import { expect, Page } from '@playwright/test';

export const CREDENCIALES = {
  admin: { correo: 'admin@clinica.com', password: 'admin123', nombre: 'Admin' },
  veterinario: { correo: 'vet@clinica.com', password: 'vet123', nombre: 'Carlos' },
  recepcion: { correo: 'recepcion@clinica.com', password: 'rec123', nombre: 'María' }
} as const;

export type RolDemo = keyof typeof CREDENCIALES;

/** Inicia sesión con una cuenta demo y espera a llegar al dashboard. */
export async function login(page: Page, rol: RolDemo): Promise<void> {
  const cred = CREDENCIALES[rol];
  await page.goto('/login');
  await page.locator('input[formControlName="correo"]').fill(cred.correo);
  await page.locator('input[formControlName="password"]').fill(cred.password);
  await page.getByRole('button', { name: /Iniciar Sesión/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Bienvenido, ${cred.nombre}`);
}

/** Lee una colección del localStorage de la app. */
export async function leerColeccion<T>(page: Page, clave: string): Promise<T[]> {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), clave);
}

/** Abre un mat-select por su etiqueta y elige la opción indicada. */
export async function elegirOpcion(page: Page, etiqueta: string, opcion: string | RegExp): Promise<void> {
  await page.getByRole('combobox', { name: etiqueta }).click();
  await page.getByRole('option', { name: opcion }).first().click();
}
