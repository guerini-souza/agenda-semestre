import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ImportResultSchema, LIMITS } from '../src/lib/domain/types';
import { importFiles } from '../src/lib/import';
import { getDemoResult } from '../src/lib/import/demo';
import { imageCoverage } from '../src/lib/import/pdf';
import { parseDate } from '../src/lib/import/shared';
import { documentInfo, groupPositionedText, interpretSources, interpretText } from '../src/lib/import/text';
import { interpretGrid } from '../src/lib/import/xlsx';

const context = { timeZone: 'America/Sao_Paulo', excludedDates: [] };
const meta = { fileId: 'synthetic', fileName: 'exemplo-sintetico.pdf' };
const source = (excerpt: string) => ({ ...meta, excerpt, page: 1, method: 'pdf-text' as const });

describe('datas e interpretação conservadora', () => {
  it('não presume ano, valida calendário e aceita contexto explícito', () => {
    expect(parseDate('20/10')).toBeUndefined();
    expect(parseDate('20/10', 2026)).toBe('2026-10-20');
    expect(parseDate('31/02/2026')).toBeUndefined();
    expect(parseDate('29/02/2024')).toBe('2024-02-29');
    expect(parseDate('02/01/2027', 2026)).toBe('2027-01-02');
  });
  it('não transforma prova sem horário em dia inteiro', () => {
    const [event] = interpretText(source('Prova 1 20/10/2026'), context);
    expect(event.date).toBe('2026-10-20');
    expect(event.allDay).toBe(false);
    expect(event.startTime).toBeUndefined();
    expect(event.issues.some(i => i.field === 'time')).toBe(true);
    expect(event.sources[0].page).toBe(1);
    expect(event.sources[0].excerpt).toContain('20/10/2026');
  });
  it('usa ano documental e horários somente para aulas, preservando cabeçalhos', () => {
    const s = source('PLANO DE AULA\nTURMA/UNIDADE CURRICULAR: A – Disciplina Exemplo (EXE123)\nANO/SEMESTRE: 2026 / 2\nDIA/HORÁRIO/SALA: 5ª Feira – 16h00 / 18h00 – B112\n20/08 2 Conteúdo sintético\n24/09 2 Avaliação de Desempenho 1\n01/10 2 Vista da Avaliação de Desempenho 1');
    const events = interpretText(s, context);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ date: '2026-08-20', courseCode: 'EXE123', startTime: '16:00', endTime: '18:00', kind: 'class' });
    expect(events[1]).toMatchObject({ date: '2026-09-24', kind: 'exam', allDay: false });
    expect(events[1].startTime).toBeUndefined();
    expect(events[2].kind).toBe('class');
    expect(events[0].sources.some(s => s.excerpt.includes('ANO/SEMESTRE'))).toBe(true);
  });
  it('não confunde data de aprovação, legislação ou vista com prova', () => {
    const events = interpretText(source('Aprovado em 09/07/2026\nLei 6.938/1981\nVista da Avaliação 01/10/2026\nProva a definir'), context);
    expect(events).toHaveLength(1);
    expect(events[0].date).toBeUndefined();
  });
  it('reconhece avaliação numerada na continuação de documento', () => {
    const info = documentInfo([source('Turma: D - Ciências Exemplo (EXE128)\nAno / Semestre: 2026 / Segundo')]);
    const events = interpretText({ ...source('P1 Prova Teórica 31/08/2026 10.0 0.3\nP3 Atividades em Sala 16/11/2026 10.0 0.1'), page: 5 }, context, info);
    expect(events.map(e => [e.kind, e.date])).toEqual([['exam', '2026-08-31'], ['assignment', '2026-11-16']]);
    expect(events[0].course).toBe('Ciências Exemplo');
    expect(events[0].sources[0].page).toBe(5);
  });
});

describe('posição, imagens e assistência', () => {
  it('preserva eventos textuais ausentes do OCR e junta evidência coincidente', () => {
    const sources = [source('Disciplina: Exemplo\nProva 1 20/10/2026\nEntrega 23/10/2026'), { ...source('Prova 1 20/10/2026'), method: 'ocr' as const }];
    const events = interpretSources(sources, context);
    expect(events).toHaveLength(2);
    expect(events.find(e => e.kind === 'exam')?.sources.map(s => s.method)).toContain('ocr');
    expect(events.find(e => e.kind === 'assignment')?.date).toBe('2026-10-23');
  });
  it('interpreta data serial no sistema Excel 1904 sem deslocar quatro anos', () => {
    const headers = ['Disciplina', 'Tipo', 'Título', 'Data', 'Início', 'Fim', 'Dia da semana', 'Início do período', 'Fim do período', 'Local'];
    const rows = [headers, ['Exemplo', 'Prova', 'Prova sintética', '44853', '14:00', '16:00']].map((row, r) => row.map((text, c) => ({ text, address: `${String.fromCharCode(65 + c)}${r + 1}` })));
    const [event] = interpretGrid([{ name: 'Sintético', rows, date1904: true }], meta, context).events;
    expect(event.date).toBe('2026-10-20');
  });
  it('ordena pelo lugar na página, não pela ordem do stream', () => {
    const items = [{ text: '20/10', x: 10, y: 100 }, { text: 'Prova', x: 90, y: 100.5 }, { text: 'Entrega', x: 90, y: 50 }].map(i => ({ ...i, width: 20, height: 10 }));
    expect(groupPositionedText(items.reverse())).toEqual(['20/10 Prova', 'Entrega']);
  });
  it('distingue logo pequeno de imagem grande que exige OCR', () => {
    const ops = { save: 1, restore: 2, transform: 3, paintImageXObject: 4 };
    expect(imageCoverage({ fnArray: [3, 4], argsArray: [[30, 0, 0, 30, 0, 0], []] }, ops, 100000)).toEqual({ hasImage: true, largeImage: false });
    expect(imageCoverage({ fnArray: [3, 4], argsArray: [[300, 0, 0, 300, 0, 0], []] }, ops, 100000)).toEqual({ hasImage: true, largeImage: true });
  });
  it('preserva células de layout desconhecido sem criar eventos', () => {
    const result = interpretGrid([{ name: 'Desconhecida', rows: [[{ address: 'A1', text: '<script>exemplo</script>' }], [{ address: 'A2', text: 'Prova 20/10/2026' }]] }], meta, context);
    expect(result.events).toHaveLength(0);
    expect(result.files[0].status).toBe('partial');
    expect(result.files[0].sources[0]).toMatchObject({ cells: 'A1', excerpt: '<script>exemplo</script>' });
  });
});

describe('arquivos e limites', () => {
  it('lê células mescladas e datas seriais, sem executar fórmula', async () => {
    const { default: ExcelJS } = await import('exceljs');
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Sintético');
    sheet.addRows([
      ['Disciplina', 'Tipo', 'Título', 'Data', 'Início', 'Fim', 'Dia da semana', 'Início do período', 'Fim do período', 'Local'],
      ['Disciplina fictícia', 'Prova', 'Prova 1', 46315, '14:00', '16:00'],
      ['', 'Prova', 'Prova 2', '21/10/2026', '14:00', '16:00'],
      ['Fórmula', 'Prova', { formula: '1+1', result: 2 }, '22/10/2026', '14:00', '16:00'],
    ]);
    sheet.mergeCells('A2:A3');
    const bytes = await book.xlsx.writeBuffer();
    const result = await importFiles([new File([bytes], 'mescladas.xlsx')], context);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].date).toBe('2026-10-20');
    expect(result.events[1].course).toBe('Disciplina fictícia');
    expect(result.files[0].status).toBe('partial');
    expect(result.files[0].sources.some(s => s.excerpt === '=1+1')).toBe(true);
  });
  it('lê XLSX sintético com eventos e recorrência explicitamente definidos', async () => {
    const bytes = await readFile('tests/fixtures/grade-sintetica.xlsx');
    const result = await importFiles([new File([bytes], 'grade.xlsx')], context);
    expect(result.events).toHaveLength(2);
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].startDate).toBe('2026-10-06');
    expect(result.events[0].sources.some(s => s.cells === 'D2')).toBe(true);
    expect(ImportResultSchema.safeParse(result).success).toBe(true);
  });
  it('lê XLS legado de layout observado e junta blocos adjacentes', async () => {
    const bytes = await readFile('tests/fixtures/grade-legada-sintetica.xls');
    const result = await importFiles([new File([bytes], 'grade.xls')], context);
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0]).toMatchObject({ startTime: '14:00', endTime: '16:00', startDate: '2026-08-03', endDate: '2026-12-14', courseCode: 'EXE101' });
    expect(result.schedules[0].sources.some(s => s.cells === 'D3')).toBe(true);
    expect(result.files[0].sources.some(s => s.cells === 'E2')).toBe(false);
  });
  it('isola arquivo inválido e preserva a leitura seguinte', async () => {
    const bytes = await readFile('tests/fixtures/grade-sintetica.xlsx');
    const result = await importFiles([new File(['inválido'], 'quebrado.xlsx'), new File([bytes], 'bom.xlsx')], context);
    expect(result.files.map(f => f.status)).toEqual(['error', 'complete']);
    expect(result.events).toHaveLength(2);
  });
  it('recusa excesso de arquivos, tamanho e processamento cancelado', async () => {
    const files = Array.from({ length: LIMITS.files + 1 }, (_, i) => new File(['texto'], `${i}.txt`));
    const result = await importFiles(files, context);
    expect(result.files[LIMITS.files - 1].message).not.toContain('por lote'); // o último arquivo permitido ainda é processado
    expect(result.files[LIMITS.files].message).toContain(`${LIMITS.files} arquivos`);
    const large = await importFiles([new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf')], context);
    expect(large.files[0].message).toContain('10 MB');
    const controller = new AbortController(); controller.abort();
    expect((await importFiles([files[0]], context, { signal: controller.signal })).files[0].status).toBe('cancelled');
  });
  it('mantém demonstração validada, fictícia e com datas completas', () => {
    const demo = getDemoResult();
    expect(ImportResultSchema.safeParse(demo).success).toBe(true);
    expect(demo.events.every(e => e.date?.match(/^\d{4}-\d{2}-\d{2}$/) && e.reviewStatus === 'pending')).toBe(true);
    expect(demo.files[0].fileName).toContain('sintético');
  });
});

// Optional local acceptance checks: originals stay outside fixtures and outside the repository.
describe('amostras locais autorizadas (quando presentes)', () => {
  it.skipIf(!existsSync('Horarios (1).xls'))('grade real: nove blocos e horários documentados', async () => {
    const bytes = await readFile('Horarios (1).xls');
    const result = await importFiles([new File([bytes], 'Horarios (1).xls')], context);
    expect(result.schedules).toHaveLength(9);
    expect(result.files[0].status).toBe('complete');
    expect(result.schedules.find(s => s.courseCode === 'ICT128')).toMatchObject({ weekdays: [1], startTime: '21:15', endTime: '23:15', startDate: '2026-08-03', endDate: '2026-12-14' });
  });
  for (const [fileName, expectedDates, totalCandidates] of [
    ['PlanoAulaGIndSegTrab2026_2.pdf', ['2026-09-02', '2026-10-21', '2026-11-25', '2026-11-27', '2026-12-02'], 30],
    ['PlanoAulaGProdutos2026_2.pdf', ['2026-09-24', '2026-11-05', '2026-11-12', '2026-11-19'], 15],
    ['ProgramaEnsino_Ciências Ambientais  (ICT128).pdf', ['2026-08-31', '2026-10-19', '2026-11-16', '2026-11-23', '2026-11-30'], 5],
  ] as const) {
    it.skipIf(!existsSync(fileName))(`PDF real: ${fileName}`, async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loading = pdfjs.getDocument({ data: new Uint8Array(await readFile(fileName)) });
      try {
        const pdf = await loading.promise;
        const sources = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const text = await page.getTextContent();
          const items = text.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height }] : []);
          sources.push({ ...source(groupPositionedText(items).join('\n')), fileName, page: pageNumber });
          const viewport = page.getViewport({ scale: 1 });
          expect(imageCoverage(await page.getOperatorList(), pdfjs.OPS, viewport.width * viewport.height).largeImage).toBe(false);
        }
        const info = documentInfo(sources);
        const events = sources.flatMap(s => interpretText(s, context, info));
        expect(events.filter(e => e.kind !== 'class').map(e => e.date)).toEqual(expectedDates);
        expect(events).toHaveLength(totalCandidates);
        expect(events.every(e => e.date?.startsWith('2026-'))).toBe(true);
        expect(events.filter(e => e.kind === 'class').every(e => !!e.startTime && !!e.endTime)).toBe(true);
        expect(events.filter(e => e.kind === 'exam').every(e => !e.allDay && e.issues.some(i => i.field === 'time'))).toBe(true);
        expect(events.every(e => e.courseCode && e.sources.some(s => s.page))).toBe(true);
        console.log(`Validação local ${fileName}: ${events.length} candidatos, ${expectedDates.length} avaliações; ${pdf.numPages} páginas.`);
      } finally { await loading.destroy(); }
    });
  }
});
