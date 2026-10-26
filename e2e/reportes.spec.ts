import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { login } from './helpers';

test('reportes: descarga el informe completo y una sección en PDF', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/reportes');

  const [informe] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar informe PDF/ }).click()]);
  expect(informe.suggestedFilename()).toMatch(/^vetsystem-reporte-.+\.pdf$/);
  const contenido = await readFile((await informe.path())!);
  expect(contenido.subarray(0, 5).toString()).toBe('%PDF-');
  expect(contenido.length).toBeGreaterThan(5000);

  // Tras generar, los botones vuelven a estar disponibles
  const seccion = page.getByRole('button', { name: 'Descargar servicios en PDF' });
  await expect(seccion).toBeEnabled();
  const [parcial] = await Promise.all([page.waitForEvent('download'), seccion.click()]);
  expect(parcial.suggestedFilename()).toMatch(/^vetsystem-servicios-.+\.pdf$/);
});
