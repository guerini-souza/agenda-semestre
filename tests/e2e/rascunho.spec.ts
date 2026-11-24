import { test, expect } from '@playwright/test';

// O script de início roda a cada carregamento (inclusive no reload): a marca na sessão evita sobrescrever o que o teste guardou.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('semestre:test-init')) { sessionStorage.setItem('semestre:test-init', '1'); localStorage.setItem('semestre:role', 'teacher'); } });
});

test('rascunho do professor sobrevive ao recarregar e à ida e volta da conferência', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Rascunho salvo neste navegador')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  await expect(page.getByText('Rascunho salvo neste navegador')).toBeVisible();
  // Edita campos de várias áreas do formulário.
  await page.getByLabel('Nome da disciplina').fill('Disciplina do rascunho');
  await page.getByLabel('Observação (OBS)').fill('Observação que precisa voltar');
  await page.getByLabel('Conteúdo da aula de 04/08').fill('Assunto editado');

  await page.reload();
  await expect(page.getByLabel('Nome da disciplina')).toHaveValue('Disciplina do rascunho');
  await expect(page.getByLabel('Código', { exact: true })).toHaveValue('EXE101');
  await expect(page.getByLabel('Início da aula')).toHaveValue('19:00');
  await expect(page.getByLabel('Último dia de aulas')).toHaveValue('2026-12-10');
  await expect(page.getByRole('group', { name: 'Dias da semana' }).getByRole('button', { name: 'Terça-feira' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('list', { name: 'Dias sem aula' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByLabel('Motivo de 08/09/2026')).toHaveValue('Semana Pedagógica');
  await expect(page.getByLabel('Conteúdo da aula de 04/08')).toHaveValue('Assunto editado');
  await expect(page.getByLabel('Título', { exact: true }).first()).toHaveValue('Prova 1 — exemplo');
  await expect(page.getByLabel('Observação (OBS)')).toHaveValue('Observação que precisa voltar');
  await expect(page.getByText('Rascunho salvo neste navegador')).toBeVisible();

  // Vai para a conferência e volta: o formulário reaparece preenchido.
  await page.getByRole('button', { name: 'Gerar aulas e conferir' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao plano' }).click();
  await expect(page.getByLabel('Nome da disciplina')).toHaveValue('Disciplina do rascunho');
  await expect(page.getByLabel('Conteúdo da aula de 04/08')).toHaveValue('Assunto editado');
  await expect(page.getByLabel('Observação (OBS)')).toHaveValue('Observação que precisa voltar');
});

test('limpar rascunho pede confirmação e zera o formulário', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  await expect(page.getByText('Rascunho salvo neste navegador')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar rascunho' }).click();
  // Cancelar mantém tudo.
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByLabel('Nome da disciplina')).toHaveValue(/Introdução à Engenharia/);
  await page.getByRole('button', { name: 'Limpar rascunho' }).click();
  await page.getByRole('button', { name: 'Sim, limpar' }).click();
  await expect(page.getByLabel('Nome da disciplina')).toHaveValue('');
  await expect(page.getByLabel('Início da aula')).toHaveValue('');
  await expect(page.getByText('Rascunho salvo neste navegador')).toHaveCount(0);
  await expect(page.getByText(/Preencha os campos para ver quantas aulas/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('semestre:draft:v1'))).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Nome da disciplina')).toHaveValue('');
});

test('rascunho inválido ou antigo é ignorado sem quebrar a página', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { if (!sessionStorage.getItem('semestre:draft-seed')) { sessionStorage.setItem('semestre:draft-seed', '1'); localStorage.setItem('semestre:draft:v1', JSON.stringify({ version: 0, form: { course: 'antigo' } })); } });
  await page.goto('/');
  await expect(page.getByLabel('Nome da disciplina')).toHaveValue('');
  await expect(page.getByText('Rascunho salvo neste navegador')).toHaveCount(0);
  expect(errors).toEqual([]);
});
