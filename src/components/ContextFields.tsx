import type { ImportContext } from '../lib/domain/types';

export function ContextFields({ value, onChange, expanded = false }: { value: ImportContext; onChange: (next: ImportContext) => void; expanded?: boolean }) {
  return <details className="context-fields" open={expanded || undefined}>
    <summary>Período letivo, fuso e dias sem aula</summary>
    <p className="muted">As aulas usam o período da planilha automaticamente. Preencha as datas se estiverem ausentes ou se quiser limitar o período. Feriados e recessos não são presumidos.</p>
    <div className="field-grid">
      <label>Ano<input type="number" min="1900" max="2200" placeholder="Não informado" value={value.year ?? ''} onChange={e => onChange({ ...value, year: e.target.value ? Number(e.target.value) : undefined })} /></label>
      <label>Semestre<select value={value.semester ?? ''} onChange={e => onChange({ ...value, semester: e.target.value === '1' || e.target.value === '2' ? e.target.value : undefined })}><option value="">Não informado</option><option value="1">1º semestre</option><option value="2">2º semestre</option></select></label>
      <label>Primeiro dia de aulas<input type="date" value={value.startDate ?? ''} onChange={e => onChange({ ...value, startDate: e.target.value || undefined })} /></label>
      <label>Último dia de aulas<input type="date" value={value.endDate ?? ''} onChange={e => onChange({ ...value, endDate: e.target.value || undefined })} /></label>
      <label className="field-wide">Fuso horário<input value={value.timeZone} onChange={e => onChange({ ...value, timeZone: e.target.value })} aria-describedby="timezone-help" /><small id="timezone-help">Exemplo: America/Sao_Paulo</small></label>
      <label className="field-wide">Dias sem aula confirmados<textarea rows={2} placeholder="Uma data por linha, no formato AAAA-MM-DD" value={value.excludedDates.join('\n')} onChange={e => onChange({ ...value, excludedDates: e.target.value.split('\n') })} /><small>Use as datas do calendário que você conferiu. Deixe vazio se não houver exclusões.</small></label>
    </div>
  </details>;
}
