import { test, expect } from '@playwright/test';
import { elegirPaciente, leerColeccion, login } from './helpers';

interface CitaLS { motivo: string; hora: string; veterinarioId: string; estado: string }

test('nueva cita: paciente, veterinario, día en el calendario, hora libre y motivo de un toque', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/citas/nueva');
  await elegirPaciente(page, 'Ana Castillo', /Max/);
  await expect(page.locator('app-selector-paciente .elegida')).toContainText('Max');
  await page.getByRole('radio', { name: /Carlos/ }).check();

  // Mañana siempre tiene horas no pasadas; se elige la primera libre
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  if (manana.getDate() === 1) await page.getByRole('button', { name: /Next month|Mes siguiente/i }).click();
  await page.locator('mat-calendar').getByRole('button', { name: new RegExp(`^${manana.getDate()} de `) }).click();
  const libre = page.locator('.hora:not(.hora--no)').first();
  const hora = (await libre.innerText()).trim();
  await libre.click();

  await page.getByRole('button', { name: 'Vacunación', exact: true }).click();
  await page.getByRole('button', { name: /Programar cita$/ }).click();
  await expect(page).toHaveURL(/\/citas$/);
  const citas = await leerColeccion<CitaLS>(page, 'vet_citas');
  const nueva = citas.find(c => c.motivo === 'Vacunación' && c.hora === hora);
  expect(nueva?.estado).toBe('pendiente');
});
