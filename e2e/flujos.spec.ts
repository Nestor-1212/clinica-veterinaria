import { test, expect } from '@playwright/test';
import { leerColeccion, login } from './helpers';

interface CitaLS { id: string; estado: string }

test('búsqueda global: Ctrl+K, escribir y abrir el expediente de la mascota', async ({ page }) => {
  await login(page, 'recepcion');
  await page.keyboard.press('Control+k');
  await page.keyboard.type('Ana Castillo');
  await page.getByRole('option', { name: /Max/ }).first().click();
  await expect(page).toHaveURL(/\/mascotas\/[^/]+$/);
});

test('por confirmar: se seleccionan las citas de un día y se confirman juntas', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/citas?vista=confirmar');
  const filas = page.locator('.fila-confirmar');
  await expect(filas.first()).toBeVisible();
  const delDia = await page.locator('.grupo').first().locator('.fila-confirmar').count();
  const antes = await filas.count();
  await page.locator('.grupo-elegir input').first().check();
  await page.locator('.lote').getByRole('button', { name: /Confirmar (la cita|las \d+ citas)$/ }).click();
  await expect(filas).toHaveCount(antes - delDia);
  const citas = await leerColeccion<CitaLS>(page, 'vet_citas');
  expect(citas.filter(c => c.estado === 'confirmada').length).toBeGreaterThanOrEqual(delDia);
});
