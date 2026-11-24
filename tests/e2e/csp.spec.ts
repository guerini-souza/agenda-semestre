import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { resolve } from 'node:path';

// Estes testes só têm sentido num servidor que aplique os cabeçalhos do vercel.json (o Vite em desenvolvimento e o `vite preview` não aplicam).
// Rode: npm run build && node scripts/serve-with-headers.mjs  e  TEST_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/csp.spec.ts
async function hasCsp(page: Page) {
  const response = await page.goto('/');
  return Boolean(response?.headers()['content-security-policy']);
}

function watchViolations(page: Page) {
  const violations: string[] = [];
  page.on('console', message => { if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text()); });
  page.on('pageerror', error => { if (/Content Security Policy/i.test(error.message)) violations.push(error.message); });
  return violations;
}
const listen = (page: Page) => page.addInitScript(() => {
  (window as unknown as { __csp: string[] }).__csp = [];
  document.addEventListener('securitypolicyviolation', event => (window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}:${event.columnNumber} ${event.sample}`));
});
const reported = (page: Page) => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp ?? []);

test('cabeçalhos de segurança chegam com o conteúdo', async ({ page }) => {
  test.skip(!(await hasCsp(page)), 'Servidor sem cabeçalhos: use scripts/serve-with-headers.mjs (porta 4173).');
  const headers = (await page.goto('/'))!.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("object-src 'none'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
});

test('o fluxo completo (planilha, PDF com texto, OCR, plano do professor e PDFs) roda sem violar a CSP', async ({ page }) => {
  test.skip(!(await hasCsp(page)), 'Servidor sem cabeçalhos: use scripts/serve-with-headers.mjs (porta 4173).');
  const consoleViolations = watchViolations(page);
  await listen(page);
  await page.addInitScript(() => { if (!sessionStorage.getItem('semestre:csp-init')) { sessionStorage.setItem('semestre:csp-init', '1'); localStorage.setItem('semestre:role', 'student'); } });
  await page.goto('/');
  // Aluno: planilha + PDF com texto + PDFs escaneado e misto (OCR em worker com WebAssembly).
  await page.locator('input[type=file]').setInputFiles(['grade-sintetica.xlsx', 'plano-textual-sintetico.pdf', 'plano-escaneado-sintetico.pdf', 'plano-misto-sintetico.pdf'].map(name => resolve('tests/fixtures', name)));
  await page.getByRole('button', { name: 'Ler meus arquivos' }).click();
  await expect(page.getByRole('heading', { name: 'Seus eventos, organizados.' })).toBeVisible({ timeout: 90000 });
  await page.getByText('Consultar o texto dos arquivos').click();
  await page.locator('summary').filter({ hasText: /plano-escaneado-sintetico.pdf ·/ }).click();
  await expect(page.locator('pre:visible').filter({ hasText: /Prova|PROVA/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  // Professor: formulário, rascunho, PDFs gerados no navegador (blob) e ICS.
  await page.getByRole('group', { name: 'Perfil' }).getByRole('button', { name: 'Professor' }).click();
  await page.getByRole('button', { name: 'Voltar ao plano' }).click().catch(() => undefined);
  await page.getByRole('button', { name: 'Preencher com um exemplo' }).click();
  const plan = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar plano de aula (PDF)' }).click();
  await plan;
  await page.getByRole('button', { name: 'Gerar aulas e conferir' }).click();
  await page.getByRole('button', { name: 'Adicionar à minha agenda' }).click();
  const ics = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar arquivo de calendário' }).click();
  await ics;
  expect(consoleViolations).toEqual([]);
  expect(await reported(page)).toEqual([]);
});

test('a política libera o Google e bloqueia qualquer outro destino', async ({ page }) => {
  test.skip(!(await hasCsp(page)), 'Servidor sem cabeçalhos: use scripts/serve-with-headers.mjs (porta 4173).');
  await listen(page);
  // Respostas falsas: nada sai do computador. O que se testa é se a política deixa o pedido sair do navegador.
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'text/javascript', body: 'window.__gsiLoaded = true;' }));
  await page.route('https://www.googleapis.com/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
  await page.route('https://example.com/**', route => route.fulfill({ contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'nao deveria chegar' }));
  await page.goto('/');
  const gsi = await page.evaluate(() => new Promise<boolean>(done => {
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => done(Boolean((window as unknown as { __gsiLoaded?: boolean }).__gsiLoaded)); script.onerror = () => done(false);
    document.head.append(script);
  }));
  expect(gsi).toBe(true);
  expect(await page.evaluate(async () => (await (await fetch('https://www.googleapis.com/calendar/v3/test')).json()).ok)).toBe(true);
  // Controle negativo: um host fora da lista precisa ser bloqueado pela política.
  expect(await page.evaluate(() => fetch('https://example.com/').then(() => 'liberado', () => 'bloqueado'))).toBe('bloqueado');
  expect((await reported(page)).some(item => item.includes('example.com'))).toBe(true);
  // Script de outro domínio não carrega.
  await page.route('https://cdn.example.org/x.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.__x = 1' }));
  const external = await page.evaluate(() => new Promise<string>(done => { const s = document.createElement('script'); s.src = 'https://cdn.example.org/x.js'; s.onload = () => done('carregou'); s.onerror = () => done('bloqueado'); document.head.append(s); }));
  expect(external).toBe('bloqueado');
});
