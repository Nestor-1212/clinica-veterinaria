import { test, expect } from '@playwright/test';
import { elegirOpcion, leerColeccion, login } from './helpers';

interface CitaLS { id: string; estado: string; motivo: string }
interface ConsultaLS { id: string; citaId?: string; tipo: string; diagnostico: string }

test('atención inmediata → consulta queda vinculada, tipo inmediata y cita completada (B1/B2)', async ({ page }) => {
  await login(page, 'veterinario');

  await page.goto('/citas/nueva?tipo=inmediata');
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Atención Inmediata');

  // Ana Castillo tiene una sola mascota (Max) en la semilla demo: se autoselecciona.
  await elegirOpcion(page, 'Propietario', 'Ana Castillo');
  await elegirOpcion(page, 'Veterinario', /Carlos/);
  await page.locator('textarea[formControlName="motivo"]').fill('E2E urgencia por vómitos');
  await page.getByRole('button', { name: /Iniciar Atención/ }).click();

  await expect(page).toHaveURL(/\/consultas\/nueva\?.*citaId=/);
  const citaId = new URL(page.url()).searchParams.get('citaId');
  expect(citaId).toBeTruthy();

  // B2: abrir el formulario NO debe completar la cita todavía.
  let citas = await leerColeccion<CitaLS>(page, 'vet_citas');
  expect(citas.find(c => c.id === citaId)?.estado).toBe('inmediata');

  await page.locator('input[formControlName="temperatura"]').fill('38.6');
  await page.locator('textarea[formControlName="sintomas"]').fill('Vómitos desde anoche');
  await page.locator('textarea[formControlName="diagnostico"]').fill('E2E gastroenteritis');
  await page.locator('textarea[formControlName="tratamiento"]').fill('Dieta blanda');
  await page.getByRole('button', { name: /Guardar sin receta/ }).click();
  await expect(page).toHaveURL(/\/consultas$/);

  const consultas = await leerColeccion<ConsultaLS>(page, 'vet_consultas');
  const consulta = consultas.find(c => c.diagnostico === 'E2E gastroenteritis');
  expect(consulta?.citaId).toBe(citaId);
  expect(consulta?.tipo).toBe('inmediata');

  citas = await leerColeccion<CitaLS>(page, 'vet_citas');
  expect(citas.find(c => c.id === citaId)?.estado).toBe('completada');
});

test('recepción registra atención inmediata y vuelve a Citas (no a Consultas)', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/citas/nueva?tipo=inmediata');
  await elegirOpcion(page, 'Propietario', 'Ana Castillo');
  await elegirOpcion(page, 'Veterinario', /Carlos/);
  await page.locator('textarea[formControlName="motivo"]').fill('E2E recepción inmediata');
  await page.getByRole('button', { name: /Iniciar Atención/ }).click();
  await expect(page).toHaveURL(/\/citas$/);
  const citas = await leerColeccion<CitaLS>(page, 'vet_citas');
  expect(citas.find(c => c.motivo === 'E2E recepción inmediata')?.estado).toBe('inmediata');
});
