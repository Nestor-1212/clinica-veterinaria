import { test, expect } from '@playwright/test';
import { leerColeccion, login } from './helpers';

interface CitaLS { id: string; estado: string }

test('agenda: un hueco libre abre Nueva cita con veterinario, día y hora puestos', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/citas');
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await expect(page).toHaveURL(/dia=\d{4}-\d{2}-\d{2}/);
  const hueco = page.locator('.tablero .libre').first();
  const etiqueta = (await hueco.getAttribute('aria-label'))!; // "Agendar con Carlos a las 07:00"
  const hora = etiqueta.match(/(\d{2}:\d{2})$/)![1];
  await hueco.click();
  await expect(page).toHaveURL(/\/citas\/nueva\?.*veterinarioId=.*hora=/);
  await expect(page.locator('.hora--elegida')).toHaveText(hora);
  await expect(page.locator('.opcion--elegida')).toHaveCount(1);
});

test('por confirmar: confirmar una cita la quita de la lista', async ({ page }) => {
  await login(page, 'recepcion');
  await page.goto('/citas?vista=confirmar');
  const boton = page.getByRole('button', { name: /^Confirmar la cita de/ }).first();
  await expect(boton).toBeVisible();
  const antes = await page.getByRole('button', { name: /^Confirmar la cita de/ }).count();
  await boton.click();
  await expect(page.getByRole('button', { name: /^Confirmar la cita de/ })).toHaveCount(antes - 1);
  const citas = await leerColeccion<CitaLS>(page, 'vet_citas');
  expect(citas.some(c => c.estado === 'confirmada')).toBe(true);
});
