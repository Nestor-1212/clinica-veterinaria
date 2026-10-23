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

test('laboratorio: al cargar el resultado se adjunta el PDF del laboratorio y queda guardado', async ({ page }) => {
  await login(page, 'veterinario');
  await page.goto('/examenes');
  await page.getByRole('button', { name: /^Pendientes de resultado/ }).click();
  await page.getByRole('button', { name: /^Cargar resultado de/ }).first().click();
  await expect(page).toHaveURL(/\/examenes\/editar\//);

  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  await page.locator('input[type="file"]').setInputFiles({ name: 'hemograma.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByText('hemograma.pdf')).toBeVisible();
  // Un archivo de otro tipo se rechaza con un aviso
  await page.locator('input[type="file"]').setInputFiles({ name: 'datos.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
  await expect(page.getByRole('alert')).toContainText('no es PDF');

  await page.getByRole('button', { name: /Guardar resultado$/ }).click();
  await expect(page).toHaveURL(/\/examenes$/);
  const examenes = await leerColeccion<ExamenLS & { archivos?: { id: string; nombre: string }[] }>(page, 'vet_examenes');
  const conPdf = examenes.find(e => e.archivos?.some(a => a.nombre === 'hemograma.pdf'));
  expect(conPdf).toBeTruthy();
  // El contenido quedó en IndexedDB
  const guardado = await page.evaluate(id => new Promise<number>((ok, mal) => {
    const r = indexedDB.open('vetsystem-archivos');
    r.onsuccess = () => {
      const g = r.result.transaction('archivos').objectStore('archivos').get(id);
      g.onsuccess = () => ok((g.result as Blob | undefined)?.size ?? 0);
      g.onerror = () => mal(g.error);
    };
  }), conPdf!.archivos![0].id);
  expect(guardado).toBe(pdf.length);
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
