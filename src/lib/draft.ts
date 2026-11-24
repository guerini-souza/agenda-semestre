import { z } from './zodSetup'; // Zod já configurado sem eval (política de segurança do site)
import type { PlanAssessment } from './domain/teaching';

export const DRAFT_KEY = 'semestre:draft:v1';
export const DRAFT_VERSION = 1;

/** Tudo o que o professor digita no formulário do plano. O fuso horário não entra: ele vem do aplicativo. */
export type PlanDraft = {
  course: string; courseCode: string; group: string; location: string;
  weekdays: number[]; startTime: string; endTime: string; startDate: string; endDate: string;
  excluded: string[]; excludedLabels: Record<string, string>;
  assessments: PlanAssessment[]; lessonContents: Record<string, string>;
  classHours: string; modality: string; institution: string; observation: string;
};

export const emptyPlanDraft = (): PlanDraft => ({
  course: '', courseCode: '', group: '', location: '', weekdays: [], startTime: '', endTime: '', startDate: '', endDate: '',
  excluded: [], excludedLabels: {}, assessments: [], lessonContents: {}, classHours: '', modality: '', institution: '', observation: ''
});

const text = (max = 20000) => z.string().max(max);
const textMap = z.record(z.string().max(40), text(2000));
const AssessmentSchema = z.object({
  id: z.string().min(1).max(40), title: text(500), kind: z.enum(['exam', 'assignment', 'presentation', 'other']), date: text(40),
  startTime: text(10).optional(), endTime: text(10).optional()
});
const DraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  form: z.object({
    course: text(500), courseCode: text(200), group: text(200), location: text(500),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    startTime: text(10), endTime: text(10), startDate: text(10), endDate: text(10),
    excluded: z.array(text(10)).max(400), excludedLabels: textMap,
    assessments: z.array(AssessmentSchema).max(200), lessonContents: textMap,
    classHours: text(20), modality: text(500), institution: text(2000), observation: text()
  })
});

/** Verdadeiro quando o formulário está igual ao vazio: nesse caso não há o que guardar. */
export function isDraftEmpty(draft: PlanDraft): boolean {
  return JSON.stringify(draft) === JSON.stringify(emptyPlanDraft());
}

/** Lê o rascunho salvo. Devolve `undefined` se não houver, se estiver corrompido, se for de outra versão ou se o armazenamento não estiver disponível. */
export function loadDraft(): PlanDraft | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return undefined;
    const parsed = DraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return undefined;
    const draft = parsed.data.form as PlanDraft;
    return isDraftEmpty(draft) ? undefined : draft;
  } catch { return undefined; }
}

/** Grava o rascunho (ou apaga a chave, se o formulário estiver vazio). Devolve `true` se o estado salvo ficou em dia. */
export function saveDraft(draft: PlanDraft): boolean {
  try {
    if (isDraftEmpty(draft)) { localStorage.removeItem(DRAFT_KEY); return false; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, form: draft }));
    return true;
  } catch { return false; }
}

export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* sem armazenamento, não há rascunho para apagar */ }
}
