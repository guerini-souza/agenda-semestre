import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const appOrigin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
// Com o Google ligado, a etapa de exportar carrega o script de login do Google. Só ele é permitido; qualquer outro host externo continua falhando o teste.
const googleLogin = (url: string) => url.startsWith('https://accounts.google.com/gsi/');

// Terças e quintas de 04/08 a 10/12/2026, menos os dias sem aula do exemplo do construtor.
function exampleClassCount() {
  const skip = new Set(['2026-09-08', '2026-10-15', '2026-11-12']);
  let count = 0;
  for (let day = new Date('2026-08-04T12:00:00Z'); day <= new Date('2026-12-10T12:00:00Z'); day = new Date(day.getTime() + 86400000)) {
    const iso = day.toISOString().slice(0, 10);
    if ([2, 4].includes(day.getUTCDay()) && !skip.has(iso)) count++;
  }
  return count;
}

test('primeira visita pergunta o perfil e lembra a escolha', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Sou aluno/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sou professor/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Sou professor/ }).click();
  await expect(page.getByRole('heading', { name: 'Seu plano de ensino na agenda.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Seu plano de ensino na agenda.' })).toBeVisible();
  await page.getByRole('group', { name: 'Perfil' }).getByRole('button', { name: 'Aluno' }).click();
  await expect(page.getByRole('heading', { name: 'Seu semestre na agenda.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explorar exemplo' })).toBeVisible();
});

test('professor monta o plano, vê no calendário e baixa o ICS sem requisições externas', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('semestre:role', 'teacher'));
  const external: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(appOrigin) && !googleLogin(request.url())) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  // Validação: formulário vazio explica o que falta.
  await page.getByRole('button', { name: 'Gerar aulas e conferir' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Informe o nome da disciplina.' })).toBeVisible();
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  const classes = exampleClassCount();
  await expect(page.getByRole('status').filter({ hasText: `Serão criadas ${classes} aulas e 3 avaliações.` })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar aulas e conferir' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible();
  await expect(page.locator('.summary-number')).toHaveText(`${classes + 3}eventos selecionados`);
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar ao plano' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar arquivo de calendário' }).click();
  const calendar = (await readFile((await (await downloadPromise).path())!, 'utf8')).replace(/\r\n[ \t]/g, '');
  expect((calendar.match(/BEGIN:VEVENT/g) || []).length).toBe(classes + 3);
  expect(calendar).toContain('Prova final — exemplo');
  expect(calendar).toContain('LOCATION:Sala exemplo 3');
  expect(calendar).toContain('Código: EXE101');
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('professor consegue usar o plano no celular sem rolagem lateral', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('semestre:role', 'teacher'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Gerar aulas e conferir' }).click();
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('professor baixa o plano de aula em PDF e o aluno importa esse mesmo PDF', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('semestre:role', 'teacher'));
  const external: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(appOrigin)) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  // Sem dados, o botão explica o que falta em vez de gerar um PDF vazio.
  await page.getByRole('button', { name: 'Baixar plano de aula (PDF)' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Informe o nome da disciplina.' })).toBeVisible();
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^\d+ de \d+ aulas com conteúdo/ })).toBeVisible();
  await page.getByLabel('Cabeçalho do documento').fill('Instituição Exemplo\nCurso Exemplo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar plano de aula (PDF)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('plano-de-aula-EXE101-introducao-a-engenharia-exemplo.pdf');
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  // O aluno lê o PDF gerado: 35 aulas/avaliações; os três dias sem aula não viram evento.
  await page.getByRole('group', { name: 'Perfil' }).getByRole('button', { name: 'Aluno' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'plano.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.summary-number')).toHaveText('35eventos selecionados');
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Prova final — exemplo' })).toBeVisible();
  expect(external).toEqual([]); expect(errors).toEqual([]);
});
