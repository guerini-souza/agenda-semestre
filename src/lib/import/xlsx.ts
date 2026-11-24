import { emptyResult, type CourseSchedule, type ImportContext, type ImportOptions, type ImportResult, type SourceRef } from '../domain/types';
import { checkCancelled, issue, makeCandidate, normalize, parseDate, parseTime, stableId } from './shared';
import type { FileMeta } from './pdf';

export type GridCell = { address: string; text: string; formula?: boolean };
export type GridSheet = { name: string; rows: GridCell[][]; truncated?: boolean; date1904?: boolean };
const weekdays: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const syntheticHeaders = ['disciplina', 'tipo', 'titulo', 'data', 'inicio', 'fim', 'dia da semana', 'inicio do periodo', 'fim do periodo', 'local'];
const realHeaders = ['horario', 'turma', 'turma pratica', 'salas', 'responsaveis', 'observacoes'];
function serialDate(text: string, date1904 = false): string | undefined {
  if (!/^\d+(?:\.0+)?$/.test(text)) return undefined;
  const serial = Number(text);
  if (serial < 1 || serial > 109574 || !date1904 && serial === 60) return undefined;
  if (date1904) return new Date(Date.UTC(1904, 0, 1) + serial * 86400000).toISOString().slice(0, 10);
  return new Date(Date.UTC(1899, 11, 31) + (serial - (serial > 60 ? 1 : 0)) * 86400000).toISOString().slice(0, 10);
}

export function interpretGrid(sheets: GridSheet[], meta: FileMeta, context: ImportContext): ImportResult {
  const result = emptyResult();
  const allSources: SourceRef[] = [];
  let unknown = false;
  for (const sheet of sheets) {
    const first = sheet.rows.findIndex(row => row.some(cell => cell.text.trim()));
    const header = sheet.rows[first]?.map(cell => normalize(cell.text)) ?? [];
    const synthetic = syntheticHeaders.every((value, index) => value === header[index]);
    const real = realHeaders.every((value, index) => value === header[index]);
    if (!synthetic && !real) unknown = true;
    if (sheet.truncated) { unknown = true; result.issues.push(issue(`${meta.fileId}:${sheet.name}`, 'source', 'Planilha muito extensa: leitura assistida limitada às primeiras 5.000 linhas e 100 colunas.')); }
    for (const [rowIndex, row] of sheet.rows.entries()) {
      if (!row.some(cell => cell.text.trim())) continue;
      const sources = row.flatMap((cell, index) => cell.text && (!real || index !== 4) ? [{ ...meta, sheet: sheet.name, cells: cell.address, excerpt: cell.text, method: 'xlsx' as const }] : []);
      allSources.push(...sources);
      if (rowIndex <= first || (!synthetic && !real)) continue;
      if (row.some(cell => cell.formula)) { unknown = true; result.issues.push(issue(`${meta.fileId}:${rowIndex}`, 'source', 'Linha com fórmula preservada apenas como texto; confira manualmente.')); continue; }
      const values = row.map(cell => cell.text.trim());
      if (real) {
        const time = normalize(values[0] ?? '').match(/^(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
        const course = values[1]?.match(/^(.+?)\s+-\s+(.+?)\s+\(([A-Z]{2,}\d+)\)$/);
        const period = values[3]?.match(/^(.+?)\s+\((\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4}),\s*semanalmente\)$/);
        const startDate = period && parseDate(period[2]), endDate = period && parseDate(period[3]);
        if (!time || !course || !period || !startDate || !endDate || !parseTime(time[2]) || !parseTime(time[3]) || time[3] <= time[2] || endDate < startDate) {
          unknown = true; result.issues.push(issue(`${meta.fileId}:${rowIndex}`, 'source', `Linha ${rowIndex + 1}: horário, disciplina ou período não reconhecido. Confira as células de origem.`)); continue;
        }
        if (values[5]) { unknown = true; result.issues.push(issue(`${meta.fileId}:${rowIndex}:obs`, 'source', `Linha ${rowIndex + 1} contém observações que precisam de conferência: ${values[5]}`)); }
        result.schedules.push({ id: stableId(JSON.stringify(sources)), course: course[2], courseCode: course[3], group: `${course[1]}${values[2] ? ` · prática ${values[2]}` : ''}`, weekdays: [weekdays[time[1]]], startTime: time[2], endTime: time[3], startDate, endDate, location: period[1], sources });
        continue;
      }
      const [course, type, title, rawDate, rawStart, rawEnd, rawWeekday, rawPeriodStart, rawPeriodEnd, location] = values;
      const startTime = parseTime(rawStart ?? ''), endTime = parseTime(rawEnd ?? '');
      const dateValue = (value: string) => parseDate(value ?? '', context.year) ?? serialDate(value ?? '', sheet.date1904);
      if (normalize(type ?? '') === 'aula semanal') {
        const weekday = weekdays[normalize(rawWeekday ?? '').replace(/-feira$/, '')];
        if (weekday === undefined || !startTime || !endTime || endTime <= startTime || !course) { unknown = true; result.issues.push(issue(`${meta.fileId}:${rowIndex}`, 'schedule', 'Aula semanal incompleta: confira dia da semana, disciplina e horários.')); continue; }
        const startDate = dateValue(rawPeriodStart), endDate = dateValue(rawPeriodEnd);
        result.schedules.push({ id: stableId(JSON.stringify(sources)), course, weekdays: [weekday], startTime, endTime, startDate, endDate, location, sources });
        continue;
      }
      const kinds = { prova: 'exam', entrega: 'assignment', apresentacao: 'presentation', aula: 'class', outro: 'other' } as const;
      const kind = kinds[normalize(type ?? '') as keyof typeof kinds];
      result.events.push(makeCandidate({ course, title: title || `${type || 'Evento'} — ${course}`, kind: kind ?? 'other', date: dateValue(rawDate), startTime, endTime, location, sources, extraIssues: kind ? [] : [issue(`${meta.fileId}:${rowIndex}`, 'kind', 'Tipo de evento não reconhecido; confirme a categoria.')] }, context));
    }
  }
  result.schedules = mergeAdjacentSchedules(result.schedules);
  if (unknown) result.issues.push(issue(meta.fileId, 'source', 'Leitura parcial ou layout desconhecido. Confira as células preservadas e crie manualmente os eventos que faltarem.'));
  result.files.push({ ...meta, status: unknown ? 'partial' : 'complete', sources: allSources, message: `${result.events.length} evento(s) e ${result.schedules.length} horário(s) reconhecido(s).${unknown ? ' Algumas células exigem revisão assistida.' : ''}` });
  return result;
}

export function mergeAdjacentSchedules(schedules: CourseSchedule[]): CourseSchedule[] {
  const result: CourseSchedule[] = [];
  for (const current of [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
    const previous = result.find(p => p.course === current.course && p.courseCode === current.courseCode && p.group === current.group && p.location === current.location && p.startDate === current.startDate && p.endDate === current.endDate && p.weekdays.join(',') === current.weekdays.join(',') && p.endTime === current.startTime);
    if (previous) { previous.endTime = current.endTime; previous.sources = [...previous.sources, ...current.sources]; previous.id = stableId(JSON.stringify(previous.sources)); }
    else result.push({ ...current, sources: [...current.sources] });
  }
  return result;
}

export async function readSpreadsheet(data: ArrayBuffer, meta: FileMeta, context: ImportContext, options: ImportOptions, legacy: boolean): Promise<ImportResult> {
  checkCancelled(options.signal);
  const sheets: GridSheet[] = [];
  if (legacy) {
    const XLSX = await import('xlsx');
    const book = XLSX.read(data, { type: 'array', cellDates: true, cellFormula: true, sheetRows: 5001 });
    for (const name of book.SheetNames) {
      const sheet = book.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
      const rows: GridCell[][] = [];
      for (let r = 0; r <= Math.min(range.e.r, 4999); r++) {
        checkCancelled(options.signal);
        const row: GridCell[] = [];
        for (let c = 0; c <= Math.min(range.e.c, 99); c++) {
          const address = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[address];
          const text = cell?.f ? `=${cell.f}` : cell?.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell?.w ?? cell?.v ?? '');
          row.push({ address, text, formula: !!cell?.f });
        }
        rows.push(row);
      }
      sheets.push({ name, rows, truncated: !!sheet['!fullref'] || range.e.r >= 5000 || range.e.c >= 100 });
    }
  } else {
    const { default: ExcelJS } = await import('exceljs');
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(data);
    for (const sheet of book.worksheets) {
      const rows: GridCell[][] = [];
      for (let r = 1; r <= Math.min(sheet.rowCount, 5000); r++) {
        checkCancelled(options.signal);
        const row: GridCell[] = [];
        for (let c = 1; c <= Math.min(sheet.columnCount, 100); c++) {
          const cell = sheet.getCell(r, c), value = cell.value;
          const formula = !!value && typeof value === 'object' && ('formula' in value || 'sharedFormula' in value);
          const text = value instanceof Date ? /h/i.test(cell.numFmt) && !/[dy]/i.test(cell.numFmt) ? value.toISOString().slice(11, 16) : value.toISOString().slice(0, 10) : formula ? `=${cell.formula ?? '(fórmula compartilhada)'}` : cell.text;
          row.push({ address: cell.address, text, formula });
        }
        rows.push(row);
      }
      sheets.push({ name: sheet.name, rows, truncated: sheet.rowCount > 5000 || sheet.columnCount > 100, date1904: book.properties.date1904 });
    }
  }
  return interpretGrid(sheets, meta, context);
}
