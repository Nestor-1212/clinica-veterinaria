# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal de una clínica veterinaria en Panamá, con tres roles:

- **Administración:** gestiona usuarios, reportes y pagos.
- **Veterinarios:** consultas, recetas, vacunas y laboratorio.
- **Recepción:** clientes, mascotas, citas y cobros.

Cada persona entra desde su propio equipo (PC o celular); no es un equipo compartido por turnos. La interfaz está en español.

## Product Purpose

VetSystem centraliza la operación diaria de la clínica: agenda, expediente de clientes y mascotas, atención médica, recetas en PDF, vacunación, laboratorio, cobros y reportes. El éxito es que el personal complete cada tarea rápido y sin errores, y que cada rol vea solo lo suyo.

## Operating Context

- Jornada clínica: recepción registra citas y atenciones inmediatas; el veterinario atiende, receta y registra vacunas y exámenes; recepción o administración cobran.
- Se usa en escritorio y en móvil.
- La versión publicada en Netlify funciona en **modo demo**, con cuentas de ejemplo de los tres roles.

## Capabilities and Constraints

- SPA en Angular 22 con Angular Material 3. **Todavía no hay backend:** los datos y las cuentas viven en el `localStorage` del navegador. El backend (API + MySQL + autenticación en servidor) está planificado para más adelante.
- Sin backend no existe recuperación de contraseña por correo. Quien olvida su contraseña debe pedir al administrador que se la restablezca desde Usuarios.
- Las cuentas demo (`admin@clinica.com`, `vet@clinica.com`, `recepcion@clinica.com`) se muestran solo con el flag `demo` activo.
- Permisos por rol centralizados en `src/app/core/auth/permisos.ts`.

## Brand Commitments

- Nombre del producto: **VetSystem**, siempre esa grafía y como única marca.
- Identidad teal con naranja de acento, ya implementada como tokens. El sistema visual vigente está en el código (`src/styles/_tokens.scss`, `src/_theme-colors.scss`, `src/styles.scss`).

## Evidence on Hand

- No hay logotipo en archivo: la marca es el icono `pets` de Material Symbols junto al nombre.
- No hay testimonios, clientes, cifras ni datos de contacto reales. El teléfono y el RUC del PDF son de relleno y **no deben presentarse como reales**.

## Product Principles

1. Cada rol ve y hace solo lo que le corresponde; la interfaz no ofrece caminos que el rol no puede completar.
2. La velocidad del trabajo diario manda sobre la decoración.
3. Nunca se finge una capacidad que no existe (recuperación automática de contraseña, facturación fiscal o seguridad de servidor).
4. Los estados se comunican con texto, icono y color, nunca solo con color.

## Accessibility & Inclusion

Objetivo WCAG 2.2 AA: contraste mínimo de 4.5:1 en texto, foco visible, operable por teclado, compatible con lector de pantalla y respeto de `prefers-reduced-motion`.
