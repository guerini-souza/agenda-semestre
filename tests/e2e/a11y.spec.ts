import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Auditoria automática com axe-core (WCAG 2.0/2.1, níveis A e AA). Falha em violações "serious" ou "critical".
// Ela não substitui o teste manual com leitor de tela e teclado: o axe só encontra uma parte dos problemas.
test.beforeEach(async ({ page }) => {
  // Sem animações, o axe mede contraste no estado final da tela, não no meio de uma transição.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function audit(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  // A11Y_VERBOSE=1 também lista os achados "moderate" e "minor", que não derrubam o teste mas valem uma olhada.
  if (process.env.A11Y_VERBOSE) for (const v of violations) console.log(`${screen} [${v.impact}] ${v.id} (${v.nodes.length}): ${v.help} → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
  const blocking = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  const report = blocking.map(v => `[${v.impact}] ${v.id}: ${v.help}\n${v.nodes.slice(0, 4).map(n => `   ${n.target.join(' ')} — ${n.failureSummary?.split('\n').slice(0, 2).join(' ')}`).join('\n')}`).join('\n');
  expect(blocking, `Violações de acessibilidade em "${screen}":\n${report}`).toEqual([]);
  // Estrutura de títulos (regras de boas práticas, impacto "moderate"): a página tem um h1 e a ordem dos níveis não pula.
  const structure = (await new AxeBuilder({ page }).withRules(['heading-order', 'page-has-heading-one']).analyze()).violations;
  expect(structure.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`), `Títulos em "${screen}"`).toEqual([]);
}

const asStudent = (page: Page) => page.addInitScript(() => localStorage.setItem('semestre:role', 'student'));
const asTeacher = (page: Page) => page.addInitScript(() => localStorage.setItem('semestre:role', 'teacher'));

test('a11y: escolha de perfil', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Sou aluno/ })).toBeVisible();
  await audit(page, 'escolha de perfil');
});

test('a11y: aluno, envio de arquivos', async ({ page }) => {
  await asStudent(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Explorar exemplo' })).toBeVisible();
  await audit(page, 'aluno: envio de arquivos');
});

test('a11y: aluno, conferência (lista e calendário) e exportação', async ({ page }) => {
  await asStudent(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar exemplo' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible();
  await audit(page, 'aluno: conferência (lista)');
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await audit(page, 'aluno: conferência (calendário)');
  await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
  await expect(page.getByRole('button', { name: 'Baixar arquivo de calendário' })).toBeVisible();
  await audit(page, 'aluno: exportação');
});

test('a11y: professor, formulário do plano de aula e conferência', async ({ page }) => {
  await asTeacher(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  await expect(page.getByRole('button', { name: 'Baixar plano de aula (PDF)' })).toBeVisible();
  await audit(page, 'professor: formulário');
  await page.getByRole('button', { name: 'Gerar aulas e conferir' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible();
  await audit(page, 'professor: conferência');
});
