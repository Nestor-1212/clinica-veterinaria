import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Login por rol', () => {
  test('admin llega al dashboard y ve Usuarios/Reportes', async ({ page }) => {
    await login(page, 'admin');
    const nav = page.locator('nav.sidebar-nav');
    await expect(nav.getByRole('link', { name: 'Usuarios' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Reportes' })).toBeVisible();
  });

  test('veterinario llega al dashboard y no ve Pagos ni Usuarios', async ({ page }) => {
    await login(page, 'veterinario');
    const nav = page.locator('nav.sidebar-nav');
    await expect(nav.getByRole('link', { name: 'Consultas' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Pagos' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  });

  test('recepción llega al dashboard y no ve Consultas', async ({ page }) => {
    await login(page, 'recepcion');
    const nav = page.locator('nav.sidebar-nav');
    await expect(nav.getByRole('link', { name: 'Pagos' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Consultas' })).toHaveCount(0);
  });
});

test.describe('Autorización por URL (S4)', () => {
  test('recepción NO puede entrar a /consultas escribiendo la URL', async ({ page }) => {
    await login(page, 'recepcion');
    await page.goto('/consultas');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('recepción NO puede entrar a /recetas ni /examenes por URL', async ({ page }) => {
    await login(page, 'recepcion');
    await page.goto('/recetas');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/examenes');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('veterinario NO puede entrar a /pagos por URL', async ({ page }) => {
    await login(page, 'veterinario');
    await page.goto('/pagos');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('sin sesión se redirige a /login', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page).toHaveURL(/\/login$/);
  });
});
