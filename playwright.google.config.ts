import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
// Testes do envio ao Google Agenda com o Google SIMULADO (nenhuma conta real). Sobem um servidor próprio com um ID de cliente de teste.
if (existsSync('.playwright-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.playwright-browsers');
export default defineConfig({
  testDir: './tests/e2e-google', timeout: 120000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1, reporter: 'list',
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 120000, env: { VITE_GOOGLE_CLIENT_ID: 'teste-simulado.apps.googleusercontent.com' } },
  use: { baseURL: 'http://127.0.0.1:5174', screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});
