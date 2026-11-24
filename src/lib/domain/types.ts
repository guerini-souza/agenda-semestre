import { z } from '../zodSetup'; // Zod já configurado sem eval (política de segurança do site)

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Data inválida');
export const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const TimeZoneSchema = z.string().refine(value => { try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }); return true; } catch { return false; } }, 'Fuso inválido');
export const ImportContextSchema = z.object({ year: z.number().int().min(1900).max(2200).optional(), semester: z.enum(['1', '2']).optional(), startDate: DateSchema.optional(), endDate: DateSchema.optional(), timeZone: TimeZoneSchema, excludedDates: z.array(DateSchema) });
export type ImportContext = z.infer<typeof ImportContextSchema>;
export const SourceRefSchema = z.object({ fileId: z.string(), fileName: z.string(), page: z.number().int().positive().optional(), sheet: z.string().optional(), cells: z.string().optional(), excerpt: z.string(), method: z.enum(['xlsx', 'pdf-text', 'ocr', 'manual', 'demo', 'plan']) });
export type SourceRef = z.infer<typeof SourceRefSchema>;
export const ReviewIssueSchema = z.object({ id: z.string(), field: z.string(), reason: z.string(), alternatives: z.array(z.string()).optional() });
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;
export const EventKindSchema = z.enum(['class', 'exam', 'presentation', 'assignment', 'other']);
export type EventKind = z.infer<typeof EventKindSchema>;
export const TimingSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('timed'), date: DateSchema, startTime: TimeSchema, endTime: TimeSchema }).refine(t => t.endTime > t.startTime, 'O fim precisa ser posterior ao início'),
  z.object({ mode: z.literal('allDay'), date: DateSchema })
]);
export type EventTiming = z.infer<typeof TimingSchema>;
export const EventCandidateSchema = z.object({
  id: z.string(), course: z.string(), courseCode: z.string().optional(), group: z.string().optional(), kind: EventKindSchema,
  title: z.string(), date: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), allDay: z.boolean().default(false),
  location: z.string().optional(), sources: z.array(SourceRefSchema), issues: z.array(ReviewIssueSchema),
  selected: z.boolean(), reviewStatus: z.enum(['pending', 'confirmed'])
});
export type EventCandidate = z.infer<typeof EventCandidateSchema>;
export const CourseScheduleSchema = z.object({ id: z.string(), course: z.string(), courseCode: z.string().optional(), group: z.string().optional(), weekdays: z.array(z.number().int().min(0).max(6)), startTime: TimeSchema, endTime: TimeSchema, startDate: DateSchema.optional(), endDate: DateSchema.optional(), location: z.string().optional(), sources: z.array(SourceRefSchema) });
export type CourseSchedule = z.infer<typeof CourseScheduleSchema>;
export const ConfirmedEventSchema = z.object({ id: z.string(), course: z.string().trim().min(1), courseCode: z.string().optional(), group: z.string().optional(), kind: EventKindSchema, title: z.string().trim().min(1), timing: TimingSchema, timeZone: TimeZoneSchema, location: z.string().optional(), sources: z.array(SourceRefSchema) });
export type ConfirmedEvent = z.infer<typeof ConfirmedEventSchema>;
export const FileResultSchema = z.object({ fileId: z.string(), fileName: z.string(), status: z.enum(['complete', 'partial', 'error', 'cancelled']), message: z.string(), pages: z.number().optional(), sources: z.array(SourceRefSchema) });
export type FileResult = z.infer<typeof FileResultSchema>;
export const ImportResultSchema = z.object({ events: z.array(EventCandidateSchema), schedules: z.array(CourseScheduleSchema), issues: z.array(ReviewIssueSchema), files: z.array(FileResultSchema) });
export type ImportResult = z.infer<typeof ImportResultSchema>;
export const ExportReportSchema = z.object({ created: z.array(z.string()), existing: z.array(z.string()), failed: z.array(z.object({ id: z.string(), message: z.string() })), calendarId: z.string().optional() });
export type ExportReport = z.infer<typeof ExportReportSchema>;
export type ImportOptions = { signal?: AbortSignal; onProgress?: (message: string) => void; pages?: number[]; forceOcr?: boolean };
/** Limites de um lote. `pages` é o total de páginas de PDF somadas entre todos os arquivos do lote. */
export const LIMITS = { files: 20, bytesPerFile: 10 * 1024 * 1024, pages: 150, events: 1500 } as const;
export const emptyResult = (): ImportResult => ({ events: [], schedules: [], issues: [], files: [] });
