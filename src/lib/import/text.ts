import type { EventCandidate, ImportContext, SourceRef } from '../domain/types';
import { issue, makeCandidate, normalize, parseDate, parseTime } from './shared';

export type PositionedText = { text: string; x: number; y: number; width: number; height: number };
export function groupPositionedText(items: PositionedText[]): string[] {
  const useful = items.filter(i => i.text.trim());
  const allText = useful.map(i => i.text).join(' ');
  const dates = useful.filter(i => /^\d{2}\/\d{2}$/.test(i.text.trim())).sort((a, b) => b.y - a.y);
  // The observed plan has one centered date and CH cell per row, with wrapped content.
  // Use midpoints between date cells to recover the actual row, rather than PDF stream order.
  if (/PLANO DE AULA/.test(allText) && /CONTEÚDO PROGRAMÁTICO/.test(allText) && dates.length > 2 && dates.every(d => Math.abs(d.x - dates[0].x) < 5)) {
    const top = dates[0].y + (dates[0].y - dates[1].y) / 2;
    const bottom = dates.at(-1)!.y - (dates.at(-2)!.y - dates.at(-1)!.y) / 2;
    const header = groupPositionedText(useful.filter(i => i.y > top));
    const table = dates.map((date, index) => {
      const upper = index === 0 ? top : (dates[index - 1].y + date.y) / 2;
      const lower = index === dates.length - 1 ? bottom : (date.y + dates[index + 1].y) / 2;
      const row = useful.filter(i => i.y <= upper && i.y > lower && i.x >= date.x - 3 && i !== date);
      const ch = row.filter(i => i.x < date.x + 70).sort((a, b) => a.x - b.x);
      const content = groupPositionedText(row.filter(i => i.x >= date.x + 70));
      return [date.text, ...ch.map(i => i.text), ...content].join(' ').replace(/\s+/g, ' ').trim();
    });
    return [...header, ...table, ...groupPositionedText(useful.filter(i => i.y <= bottom))];
  }
  const rows: { y: number; items: PositionedText[] }[] = [];
  for (const item of [...items].filter(i => i.text.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find(r => Math.abs(r.y - item.y) < 3);
    if (row) row.items.push(item); else rows.push({ y: item.y, items: [item] });
  }
  return rows.map(row => row.items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim());
}

export type DocumentInfo = { course?: string; courseCode?: string; group?: string; year?: number; headerSources: SourceRef[]; hours: { weekday: number; start: string; end: string }[]; location?: string; knownPlan: boolean };
export function documentInfo(sources: SourceRef[]): DocumentInfo {
  const lines = [...sources].sort((a, b) => Number(a.method !== 'ocr') - Number(b.method !== 'ocr')).flatMap(source => source.excerpt.split('\n').map(text => ({ text, source: { ...source, excerpt: text } })));
  const info: DocumentInfo = { headerSources: [], hours: [], knownPlan: false };
  for (const { text, source } of lines) {
    const plain = normalize(text);
    if (plain.includes('plano de aula') || plain.includes('programa de ensino de disciplina')) info.knownPlan = true;
    const course = text.match(/(?:TURMA\/UNIDADE CURRICULAR|Turma|Disciplina)\s*:\s*(.+)$/i);
    if (course) {
      const detailed = course[1].match(/^(.+?)\s+[–—-]\s+(.+?)(?:\s*\(([A-Z]{2,}\d+)\))?$/);
      info.course = detailed ? detailed[2] : course[1];
      info.group = detailed?.[1];
      info.courseCode = detailed?.[3];
      info.headerSources.push(source);
    }
    const year = plain.match(/ano\s*\/\s*semestre\s*:\s*(\d{4})\s*\//);
    if (year) { info.year = Number(year[1]); info.headerSources.push(source); }
    if (plain.includes('dia/horario/sala')) {
      for (const match of text.matchAll(/([2-7])\s*[ªºa]?\s*[- ]?Feira\s*[–—-]?\s*\(?\s*(\d{1,2}h\d{2})\s*\/\s*(\d{1,2}h\d{2})/gi)) {
        const start = parseTime(match[2]), end = parseTime(match[3]);
        if (start && end) info.hours.push({ weekday: Number(match[1]) - 1, start, end });
      }
      info.location = text.match(/[–—-]\s*([A-Z]\d{2,})\s*$/)?.[1];
      info.headerSources.push(source);
    }
  }
  return info;
}

export function interpretText(source: SourceRef, context: ImportContext, info = documentInfo([source])): EventCandidate[] {
  const events: EventCandidate[] = [];
  for (const raw of source.excerpt.split('\n')) {
    const text = raw.trim();
    const plain = normalize(text);
    const dateMatch = text.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/);
    const assessment = /^(?:p\d+\s+)?(?:prova|avaliacao|apresentacao(?! da disciplina)|entrega|seminario|projetos?\b|atividades em sala)/.test(plain.replace(/^\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+(?:(?:\d+|-{2,})\s+)?/, ''));
    const datedRow = info.knownPlan && /^\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+\d+(?:\s+|$)/.test(text);
    const synthetic = /\|/.test(text) && /^(?:prova|entrega|apresentacao|aula)\s*\|/.test(plain);
    if ((!dateMatch && !assessment) || (!assessment && !datedRow && !synthetic)) continue;
    if (!dateMatch && !/a definir|semana\s+\d/.test(plain)) continue;
    if (/\bferiado\b|semana pedagogica|^vista/.test(plain)) continue;
    const date = dateMatch ? parseDate(dateMatch[0], info.year ?? context.year) : undefined;
    const times = [...text.matchAll(/\b\d{1,2}[:h]\d{2}\b/g)].map(m => parseTime(m[0]));
    const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
    // General class times establish classes, never silently fill assessment times.
    const schedule = !assessment ? info.hours.find(h => h.weekday === weekday) : undefined;
    const kind: EventCandidate['kind'] = /prova|avaliacao/.test(plain.replace(/vista da avaliacao.*$/, '')) && assessment ? 'exam' : /entrega|projetos?\b|atividades em sala/.test(plain) && assessment ? 'assignment' : /apresentacao|seminario/.test(plain) && assessment ? 'presentation' : 'class';
    const title = text.replace(/^\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+(?:\d+|-{2,})(?:\s+|$)/, '').replace(/\s+\d{1,2}\/\d{1,2}\/\d{4}.*$/, '').trim() || `Aula${info.course ? ` · ${info.course}` : ''}`;
    const extraIssues = [];
    if (!info.knownPlan && !synthetic) extraIssues.push(issue(text, 'source', 'Trecho livre: confirme a interpretação com a página de origem.'));
    if (info.year && context.year && info.year !== context.year) extraIssues.push(issue(text, 'date', `O documento informa ${info.year}, diferente do ano ${context.year} escolhido.`));
    if (source.method === 'ocr') extraIssues.push(issue(text, 'source', 'Texto reconhecido por OCR: confira os números e o trecho no documento.'));
    events.push(makeCandidate({ course: info.course, courseCode: info.courseCode, group: info.group, kind, title, date, startTime: times[0] ?? schedule?.start, endTime: times[1] ?? schedule?.end, location: info.location, sources: [{ ...source, excerpt: text }, ...info.headerSources], extraIssues }, context));
  }
  return events;
}

export function interpretSources(sources: SourceRef[], context: ImportContext): EventCandidate[] {
  const info = documentInfo(sources);
  const combined = new Map<string, EventCandidate>();
  for (const source of sources) {
    for (const event of interpretText(source, context, info)) {
      const key = JSON.stringify([event.courseCode ?? normalize(event.course), event.kind, event.date, event.startTime, event.endTime, normalize(event.title).replace(/[^a-z0-9]/g, '')]);
      const previous = combined.get(key);
      if (previous) {
        const references = new Map([...previous.sources, ...event.sources].map(s => [JSON.stringify(s), s]));
        previous.sources = [...references.values()];
        previous.issues = [...new Map([...previous.issues, ...event.issues].map(i => [`${i.field}:${i.reason}`, i])).values()];
      } else combined.set(key, event);
    }
  }
  return [...combined.values()];
}
