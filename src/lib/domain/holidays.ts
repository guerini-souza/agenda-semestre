export type Holiday = { date: string; name: string };

const pad = (value: number) => String(value).padStart(2, '0');
const iso = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** Domingo de Páscoa pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher). */
function easter(year: number): { month: number; day: number } {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Feriados nacionais do Brasil no ano, em ordem de data. Carnaval e Corpus Christi são ponto facultativo e ficam de fora; a Consciência Negra é nacional desde 2024. */
export function nationalHolidays(year: number): Holiday[] {
  const { month, day } = easter(year);
  const goodFriday = new Date(Date.UTC(year, month - 1, day - 2));
  const list: Holiday[] = [
    { date: iso(year, 1, 1), name: 'Confraternização Universal' },
    { date: iso(year, goodFriday.getUTCMonth() + 1, goodFriday.getUTCDate()), name: 'Sexta-feira Santa' },
    { date: iso(year, 4, 21), name: 'Tiradentes' },
    { date: iso(year, 5, 1), name: 'Dia do Trabalho' },
    { date: iso(year, 9, 7), name: 'Independência do Brasil' },
    { date: iso(year, 10, 12), name: 'Nossa Senhora Aparecida' },
    { date: iso(year, 11, 2), name: 'Finados' },
    { date: iso(year, 11, 15), name: 'Proclamação da República' }
  ];
  if (year >= 2024) list.push({ date: iso(year, 11, 20), name: 'Dia da Consciência Negra' });
  list.push({ date: iso(year, 12, 25), name: 'Natal' });
  // A Sexta-feira Santa pode cair depois de Tiradentes (ex.: 2038).
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Feriados nacionais entre o primeiro e o último dia de aulas (inclusive) que caem em um dia da semana com aula. Datas inválidas ou fora de ordem resultam em lista vazia. */
export function holidaysInPeriod(startDate: string, endDate: string, weekdays: number[]): Holiday[] {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
  if (!valid(startDate) || !valid(endDate) || endDate < startDate || !weekdays.length) return [];
  const result: Holiday[] = [];
  for (let year = Number(startDate.slice(0, 4)); year <= Number(endDate.slice(0, 4)); year++) {
    for (const holiday of nationalHolidays(year)) {
      if (holiday.date < startDate || holiday.date > endDate) continue;
      if (weekdays.includes(new Date(`${holiday.date}T12:00:00Z`).getUTCDay())) result.push(holiday);
    }
  }
  return result;
}
