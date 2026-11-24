import { DateSchema, TimeSchema, type EventCandidate, type ImportContext, type ReviewIssue, type SourceRef } from '../domain/types';

export function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `import-${(hash >>> 0).toString(16)}`;
}
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const issue = (id: string, field: string, reason: string): ReviewIssue => ({ id: stableId(`${id}:${field}:${reason}`), field, reason });
export function checkCancelled(signal?: AbortSignal) { if (signal?.aborted) throw new DOMException('Leitura cancelada', 'AbortError'); }
export function parseDate(value: string, year?: number): string | undefined {
  const raw = value.trim();
  if (DateSchema.safeParse(raw).success) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!match || (!match[3] && !year)) return undefined;
  const date = `${match[3] ?? year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return DateSchema.safeParse(date).success ? date : undefined;
}
export function parseTime(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})[:h](\d{2})$/i);
  const time = match && `${match[1].padStart(2, '0')}:${match[2]}`;
  return time && TimeSchema.safeParse(time).success ? time : undefined;
}
export function makeCandidate(input: { course?: string; courseCode?: string; group?: string; title: string; kind: EventCandidate['kind']; date?: string; startTime?: string; endTime?: string; location?: string; sources: SourceRef[]; extraIssues?: ReviewIssue[] }, context: ImportContext): EventCandidate {
  const id = stableId(JSON.stringify([input.course, input.title, input.date, input.startTime, input.sources]));
  const issues = [...(input.extraIssues ?? [])];
  if (!input.course) issues.push(issue(id, 'course', 'Informe a disciplina; ela não foi identificada com segurança.'));
  if (!input.date) issues.push(issue(id, 'date', 'Confirme a data completa, incluindo o ano.'));
  if (!input.startTime || !input.endTime) issues.push(issue(id, 'time', 'Horário ausente. Informe início e fim ou escolha explicitamente dia inteiro.'));
  else if (input.endTime <= input.startTime) issues.push(issue(id, 'time', 'O horário final precisa ser posterior ao início.'));
  if (input.date && context.startDate && input.date < context.startDate || input.date && context.endDate && input.date > context.endDate) issues.push(issue(id, 'date', 'A data está fora do intervalo informado. Confirme se deve ser mantida.'));
  return { ...input, course: input.course ?? '', id, allDay: false, selected: true, reviewStatus: 'pending', issues };
}
