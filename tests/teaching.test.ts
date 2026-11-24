import { describe, it, expect } from 'vitest';
import { buildTeachingPlan, validateTeachingPlan, type TeachingPlan } from '../src/lib/domain/teaching';
import { confirmEvents } from '../src/lib/domain/calendar';

const plan = (patch: Partial<TeachingPlan> = {}): TeachingPlan => ({
  course: 'Cálculo I', courseCode: 'MAT101', group: 'A', location: 'Sala 12',
  weekdays: [1, 3], startTime: '19:00', endTime: '20:40',
  startDate: '2026-08-03', endDate: '2026-08-12', excludedDates: [], timeZone: 'America/Sao_Paulo',
  assessments: [], ...patch
});

describe('plano de ensino do professor', () => {
  it('gera as aulas nos dias da semana escolhidos, inclusive nas pontas do período', () => {
    const { events, schedule } = buildTeachingPlan(plan());
    expect(schedule.weekdays).toEqual([1, 3]);
    expect(events.filter(e => e.kind === 'class').map(e => e.date)).toEqual(['2026-08-03', '2026-08-05', '2026-08-10', '2026-08-12']);
    expect(events[0]).toMatchObject({ course: 'Cálculo I', courseCode: 'MAT101', group: 'A', location: 'Sala 12', startTime: '19:00', endTime: '20:40' });
  });

  it('pula os dias sem aula informados', () => {
    const { events } = buildTeachingPlan(plan({ excludedDates: ['2026-08-05'] }));
    expect(events.map(e => e.date)).not.toContain('2026-08-05');
    expect(events).toHaveLength(3);
  });

  it('inclui avaliações; sem horário vão como dia inteiro e podem ser exportadas', () => {
    const { events } = buildTeachingPlan(plan({ assessments: [
      { id: 'p1', title: 'Prova 1', kind: 'exam', date: '2026-08-07' },
      { id: 't1', title: 'Entrega do trabalho', kind: 'assignment', date: '2026-08-11', startTime: '10:00', endTime: '11:00' }
    ] }));
    const exam = events.find(e => e.title === 'Prova 1')!;
    expect(exam).toMatchObject({ kind: 'exam', date: '2026-08-07', course: 'Cálculo I', selected: true });
    expect(exam.sources[0].method).toBe('plan');
    const confirmed = confirmEvents(events, { timeZone: 'America/Sao_Paulo', excludedDates: [] });
    expect(confirmed).toHaveLength(6);
    expect(confirmed.find(e => e.title === 'Prova 1')!.timing.mode).toBe('allDay');
    expect(confirmed.find(e => e.title === 'Entrega do trabalho')!.timing.mode).toBe('timed');
  });

  it('é determinístico: o mesmo plano gera os mesmos identificadores', () => {
    expect(buildTeachingPlan(plan()).events.map(e => e.id)).toEqual(buildTeachingPlan(plan()).events.map(e => e.id));
  });

  it('recusa dados incompletos ou incoerentes com mensagens em português', () => {
    expect(validateTeachingPlan(plan({ course: '  ' }))).toContain('Informe o nome da disciplina.');
    expect(validateTeachingPlan(plan({ weekdays: [] }))).toContain('Escolha pelo menos um dia da semana.');
    expect(validateTeachingPlan(plan({ endTime: '18:00' }))).toContain('O fim da aula precisa ser depois do início.');
    expect(validateTeachingPlan(plan({ endDate: '2026-07-01' }))).toContain('O último dia de aulas precisa ser igual ou posterior ao primeiro.');
    expect(validateTeachingPlan(plan({ startDate: '' }))).toContain('Informe o primeiro e o último dia de aulas.');
    expect(validateTeachingPlan(plan({ assessments: [{ id: 'x', title: '', kind: 'exam', date: '2026-08-07' }] }))).toContain('Toda avaliação precisa de título e data válida.');
    expect(() => buildTeachingPlan(plan({ weekdays: [] }))).toThrow('Escolha pelo menos um dia da semana.');
    expect(validateTeachingPlan(plan())).toEqual([]);
  });

  it('avisa quando nenhum dia do período cai nos dias escolhidos', () => {
    expect(validateTeachingPlan(plan({ weekdays: [0], startDate: '2026-08-03', endDate: '2026-08-07' }))).toContain('Nenhuma aula cai nesse período e nesses dias da semana.');
  });
});
