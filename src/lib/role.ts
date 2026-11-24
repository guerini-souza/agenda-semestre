export type Role = 'student' | 'teacher';
const KEY = 'semestre:role';

/** Perfil escolhido neste navegador. O armazenamento pode estar indisponível: nesse caso o app só pergunta de novo. */
export function loadRole(): Role | undefined {
  try { const value = localStorage.getItem(KEY); return value === 'student' || value === 'teacher' ? value : undefined; } catch { return undefined; }
}
export function saveRole(role: Role): void {
  try { localStorage.setItem(KEY, role); } catch { /* preferência por aparelho; não é essencial */ }
}

export const roleCopy: Record<Role, { label: string; heroTitle: string; heroText: string; steps: [string, string, string]; back: string; calendarName: string }> = {
  student: {
    label: 'Aluno',
    heroTitle: 'Seu semestre na agenda',
    heroText: 'Envie seus horários e planos de ensino, confira as datas e leve tudo para a sua agenda.',
    steps: ['Enviar arquivos', 'Conferir agenda', 'Adicionar à agenda'],
    back: 'Voltar aos arquivos',
    calendarName: 'Meu semestre'
  },
  teacher: {
    label: 'Professor',
    heroTitle: 'Seu plano de ensino na agenda',
    heroText: 'Monte o plano da disciplina ou importe o que você já tem. Aulas e avaliações vão direto para a sua agenda.',
    steps: ['Montar o plano', 'Conferir agenda', 'Adicionar à agenda'],
    back: 'Voltar ao plano',
    calendarName: 'Minhas aulas'
  }
};
