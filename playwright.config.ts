import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas e2e de VetSystem.
 * - Local: usa el Microsoft Edge instalado (channel 'msedge') para no descargar navegadores.
 * - CI (variable CI definida): usa el Chromium que instala `npx playwright install --with-deps chromium`.
 * Si ya hay un dev server en http://localhost:4200 se reutiliza.
 */
const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: isCI
    ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
    : [{ name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !isCI,
    timeout: 180_000
  }
});
