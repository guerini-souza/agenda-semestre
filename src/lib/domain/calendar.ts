import { Temporal } from '@js-temporal/polyfill';
import { ConfirmedEventSchema, CourseScheduleSchema, DateSchema, ImportContextSchema, LIMITS, TimeSchema } from './types';
import type { CourseSchedule, EventCandidate, ImportContext, ConfirmedEvent } from './types';

/** Stable non-secret identity. Exporters hash this canonical content with SHA-256. */
export function eventKey(event: Pick<EventCandidate, 'course' | 'courseCode' | 'group' | 'kind' | 'title' | 'date' | 'startTime' | 'endTime' | 'allDay' | 'location'>): string {
  return JSON.stringify([event.courseCode || event.course.trim().toLocaleLowerCase('pt-BR'), event.group || '', event.kind, event.title.trim(), event.date || '', event.allDay ? 'allDay' : event.startTime || '', event.allDay ? '' : event.endTime || '', event.location || '']);
}

export function expandSchedules(schedules: CourseSchedule[], context: ImportContext): EventCandidate[] {
  ImportContextSchema.parse(context);
  if (!context.startDate || !context.endDate) throw new Error('Confirme o início e o fim das aulas.');
  if (context.endDate < context.startDate) throw new Error('O fim do período deve ser posterior ao início.');
  const start = Temporal.PlainDate.from(context.startDate), end = Temporal.PlainDate.from(context.endDate);
  if (start.until(end).days > 730) throw new Error('Escolha um período de até dois anos.');
  const events: EventCandidate[] = [];
  for (const raw of schedules) {
    const schedule = CourseScheduleSchema.parse(raw);
    if (schedule.endTime <= schedule.startTime) throw new Error(`Confira o horário de ${schedule.course}.`);
    for (let day = start; Temporal.PlainDate.compare(day, end) <= 0; day = day.add({ days: 1 })) {
      const date = day.toString();
      if (!schedule.weekdays.includes(day.dayOfWeek % 7) || context.excludedDates.includes(date) || (schedule.startDate && date < schedule.startDate) || (schedule.endDate && date > schedule.endDate)) continue;
      events.push({ id: `${schedule.id}:${date}`, course: schedule.course, courseCode: schedule.courseCode, group: schedule.group, kind: 'class', title: `Aula · ${schedule.course}${schedule.courseCode ? ` (${schedule.courseCode})` : ''}`, date, startTime: schedule.startTime, endTime: schedule.endTime, allDay: false, location: schedule.location, sources: schedule.sources, issues: [], selected: true, reviewStatus: 'pending' });
      if (events.length > LIMITS.events) throw new Error(`O limite é de ${LIMITS.events} eventos. Reduza o período.`);
    }
  }
  return reconcileEvents(events);
}

/** Use each documented period unless the student supplied an explicit boundary. */
export function prepareSchedules(schedules: CourseSchedule[], context: ImportContext) {
  const pending: CourseSchedule[] = [];
  const events: EventCandidate[] = [];
  for (const schedule of schedules) {
    const startDate = context.startDate || schedule.startDate;
    const endDate = context.endDate || schedule.endDate;
    if (!startDate || !endDate) { pending.push(schedule); continue; }
    events.push(...expandSchedules([schedule], { ...context, startDate, endDate }));
    if (events.length > LIMITS.events) throw new Error(`O limite é de ${LIMITS.events} eventos. Reduza o período.`);
  }
  return { events: reconcileEvents(events), pending };
}

export function calendarTitle(event: ConfirmedEvent): string {
  return event.courseCode && !event.title.includes(event.courseCode) ? `${event.title} (${event.courseCode})` : event.title;
}

export function calendarDescription(event: ConfirmedEvent): string {
  return [`Disciplina: ${event.course}`, event.courseCode && `Código: ${event.courseCode}`, event.location && `Sala / local: ${event.location}`, event.group && `Turma: ${event.group}`, 'Importado pelo Semestre.'].filter(Boolean).join('\n');
}

export function reconcileEvents(candidates: EventCandidate[]): EventCandidate[] {
  const unique = new Map<string, EventCandidate>();
  for (const candidate of candidates) {
    const key = eventKey(candidate);
    const clean = { ...candidate, sources: [...candidate.sources], issues: candidate.issues.filter(issue => issue.field !== 'conflict') };
    // Incomplete records can be distinct even when their missing fields match.
    const matchKey = candidate.date ? key : `${key}:${candidate.id}`;
    const existing = unique.get(matchKey);
    if (!existing) unique.set(matchKey, clean);
    else {
      const refs = new Map([...existing.sources, ...clean.sources].map(s => [JSON.stringify(s), s]));
      existing.sources = [...refs.values()];
      existing.issues = [...new Map([...existing.issues, ...clean.issues].map(i => [i.id, i])).values()];
      existing.selected ||= clean.selected;
      if (clean.reviewStatus !== 'confirmed') existing.reviewStatus = 'pending';
    }
  }
  const events = [...unique.values()].sort((a, b) => `${a.date || '9999'}${a.startTime || ''}`.localeCompare(`${b.date || '9999'}${b.startTime || ''}`));
  for (let i = 0; i < events.length; i++) {
    const a = events[i];
    if (!a.selected || a.allDay || !a.date || !a.startTime || !a.endTime) continue;
    for (let j = i + 1; j < events.length; j++) {
      const b = events[j];
      if (b.date !== a.date) break;
      if (!b.selected || b.allDay || !b.startTime || !b.endTime || a.endTime <= b.startTime || b.endTime <= a.startTime) continue;
      a.issues.push({ id: `conflict:${b.id}`, field: 'conflict', reason: `Sobreposição com “${b.title}”. Corrija o horário ou desmarque um dos eventos.` });
      b.issues.push({ id: `conflict:${a.id}`, field: 'conflict', reason: `Sobreposição com “${a.title}”. Corrija o horário ou desmarque um dos eventos.` });
    }
  }
  return events;
}

export function usesAllDay(event: EventCandidate): boolean {
  return event.allDay || (event.kind !== 'class' && (!event.startTime || !event.endTime));
}

/** Only missing/invalid scheduling data blocks export; review and overlap are advisory. */
export function exportProblems(event: EventCandidate): string[] {
  const problems: string[] = [];
  if (!event.course.trim()) problems.push('Informe a disciplina.');
  if (!event.title.trim()) problems.push('Informe o título.');
  if (!DateSchema.safeParse(event.date).success) problems.push('Informe uma data válida.');
  if (!usesAllDay(event) && (!TimeSchema.safeParse(event.startTime).success || !TimeSchema.safeParse(event.endTime).success || event.endTime! <= event.startTime!)) problems.push('Corrija o início e o fim, ou use dia inteiro.');
  if (event.issues.some(issue => issue.field === 'period')) problems.push('Gere as aulas novamente para aplicar o período alterado.');
  return problems;
}

export function confirmEvents(candidates: EventCandidate[], context: ImportContext): ConfirmedEvent[] {
  ImportContextSchema.parse(context);
  const selected = reconcileEvents(candidates).filter(event => event.selected);
  if (!selected.length) throw new Error('Selecione pelo menos um evento.');
  if (selected.length > LIMITS.events) throw new Error(`O limite é de ${LIMITS.events} eventos.`);
  return selected.map(event => {
    const problems = exportProblems(event);
    if (problems.length) throw new Error(`${event.title || event.course || 'Evento'}: ${problems.join(' ')}`);
    const confirmed = ConfirmedEventSchema.parse({ ...event, timing: usesAllDay(event) ? { mode: 'allDay', date: event.date } : { mode: 'timed', date: event.date, startTime: event.startTime, endTime: event.endTime }, timeZone: context.timeZone });
    if (confirmed.timing.mode === 'timed') {
      toInstant(confirmed.timing.date, confirmed.timing.startTime, confirmed.timeZone);
      toInstant(confirmed.timing.date, confirmed.timing.endTime, confirmed.timeZone);
    }
    return confirmed;
  });
}

export function toInstant(date: string, time: string, zone: string): Date {
  const value = Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(zone, { disambiguation: 'reject' });
  return new Date(Number(value.epochMilliseconds));
}

export const nextDate = (date: string): string => Temporal.PlainDate.from(date).add({ days: 1 }).toString();
export function confirmedKey(event: ConfirmedEvent): string {
  return `${eventKey({ ...event, date: event.timing.date, allDay: event.timing.mode === 'allDay', startTime: event.timing.mode === 'timed' ? event.timing.startTime : undefined, endTime: event.timing.mode === 'timed' ? event.timing.endTime : undefined })}:${event.timeZone}`;
}
