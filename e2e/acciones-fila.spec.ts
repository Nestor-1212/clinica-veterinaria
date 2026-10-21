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
});
