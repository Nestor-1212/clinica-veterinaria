import { test, expect } from '@playwright/test';
import { leerColeccion, login } from './helpers';

test('enviar el formulario de cliente vacío muestra los errores, enfoca el primer campo y no navega', async ({ page }) => {
  await login(page, 'admin');
  const antes = (await leerColeccion(page, 'vet_clientes')).length;
  await page.goto('/clientes/nuevo');

  const enviar = page.getByRole('button', { name: /Registrar cliente/ });
  await expect(enviar).toBeEnabled();
  await enviar.click();

  await expect(page).toHaveURL(/\/clientes\/nuevo$/);
  await expect(page.locator('mat-error').first()).toBeVisible();
  await expect(page.locator('input[formControlName="nombre"]')).toBeFocused();
  expect((await leerColeccion(page, 'vet_clientes')).length).toBe(antes);
});
