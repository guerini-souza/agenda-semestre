import { useRef, useState } from 'react';
import { ArrowRight, FileSpreadsheet, FileText, Upload, X, ShieldCheck, Sparkles, LoaderCircle } from 'lucide-react';
import { LIMITS, type ImportContext } from '../lib/domain/types';
import type { Role } from '../lib/role';
import { Button } from './ui/button';
import { ContextFields } from './ContextFields';

type Props = { role: Role; files: File[]; addFiles: (files: File[]) => void; removeFile: (index: number) => void; context: ImportContext; setContext: (context: ImportContext) => void; onImport: () => void; onDemo: () => void; onManual: () => void; reading: boolean; progress: string; cancel: () => void; forceOcr: boolean; setForceOcr: (value: boolean) => void; pages: string; setPages: (value: string) => void; hasResults: boolean; onResume: () => void };
const copy = {
  student: { title: 'O semestre começa aqui.', text: 'Junte a grade de horários e os planos de ensino que você já tem.', kinds: 'PDF dos planos de ensino · XLS ou XLSX da grade', noteTitle: 'Você dá a última conferida.', note: 'Datas, horários e disciplinas ficam à vista. O que precisar de atenção será marcado para você revisar.' },
  teacher: { title: 'Importe o plano de ensino.', text: 'Envie o PDF do plano ou a planilha da disciplina e confira as datas antes de levar para a agenda.', kinds: 'PDF do plano de ensino · XLS ou XLSX da disciplina', noteTitle: 'Nada vai para a agenda sem você.', note: 'Se o documento tiver um formato diferente, você consulta o texto lido e completa os eventos, ou monta o plano na tela.' }
} as const;

export function UploadStep(p: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const c = copy[p.role];
  return <div className="upload-layout">
    <section className="panel upload-panel" aria-labelledby="upload-heading">
      <div className="section-heading"><h2 id="upload-heading">{c.title}</h2><p>{c.text}</p></div>
      <input ref={input} type="file" className="sr-only" tabIndex={-1} accept=".pdf,.xls,.xlsx" multiple disabled={p.reading} onChange={e => { p.addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} aria-label="Selecionar arquivos PDF, XLS ou XLSX" />
      <button type="button" className={`dropzone ${dragging ? 'is-dragging' : ''}`} disabled={p.reading} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!p.reading) p.addFiles(Array.from(e.dataTransfer.files)); }}>
        <span className="upload-icon"><Upload size={26} strokeWidth={1.8} /></span><strong>Selecione ou arraste seus arquivos</strong><span>{c.kinds}</span><small>Até {LIMITS.files} arquivos · 10 MB por arquivo · {LIMITS.pages} páginas de PDF no total</small>
      </button>
      {p.files.length > 0 && <ul className="upload-files" aria-label="Arquivos selecionados">{p.files.map((file, i) => <li key={`${file.name}-${file.size}-${i}`}><span className="file-icon">{file.name.toLowerCase().endsWith('.pdf') ? <FileText size={22} /> : <FileSpreadsheet size={22} />}</span><span className="file-description"><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · pronto para ler</small></span><Button variant="ghost" className="icon-button" disabled={p.reading} onClick={() => p.removeFile(i)} aria-label={`Remover ${file.name}`}><X size={18} /></Button></li>)}</ul>}
      <details className="reading-options"><summary>Opções de leitura do PDF</summary><div className="options-content"><label>Páginas do cronograma<input placeholder="Todas, ou por exemplo: 2, 4-6" value={p.pages} onChange={e => p.setPages(e.target.value)} disabled={p.reading} /><small>A seleção se aplica a cada PDF do lote.</small></label><label className="checkbox-label"><input type="checkbox" checked={p.forceOcr} onChange={e => p.setForceOcr(e.target.checked)} disabled={p.reading} /><span>Usar reconhecimento de imagem (OCR) nas páginas selecionadas<small>Útil para digitalizações e tabelas que não foram lidas. Pode levar mais tempo.</small></span></label></div></details>
      <ContextFields value={p.context} onChange={p.setContext} />
      {p.reading ? <div className="reading-status" role="status"><LoaderCircle className="spin" size={20} /><span>{p.progress || 'Preparando leitura local…'}</span><Button variant="ghost" onClick={p.cancel}>Cancelar</Button></div> : <div className="upload-actions"><Button onClick={p.onImport} disabled={!p.files.length}>Ler meus arquivos <ArrowRight size={18} /></Button>{p.hasResults && <Button variant="secondary" onClick={p.onResume}>Voltar à revisão</Button>}</div>}
      <p className="privacy-line"><ShieldCheck size={16} /> Seus documentos são processados neste aparelho.</p>
    </section>
    <aside className="upload-aside"><div className="aside-note"><h3>{c.noteTitle}</h3><p>{c.note}</p></div>
      <div className="try-example">
        {p.role === 'student' && <><Sparkles size={20} /><h3>Quer conhecer primeiro?</h3><p>Teste com um semestre fictício, sem enviar nenhum documento.</p><Button variant="secondary" onClick={p.onDemo} disabled={p.reading}>Explorar exemplo</Button></>}
        <button type="button" className="text-button" onClick={p.onManual} disabled={p.reading}>Criar um evento manualmente</button>
      </div></aside>
  </div>;
}
