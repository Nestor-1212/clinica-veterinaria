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
