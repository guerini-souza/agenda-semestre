const weekday = (date: string) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace('.', '');
const br = (date: string) => date.split('-').reverse().slice(0, 2).join('/');

/** Um campo de conteúdo programático por aula. Esses textos entram só no PDF do plano de aula. */
export function LessonContentEditor({ dates, value, onChange }: { dates: string[]; value: Record<string, string>; onChange: (date: string, text: string) => void }) {
  const filled = dates.filter(date => value[date]?.trim()).length;
  return <fieldset className="fieldset"><legend>Conteúdo de cada aula</legend>
    <p className="muted">Escreva o assunto de cada data. Ele aparece na coluna “Conteúdo programático” do PDF do plano de aula. É opcional, e você pode deixar datas em branco.</p>
    {dates.length === 0
      ? <p className="muted">Escolha os dias da semana, o horário e o período para listar as aulas aqui.</p>
      : <><p className="lesson-count" role="status">{filled} de {dates.length} aulas com conteúdo</p>
        <ul className="lesson-list" aria-label="Conteúdo por aula">{dates.map(date => <li key={date}>
          <span className="lesson-date"><b>{br(date)}</b><small>{weekday(date)}</small></span>
          <input aria-label={`Conteúdo da aula de ${br(date)}`} value={value[date] ?? ''} onChange={e => onChange(date, e.target.value)} placeholder="Ex.: Introdução e plano de aulas" maxLength={300} autoComplete="off" />
        </li>)}</ul></>}
  </fieldset>;
}
