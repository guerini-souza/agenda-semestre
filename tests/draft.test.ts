import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DRAFT_KEY, clearDraft, emptyPlanDraft, isDraftEmpty, loadDraft, saveDraft } from '../src/lib/draft';
import type { PlanDraft } from '../src/lib/draft';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => data.clear(), key: () => null, length: 0
  };
}
const filled = (): PlanDraft => ({
  ...emptyPlanDraft(),
  course: 'Cálculo I', courseCode: 'MAT101', weekdays: [2, 4], startTime: '19:00', endTime: '20:40', startDate: '2026-08-04', endDate: '2026-12-10',
  excluded: ['2026-09-08'], excludedLabels: { '2026-09-08': 'Semana Pedagógica' },
  assessments: [{ id: 'abc123', title: 'Prova 1', kind: 'exam', date: '2026-09-22', startTime: '19:00', endTime: '20:40' }],
  lessonContents: { '2026-08-04': 'Apresentação' }, observation: 'Texto'
});

describe('rascunho do professor', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('grava e lê de volta todos os campos, inclusive avaliações e conteúdo por aula', () => {
    const draft = filled();
    expect(saveDraft(draft)).toBe(true);
    expect(loadDraft()).toEqual(draft);
  });

  it('formulário vazio não deixa rascunho e apaga o anterior', () => {
    saveDraft(filled());
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    expect(saveDraft(emptyPlanDraft())).toBe(false);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(isDraftEmpty(emptyPlanDraft())).toBe(true);
    expect(isDraftEmpty(filled())).toBe(false);
  });

  it('clearDraft remove o que foi salvo', () => {
    saveDraft(filled()); clearDraft();
    expect(loadDraft()).toBeUndefined();
  });

  it('rascunho antigo, que guardava o programa de ensino, ainda carrega e o campo removido é descartado', () => {
    const old = { version: 1, form: { ...filled(), program: { degree: 'Curso', units: [], evaluation: {}, datesNotice: false } } };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(old));
    const loaded = loadDraft();
    expect(loaded).toBeDefined();
    expect(loaded).toEqual(filled());
    expect(loaded).not.toHaveProperty('program');
  });

  it('ignora sem quebrar: nada salvo, JSON corrompido, outra versão e formato errado', () => {
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem(DRAFT_KEY, '{nao e json');
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 0, form: filled() }));
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, form: { ...filled(), weekdays: ['segunda'] } }));
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, form: { ...filled(), assessments: [{ id: 'x', title: 'P', kind: 'inventado', date: '' }] } }));
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, form: { course: 'faltam campos' } }));
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem(DRAFT_KEY, 'null');
    expect(loadDraft()).toBeUndefined();
  });

  it('armazenamento indisponível não lança erro', () => {
    const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('cheio'); }, removeItem: () => { throw new Error('bloqueado'); } };
    vi.stubGlobal('localStorage', broken);
    expect(loadDraft()).toBeUndefined();
    expect(saveDraft(filled())).toBe(false);
    expect(saveDraft(emptyPlanDraft())).toBe(false);
    expect(() => clearDraft()).not.toThrow();
  });
});
