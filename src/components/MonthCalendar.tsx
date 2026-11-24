import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventCandidate, EventKind } from '../lib/domain/types';

const kindLabel: Record<EventKind, string> = { class: 'Aula', exam: 'Prova', presentation: 'Apresentação', assignment: 'Entrega', other: 'Outro' };
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const monthName = (year: number, month: number) => {
  const text = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1)));
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
};
const chipLabel = (e: EventCandidate) => e.kind === 'class' ? (e.courseCode || e.course || e.title) : (e.title || e.course);
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendário mensal somente leitura dos eventos selecionados. Os dados vêm da conferência. */
export function MonthCalendar({ events }: { events: EventCandidate[] }) {
  const dated = useMemo(() => events.filter(e => e.selected && e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)), [events]);
  const first = dated.map(e => e.date!).sort()[0];
  const [cursor, setCursor] = useState(() => first ? { y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 } : { y: new Date().getFullYear(), m: new Date().getMonth() });
  const byDay = useMemo(() => {
    const map = new Map<string, EventCandidate[]>();
    for (const event of dated) { const list = map.get(event.date!) ?? []; list.push(event); map.set(event.date!, list); }
    for (const list of map.values()) list.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return map;
  }, [dated]);
  const monthKey = `${cursor.y}-${pad(cursor.m + 1)}`;
  const inMonth = dated.filter(e => e.date!.startsWith(monthKey)).length;
  const offset = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
  const move = (delta: number) => setCursor(c => { const d = new Date(Date.UTC(c.y, c.m + delta, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const today = new Date().toISOString().slice(0, 10);
  return <section className="month" aria-label="Calendário dos eventos selecionados">
    <div className="month-bar">
      <button type="button" className="month-nav" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
      <h3 aria-live="polite">{monthName(cursor.y, cursor.m)}<small>{inMonth} {inMonth === 1 ? 'evento' : 'eventos'}</small></h3>
      <button type="button" className="month-nav" onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight size={20} /></button>
    </div>
    <div className="month-scroll"><table className="month-grid">
      <thead><tr>{weekdays.map(d => <th key={d} scope="col">{d}</th>)}</tr></thead>
      <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => <tr key={week}>{cells.slice(week * 7, week * 7 + 7).map((day, i) => {
        if (day < 1 || day > days) return <td key={i} className="is-outside" />;
        const date = `${monthKey}-${pad(day)}`;
        const list = byDay.get(date) ?? [];
        return <td key={i} className={`${date === today ? 'is-today' : ''} ${i === 0 || i === 6 ? 'is-weekend' : ''}`}>
          <span className="month-day">{day}</span>
          <ul>{list.slice(0, 3).map(e => <li key={e.id} className={`chip chip--${e.kind}`} title={`${kindLabel[e.kind]} · ${e.title}${e.startTime ? ` · ${e.startTime}` : ''}`}><b>{e.startTime && !e.allDay ? e.startTime : kindLabel[e.kind]}</b> {chipLabel(e)}</li>)}
            {list.length > 3 && <li className="chip-more">+{list.length - 3} mais</li>}</ul>
        </td>;
      })}</tr>)}</tbody>
    </table></div>
    <ul className="legend" aria-label="Legenda">{(Object.keys(kindLabel) as EventKind[]).map(k => <li key={k}><i className={`chip--${k}`} />{kindLabel[k]}</li>)}</ul>
  </section>;
}
