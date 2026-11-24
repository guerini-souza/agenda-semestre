import { createEvents } from 'ics';
import type { EventAttributes, DateArray } from 'ics';
import { ConfirmedEventSchema, LIMITS } from '../domain/types';
import type { ConfirmedEvent } from '../domain/types';
import { calendarDescription, calendarTitle, confirmedKey, nextDate, toInstant } from '../domain/calendar';

function uid(value: string): string {
  // Full canonical identity, encoded as base64url, avoids truncation collisions.
  const bytes = new TextEncoder().encode(value);
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}@semestre.local`;
}
function dateParts(value: string): DateArray { return value.split('-').map(Number) as [number, number, number]; }
function utcParts(date: Date): DateArray { return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()]; }
export function createIcs(input: ConfirmedEvent[]): string {
  if (!input.length || input.length > LIMITS.events) throw new Error('Selecione de 1 a 1.500 eventos.');
  const events: EventAttributes[] = input.map(raw => {
    const event = ConfirmedEventSchema.parse(raw), timing = event.timing;
    const common = { uid: uid(confirmedKey(event)), title: calendarTitle(event), description: calendarDescription(event), location: event.location, productId: 'semestre/local', status: 'CONFIRMED' as const, sequence: 0 };
    if (timing.mode === 'allDay') return { ...common, start: dateParts(timing.date), end: dateParts(nextDate(timing.date)) };
    return { ...common, start: utcParts(toInstant(timing.date, timing.startTime, event.timeZone)), end: utcParts(toInstant(timing.date, timing.endTime, event.timeZone)), startInputType: 'utc', startOutputType: 'utc', endInputType: 'utc', endOutputType: 'utc' };
  });
  const { value, error } = createEvents(events);
  if (error || !value) throw new Error('Não foi possível gerar o calendário. Confira datas e horários.');
  return value;
}
export function downloadIcs(events: ConfirmedEvent[]): void {
  const url = URL.createObjectURL(new Blob([createIcs(events)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'meu-semestre.ics'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
