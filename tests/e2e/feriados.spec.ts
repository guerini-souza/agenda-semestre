import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('semestre:test-init')) { sessionStorage.setItem('semestre:test-init', '1'); localStorage.setItem('semestre:role', 'teacher'); } });
});

const button = 'Adicionar feriados nacionais do período';

test('botão de feriados nacionais fica desabilitado, com dica, até haver dias da semana e datas', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('button', { name: button });
  await expect(add).toBeDisabled();
  await expect(page.getByText('Escolha os dias da semana e as datas do primeiro e do último dia de aulas.')).toBeVisible();
  await page.getByRole('group', { name: 'Dias da semana' }).getByRole('button', { name: 'Segunda-feira' }).click();
  await expect(add).toBeDisabled();
  await page.getByLabel('Primeiro dia de aulas').fill('2026-08-04');
  await page.getByLabel('Último dia de aulas').fill('2026-12-10');
  await expect(add).toBeEnabled();
  await expect(page.getByText('Escolha os dias da semana e as datas')).toHaveCount(0);
});

test('adiciona só os feriados do período que caem em dia de aula, sem repetir', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  const days = page.getByRole('group', { name: 'Dias da semana' });
  const list = page.getByRole('list', { name: 'Dias sem aula' });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  // Terças e quintas: nenhum feriado nacional do período cai nesses dias.
  await page.getByRole('button', { name: button }).click();
  await expect(page.getByText('Nenhum feriado nacional novo cai nos dias de aula deste período.')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(3);
  // Com segunda e sexta entram 07/09, 12/10, 02/11 e 20/11 (15/11 é domingo e fica de fora; 25/12 está depois do período).
  await days.getByRole('button', { name: 'Segunda-feira' }).click();
  await days.getByRole('button', { name: 'Sexta-feira' }).click();
  await page.getByRole('button', { name: button }).click();
  await expect(page.getByText('Feriados nacionais adicionados. Confira e inclua os feriados estaduais e municipais da sua cidade.')).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(7);
  for (const date of ['07/09/2026', '12/10/2026', '02/11/2026', '20/11/2026']) {
    await expect(list.getByRole('listitem').filter({ hasText: date })).toHaveCount(1);
    await expect(page.getByLabel(`Motivo de ${date}`)).toHaveValue('Feriado');
  }
  await expect(list.getByRole('listitem').filter({ hasText: '15/11/2026' })).toHaveCount(0);
  // Clicar de novo não duplica.
  await page.getByRole('button', { name: button }).click();
  await expect(list.getByRole('listitem')).toHaveCount(7);
  await expect(page.getByText('Nenhum feriado nacional novo cai nos dias de aula deste período.')).toBeVisible();
  // As datas viram dias sem aula de verdade: a contagem de aulas considera esses feriados.
  await expect(page.getByRole('status').filter({ hasText: /^Serão criadas \d+ aulas/ })).toBeVisible();
});
