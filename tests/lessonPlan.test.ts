import { describe, it, expect } from 'vitest';
import { buildLessonPlanDocument, lessonPlanFileName } from '../src/lib/domain/lessonPlan';
import type { TeachingPlan } from '../src/lib/domain/teaching';

// Quintas-feiras de agosto de 2026: 06, 13, 20 e 27.
const plan = (patch: Partial<TeachingPlan> = {}): TeachingPlan => ({
  course: 'Gestão de Produtos', courseCode: 'ICT133', group: 'A|D', location: 'B112',
  weekdays: [4], startTime: '16:00', endTime: '18:00',
  startDate: '2026-08-06', endDate: '2026-08-27', excludedDates: ['2026-08-06'], timeZone: 'America/Sao_Paulo',
  assessments: [
    { id: 'a1', title: 'Avaliação de Desempenho 1', kind: 'exam', date: '2026-08-20' },
    { id: 'a2', title: 'Prova extra', kind: 'exam', date: '2026-08-22' }
  ],
  excludedLabels: { '2026-08-06': 'Semana Pedagógica' },
  lessonContents: { '2026-08-13': 'Apresentação da disciplina', '2026-08-20': 'Revisão' },
  ...patch
});

describe('documento do plano de aula', () => {
  it('monta o cabeçalho no padrão do plano de aula', () => {
    const doc = buildLessonPlanDocument(plan());
    expect(doc.title).toBe('PLANO DE AULA · DOCUMENTO DE APOIO');
    expect(doc.notice).toBe('Gerado pelo Semestre. Não substitui o plano de aula oficial do sistema acadêmico.');
    expect(doc.fields).toEqual([
      { label: 'TURMA/UNIDADE CURRICULAR', value: 'A|D – Gestão de Produtos (ICT133)' },
      { label: 'ANO/SEMESTRE', value: '2026 / 2' },
      { label: 'DIA/HORÁRIO/SALA', value: '5ª Feira (16h00 / 18h00) – B112' },
      { label: 'CARGA HORÁRIA', value: '6h' }
    ]);
  });

  it('lista cada data com carga horária e conteúdo; dias sem aula usam ---- e o motivo', () => {
    const { rows } = buildLessonPlanDocument(plan());
    expect(rows.map(r => [r.dateLabel, r.hours, r.content, r.kind])).toEqual([
      ['06/08', null, 'Semana Pedagógica', 'break'],
      ['13/08', 2, 'Apresentação da disciplina', 'class'],
      ['20/08', 2, 'Avaliação de Desempenho 1; Revisão', 'class'],
      ['22/08', null, 'Prova extra', 'assessment'],
      ['27/08', 2, '', 'class']
    ]);
  });

  it('soma a carga horária por mês e no total, apontando a última linha de cada mês', () => {
    const doc = buildLessonPlanDocument(plan({ endDate: '2026-09-10', lessonContents: {}, assessments: [] }));
    expect(doc.monthTotals).toEqual([{ label: 'Agosto = 6', rowIndex: 3 }, { label: 'Setembro = 4', rowIndex: 5 }]);
    expect(doc.totalHours).toBe(10);
    expect(doc.fields[3].value).toBe('10h');
  });

  it('deduz as horas da duração e aceita ajuste manual, com vírgula decimal', () => {
    expect(buildLessonPlanDocument(plan({ startTime: '19:00', endTime: '20:40' })).rows[1].hours).toBe(2);
    expect(buildLessonPlanDocument(plan({ startTime: '19:00', endTime: '19:50' })).rows[1].hours).toBe(1);
    const doc = buildLessonPlanDocument(plan({ classHours: 1.5 }));
    expect(doc.rows[1].hours).toBe(1.5);
    expect(doc.fields[3].value).toBe('4,5h');
  });

  it('escreve cada dia da semana com o próprio horário, como o leitor do app espera', () => {
    const doc = buildLessonPlanDocument(plan({ weekdays: [3, 5], startTime: '19:00', endTime: '21:00', location: 'B110', excludedDates: [], assessments: [], excludedLabels: {} }));
    expect(doc.fields[2].value).toBe('4ª Feira (19h00 / 21h00) & 6ª Feira (19h00 / 21h00) – B110');
  });

  it('usa modalidade, cabeçalho e observação informados; sem eles, usa o padrão', () => {
    const doc = buildLessonPlanDocument(plan({ modality: 'Ensino Híbrido', institution: ' Universidade Exemplo \n\n Campus Central ', observation: 'As aulas de 20/08 contam na frequência.' }));
    expect(doc.title).toBe('PLANO DE AULA · DOCUMENTO DE APOIO'); // o título nunca imita o documento oficial
    expect(doc.fields.at(-1)).toEqual({ label: 'MODALIDADE', value: 'Ensino Híbrido' });
    expect(doc.institution).toEqual(['Universidade Exemplo', 'Campus Central']);
    expect(doc.observation).toBe('As aulas de 20/08 contam na frequência.');
    const bare = buildLessonPlanDocument(plan());
    expect(bare.institution).toEqual([]);
    expect(bare.observation).toBeUndefined();
  });

  it('não repete linha de dia sem aula fora dos dias da semana nem do período', () => {
    const { rows } = buildLessonPlanDocument(plan({ excludedDates: ['2026-08-06', '2026-08-07', '2026-09-03'] }));
    expect(rows.filter(r => r.kind === 'break').map(r => r.dateLabel)).toEqual(['06/08']);
  });

  it('recusa plano inválido e gera nome de arquivo seguro', () => {
    expect(() => buildLessonPlanDocument(plan({ weekdays: [] }))).toThrow('Escolha pelo menos um dia da semana.');
    expect(() => buildLessonPlanDocument(plan({ classHours: 0 }))).toThrow('A carga horária por aula deve ficar entre 0,5 e 12 horas.');
    expect(lessonPlanFileName(plan({ course: 'Cálculo I / Turma "A"', courseCode: 'MAT 101' }))).toBe('plano-de-aula-MAT-101-calculo-i-turma-a.pdf');
  });
});
