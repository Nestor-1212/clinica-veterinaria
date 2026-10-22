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
    await page.locator('a.kpi--enlace').first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/pagos$/);
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

  test('el dashboard del admin abre en Negocio y respeta la vista pedida en la URL', async ({ page }) => {
    await login(page, 'admin');
    await expect(page.getByRole('tab', { name: 'Negocio' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Ingresos de los últimos 6 meses' })).toBeVisible();
    await page.goto('/dashboard?vista=clientes');
    await expect(page.getByRole('tab', { name: 'Clientes' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Para recuperar' })).toBeVisible();
  });

  test('recepción ve su jornada y no ve el negocio ni secciones sin permiso', async ({ page }) => {
    await login(page, 'recepcion');
    await expect(page.getByRole('tab')).toHaveText(['Hoy', 'Clientes']);
    await expect(page.getByRole('heading', { name: 'Agenda de hoy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirmar citas' })).toBeVisible();
    await expect(page.locator('main a[href="/consultas"]')).toHaveCount(0);
    await expect(page.getByText('Ingresos del mes')).toHaveCount(0);
  });

  test('veterinario no ve ingresos ni pagos en el dashboard', async ({ page }) => {
    await login(page, 'veterinario');
    await expect(page.getByRole('tab')).toHaveText(['Hoy', 'Clientes']);
    await expect(page.getByRole('heading', { name: 'Agenda de hoy' })).toBeVisible();
    await expect(page.locator('main a[href="/pagos"]')).toHaveCount(0);
    await expect(page.getByText('Ingresos del mes')).toHaveCount(0);
  });
});
