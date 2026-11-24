import { test, expect } from '@playwright/test';

test('páginas de privacidade e termos existem, têm contato e o rodapé do app leva até elas', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('semestre:role', 'student'));
  const violations: string[] = [];
  page.on('console', message => { if (/Content Security Policy/i.test(message.text())) violations.push(message.text()); });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Documentos legais' }).getByRole('link', { name: 'Privacidade' }).click();
  await expect(page).toHaveURL(/\/privacidade\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible();
  for (const text of ['calendar.app.created', 'Uso Limitado', 'não são enviados para nenhum servidor do Semestre', 'caronasunifal@gmail.com']) await expect(page.locator('main')).toContainText(text);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(246, 241, 230)'); // legal.css aplicado
  await page.getByRole('link', { name: 'Termos de Uso' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeVisible();
  await expect(page.locator('main')).toContainText('Não tem vínculo institucional');
  await expect(page.getByRole('link', { name: 'Política de Privacidade' }).first()).toHaveAttribute('href', '/privacidade.html');
  expect(violations).toEqual([]);
});
