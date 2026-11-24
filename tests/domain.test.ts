import { describe, it, expect } from 'vitest';
import { DateSchema } from '../src/lib/domain/types';
import type { EventCandidate, ImportContext, CourseSchedule } from '../src/lib/domain/types';
import { expandSchedules, prepareSchedules, reconcileEvents, confirmEvents, toInstant } from '../src/lib/domain/calendar';
import { createIcs } from '../src/lib/calendar/ics';
import { googleEventBody } from '../src/lib/calendar/google';
const context: ImportContext = { timeZone: 'America/Sao_Paulo', excludedDates: [], startDate: '2026-12-28', endDate: '2027-01-04' };
const candidate = (patch: Partial<EventCandidate> = {}): EventCandidate => ({ id: 'a', course: 'Cálculo', title: 'Prova; 1, revisão', kind: 'exam', date: '2026-10-08', startTime: '19:00', endTime: '21:00', allDay: false, sources: [], issues: [], selected: true, reviewStatus: 'confirmed', ...patch });
describe('datas e confirmação', () => {
  it('rejeita rollover e dias inexistentes', () => { expect(DateSchema.safeParse('2026-02-31').success).toBe(false); expect(DateSchema.safeParse('2028-02-29').success).toBe(true); });
  it('expande inclusivamente atravessando o ano e aplica exclusões', () => {
    const schedule: CourseSchedule = { id: 's', course: 'Cálculo', weekdays: [1], startTime: '19:00', endTime: '21:00', sources: [] };
    expect(expandSchedules([schedule], context).map(e => e.date)).toEqual(['2026-12-28', '2027-01-04']);
    expect(expandSchedules([schedule], { ...context, excludedDates: ['2026-12-28'] })).toHaveLength(1);
    expect(() => expandSchedules([schedule], { ...context, startDate: undefined })).toThrow();
  });
  it('exporta prova sem duração como dia inteiro, sem confirmação individual', () => {
    expect(confirmEvents([candidate({ endTime: undefined, reviewStatus: 'pending', issues: [{ id: 'time', field: 'time', reason: 'Horário ausente' }] })], context)[0].timing.mode).toBe('allDay');
    expect(confirmEvents([candidate({ reviewStatus: 'pending' })], context)[0].timing.mode).toBe('timed');
    expect(confirmEvents([candidate({ allDay: true, startTime: undefined, endTime: undefined })], context)[0].timing.mode).toBe('allDay');
  });
  it('ainda bloqueia data inválida, horário invertido e aula incompleta', () => {
    expect(() => confirmEvents([candidate({ date: '2026-02-31' })], context)).toThrow('data válida');
    expect(() => confirmEvents([candidate({ date: undefined })], context)).toThrow('data válida');
    expect(() => confirmEvents([candidate({ startTime: '22:00', endTime: '21:00' })], context)).toThrow();
    expect(() => confirmEvents([candidate({ kind: 'class', endTime: undefined })], context)).toThrow();
  });
  it('mescla duplicata e mantém choque entre disciplinas', () => {
    expect(reconcileEvents([candidate(), candidate({ id: 'b' })])).toHaveLength(1);
    const conflict = reconcileEvents([candidate(), candidate({ id: 'c', course: 'Física' })]);
    expect(conflict.every(e => e.issues.some(i => i.field === 'conflict'))).toBe(true);
    expect(confirmEvents(conflict, context)).toHaveLength(2);
    expect(reconcileEvents([conflict[0], { ...conflict[1], selected: false }])[0].issues).toEqual([]);
  });
  it('rejeita horário inexistente ou ambíguo de DST', () => {
    expect(() => toInstant('2026-03-08', '02:30', 'America/New_York')).toThrow();
    expect(() => toInstant('2026-11-01', '01:30', 'America/New_York')).toThrow();
  });
});
describe('ICS', () => {
  it('preserva matéria, código, sala e turma em ICS e Google', () => {
    const events = confirmEvents([candidate({ courseCode: 'ICT128', location: 'Sala R-101', group: '2026.2' })], context);
    const body = googleEventBody(events[0], 'id');
    expect(body.summary).toBe('Prova; 1, revisão (ICT128)');
    expect(body.location).toBe('Sala R-101');
    expect(body.description).toContain('Código: ICT128');
    expect(body.description).toContain('Turma: 2026.2');
    const ics = createIcs(events).replace(/\r\n[ \t]/g, '');
    expect(ics).toContain('SUMMARY:Prova\\; 1\\, revisão (ICT128)');
    expect(ics).toContain('LOCATION:Sala R-101');
    expect(ics).toContain('Disciplina: Cálculo');
    expect(ics).toContain('Código: ICT128');
  });
  it('usa UTC correto, escape e identidade estável', () => {
    const events = confirmEvents([candidate()], context);
    const first = createIcs(events), second = createIcs(events);
    expect(first).toContain('DTSTART:20261008T220000Z'); expect(first).toContain('DTEND:20261009T000000Z');
    expect(first).toContain('SUMMARY:Prova\\; 1\\, revisão');
    expect(first.match(/UID:[\s\S]*?\r\n[A-Z]/)?.[0]).toEqual(second.match(/UID:[\s\S]*?\r\n[A-Z]/)?.[0]);
  });
  it('dia inteiro termina na data exclusiva seguinte', () => {
    const value = createIcs(confirmEvents([candidate({ date: '2026-12-31', allDay: true })], context));
    expect(value).toContain('DTSTART;VALUE=DATE:20261231'); expect(value).toContain('DTEND;VALUE=DATE:20270101');
  });
});

describe('aulas automáticas da planilha', () => {
  const schedule: CourseSchedule = { id: 's', course: 'Ciências Ambientais', courseCode: 'ICT128', location: 'Sala 10', weekdays: [1], startTime: '21:15', endTime: '23:15', startDate: '2026-08-03', endDate: '2026-08-17', sources: [] };
  const automatic = { timeZone: 'America/Sao_Paulo', excludedDates: [] };
  it('gera cada período documentado e identifica separadamente o que falta', () => {
    const result = prepareSchedules([schedule, { ...schedule, id: 'later', startDate: '2026-09-07', endDate: '2026-09-14' }, { ...schedule, id: 'missing', endDate: undefined }], automatic);
    expect(result.events.map(event => event.date)).toEqual(['2026-08-03', '2026-08-10', '2026-08-17', '2026-09-07', '2026-09-14']);
    expect(result.pending.map(item => item.id)).toEqual(['missing']);
    expect(result.events[0]).toMatchObject({ title: 'Aula · Ciências Ambientais (ICT128)', location: 'Sala 10', startTime: '21:15', endTime: '23:15' });
    expect(googleEventBody(confirmEvents(result.events, automatic)[0], 'id').summary).toBe(result.events[0].title);
  });
  it('respeita o intervalo escolhido e exclusões sem inventar datas de aulas', () => {
    const result = prepareSchedules([schedule], { ...automatic, startDate: '2026-08-10', endDate: '2026-09-30', excludedDates: ['2026-08-10'] });
    expect(result.events.map(event => event.date)).toEqual(['2026-08-17']);
    expect(prepareSchedules([{ ...schedule, startDate: undefined, endDate: undefined }], automatic).events).toEqual([]);
  });
});
