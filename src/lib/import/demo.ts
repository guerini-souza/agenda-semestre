import { emptyResult, type ImportResult, type SourceRef } from '../domain/types';
import { makeCandidate } from './shared';

export function getDemoResult(): ImportResult {
  const context = { year: 2026, timeZone: 'America/Sao_Paulo', excludedDates: [] };
  const result = emptyResult();
  const source = (excerpt: string): SourceRef => ({ fileId: 'demo-sintetico-2026', fileName: 'Exemplo sintético — não é um documento institucional', excerpt, method: 'demo' });
  result.events = [
    makeCandidate({ course: 'Matemática aplicada (exemplo)', title: 'Prova 1 — exemplo sintético', kind: 'exam', date: '2026-10-20', startTime: '14:00', endTime: '16:00', location: 'Sala exemplo 12', sources: [source('20/10/2026 • Prova 1 • 14:00–16:00 • Sala exemplo 12')] }, context),
    makeCandidate({ course: 'Projeto integrador (exemplo)', title: 'Entrega do projeto — exemplo sintético', kind: 'assignment', date: '2026-10-23', sources: [source('23/10/2026 • Entrega do projeto • horário não informado')] }, context),
    makeCandidate({ course: 'Projeto integrador (exemplo)', title: 'Apresentação — exemplo sintético', kind: 'presentation', date: '2026-10-27', startTime: '10:00', endTime: '11:30', sources: [source('27/10/2026 • Apresentação • 10:00–11:30')] }, context),
  ];
  result.schedules = [{ id: 'demo-aula-sintetica', course: 'Matemática aplicada (exemplo)', weekdays: [2], startTime: '14:00', endTime: '16:00', startDate: '2026-10-06', endDate: '2026-11-24', location: 'Sala exemplo 12', sources: [source('Exemplo sintético: terças-feiras, 14:00–16:00; 06/10/2026 a 24/11/2026.')] }];
  result.files = [{ fileId: 'demo-sintetico-2026', fileName: 'Exemplo sintético', status: 'complete', message: 'Dados fictícios para experimentar a revisão. Nenhum documento institucional foi usado.', sources: result.events.flatMap(event => event.sources) }];
  return result;
}
