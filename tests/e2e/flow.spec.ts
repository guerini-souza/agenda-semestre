import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LIMITS } from '../../src/lib/domain/types';
const appOrigin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
// Com o Google ligado, a etapa de exportar carrega o script de login do Google. Só ele é permitido; qualquer outro host externo continua falhando o teste.
const googleLogin = (url: string) => url.startsWith('https://accounts.google.com/gsi/');
// Estes cenários cobrem o fluxo do aluno; a escolha de perfil é testada em roles.spec.ts.
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('semestre:role', 'student')); });

for (const format of ['xls', 'xlsx']) {
  test(`grade real ${format}: exporta todas as 180 aulas com código e sala sem geração manual`, async ({ page }) => {
    test.skip(!existsSync('Horarios (1).xls'), 'Amostras pessoais não fazem parte do repositório.');
    let buffer = await readFile('Horarios (1).xls');
    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const { default: ExcelJS } = await import('exceljs');
      const source = XLSX.read(buffer);
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Horários').addRows(XLSX.utils.sheet_to_json(source.Sheets[source.SheetNames[0]], { header: 1 }));
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    }
    await page.goto('/');
    await page.locator('input[type=file]').setInputFiles({ name: `grade.${format}`, mimeType: 'application/octet-stream', buffer });
    await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
    await expect(page.locator('.summary-number')).toHaveText('180eventos selecionados');
    await expect(page.getByRole('heading', { name: 'Aula · Ciências Ambientais (ICT128)', exact: true }).first()).toBeVisible();
    // A second reading preserves the selection without multiplying occurrences.
    await page.getByRole('button', { name: 'Voltar aos arquivos' }).click();
    await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
    await expect(page.locator('.summary-number')).toHaveText('180eventos selecionados');
    await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar arquivo de calendário' }).click();
    const download = await downloadPromise;
    const calendar = (await readFile((await download.path())!, 'utf8')).replace(/\r\n[ \t]/g, '');
    expect((calendar.match(/BEGIN:VEVENT/g) || []).length).toBe(180);
    const environmental = calendar.split('BEGIN:VEVENT').filter(event => event.includes('SUMMARY:Aula · Ciências Ambientais (ICT128)'));
    expect(environmental).toHaveLength(20);
    for (const event of environmental) {
      expect(event).toContain('LOCATION:PC-B-113');
      expect(event).toContain('Código: ICT128');
      expect(event).toContain('Turma: D');
    }
    expect(environmental[0]).toContain('DTSTART:20260804T001500Z');
    expect(environmental.at(-1)).toContain('DTEND:20261215T021500Z');
  });
}

test('XLSX sem período pede datas e não omite aulas silenciosamente', async ({ page }) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Grade').addRows([
    ['Disciplina', 'Tipo', 'Titulo', 'Data', 'Inicio', 'Fim', 'Dia da semana', 'Inicio do periodo', 'Fim do periodo', 'Local'],
    ['Exemplo', 'Aula semanal', '', '', '14:00', '16:00', 'segunda', '', '', 'Sala exemplo'],
    ['Exemplo', 'Prova', 'Prova exemplo', '10/08/2026', '', '', '', '', '', 'Sala exemplo'],
  ]);
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({ name: 'sem-periodo.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeDisabled();
  await page.getByRole('button', { name: 'Só avaliações', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
  await page.getByRole('button', { name: 'Aulas e avaliações', exact: true }).click();
  await page.getByLabel('Primeiro dia de aulas').fill('2026-08-03');
  await page.getByLabel('Último dia de aulas').fill('2026-08-17');
  await page.getByRole('button', { name: 'Atualizar aulas', exact: true }).click();
  await expect(page.locator('.summary-number')).toHaveText('4eventos selecionados');
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
  await page.getByLabel('Último dia de aulas').fill('2026-08-10');
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeDisabled();
  await page.getByRole('button', { name: 'Atualizar aulas', exact: true }).click();
  await expect(page.locator('.summary-number')).toHaveText('3eventos selecionados');
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
});

test('demonstração segue direto e gera ICS sem exigir duração, no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Seu semestre na agenda.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Explorar exemplo' }).click();
  await expect(page.getByRole('button', { name: /Confirmar.*evento|Confirmar seleção/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
  const delivery = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Entrega do projeto — exemplo sintético' }) });
  await expect(delivery.getByText('Dia inteiro', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar aos arquivos' }).click();
  await page.getByRole('button', { name: 'Voltar à revisão' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
  await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar arquivo de calendário' }).click();
  const download = await downloadPromise; const path = await download.path();
  const ics = await readFile(path!, 'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR'); expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(11);
  expect(ics).toContain('DTSTART;VALUE=DATE:20261023');
  // Sem ID de cliente do Google, o app oferece o arquivo .ics com instruções; com ID, oferece o envio direto.
  const direct = page.getByRole('button', { name: 'Adicionar ao Google' });
  if (await direct.count()) { await expect(direct).toBeEnabled(); } else {
    await expect(page.getByRole('button', { name: 'Usar no Google com arquivo' })).toBeEnabled();
    const googleFile = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Usar no Google com arquivo' }).click();
    await googleFile;
    await expect(page.getByRole('heading', { name: 'Importar no Google Agenda' })).toBeVisible();
  }

  await page.getByRole('button', { name: /Vai usar no iPhone/ }).click();
  await expect(page.getByText(/Baixar pelo Safari não garante/)).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-export.png', fullPage: true });
});

test('XLSX e PDF sintéticos preservam arquivo inválido sem perder resultados', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles([resolve('tests/fixtures/grade-sintetica.xlsx'), resolve('tests/fixtures/plano-textual-sintetico.pdf')]);
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible();
  await expect(page.locator('article.event-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Voltar aos arquivos' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'invalido.pdf', mimeType: 'application/pdf', buffer: Buffer.from('isto nao e um pdf') });
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('button', { name: 'Tentar de novo' }).last()).toBeVisible();
  await expect(page.locator('article.event-card').first()).toBeVisible();
});

test('OCR de PDF escaneado e misto usa somente recursos locais', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(appOrigin)) external.push(request.url()); });
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles([resolve('tests/fixtures/plano-escaneado-sintetico.pdf'), resolve('tests/fixtures/plano-misto-sintetico.pdf')]);
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible({ timeout: 90000 });
  await page.getByText('Consultar o texto dos arquivos').click();
  await page.locator('summary').filter({ hasText: /plano-escaneado-sintetico.pdf ·/ }).click();
  await expect(page.locator('pre').filter({ hasText: /Prova|PROVA/ }).first()).toBeVisible();
  expect(external).toEqual([]);
});

test('amostras reais: grade reconhecida e PDFs lidos sem envio remoto', async ({ page }) => {
  test.skip(!existsSync('Horarios (1).xls'), 'Amostras pessoais não fazem parte do repositório.');
  const external: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(appOrigin) && !googleLogin(request.url())) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(['Horarios (1).xls', 'PlanoAulaGProdutos2026_2.pdf', 'PlanoAulaGIndSegTrab2026_2.pdf', 'ProgramaEnsino_Ciências Ambientais  (ICT128).pdf'].map(name => resolve(name)));
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByText(/9 horário\(s\) semanal\(is\) encontrado/)).toBeVisible({ timeout: 90000 });
  const count = await page.locator('article.event-card').count(); expect(count).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Só avaliações', exact: true }).click();
  await expect(page.locator('article.event-card')).toHaveCount(14);
  await expect(page.getByRole('button', { name: 'Adicionar à minha agenda' })).toBeEnabled();
  await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
  const realDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar arquivo de calendário' }).click();
  const realDownload = await realDownloadPromise;
  const calendar = await readFile((await realDownload.path())!, 'utf8');
  expect((calendar.match(/BEGIN:VEVENT/g) || []).length).toBe(14);
  expect((calendar.match(/DTSTART;VALUE=DATE:/g) || []).length).toBe(14);
  await page.getByRole('button', { name: 'Voltar para conferir' }).click();
  await page.getByRole('button', { name: 'Aulas e avaliações', exact: true }).click();

  await page.getByRole('button', { name: 'Atualizar aulas' }).click();
  await expect(page.getByRole('status').filter({ hasText: /ocorrências de aulas geradas/ })).toBeVisible();
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('cancelar OCR libera a interface e preserva o arquivo já lido', async ({ page }) => {
  await page.route('**/ocr/lang/**', async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue().catch(() => undefined); });
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles([resolve('tests/fixtures/grade-sintetica.xlsx'), resolve('tests/fixtures/plano-escaneado-sintetico.pdf')]);
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('status').filter({ hasText: /OCR local/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Leitura cancelada/).first()).toBeVisible();
  await expect(page.locator('article.event-card').first()).toBeVisible();
});

test('PDF acima do limite é recusado e o seguinte ainda pode ser lido', async ({ page }) => {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create(); for (let i = 0; i < LIMITS.pages + 1; i++) pdf.addPage();
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles([{ name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) }, { name: 'grade.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: await readFile('tests/fixtures/grade-sintetica.xlsx') }]);
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByText(new RegExp(`Este arquivo tem ${LIMITS.pages + 1} páginas`))).toBeVisible();
  await expect(page.locator('article.event-card').first()).toBeVisible();
});
