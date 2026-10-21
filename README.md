# VetSystem — Clínica Veterinaria

Sistema de gestión para una clínica veterinaria (clientes, mascotas, citas, consultas, recetas,
vacunas, laboratorio, pagos, reportes y usuarios). Interfaz en español.

> **Aviso importante: es solo frontend, sin seguridad real.**
> No hay backend. Todos los datos (incluidos los usuarios y sus contraseñas) se guardan en el
> `localStorage` del navegador: cada navegador tiene sus propios datos, se pierden al borrar los
> datos del sitio y cualquiera con las herramientas de desarrollo puede leerlos o modificarlos.
> Los roles y permisos solo controlan la navegación. No usar con datos reales de pacientes o clientes.

## Stack

- Angular 22 (componentes standalone, rutas lazy, guards funcionales, control flow `@if/@for`)
- Angular Material 22 (Material 3) y CDK
- TypeScript 6, RxJS 7.8, zone.js
- Builder `@angular/build:application` (esbuild)
- jsPDF para recetas y comprobantes en PDF
- Pruebas: Vitest (builder `@angular/build:unit-test`, entorno jsdom) y Playwright (e2e)
- Node: `^22.22.3 || ^24.15.0 || >=26.0.0` (Netlify usa Node 24)

## Comandos

| Comando | Descripción |
|---|---|
| `npm ci` | Instala dependencias exactas del `package-lock.json` |
| `npm start` | Servidor de desarrollo en http://localhost:4200 |
| `npm run build` | Build de producción en `dist/clinica-veterinaria/browser` |
| `npm run lint` | ESLint (TypeScript + plantillas, incluye reglas de accesibilidad) |
| `npm test` | Pruebas unitarias (`ng test`; en CI: `npx ng test --watch=false`) |
| `npm run e2e` | Pruebas e2e con Playwright (local: Microsoft Edge instalado; reutiliza el dev server si ya corre) |

Dependencias de desarrollo necesarias para las pruebas (si aún no están en `package.json`):

```bash
npm install -D vitest@^5.0.5 jsdom@^30.1.3 @playwright/test@^1.64.1
```

En CI (`.github/workflows/ci.yml`) se ejecutan lint, build, pruebas unitarias y e2e con Chromium
(`npx playwright install --with-deps chromium`).

## Modo demo y credenciales

El flag `demo` de `src/environments/environment*.ts` (reemplazado en producción vía
`fileReplacements` de `angular.json`) controla la semilla de datos de ejemplo y los botones de
acceso rápido del login. Está activo en ambos entornos porque, sin backend, es la única forma de
tener usuarios iniciales. Si se desactiva en un navegador sin datos, no habrá usuarios para entrar.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@clinica.com | admin123 |
| Veterinario | vet@clinica.com | vet123 |
| Recepción | recepcion@clinica.com | rec123 |

Para volver a los datos de ejemplo: borrar el `localStorage` del sitio y recargar.

## Roles y permisos

La matriz única está en `src/app/core/auth/permisos.ts`; la usan las rutas (`roleGuard`) y el menú lateral.

| Sección | Admin | Veterinario | Recepción |
|---|:-:|:-:|:-:|
| Dashboard, Clientes, Mascotas, Citas, Vacunas | ✔ | ✔ | ✔ |
| Consultas, Recetas, Laboratorio | ✔ | ✔ | |
| Pagos | ✔ | | ✔ |
| Reportes, Usuarios | ✔ | | |

## Estructura

```
src/app/
  core/       modelos, servicios (persistencia en localStorage), guards, permisos, utilidades
  modules/    una carpeta por funcionalidad con sus rutas lazy (*.routes.ts)
  shared/     shell, header, sidebar, diálogo de confirmación, utilidades de UI
e2e/          pruebas Playwright
database/     esquema MySQL de referencia (la app todavía no lo usa)
```

## Despliegue

Netlify (`netlify.toml`): `ng build`, publica `dist/clinica-veterinaria/browser` e incluye la
redirección SPA (`/* → /index.html 200`) para que las rutas profundas no den 404.
