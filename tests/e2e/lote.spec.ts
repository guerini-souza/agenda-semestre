import { test, expect } from '@playwright/test';
import { LIMITS } from '../../src/lib/domain/types';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('semestre:role', 'student')); });

/** PDF só de texto (sem OCR): cada página tem texto suficiente para o leitor não acionar o reconhecimento de imagem. */
async function textPdf(pages: number, label: string) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) pdf.addPage().drawText(`${label} pagina ${i}: conteudo de texto suficiente para dispensar o reconhecimento de imagem.`, { x: 40, y: 700, size: 10, font });
  return Buffer.from(await pdf.save());
}
const pdfFile = async (name: string, pages: number) => ({ name, mimeType: 'application/pdf', buffer: await textPdf(pages, name) });

test('aluno com muitas disciplinas: 8 PDFs de 6 páginas (48 no total) entram no mesmo lote', async ({ page }) => {
  const files = await Promise.all(Array.from({ length: 8 }, (_, i) => pdfFile(`disciplina-${i + 1}.pdf`, 6)));
  expect(8).toBeLessThanOrEqual(LIMITS.files); expect(48).toBeLessThanOrEqual(LIMITS.pages);
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(files);
  await expect(page.getByRole('list', { name: 'Arquivos selecionados' }).getByRole('listitem')).toHaveCount(8);
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/páginas PDF por lote/)).toHaveCount(0); // nenhum arquivo foi recusado por limite
  await page.getByText('Consultar o texto dos arquivos').click();
  await expect(page.locator('details.source-file')).toHaveCount(8); // os 8 foram lidos
});

test(`a seleção para no limite de ${LIMITS.files} arquivos e explica`, async ({ page }) => {
  const tiny = await textPdf(1, 'pequeno');
  const files = Array.from({ length: LIMITS.files + 1 }, (_, i) => ({ name: `arquivo-${i + 1}.pdf`, mimeType: 'application/pdf', buffer: Buffer.concat([tiny, Buffer.from(`\n%${i}`)]) }));
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(files);
  await expect(page.getByRole('alert').filter({ hasText: `Você pode selecionar até ${LIMITS.files} arquivos por lote.` })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Arquivos selecionados' }).getByRole('listitem')).toHaveCount(LIMITS.files);
});

test('o limite de páginas é do lote inteiro: o que não cabe é recusado com a conta clara, e o resto é lido', async ({ page }) => {
  const perFile = Math.floor(LIMITS.pages / 2) - 5; // dois cabem (140 de 150); o terceiro estoura o total
  const files = await Promise.all([1, 2, 3].map(n => pdfFile(`longo-${n}.pdf`, perFile)));
  const remaining = LIMITS.pages - 2 * perFile;
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(files);
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByText(new RegExp(`só cabem ${remaining} neste lote`))).toBeVisible({ timeout: 90000 });
  await page.getByText('Consultar o texto dos arquivos').click();
  await expect(page.locator('details.source-file')).toHaveCount(3); // os 3 aparecem; o terceiro sem trechos lidos aparece como erro na lista de avisos
});
