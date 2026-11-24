import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, ShieldCheck, X } from 'lucide-react';
import { importFiles } from './lib/import';
import { getDemoResult } from './lib/import/demo';
import { confirmEvents, prepareSchedules, reconcileEvents } from './lib/domain/calendar';
import { buildTeachingPlan } from './lib/domain/teaching';
import type { TeachingPlan } from './lib/domain/teaching';
import { ImportContextSchema, LIMITS, emptyResult } from './lib/domain/types';
import type { ConfirmedEvent, EventCandidate, ImportContext, ImportResult, SourceRef } from './lib/domain/types';
import { loadRole, roleCopy, saveRole } from './lib/role';
import type { Role } from './lib/role';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { ExportStep } from './components/ExportStep';
import { RoleGate } from './components/RoleGate';
import { TeacherPlanBuilder } from './components/TeacherPlanBuilder';
import { StudentScene, TeacherScene } from './components/Illustrations';
import { Button } from './components/ui/button';

const initialContext: ImportContext = { timeZone: 'America/Sao_Paulo', excludedDates: [] };
function cleanContext(context: ImportContext): ImportContext {
  const parsed = ImportContextSchema.safeParse({ ...context, excludedDates: context.excludedDates.map(v => v.trim()).filter(Boolean) });
  if (!parsed.success) throw new Error('Confira o ano, as datas e o fuso do período letivo. Dias sem aula devem usar AAAA-MM-DD.');
  if (parsed.data.startDate && parsed.data.endDate && parsed.data.endDate < parsed.data.startDate) throw new Error('O último dia de aulas precisa ser igual ou posterior ao primeiro.');
  return parsed.data;
}
function parsePages(value: string): number[] | undefined {
  if (!value.trim()) return undefined;
  const pages = new Set<number>();
  for (const raw of value.split(',')) {
    const match = raw.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Informe páginas como 2, 4-6, ou deixe o campo vazio para ler todas.');
    const first = Number(match[1]); const last = Number(match[2] || first);
    if (first < 1 || last < first || last > 10000 || last - first >= LIMITS.pages) throw new Error(`Confira a seleção de páginas. Use números positivos e no máximo ${LIMITS.pages} páginas por lote.`);
    for (let page = first; page <= last; page++) pages.add(page);
  }
  if (pages.size > LIMITS.pages) throw new Error(`Selecione no máximo ${LIMITS.pages} páginas por lote.`);
  return [...pages].sort((a, b) => a - b);
}
function mergeResult(previous: ImportResult, next: ImportResult): ImportResult {
  return { events: [...previous.events, ...next.events], schedules: [...new Map([...previous.schedules, ...next.schedules].map(s => [s.id, s])).values()], issues: [...new Map([...previous.issues, ...next.issues].map(i => [i.id, i])).values()], files: [...new Map([...previous.files, ...next.files].map(file => [file.fileId, file])).values()] };
}

export default function App() {
  const [role, setRole] = useState<Role | undefined>(loadRole);
  const [teacherTab, setTeacherTab] = useState<'build' | 'import'>('build');
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ImportResult>(emptyResult);
  const [candidates, setCandidates] = useState<EventCandidate[]>([]);
  const [context, setContext] = useState<ImportContext>(initialContext);
  const [scope, setScope] = useState<'all' | 'assessments'>('all');
  const [confirmed, setConfirmed] = useState<ConfirmedEvent[]>([]);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [demo, setDemo] = useState(false);
  const [forceOcr, setForceOcr] = useState(false);
  const [pages, setPages] = useState('');
  const [pendingSchedules, setPendingSchedules] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const generatedIds = useRef(new Set<string>());
  const explicitPeriod = useRef(false);
  const main = useRef<HTMLElement>(null);
  const events = useMemo(() => reconcileEvents(candidates.map(e => ({ ...e, selected: e.selected && (scope === 'all' || e.kind !== 'class') }))), [candidates, scope]);
  useEffect(() => { main.current?.focus({ preventScroll: true }); }, [step]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { document.documentElement.dataset.role = role ?? 'none'; }, [role]);
  function chooseRole(next: Role) { setRole(next); saveRole(next); setError(''); setNotice(''); }
  function buildPlan(plan: TeachingPlan) {
    if (reading) return;
    setError(''); setNotice('');
    try {
      const built = buildTeachingPlan(plan);
      const base = demo ? emptyResult() : result;
      const current = demo ? [] : candidates;
      const combined = mergeResult(base, { events: [], schedules: [built.schedule], issues: [], files: [{ fileId: built.schedule.id, fileName: built.schedule.sources[0].fileName, status: 'complete', message: `${built.events.length} eventos gerados pelo plano montado na tela.`, sources: [] }] });
      // Eventos que já existem (e talvez foram corrigidos) têm prioridade sobre os recém-gerados.
      const merged = reconcileEvents([...new Map([...built.events, ...current].map(e => [e.id, e])).values()]);
      if (merged.length > LIMITS.events) throw new Error('O plano excede 1.500 eventos. Reduza o período ou use menos disciplinas.');
      const starts = combined.schedules.flatMap(s => s.startDate ? [s.startDate] : []).sort();
      const ends = combined.schedules.flatMap(s => s.endDate ? [s.endDate] : []).sort();
      const baseContext = demo ? initialContext : context;
      if (demo) generatedIds.current = new Set();
      built.events.filter(e => e.kind === 'class').forEach(e => generatedIds.current.add(e.id));
      setResult(combined); setCandidates(merged);
      setContext({ ...baseContext, timeZone: plan.timeZone, startDate: starts[0], endDate: ends.at(-1), excludedDates: [...new Set([...baseContext.excludedDates, ...plan.excludedDates])].sort() });
      explicitPeriod.current = false; setDemo(false); setStep(1);
      setNotice(`Plano de ${built.schedule.course} criado: ${built.events.filter(e => e.kind === 'class').length} aulas e ${built.events.filter(e => e.kind !== 'class').length} avaliações. Confira e adicione à agenda, ou monte outra disciplina.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível montar o plano.'); }
  }

  function addFiles(incoming: File[]) {
    setError('');
    const accepted: File[] = [...files]; const errors: string[] = [];
    for (const file of incoming) {
      if (!/\.(pdf|xlsx|xls)$/i.test(file.name)) { errors.push(`${file.name}: use um PDF, XLS ou XLSX.`); continue; }
      if (file.size > LIMITS.bytesPerFile) { errors.push(`${file.name}: o limite por arquivo é 10 MB.`); continue; }
      if (!file.size) { errors.push(`${file.name}: o arquivo está vazio.`); continue; }
      if (accepted.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) continue;
      if (accepted.length >= LIMITS.files) { errors.push(`Você pode selecionar até ${LIMITS.files} arquivos por lote.`); break; }
      accepted.push(file);
    }
    setFiles(accepted); setError(errors.join(' '));
  }
  async function readFiles(onlyFiles?: File[]) {
    if (reading) return;
    setError(''); setNotice('');
    let validContext: ImportContext; let selectedPages: number[] | undefined;
    try { validContext = cleanContext(context); selectedPages = parsePages(pages); } catch (e) { setError((e as Error).message); return; }
    const selectedFiles = onlyFiles ?? files;
    if (!selectedFiles.length) return;
    controller.current = new AbortController(); setReading(true); setProgress('Preparando leitura local…');
    try {
      const next = await importFiles(selectedFiles, validContext, { signal: controller.current.signal, onProgress: setProgress, forceOcr, pages: selectedPages });
      const previous = demo ? emptyResult() : result;
      const combined = mergeResult(previous, next);
      const current = demo ? [] : candidates;
      const scheduleContext = explicitPeriod.current && !demo ? validContext : { ...validContext, startDate: undefined, endDate: undefined };
      const prepared = prepareSchedules(combined.schedules, scheduleContext);
      const existing = new Map(current.map(event => [event.id, event]));
      const generated = prepared.events.map(event => {
        const edited = existing.get(event.id);
        return edited ? { ...edited, issues: edited.issues.filter(issue => issue.field !== 'period') } : event;
      });
      // Existing candidates take precedence so another reading never erases a correction.
      const merged = reconcileEvents([...new Map([...next.events, ...current.filter(event => !generatedIds.current.has(event.id)), ...generated].map(e => [e.id, e])).values()]);
      if (merged.length > LIMITS.events) throw new Error('A leitura excedeu 1.500 eventos. Divida os documentos em lotes menores.');
      setResult(combined);
      setCandidates(merged);
      generatedIds.current = new Set(prepared.events.map(event => event.id));
      setPendingSchedules(prepared.pending.length);
      if (demo) explicitPeriod.current = false;
      setDemo(false); setStep(1);
      if (combined.schedules.length) {
        const starts = combined.schedules.flatMap(s => s.startDate ? [s.startDate] : []).sort();
        const ends = combined.schedules.flatMap(s => s.endDate ? [s.endDate] : []).sort();
        setContext({ ...validContext, startDate: scheduleContext.startDate || starts[0], endDate: scheduleContext.endDate || ends.at(-1) });
        setNotice(`${prepared.events.length} aulas adicionadas à seleção a partir da planilha.${prepared.pending.length ? ` Falta informar o período de ${prepared.pending.length} horário(s) semanal(is).` : ' Os horários e períodos de cada disciplina foram respeitados.'} Feriados e recessos só são excluídos se informados.`);
      }
      if (next.files.some(f => f.status === 'cancelled')) setNotice('Leitura cancelada. Os resultados concluídos continuam disponíveis para revisão.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ler o lote. Tente novamente com um arquivo por vez.'); }
    finally { setReading(false); controller.current = null; }
  }
  function loadDemo() {
    const example = getDemoResult();
    const prepared = prepareSchedules(example.schedules, initialContext);
    const starts = example.schedules.flatMap(schedule => schedule.startDate ? [schedule.startDate] : []).sort();
    const ends = example.schedules.flatMap(schedule => schedule.endDate ? [schedule.endDate] : []).sort();
    setContext({ ...initialContext, startDate: starts[0], endDate: ends.at(-1) });
    setResult(example); setCandidates(reconcileEvents([...example.events, ...prepared.events])); setDemo(true); setStep(1); setError(''); setNotice('Exemplo sintético: confira e edite livremente. As disciplinas e datas não representam um semestre real da UNIFAL.'); setScope('all'); generatedIds.current = new Set(prepared.events.map(event => event.id)); explicitPeriod.current = false; setPendingSchedules(prepared.pending.length);
  }
  function manual(source?: SourceRef) {
    if (reading) { setError('Aguarde o fim da leitura ou cancele antes de criar outro evento.'); return; }
    if (candidates.length >= LIMITS.events) { setError('O limite é de 1.500 eventos. Remova eventos antes de criar mais.'); return; }
    const id = `manual-${crypto.randomUUID()}`;
    setCandidates(current => [{ id, course: '', kind: 'exam', title: '', allDay: false, sources: source ? [source] : [{ fileId: id, fileName: 'Preenchimento manual', method: 'manual', excerpt: 'Evento criado pelo aluno.' }], issues: [{ id: `${id}-missing`, field: 'date', reason: 'Preencha a disciplina, o título e a data. Confirme o horário ou escolha dia inteiro.' }], selected: true, reviewStatus: 'pending' }, ...current]);
    setStep(1); setError(''); setNotice('Evento manual criado. Preencha a disciplina, o título e a data.');
  }
  function changeEvent(event: EventCandidate) {
    setCandidates(current => reconcileEvents(current.map(e => e.id === event.id ? event : e))); setError('');
  }
  function expand() {
    setError(''); setNotice('');
    try {
      const validContext = cleanContext(context);
      if (!validContext.startDate || !validContext.endDate) throw new Error('Informe o primeiro e o último dia de aulas antes de gerar as ocorrências.');
      const prepared = prepareSchedules(result.schedules, validContext);
      const expanded = prepared.events;
      const preserved = candidates.filter(e => !generatedIds.current.has(e.id));
      const existing = new Map(candidates.map(e => [e.id, e]));
      const combined = reconcileEvents([...preserved, ...expanded.map(e => {
        const previous = existing.get(e.id);
        return previous ? { ...previous, issues: previous.issues.filter(issue => issue.field !== 'period') } : e;
      })]);
      if (combined.length > LIMITS.events) throw new Error('Esse período excede o limite de 1.500 eventos. Reduza o intervalo ou use menos arquivos.');
      generatedIds.current = new Set(expanded.map(e => e.id));
      setPendingSchedules(prepared.pending.length);
      explicitPeriod.current = true;
      setCandidates(combined); setContext(validContext); setNotice(`${expanded.length} ocorrências de aulas geradas para o período informado.`);
    } catch (e) { setError((e as Error).message); }
  }
  function next() {
    try {
      if (scope === 'all' && pendingSchedules) throw new Error('Complete o período das aulas e clique em “Atualizar aulas” para incluir todos os horários da planilha.');
      const selection = confirmEvents(events, cleanContext(context)); setConfirmed(selection); setStep(2); setError(''); setNotice('');
    }
    catch (e) { setError((e as Error).message); }
  }
  function updateContext(nextContext: ImportContext) {
    if (nextContext.startDate !== context.startDate || nextContext.endDate !== context.endDate) explicitPeriod.current = true;
    if (nextContext.timeZone !== context.timeZone) setCandidates(current => current.map(e => ({ ...e, reviewStatus: 'pending' })));
    else if (nextContext.startDate !== context.startDate || nextContext.endDate !== context.endDate || nextContext.excludedDates.join(',') !== context.excludedDates.join(',')) {
      setCandidates(current => current.map(e => generatedIds.current.has(e.id) ? { ...e, reviewStatus: 'pending', issues: [...e.issues.filter(issue => issue.field !== 'period'), { id: `${e.id}:period`, field: 'period', reason: 'O período ou os dias sem aula foram alterados. Gere as aulas novamente ou confira conscientemente esta ocorrência.' }] } : e));
    }
    setContext(nextContext);
  }

  const copy = role ? roleCopy[role] : undefined;
  const uploadProps = { files, addFiles, removeFile: (index: number) => setFiles(files.filter((_, i) => i !== index)), context, setContext: updateContext, onImport: () => void readFiles(), onDemo: loadDemo, onManual: () => manual(), reading, progress, cancel: () => controller.current?.abort(), forceOcr, setForceOcr, pages, setPages, hasResults: Boolean(candidates.length || result.files.length), onResume: () => setStep(1) };

  return <><a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <header className="site-header"><a className="brand" href="#" onClick={e => { e.preventDefault(); setStep(0); }} aria-label="Semestre, voltar ao início"><span className="brand-mark"><CalendarDays size={22} /></span><span>semestre<span className="brand-dot">.</span></span></a>
      <div className="header-meta">{role && <div className="role-switch" role="group" aria-label="Perfil">{(['student', 'teacher'] as Role[]).map(r => <button key={r} type="button" aria-pressed={role === r} onClick={() => chooseRole(r)}>{roleCopy[r].label}</button>)}</div>}<span className="local-badge"><span />Sem cadastro</span></div></header>
    <main id="main-content" ref={main} tabIndex={-1}>
      {!role || !copy ? <RoleGate onChoose={chooseRole} /> : <div data-step={step} className="stage">
        {step === 0 && <section className="hero"><div className="hero-copy"><h1>{copy.heroTitle}<span>.</span></h1><p>{copy.heroText}</p></div>{role === 'teacher' ? <TeacherScene className="hero-art" /> : <StudentScene className="hero-art" />}</section>}
        {step > 0 && <h1 className="sr-only">{copy.heroTitle}</h1>}
        <nav className="steps" aria-label="Etapas"><ol>{copy.steps.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><button type="button" onClick={() => { if (index < step) { setStep(index); setError(''); } }} disabled={index > step || reading} aria-current={index === step ? 'step' : undefined}><span className="step-number">{index < step ? <Check size={16} /> : index + 1}</span><span>{label}</span></button></li>)}</ol><span className="step-aside">Você confere. A agenda organiza.</span></nav>
        {demo && step === 1 && <div className="demo-banner"><span><strong>Modo exemplo</strong> · Documentos e eventos fictícios.</span><Button variant="ghost" onClick={() => { setStep(0); }}>Usar meus arquivos <ArrowUpRight size={15} /></Button></div>}
        {error && <div className="notice warning global-notice" role="alert"><span>{error}</span><Button variant="ghost" className="icon-button" aria-label="Fechar aviso" onClick={() => setError('')}><X size={17} /></Button></div>}
        {notice && <div className="notice neutral global-notice" role="status"><span>{notice}</span></div>}
        {reading && step !== 0 && <div className="notice neutral" role="status"><span>{progress}</span><Button variant="ghost" onClick={() => controller.current?.abort()}>Cancelar leitura</Button></div>}
        {step === 0 && role === 'student' && <UploadStep role="student" {...uploadProps} />}
        {step === 0 && role === 'teacher' && <>
          <div className="segmented teacher-tabs" role="group" aria-label="Como criar o plano"><button type="button" aria-pressed={teacherTab === 'build'} onClick={() => setTeacherTab('build')}>Montar o plano na tela</button><button type="button" aria-pressed={teacherTab === 'import'} onClick={() => setTeacherTab('import')}>Importar PDF ou planilha</button></div>
          {teacherTab === 'build' ? <><TeacherPlanBuilder timeZone={context.timeZone} onSubmit={buildPlan} disabled={reading} />{candidates.length > 0 && <div className="resume-row"><Button variant="secondary" onClick={() => setStep(1)}>Voltar à revisão</Button></div>}</> : <UploadStep role="teacher" {...uploadProps} />}
        </>}
        {step === 1 && <ReviewStep events={events} result={result} pendingSchedules={pendingSchedules} context={context} setContext={updateContext} scope={scope} setScope={setScope} onChange={changeEvent} onManual={manual} onExpand={expand} onRetry={fileName => { const file = files.find(f => f.name === fileName); if (file) void readFiles([file]); else setError('Volte aos arquivos e selecione esse documento novamente para repetir a leitura.'); }} onBack={() => setStep(0)} backLabel={copy.back} onNext={next} reading={reading} />}
        {step === 2 && <ExportStep events={confirmed} onBack={() => setStep(1)} demo={demo} calendarName={copy.calendarName} />}
      </div>}
    </main>
    <footer className="site-footer"><span className="footer-brand">semestre.</span><p>Uma ferramenta independente para estudantes e professores da UNIFAL.<br />Sem vínculo institucional com a universidade.</p><nav className="footer-links" aria-label="Documentos legais"><a href="/privacidade.html">Privacidade</a><a href="/termos.html">Termos de uso</a></nav><span><ShieldCheck size={16} />Arquivos no seu aparelho</span></footer></>;
}
