import { CourseScheduleSchema, DateSchema, TimeSchema } from './types';
import type { CourseSchedule, EventCandidate, EventKind, SourceRef } from './types';
import { expandSchedules, reconcileEvents } from './calendar';

export type PlanAssessment = { id: string; title: string; kind: Exclude<EventKind, 'class'>; date: string; startTime?: string; endTime?: string };
/** Plano de ensino montado pelo professor. weekdays: 0 = domingo … 6 = sábado. */
export type TeachingPlan = {
  course: string; courseCode?: string; group?: string; location?: string;
  weekdays: number[]; startTime: string; endTime: string;
  startDate: string; endDate: string; excludedDates: string[]; timeZone: string;
  assessments: PlanAssessment[];
  /** Usados só no PDF do plano de aula; não alteram os eventos da agenda. */
  lessonContents?: Record<string, string>;
  excludedLabels?: Record<string, string>;
  classHours?: number;
  modality?: string;
  institution?: string;
  observation?: string;
};

const clean = (value?: string) => value?.trim() || undefined;
function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

export function validateTeachingPlan(plan: TeachingPlan): string[] {
  const problems: string[] = [];
  if (!plan.course.trim()) problems.push('Informe o nome da disciplina.');
  if (!plan.weekdays.length) problems.push('Escolha pelo menos um dia da semana.');
  if (!TimeSchema.safeParse(plan.startTime).success || !TimeSchema.safeParse(plan.endTime).success) problems.push('Informe o início e o fim da aula.');
  else if (plan.endTime <= plan.startTime) problems.push('O fim da aula precisa ser depois do início.');
  const datesOk = DateSchema.safeParse(plan.startDate).success && DateSchema.safeParse(plan.endDate).success;
  if (!datesOk) problems.push('Informe o primeiro e o último dia de aulas.');
  else if (plan.endDate < plan.startDate) problems.push('O último dia de aulas precisa ser igual ou posterior ao primeiro.');
  if (plan.excludedDates.some(date => !DateSchema.safeParse(date).success)) problems.push('Dias sem aula devem usar datas válidas.');
  if (plan.classHours !== undefined && !(plan.classHours >= 0.5 && plan.classHours <= 12)) problems.push('A carga horária por aula deve ficar entre 0,5 e 12 horas.');
  if (plan.assessments.some(a => !a.title.trim() || !DateSchema.safeParse(a.date).success)) problems.push('Toda avaliação precisa de título e data válida.');
  if (plan.assessments.some(a => (a.startTime || a.endTime) && (!TimeSchema.safeParse(a.startTime).success || !TimeSchema.safeParse(a.endTime).success || a.endTime! <= a.startTime!))) problems.push('Em avaliações com horário, o fim precisa ser depois do início.');
  if (!problems.length) {
    const inRange = expandSchedules([{ id: 'check', course: 'x', weekdays: plan.weekdays, startTime: plan.startTime, endTime: plan.endTime, sources: [] }], { timeZone: plan.timeZone, startDate: plan.startDate, endDate: plan.endDate, excludedDates: plan.excludedDates });
    if (!inRange.length) problems.push('Nenhuma aula cai nesse período e nesses dias da semana.');
  }
  return problems;
}

/** Converte o plano em horário semanal + eventos (aulas e avaliações). Lança Error com a primeira mensagem de validação. */
export function buildTeachingPlan(plan: TeachingPlan): { schedule: CourseSchedule; events: EventCandidate[] } {
  const problems = validateTeachingPlan(plan);
  if (problems.length) throw new Error(problems[0]);
  const course = plan.course.trim();
  const identity = hash(JSON.stringify([course, plan.courseCode, plan.group, plan.weekdays, plan.startTime, plan.endTime, plan.startDate, plan.endDate]));
  const source: SourceRef = { fileId: `plano-${identity}`, fileName: `Plano de ensino · ${course}`, method: 'plan', excerpt: `Plano montado na tela: ${course}${plan.courseCode ? ` (${plan.courseCode})` : ''}, ${plan.startTime}–${plan.endTime}, de ${plan.startDate} a ${plan.endDate}.` };
  const schedule = CourseScheduleSchema.parse({ id: `plano-${identity}`, course, courseCode: clean(plan.courseCode), group: clean(plan.group), weekdays: [...plan.weekdays].sort(), startTime: plan.startTime, endTime: plan.endTime, startDate: plan.startDate, endDate: plan.endDate, location: clean(plan.location), sources: [source] });
  const classes = expandSchedules([schedule], { timeZone: plan.timeZone, startDate: plan.startDate, endDate: plan.endDate, excludedDates: plan.excludedDates });
  const assessments: EventCandidate[] = plan.assessments.map(a => ({
    id: `plano-${identity}:${a.id}`, course, courseCode: clean(plan.courseCode), group: clean(plan.group), kind: a.kind, title: a.title.trim(),
    date: a.date, startTime: a.startTime || undefined, endTime: a.endTime || undefined, allDay: false, location: clean(plan.location),
    sources: [{ ...source, excerpt: `Avaliação cadastrada no plano: ${a.title.trim()} em ${a.date}.` }], issues: [], selected: true, reviewStatus: 'pending'
  }));
  return { schedule, events: reconcileEvents([...classes, ...assessments]) };
}
