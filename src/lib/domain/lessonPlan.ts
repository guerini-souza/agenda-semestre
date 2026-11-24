import { buildTeachingPlan } from './teaching';
import type { TeachingPlan } from './teaching';

export type LessonRow = { date: string; dateLabel: string; hours: number | null; content: string; kind: 'class' | 'break' | 'assessment' };
export type LessonPlanDocument = {
  institution: string[]; title: string; notice: string; fields: { label: string; value: string }[];
  rows: LessonRow[]; monthTotals: { label: string; rowIndex: number }[]; totalHours: number; observation?: string;
};

/** Aviso impresso no topo do PDF: o documento é de apoio e não substitui o oficial. */
export const LESSON_PLAN_NOTICE = 'Gerado pelo Semestre. Não substitui o plano de aula oficial do sistema acadêmico.';
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayName = (day: number) => day === 0 ? 'Domingo' : `${day + 1}ª Feira`;
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const hhmm = (time: string) => time.replace(':', 'h');
const decimal = (value: number) => String(value).replace('.', ',');
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const slug = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Horas de cada aula: o valor informado ou a duração do horário arredondada, nunca menos de 1. */
export function hoursPerClass(plan: Pick<TeachingPlan, 'classHours' | 'startTime' | 'endTime'>): number {
  return plan.classHours ?? Math.max(1, Math.round((minutes(plan.endTime) - minutes(plan.startTime)) / 60));
}

/** Converte o plano no conteúdo do PDF "Plano de aula". Lança Error (em português) se o plano for inválido. */
export function buildLessonPlanDocument(plan: TeachingPlan): LessonPlanDocument {
  const { events } = buildTeachingPlan(plan);
  const hours = hoursPerClass(plan);
  const classDates = new Set(events.filter(e => e.kind === 'class').map(e => e.date!));
  const breaks = new Map<string, string>();
  for (const date of plan.excludedDates) {
    if (date >= plan.startDate && date <= plan.endDate && plan.weekdays.includes(weekdayOf(date))) breaks.set(date, plan.excludedLabels?.[date]?.trim() || 'Feriado');
  }
  const titles = new Map<string, string[]>();
  for (const a of plan.assessments) titles.set(a.date, [...(titles.get(a.date) ?? []), a.title.trim()]);
  const dates = [...new Set([...classDates, ...breaks.keys(), ...titles.keys()])].sort();
  const rows: LessonRow[] = dates.map(date => {
    const kind = classDates.has(date) ? 'class' : breaks.has(date) ? 'break' : 'assessment';
    const content = [kind === 'break' ? breaks.get(date) : undefined, ...(titles.get(date) ?? []), kind === 'break' ? undefined : plan.lessonContents?.[date]?.trim()].filter(Boolean).join('; ');
    return { date, dateLabel: `${date.slice(8, 10)}/${date.slice(5, 7)}`, hours: kind === 'class' ? hours : null, content, kind };
  });
  const totals = new Map<string, { sum: number; last: number }>();
  rows.forEach((row, index) => { const key = row.date.slice(0, 7); totals.set(key, { sum: (totals.get(key)?.sum ?? 0) + (row.hours ?? 0), last: index }); });
  const monthTotals = [...totals.entries()].filter(([, v]) => v.sum > 0).map(([key, v]) => ({ label: `${MONTHS[Number(key.slice(5)) - 1]} = ${decimal(v.sum)}`, rowIndex: v.last }));
  const totalHours = rows.reduce((sum, row) => sum + (row.hours ?? 0), 0);
  const days = DISPLAY_ORDER.filter(day => plan.weekdays.includes(day)).map(day => `${weekdayName(day)} (${hhmm(plan.startTime)} / ${hhmm(plan.endTime)})`).join(' & ');
  const room = plan.location?.trim();
  const code = plan.courseCode?.trim();
  const group = plan.group?.trim();
  const observation = plan.observation?.trim();
  const modality = plan.modality?.trim();
  return {
    institution: (plan.institution ?? '').split('\n').map(line => line.trim()).filter(Boolean).slice(0, 3),
    title: 'PLANO DE AULA · DOCUMENTO DE APOIO',
    notice: LESSON_PLAN_NOTICE,
    fields: [
      { label: 'TURMA/UNIDADE CURRICULAR', value: `${group ? `${group} – ` : ''}${plan.course.trim()}${code ? ` (${code})` : ''}` },
      { label: 'ANO/SEMESTRE', value: `${plan.startDate.slice(0, 4)} / ${Number(plan.startDate.slice(5, 7)) <= 6 ? 1 : 2}` },
      { label: 'DIA/HORÁRIO/SALA', value: `${days}${room ? ` – ${room}` : ''}` },
      { label: 'CARGA HORÁRIA', value: `${decimal(totalHours)}h` },
      ...(modality ? [{ label: 'MODALIDADE', value: modality }] : [])
    ],
    rows, monthTotals, totalHours, ...(observation ? { observation } : {})
  };
}

export function lessonPlanFileName(plan: Pick<TeachingPlan, 'course' | 'courseCode'>): string {
  const code = plan.courseCode?.trim() ? slug(plan.courseCode).toUpperCase() : '';
  return `plano-de-aula-${[code, slug(plan.course)].filter(Boolean).join('-') || 'disciplina'}.pdf`;
}
