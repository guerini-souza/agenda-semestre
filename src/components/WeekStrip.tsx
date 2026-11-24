import { CalendarDays } from 'lucide-react';
import type { EventCandidate } from '../lib/domain/types';

export function WeekStrip({ events, demo }: { events: EventCandidate[]; demo: boolean }) {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const selected = events.filter(e => e.selected && e.date);
  return <aside className="week-strip" aria-label="Distribuição dos eventos por dia da semana">
    <div className="week-caption"><CalendarDays size={17} /><span>Eventos por dia da semana</span>{demo && <span className="tag">Exemplo</span>}</div>
    <div className="week-days">{days.map((day, index) => {
      const count = selected.filter(e => new Date(`${e.date}T12:00:00`).getDay() === index + 1).length;
      return <div className={`week-day ${count ? 'is-filled' : ''}`} key={day}><span>{day}</span><div className="week-track">{[0, 1, 2].map(n => <i key={n} className={count > n ? 'is-active' : ''} />)}</div><small>{count ? `${count} ${count === 1 ? 'evento' : 'eventos'}` : '—'}</small></div>;
    })}</div>
    {selected.some(e => [0, 6].includes(new Date(`${e.date}T12:00:00`).getDay())) && <small className="week-note">Também há eventos no fim de semana. Confira a lista completa.</small>}
  </aside>;
}
