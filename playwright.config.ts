import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
if (existsSync('.playwright-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.playwright-browsers');
export default defineConfig({ testDir: './tests/e2e', timeout: 120000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1, reporter: 'list', use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:5173', screenshot: 'only-on-failure', trace: 'retain-on-failure' } });
