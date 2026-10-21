import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Acciones dentro de filas clicables (UX C1/C2)', () => {
  test('"Atención inmediata" en Clientes abre la cita, no el expediente', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/clientes');
    await page.getByRole('button', { name: /^Iniciar atención inmediata para/ }).first().click();
    await expect(page).toHaveURL(/\/citas\/nueva\?clienteId=/);
  });

  test('"Eliminar" abre la confirmación sin navegar al expediente', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/clientes');
    await page.getByRole('button', { name: /^Eliminar / }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/clientes$/);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('las métricas del dashboard se activan con teclado', async ({ page }) => {
    await login(page, 'admin');
    await page.locator('a.stat-link').first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/citas$/);
  });

  test('las tarjetas de mascota del expediente se abren con teclado', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/clientes');
    await page.getByRole('button', { name: /^Ver expediente de/ }).first().click();
    await expect(page).toHaveURL(/\/clientes\/[^/]+$/);
    const tarjeta = page.getByRole('link', { name: /^Ver historial médico de/ }).first();
    await tarjeta.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/mascotas\/[^/]+$/);
  });

  test('recepción no ve métricas ni paneles de secciones sin permiso', async ({ page }) => {
    await login(page, 'recepcion');
    await expect(page.locator('a.stat-link[href="/consultas"]')).toHaveCount(0);
    await expect(page.locator('a.stat-link[href="/pagos"]')).toHaveCount(1);
  });

  test('veterinario no ve ingresos ni pagos pendientes en el dashboard', async ({ page }) => {
    await login(page, 'veterinario');
    await expect(page.locator('a.stat-link[href="/pagos"]')).toHaveCount(0);
    await expect(page.getByText('Pagos Pendientes')).toHaveCount(0);
  });
});
