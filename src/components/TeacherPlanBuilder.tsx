import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarPlus, FileDown, LoaderCircle, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { buildTeachingPlan, validateTeachingPlan } from '../lib/domain/teaching';
import type { PlanAssessment, TeachingPlan } from '../lib/domain/teaching';
import { hoursPerClass } from '../lib/domain/lessonPlan';
import { holidaysInPeriod } from '../lib/domain/holidays';
import { DateSchema } from '../lib/domain/types';
import type { EventKind } from '../lib/domain/types';
import { clearDraft, emptyPlanDraft, isDraftEmpty, loadDraft, saveDraft } from '../lib/draft';
import type { PlanDraft } from '../lib/draft';
import { LessonContentEditor } from './LessonContentEditor';
import { Button } from './ui/button';

const days: Array<[number, string, string]> = [[1, 'Seg', 'Segunda-feira'], [2, 'Ter', 'Terça-feira'], [3, 'Qua', 'Quarta-feira'], [4, 'Qui', 'Quinta-feira'], [5, 'Sex', 'Sexta-feira'], [6, 'Sáb', 'Sábado'], [0, 'Dom', 'Domingo']];
const kinds: Array<[Exclude<EventKind, 'class'>, string]> = [['exam', 'Prova'], ['assignment', 'Entrega'], ['presentation', 'Apresentação'], ['other', 'Outro']];
const br = (date: string) => date.split('-').reverse().join('/');
const newId = () => crypto.randomUUID().slice(0, 8);
const breakReasons = ['Feriado', 'Semana Pedagógica', 'Recesso'];
const timeOk = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const exampleTopics = ['Apresentação da disciplina | Plano de aulas | Sistema de avaliação', 'Conceitos fundamentais da área', 'O papel do profissional no mercado', 'Estudo dirigido 1', 'Métodos e ferramentas de projeto', 'Exercício de fixação 1'];

export function TeacherPlanBuilder({ timeZone, onSubmit, disabled }: { timeZone: string; onSubmit: (plan: TeachingPlan) => void; disabled?: boolean }) {
  const [stored] = useState(loadDraft); const init = stored ?? emptyPlanDraft();
  const [course, setCourse] = useState(init.course); const [courseCode, setCourseCode] = useState(init.courseCode); const [group, setGroup] = useState(init.group); const [location, setLocation] = useState(init.location);
  const [weekdays, setWeekdays] = useState<number[]>(init.weekdays); const [startTime, setStartTime] = useState(init.startTime); const [endTime, setEndTime] = useState(init.endTime);
  const [startDate, setStartDate] = useState(init.startDate); const [endDate, setEndDate] = useState(init.endDate);
  const [excluded, setExcluded] = useState<string[]>(init.excluded); const [excludedDraft, setExcludedDraft] = useState('');
  const [assessments, setAssessments] = useState<PlanAssessment[]>(init.assessments);
  const [attempted, setAttempted] = useState(false);
  const [excludedLabels, setExcludedLabels] = useState<Record<string, string>>(init.excludedLabels);
  const [lessonContents, setLessonContents] = useState<Record<string, string>>(init.lessonContents);
  const [classHours, setClassHours] = useState(init.classHours); const [modality, setModality] = useState(init.modality); const [institution, setInstitution] = useState(init.institution); const [observation, setObservation] = useState(init.observation);
  const [pdfBusy, setPdfBusy] = useState(false); const [pdfError, setPdfError] = useState('');
  const [holidayNotice, setHolidayNotice] = useState('');
  const [draftSaved, setDraftSaved] = useState(stored !== undefined); const [confirmingClear, setConfirmingClear] = useState(false);
  const errors = useRef<HTMLUListElement>(null);
  const plan: TeachingPlan = useMemo(() => ({ course, courseCode, group, location, weekdays, startTime, endTime, startDate, endDate, excludedDates: excluded, timeZone, assessments, lessonContents, excludedLabels, classHours: classHours.trim() ? Number(classHours.replace(',', '.')) : undefined, modality, institution, observation }), [course, courseCode, group, location, weekdays, startTime, endTime, startDate, endDate, excluded, timeZone, assessments, lessonContents, excludedLabels, classHours, modality, institution, observation]);
  const problems = useMemo(() => validateTeachingPlan(plan), [plan]);
  const draft: PlanDraft = useMemo(() => ({ course, courseCode, group, location, weekdays, startTime, endTime, startDate, endDate, excluded, excludedLabels, assessments, lessonContents, classHours, modality, institution, observation }), [course, courseCode, group, location, weekdays, startTime, endTime, startDate, endDate, excluded, excludedLabels, assessments, lessonContents, classHours, modality, institution, observation]);
  const latestDraft = useRef(draft);
  const courseInput = useRef<HTMLInputElement>(null); const clearButton = useRef<HTMLButtonElement>(null);
  // Gravação adiada: só grava quando o professor para de digitar por um instante.
  useEffect(() => { latestDraft.current = draft; const timer = setTimeout(() => setDraftSaved(saveDraft(draft)), 400); return () => clearTimeout(timer); }, [draft]);
  // Ao sair da tela (conferência, recarregar, fechar a aba) grava na hora o que ainda estava pendente.
  useEffect(() => {
    const flush = () => { saveDraft(latestDraft.current); };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  const preview = useMemo(() => { if (problems.length) return undefined; const { events } = buildTeachingPlan(plan); const classDates = events.filter(e => e.kind === 'class').map(e => e.date!); return { classes: classDates.length, classDates, others: events.length - classDates.length }; }, [plan, problems]);
  const hoursHint = timeOk(startTime) && timeOk(endTime) && endTime > startTime ? hoursPerClass({ startTime, endTime }) : undefined;
  const toggleDay = (day: number) => setWeekdays(current => current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort());
  const patchAssessment = (id: string, changes: Partial<PlanAssessment>) => setAssessments(current => current.map(a => a.id === id ? { ...a, ...changes } : a));
  const canAddHolidays = weekdays.length > 0 && DateSchema.safeParse(startDate).success && DateSchema.safeParse(endDate).success && endDate >= startDate;
  function addNationalHolidays() {
    const fresh = holidaysInPeriod(startDate, endDate, weekdays).filter(h => !excluded.includes(h.date));
    if (!fresh.length) { setHolidayNotice('Nenhum feriado nacional novo cai nos dias de aula deste período. Confira e inclua os feriados estaduais e municipais da sua cidade.'); return; }
    setExcluded([...new Set([...excluded, ...fresh.map(h => h.date)])].sort());
    setExcludedLabels(current => ({ ...current, ...Object.fromEntries(fresh.map(h => [h.date, 'Feriado'])) }));
    setHolidayNotice('Feriados nacionais adicionados. Confira e inclua os feriados estaduais e municipais da sua cidade.');
  }
  function addExcluded() { if (excludedDraft && !excluded.includes(excludedDraft)) setExcluded([...excluded, excludedDraft].sort()); setExcludedDraft(''); }
  const setContent = (date: string, text: string) => setLessonContents(current => ({ ...current, [date]: text }));
  async function downloadPdf() {
    if (problems.length) { setAttempted(true); requestAnimationFrame(() => errors.current?.focus()); return; }
    setPdfBusy(true); setPdfError('');
    try { const { downloadLessonPlanPdf } = await import('../lib/pdf/lessonPlanPdf'); await downloadLessonPlanPdf(plan); }
    catch (e) { setPdfError(e instanceof Error ? e.message : 'Não foi possível gerar o PDF. Tente novamente.'); }
    finally { setPdfBusy(false); }
  }
  function fillExample() {
    setCourse('Introdução à Engenharia (exemplo)'); setCourseCode('EXE101'); setGroup('A'); setLocation('Sala exemplo 3');
    setWeekdays([2, 4]); setStartTime('19:00'); setEndTime('20:40'); setStartDate('2026-08-04'); setEndDate('2026-12-10'); setExcluded(['2026-09-08', '2026-10-15', '2026-11-12']);
    const exampleAssessments: PlanAssessment[] = [{ id: newId(), title: 'Prova 1 — exemplo', kind: 'exam', date: '2026-09-22' }, { id: newId(), title: 'Entrega do trabalho — exemplo', kind: 'assignment', date: '2026-10-27' }, { id: newId(), title: 'Prova final — exemplo', kind: 'exam', date: '2026-12-08', startTime: '19:00', endTime: '20:40' }];
    setAssessments(exampleAssessments);
    setExcludedLabels({ '2026-09-08': 'Semana Pedagógica' });
    const example = buildTeachingPlan({ course: 'x', weekdays: [2, 4], startTime: '19:00', endTime: '20:40', startDate: '2026-08-04', endDate: '2026-12-10', excludedDates: ['2026-09-08', '2026-10-15', '2026-11-12'], timeZone, assessments: [] });
    const dates = example.events.filter(e => e.kind === 'class').map(e => e.date!);
    setLessonContents(Object.fromEntries(exampleTopics.map((topic, i) => [dates[i], topic])));
    setClassHours(''); setModality(''); setInstitution(''); setObservation('As avaliações podem ser alteradas pelo docente e serão comunicadas previamente à turma.');
    setAttempted(false); setPdfError('');
  }
  function resetForm() {
    const empty = emptyPlanDraft();
    setCourse(empty.course); setCourseCode(empty.courseCode); setGroup(empty.group); setLocation(empty.location);
    setWeekdays(empty.weekdays); setStartTime(empty.startTime); setEndTime(empty.endTime); setStartDate(empty.startDate); setEndDate(empty.endDate);
    setExcluded(empty.excluded); setExcludedDraft(''); setExcludedLabels(empty.excludedLabels); setAssessments(empty.assessments); setLessonContents(empty.lessonContents);
    setClassHours(empty.classHours); setModality(empty.modality); setInstitution(empty.institution); setObservation(empty.observation);
    setAttempted(false); setPdfError('');
    latestDraft.current = empty; clearDraft(); setDraftSaved(false); setConfirmingClear(false);
    requestAnimationFrame(() => courseInput.current?.focus());
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problems.length) { setAttempted(true); requestAnimationFrame(() => errors.current?.focus()); return; }
    onSubmit(plan);
  }
  return <form className="panel builder" onSubmit={submit} noValidate aria-labelledby="builder-title">
    <div className="section-heading"><h2 id="builder-title">Monte o plano da disciplina.</h2><p>Informe quando a turma tem aula e as avaliações. O Semestre cria cada aula na data certa.</p></div>
    <fieldset className="fieldset"><legend>Disciplina</legend>
      <div className="field-grid">
        <label className="field-wide">Nome da disciplina<input ref={courseInput} value={course} onChange={e => setCourse(e.target.value)} placeholder="Ex.: Cálculo I" autoComplete="off" /></label>
        <label>Código<input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="Ex.: MAT101" autoComplete="off" /></label>
        <label>Turma<input value={group} onChange={e => setGroup(e.target.value)} placeholder="Ex.: A" autoComplete="off" /></label>
        <label className="field-wide">Sala ou local<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex.: Bloco B, sala 113" autoComplete="off" /></label>
      </div>
    </fieldset>
    <fieldset className="fieldset"><legend>Quando tem aula</legend>
      <div className="day-picker" role="group" aria-label="Dias da semana">{days.map(([value, short, full]) => <button key={value} type="button" className="day-chip" aria-pressed={weekdays.includes(value)} aria-label={full} onClick={() => toggleDay(value)}>{short}</button>)}</div>
      <div className="field-grid">
        <label>Início da aula<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></label>
        <label>Fim da aula<input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
        <label>Primeiro dia de aulas<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label>Último dia de aulas<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
      </div>
      <div className="excluded">
        <div className="excluded-add"><label>Dias sem aula (feriados, recessos)<input type="date" value={excludedDraft} onChange={e => setExcludedDraft(e.target.value)} /></label><Button type="button" variant="secondary" onClick={addExcluded} disabled={!excludedDraft}><Plus size={16} />Adicionar dia</Button></div>
        <div className="holiday-row"><Button type="button" variant="secondary" onClick={addNationalHolidays} disabled={!canAddHolidays} aria-describedby={canAddHolidays ? undefined : 'holiday-hint'}><CalendarDays size={16} />Adicionar feriados nacionais do período</Button>{!canAddHolidays && <small id="holiday-hint" className="muted">Escolha os dias da semana e as datas do primeiro e do último dia de aulas.</small>}</div>
        {holidayNotice && <p className="notice neutral" role="status">{holidayNotice}</p>}
        {excluded.length > 0 ? <ul className="tags" aria-label="Dias sem aula">{excluded.map(date => <li key={date}>{br(date)}<select aria-label={`Motivo de ${br(date)}`} value={excludedLabels[date] ?? 'Feriado'} onChange={e => setExcludedLabels({ ...excludedLabels, [date]: e.target.value })}>{breakReasons.map(reason => <option key={reason}>{reason}</option>)}</select><button type="button" aria-label={`Remover ${br(date)}`} onClick={() => setExcluded(excluded.filter(d => d !== date))}><X size={14} /></button></li>)}</ul> : <p className="muted">Feriados e recessos não são presumidos. Adicione os que valem para a sua turma.</p>}
      </div>
    </fieldset>
    <LessonContentEditor dates={preview?.classDates ?? []} value={lessonContents} onChange={setContent} />
    <fieldset className="fieldset"><legend>Avaliações e prazos</legend>
      <p className="muted">Provas, entregas e apresentações aparecem na agenda como eventos. O horário é opcional: sem ele, o evento fica como dia inteiro.</p>
      <ul className="assessments">{assessments.map((a, index) => <li key={a.id} className="assessment">
        <label>Título<input value={a.title} onChange={e => patchAssessment(a.id, { title: e.target.value })} placeholder={`Avaliação ${index + 1}`} /></label>
        <label>Tipo<select value={a.kind} onChange={e => patchAssessment(a.id, { kind: e.target.value as PlanAssessment['kind'] })}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Data<input type="date" value={a.date} onChange={e => patchAssessment(a.id, { date: e.target.value })} /></label>
        <label>Início<input type="time" value={a.startTime ?? ''} onChange={e => patchAssessment(a.id, { startTime: e.target.value || undefined })} /></label>
        <label>Fim<input type="time" value={a.endTime ?? ''} onChange={e => patchAssessment(a.id, { endTime: e.target.value || undefined })} /></label>
        <Button type="button" variant="ghost" className="icon-button" aria-label={`Remover ${a.title || `avaliação ${index + 1}`}`} onClick={() => setAssessments(assessments.filter(x => x.id !== a.id))}><Trash2 size={18} /></Button>
      </li>)}</ul>
      <Button type="button" variant="secondary" onClick={() => setAssessments([...assessments, { id: newId(), title: '', kind: 'exam', date: '' }])}><Plus size={16} />Adicionar avaliação</Button>
    </fieldset>
    <fieldset className="fieldset"><legend>Plano de aula em PDF (documento de apoio)</legend>
      <p className="muted">Gera um plano de aula de apoio, organizado como o modelo (turma, ano/semestre, dia/horário/sala, carga horária e tabela de datas), mas identificado como gerado pelo Semestre. <strong>Ele não substitui o documento oficial</strong>, que continua sendo feito no sistema acadêmico. Os campos abaixo são opcionais.</p>
      <div className="field-grid">
        <label>Modalidade<input value={modality} onChange={e => setModality(e.target.value)} placeholder="Ensino Presencial" autoComplete="off" /></label>
        <label>Horas por aula<input inputMode="decimal" value={classHours} onChange={e => setClassHours(e.target.value)} placeholder={hoursHint ? `Automático: ${hoursHint}` : 'Automático'} autoComplete="off" /><small>A carga horária total é a soma das aulas.</small></label>
        <label className="field-wide">Cabeçalho do documento<textarea rows={2} value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Nome da instituição, curso ou setor (até 3 linhas)" /><small>Fica no topo do PDF. Preencha com os dados da sua instituição; o Semestre não coloca nenhum nome por conta própria.</small></label>
        <label className="field-wide">Observação (OBS)<textarea rows={2} value={observation} onChange={e => setObservation(e.target.value)} placeholder="Ex.: As atividades dos dias 27/11 e 02/12 contam na frequência." /></label>
      </div>
    </fieldset>
    {attempted && problems.length > 0 && <ul className="notice warning form-errors" role="alert" tabIndex={-1} ref={errors}>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
    <div className="builder-actions">
      <Button type="submit" disabled={disabled}><CalendarPlus size={18} />Gerar aulas e conferir</Button>
      <Button type="button" variant="secondary" onClick={() => void downloadPdf()} disabled={disabled || pdfBusy}>{pdfBusy ? <><LoaderCircle className="spin" size={17} />Gerando PDF…</> : <><FileDown size={17} />Baixar plano de aula (PDF)</>}</Button>
      <Button type="button" variant="ghost" onClick={fillExample} disabled={disabled}><Sparkles size={16} />Preencher com um exemplo</Button>
      <p className="builder-preview" role="status">{preview ? `Serão criadas ${preview.classes} ${preview.classes === 1 ? 'aula' : 'aulas'}${preview.others ? ` e ${preview.others} ${preview.others === 1 ? 'avaliação' : 'avaliações'}` : ''}.` : 'Preencha os campos para ver quantas aulas serão criadas.'}</p>
      {pdfError && <p className="notice warning" role="alert">{pdfError}</p>}
    </div>
    {(draftSaved || !isDraftEmpty(draft)) && <div className="draft-row">
      {draftSaved && <p className="draft-note" role="status">Rascunho salvo neste navegador</p>}
      {confirmingClear
        ? <span className="draft-confirm" role="group" aria-label="Confirmar limpeza do rascunho"><span>Apagar tudo o que foi preenchido?</span><Button type="button" variant="secondary" onClick={resetForm}>Sim, limpar</Button><Button type="button" variant="ghost" autoFocus onClick={() => { setConfirmingClear(false); requestAnimationFrame(() => clearButton.current?.focus()); }}>Cancelar</Button></span>
        : <Button type="button" variant="ghost" ref={clearButton} onClick={() => setConfirmingClear(true)}>Limpar rascunho</Button>}
    </div>}
  </form>;
}
