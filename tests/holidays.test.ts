import { describe, it, expect } from 'vitest';
import { holidaysInPeriod, nationalHolidays } from '../src/lib/domain/holidays';

const dates = (year: number) => nationalHolidays(year).map(h => h.date);
const byName = (year: number, name: string) => nationalHolidays(year).find(h => h.name === name)?.date;

describe('feriados nacionais', () => {
  it('calcula a Páscoa certa: Sexta-feira Santa é dois dias antes', () => {
    expect(byName(2026, 'Sexta-feira Santa')).toBe('2026-04-03'); // Páscoa em 05/04/2026
    expect(byName(2025, 'Sexta-feira Santa')).toBe('2025-04-18'); // Páscoa em 20/04/2025
    expect(byName(2024, 'Sexta-feira Santa')).toBe('2024-03-29'); // Páscoa em 31/03/2024
    expect(byName(2027, 'Sexta-feira Santa')).toBe('2027-03-26'); // Páscoa em 28/03/2027
    expect(byName(2038, 'Sexta-feira Santa')).toBe('2038-04-23'); // Páscoa em 25/04/2038 (a mais tardia)
  });

  it('lista os feriados fixos com os nomes oficiais, em ordem de data', () => {
    expect(nationalHolidays(2026)).toEqual([
      { date: '2026-01-01', name: 'Confraternização Universal' },
      { date: '2026-04-03', name: 'Sexta-feira Santa' },
      { date: '2026-04-21', name: 'Tiradentes' },
      { date: '2026-05-01', name: 'Dia do Trabalho' },
      { date: '2026-09-07', name: 'Independência do Brasil' },
      { date: '2026-10-12', name: 'Nossa Senhora Aparecida' },
      { date: '2026-11-02', name: 'Finados' },
      { date: '2026-11-15', name: 'Proclamação da República' },
      { date: '2026-11-20', name: 'Dia da Consciência Negra' },
      { date: '2026-12-25', name: 'Natal' }
    ]);
  });

  it('Consciência Negra só é nacional a partir de 2024', () => {
    expect(dates(2023)).not.toContain('2023-11-20');
    expect(dates(2024)).toContain('2024-11-20');
    expect(dates(2025)).toContain('2025-11-20');
    expect(nationalHolidays(2023)).toHaveLength(9);
  });

  it('não inclui Carnaval nem Corpus Christi (ponto facultativo)', () => {
    // 2026: Carnaval 17/02 e Corpus Christi 04/06.
    expect(dates(2026)).not.toContain('2026-02-17');
    expect(dates(2026)).not.toContain('2026-06-04');
    expect(nationalHolidays(2026).some(h => /carnaval|corpus/i.test(h.name))).toBe(false);
  });

  it('traz só os feriados do período que caem em dia da semana com aula', () => {
    // Terças e quintas, 04/08 a 10/12/2026: 07/09, 12/10 e 02/11 são segundas, 15/11 é domingo e 20/11 é sexta.
    expect(holidaysInPeriod('2026-08-04', '2026-12-10', [2, 4])).toEqual([]);
    expect(holidaysInPeriod('2026-08-04', '2026-12-10', [1, 5]).map(h => h.date)).toEqual(['2026-09-07', '2026-10-12', '2026-11-02', '2026-11-20']);
  });

  it('respeita as pontas do período e períodos que viram o ano', () => {
    expect(holidaysInPeriod('2026-09-07', '2026-09-07', [1]).map(h => h.date)).toEqual(['2026-09-07']);
    expect(holidaysInPeriod('2026-09-08', '2026-10-11', [0, 1, 2, 3, 4, 5, 6])).toEqual([]);
    expect(holidaysInPeriod('2026-12-20', '2027-01-05', [0, 1, 2, 3, 4, 5, 6]).map(h => h.date)).toEqual(['2026-12-25', '2027-01-01']);
  });

  it('sem dias da semana ou com datas inválidas, não traz nada', () => {
    expect(holidaysInPeriod('2026-08-04', '2026-12-10', [])).toEqual([]);
    expect(holidaysInPeriod('', '2026-12-10', [1])).toEqual([]);
    expect(holidaysInPeriod('2026-12-10', '2026-08-04', [1])).toEqual([]);
  });

  it('devolve datas ISO válidas e ordenadas em vários anos', () => {
    for (let year = 2020; year <= 2040; year++) {
      const list = dates(year);
      expect(list).toEqual([...list].sort());
      expect(new Set(list).size).toBe(list.length);
      for (const date of list) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
