import { test, expect } from '@playwright/test';
import { leerColeccion, login } from './helpers';

interface VacunaLS { mascotaId: string; nombre: string; lote: string; proximaFecha: string }
interface ExamenLS { id: string; resultado: string }

test('vacunas: aplicar refuerzo desde la lista registra una nueva dosis con la misma vacuna', async ({ page }) => {
  await login(page, 'veterinario');
  await page.goto('/vacunas');
  const aplicar = page.getByRole('button', { name: /^Aplicar refuerzo de/ }).first();
  await expect(aplicar).toBeVisible();
  await aplicar.click();
  await expect(page).toHaveURL(/\/vacunas\/nueva\?.*mascotaId=.*nombre=/);
  const nombre = await page.locator('input[formControlName="nombre"]').inputValue();
  expect(nombre).not.toBe('');
  await page.locator('input[formControlName="lote"]').fill('E2E-LOTE-1');
  await page.getByRole('button', { name: /Registrar vacuna$/ }).click();
  await expect(page).toHaveURL(/\/vacunas$/);
  const vacunas = await leerColeccion<VacunaLS>(page, 'vet_vacunas');
  const nueva = vacunas.find(v => v.lote === 'E2E-LOTE-1');
  expect(nueva?.nombre).toBe(nombre);
  expect(new Date(nueva!.proximaFecha).getTime()).toBeGreaterThan(Date.now());
});

test('laboratorio: un examen se solicita sin resultado y luego se carga', async ({ page }) => {
  await login(page, 'veterinario');
  await page.goto('/examenes/nuevo');
  await page.locator('#selector-paciente').fill('max');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Hemograma completo', exact: true }).click();
  await page.locator('textarea[formControlName="descripcion"]').fill('E2E control general');
  await page.getByRole('button', { name: /Guardar como pendiente$/ }).click();
  await expect(page).toHaveURL(/\/examenes$/);

  await page.getByRole('button', { name: /^Pendientes de resultado/ }).click();
  await page.getByRole('button', { name: /^Cargar resultado de Hemograma completo/ }).first().click();
  await page.locator('textarea[formControlName="resultado"]').fill('E2E valores normales');
  await page.getByRole('button', { name: /Guardar resultado$/ }).click();
  await expect(page).toHaveURL(/\/examenes$/);
  const examenes = await leerColeccion<ExamenLS>(page, 'vet_examenes');
  expect(examenes.some(e => e.resultado === 'E2E valores normales')).toBe(true);
});
