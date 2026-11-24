import { describe, it, expect } from 'vitest';
import { renderLessonPlanPdf } from '../src/lib/pdf/lessonPlanPdf';
import { buildLessonPlanDocument } from '../src/lib/domain/lessonPlan';
import type { TeachingPlan } from '../src/lib/domain/teaching';
import { groupPositionedText, interpretSources } from '../src/lib/import/text';
import type { SourceRef } from '../src/lib/domain/types';

const plan = (patch: Partial<TeachingPlan> = {}): TeachingPlan => ({
  course: 'Gestão de Produtos', courseCode: 'ICT133', group: 'A|D', location: 'B112',
  weekdays: [4], startTime: '16:00', endTime: '18:00',
  startDate: '2026-08-06', endDate: '2026-08-27', excludedDates: ['2026-08-06'], timeZone: 'America/Sao_Paulo',
  assessments: [{ id: 'a1', title: 'Avaliação de Desempenho 1', kind: 'exam', date: '2026-08-20' }, { id: 'a2', title: 'Prova extra', kind: 'exam', date: '2026-08-22' }],
  excludedLabels: { '2026-08-06': 'Semana Pedagógica' }, lessonContents: { '2026-08-13': 'Apresentação da disciplina | Plano de aulas | Sistema de avaliação' },
  observation: 'As atividades didáticas do dia 27/08 contabilizam na frequência do curso.',
  ...patch
});

/** Lê o PDF como o app lê: mesmas funções de agrupamento e interpretação. */
async function readBack(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const sources: SourceRef[] = []; const raw: string[] = [];
  for (let number = 1; number <= doc.numPages; number++) {
    const content = await (await doc.getPage(number)).getTextContent();
    const items = content.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height }] : []);
    raw.push(...items.map(item => item.text));
    sources.push({ fileId: 'gerado', fileName: 'gerado.pdf', page: number, excerpt: groupPositionedText(items).join('\n'), method: 'pdf-text' });
  }
  return { pages: doc.numPages, sources, raw: raw.join(' ') };
}
const context = { timeZone: 'America/Sao_Paulo', excludedDates: [] };

describe('PDF do plano de aula', () => {
  it('gera um PDF A4 válido com o cabeçalho, as linhas e os totais do mês', async () => {
    const bytes = await renderLessonPlanPdf(buildLessonPlanDocument(plan({ institution: 'Instituição Exemplo' })));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const { pages, sources, raw } = await readBack(bytes);
    expect(pages).toBe(1);
    const text = sources[0].excerpt;
    expect(text).toContain('PLANO DE AULA · DOCUMENTO DE APOIO');
    expect(text).toContain('Gerado pelo Semestre. Não substitui o plano de aula oficial do sistema acadêmico.');
    expect(raw).toContain('Documento de apoio gerado pelo Semestre · não oficial');
    expect(text).toContain('TURMA/UNIDADE CURRICULAR: A|D – Gestão de Produtos (ICT133)');
    expect(text).toContain('ANO/SEMESTRE: 2026 / 2');
    expect(text).toContain('DIA/HORÁRIO/SALA: 5ª Feira (16h00 / 18h00) – B112');
    expect(text).toContain('CARGA HORÁRIA: 6h');
    expect(text).toContain('06/08 ---- Semana Pedagógica');
    expect(text).toContain('13/08 2 Apresentação da disciplina');
    expect(raw).toContain('Agosto = 6');
    expect(raw).toContain('Instituição Exemplo');
    expect(raw).toContain('1/1');
  });

  it('o próprio leitor do app recupera disciplina, turma, aulas e avaliações do PDF gerado', async () => {
    const { sources } = await readBack(await renderLessonPlanPdf(buildLessonPlanDocument(plan())));
    const events = interpretSources(sources, context);
    const classes = events.filter(e => e.kind === 'class');
    expect(classes.map(e => e.date)).toEqual(['2026-08-13', '2026-08-27']);
    expect(classes[0]).toMatchObject({ course: 'Gestão de Produtos', courseCode: 'ICT133', group: 'A|D', location: 'B112', startTime: '16:00', endTime: '18:00' });
    const exams = events.filter(e => e.kind === 'exam');
    expect(exams.map(e => [e.date, e.title])).toEqual([['2026-08-20', 'Avaliação de Desempenho 1'], ['2026-08-22', 'Prova extra']]);
    expect(events.some(e => e.date === '2026-08-06')).toBe(false); // Semana pedagógica não vira evento
  });

  it('passa para novas páginas repetindo o cabeçalho da tabela, e o leitor recupera todas as aulas', async () => {
    const long = plan({ weekdays: [1, 2, 3, 4, 5], startDate: '2026-08-03', endDate: '2026-11-27', excludedDates: [], excludedLabels: {}, assessments: [], lessonContents: {}, observation: undefined });
    const doc = buildLessonPlanDocument(long);
    const { pages, sources } = await readBack(await renderLessonPlanPdf(doc));
    expect(pages).toBeGreaterThan(1);
    for (const source of sources) expect(source.excerpt).toContain('CONTEÚDO PROGRAMÁTICO');
    const classes = interpretSources(sources, context).filter(e => e.kind === 'class');
    expect(classes).toHaveLength(doc.rows.length);
    expect(sources.at(-1)!.excerpt).toMatch(new RegExp(`${pages}/${pages}`));
  });

  it('não quebra com caracteres fora do alfabeto do PDF nem com palavras enormes', async () => {
    const odd = plan({ course: 'Cálculo ∑ 😀', lessonContents: { '2026-08-13': 'x'.repeat(300) } });
    const { raw, pages } = await readBack(await renderLessonPlanPdf(buildLessonPlanDocument(odd)));
    expect(pages).toBe(1);
    expect(raw).toContain('Cálculo ? ?');
  });
});
