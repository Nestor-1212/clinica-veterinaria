import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('desde Mascotas, la atención inmediata abre con esa mascota elegida (filtro Con alergias)', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/mascotas');
  await page.getByRole('button', { name: /^Con alergias/ }).click();
  await expect(page.locator('.alergia').first()).toBeVisible();

  const nombre = (await page.locator('.c-paciente .nombre a').first().innerText()).trim();
  await page.getByRole('button', { name: `Iniciar atención inmediata para ${nombre}` }).first().click();
  await expect(page).toHaveURL(/\/citas\/nueva\?.*mascotaId=.*tipo=inmediata/);
  await expect(page.getByRole('radio', { name: new RegExp(nombre) })).toBeChecked();
  await expect(page.locator('.ficha-alergia')).toBeVisible();
});

test('registrar mascota: especie y sexo en un toque, raza sugerida y vuelve al expediente del dueño', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/mascotas/nueva');
  await page.getByRole('combobox', { name: 'Propietario' }).click();
  await page.getByRole('option', { name: /Ana Castillo/ }).click();
  await page.locator('input[formControlName="nombre"]').fill('E2E Luna');
  await page.getByRole('radio', { name: 'Gato' }).check();
  await page.getByRole('radio', { name: 'Hembra' }).check();
  await page.locator('input[formControlName="raza"]').fill('sia');
  await page.getByRole('option', { name: 'Siamés' }).click();
  await page.locator('input[formControlName="color"]').fill('Crema');
  await page.locator('input[formControlName="edad"]').fill('2');
  await page.locator('input[formControlName="peso"]').fill('3.8');
  await expect(page.locator('.previa-nombre')).toHaveText('E2E Luna');
  await page.getByRole('button', { name: /Registrar mascota$/ }).click();
  await expect(page).toHaveURL(/\/clientes\/[^/]+$/);
  await expect(page.getByText('E2E Luna').first()).toBeVisible();
});
