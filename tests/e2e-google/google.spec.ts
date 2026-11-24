import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

// Google simulado: o script de login e as APIs são respondidos aqui. Prova o fluxo da interface e o formato dos pedidos,
// mas NÃO prova que uma conta Google real aceita o aplicativo (isso depende do ID de cliente verdadeiro).
type Body = { id: string; summary: string; colorId?: string; reminders: { overrides: { minutes: number }[] }; start: Record<string, string> };
type State = { created: Body[]; calendarPosts: string[]; eventAttempts: number; rateLimited: number; failAfter?: number; auth: 'ok' | 'denied' | 'closed' | 'partial' };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const apiError = (reason: string) => ({ error: { errors: [{ reason }] } });

async function installGoogle(page: Page, state: State) {
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.google = { accounts: { oauth2: { initTokenClient: function (o) { return { requestAccessToken: function () {
      var mode = window.__authMode || 'ok';
      if (mode === 'denied') o.callback({ error: 'access_denied' });
      else if (mode === 'closed') o.error_callback();
      else if (mode === 'partial') o.callback({ access_token: 'token-de-teste', scope: 'openid' });
      else o.callback({ access_token: 'token-de-teste', scope: 'openid https://www.googleapis.com/auth/calendar.app.created' });
    } }; } } } };` }));
  await page.route('https://openidconnect.googleapis.com/**', route => route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: cors }) : json(route, 200, { sub: 'conta-teste' }));
  await page.route('https://www.googleapis.com/calendar/v3/**', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname.replace('/calendar/v3', '');
    if (path === '/calendars' && request.method() === 'POST') { state.calendarPosts.push(JSON.parse(request.postData() || '{}').summary); return json(route, 200, { id: 'agenda-teste' }); }
    if (/^\/calendars\/[^/]+\/events$/.test(path) && request.method() === 'GET') return path.includes('apagada') ? json(route, 404, apiError('notFound')) : json(route, 200, { items: [] });
    if (/^\/calendars\/[^/]+\/events$/.test(path) && request.method() === 'POST') {
      state.eventAttempts++;
      if (state.rateLimited > 0) { state.rateLimited--; return json(route, 403, apiError('rateLimitExceeded')); }
      if (state.failAfter !== undefined && state.created.length >= state.failAfter) return json(route, 401, {});
      const body = JSON.parse(request.postData() || '{}') as Body; state.created.push(body); return json(route, 200, { id: body.id });
    }
    return json(route, 404, apiError('notFound'));
  });
  await page.addInitScript(mode => { (window as unknown as { __authMode: string }).__authMode = mode; }, state.auth);
}
const newState = (patch: Partial<State> = {}): State => ({ created: [], calendarPosts: [], eventAttempts: 0, rateLimited: 0, auth: 'ok', ...patch });
async function toExport(page: Page) {
  await page.addInitScript(() => localStorage.setItem('semestre:role', 'student'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar exemplo' }).click();
  await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
  await expect(page.getByRole('button', { name: 'Adicionar ao Google' })).toBeEnabled();
}
const setAuth = (page: Page, mode: State['auth']) => page.evaluate(m => { (window as unknown as { __authMode: string }).__authMode = m; }, mode);

test('envia os 11 eventos do exemplo ao Google, com cores e lembretes, e mostra o link da agenda', async ({ page }) => {
  const state = newState(); await installGoogle(page, state); await toExport(page);
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByText('Pronto! Seus eventos estão no Google Agenda.')).toBeVisible();
  await expect(page.locator('.report-counts')).toContainText('11 criados');
  expect(state.calendarPosts).toHaveLength(1); expect(state.calendarPosts[0]).toMatch(/^Meu semestre · /);
  expect(state.created).toHaveLength(11);
  expect(new Set(state.created.map(e => e.id)).size).toBe(11);
  const exam = state.created.find(e => e.summary.includes('Prova 1'))!;
  expect(exam.colorId).toBe('11'); expect(exam.reminders.overrides.map(r => r.minutes)).toEqual([60, 1440]);
  const lesson = state.created.find(e => e.summary.startsWith('Aula'))!;
  expect(lesson.colorId).toBeUndefined(); expect(lesson.reminders.overrides.map(r => r.minutes)).toEqual([30]);
  const link = page.getByRole('link', { name: /Ver no Google Agenda/ });
  await expect(link).toHaveAttribute('href', 'https://calendar.google.com/calendar/r/month/2026/10/1');
  await expect(page.getByRole('button', { name: 'Adicionar ao Google' })).toBeDisabled(); // já enviado: não duplica por engano
});

test('permissão negada e janela fechada mostram mensagem clara e não enviam nada', async ({ page }) => {
  const state = newState({ auth: 'denied' }); await installGoogle(page, state); await toExport(page);
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Autorização não concedida' })).toBeVisible();
  await setAuth(page, 'closed');
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'fechada ou bloqueada' })).toBeVisible();
  expect(state.calendarPosts).toHaveLength(0); expect(state.created).toHaveLength(0);
  await setAuth(page, 'ok'); // depois de autorizar, funciona na mesma tela
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByText('Pronto! Seus eventos estão no Google Agenda.')).toBeVisible();
});

test('permissão da agenda desmarcada na tela do Google: explica o que fazer e funciona ao tentar de novo', async ({ page }) => {
  const state = newState({ auth: 'partial' }); await installGoogle(page, state); await toExport(page);
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Faltou a permissão da agenda' })).toContainText('deixe marcada a opção');
  expect(state.calendarPosts).toHaveLength(0); expect(state.created).toHaveLength(0); // nada foi criado sem a permissão
  await setAuth(page, 'ok');
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByText('Pronto! Seus eventos estão no Google Agenda.')).toBeVisible();
  expect(state.created).toHaveLength(11);
});

test('limite de taxa do Google: espera, tenta de novo e conclui sem perder evento', async ({ page }) => {
  const state = newState({ rateLimited: 2 }); await installGoogle(page, state); await toExport(page);
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByText('Pronto! Seus eventos estão no Google Agenda.')).toBeVisible({ timeout: 40000 });
  expect(state.created).toHaveLength(11); expect(state.eventAttempts).toBe(13);
});

test('autorização que expira no meio: pausa, oferece nova tentativa e envia só o que faltou', async ({ page }) => {
  const state = newState({ failAfter: 3 }); await installGoogle(page, state); await toExport(page);
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByRole('heading', { name: 'Alguns eventos precisam de uma nova tentativa.' })).toBeVisible();
  await expect(page.locator('.report-counts')).toContainText('3 criados'); await expect(page.locator('.report-counts')).toContainText('8 não adicionados');
  expect(state.created).toHaveLength(3);
  state.failAfter = undefined;
  await page.getByRole('button', { name: 'Tentar novamente no Google' }).click();
  await expect(page.getByText('Pronto! Seus eventos estão no Google Agenda.')).toBeVisible();
  expect(state.created).toHaveLength(11); expect(new Set(state.created.map(e => e.id)).size).toBe(11); // nenhum evento repetido
  expect(state.calendarPosts).toHaveLength(1); // a mesma agenda foi reaproveitada
});

test('se a agenda guardada foi apagada no Google, o app cria uma nova e envia os eventos', async ({ page }) => {
  const state = newState(); await installGoogle(page, state); await toExport(page);
  const title = await page.getByLabel('Nome do calendário').inputValue();
  await page.evaluate(([key]) => localStorage.setItem(key, JSON.stringify({ calendarId: 'apagada' })), [`semestre:v1:conta-teste:${title.trim()}`]);
  await page.getByRole('button', { name: 'Adicionar ao Google' }).click();
  await expect(page.getByText('Pronto! Seus eventos estão no Google Agenda.')).toBeVisible();
  expect(state.calendarPosts).toHaveLength(1); expect(state.created).toHaveLength(11);
});

test('navegador normal não mostra o aviso de navegador interno', async ({ page }) => {
  const state = newState(); await installGoogle(page, state); await toExport(page);
  await expect(page.getByText(/Você está dentro/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Adicionar ao Google' })).toBeEnabled();
});

test.describe('aberto pelo navegador embutido do Instagram', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 312.0.0.34.111 (iPhone14,5; iOS 17_0; pt_BR; pt-BR; scale=3.00; 1170x2532; 551934723)' });
  test('avisa que o Google bloqueia o login ali, oferece copiar o link e não bloqueia o botão', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const state = newState(); await installGoogle(page, state); await toExport(page);
    const notice = page.getByRole('status').filter({ hasText: 'Você está dentro do Instagram.' });
    await expect(notice).toContainText('abra este endereço no Safari ou no Chrome');
    await notice.getByRole('button', { name: 'Copiar link' }).click();
    await expect(notice.getByRole('button', { name: 'Link copiado' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://127.0.0.1:5174/');
    await expect(page.getByRole('button', { name: 'Adicionar ao Google' })).toBeEnabled(); // pode ser engano de detecção: não bloqueia
  });
});
