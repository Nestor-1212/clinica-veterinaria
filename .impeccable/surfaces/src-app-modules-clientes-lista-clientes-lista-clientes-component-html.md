---
version: 1
slug: "src-app-modules-clientes-lista-clientes-lista-clientes-component-html"
primary_target: "src/app/modules/clientes/lista-clientes/lista-clientes.component.html"
related_targets: ["src/app/modules/clientes/detalle-cliente/detalle-cliente.component.html","src/app/modules/clientes/form-cliente/form-cliente.component.html"]
---

# Clientes (/clientes, /clientes/:id, /clientes/nuevo, /clientes/editar/:id)

Scope: módulo Clientes (lista, expediente y formulario). Mode: operate.
Audiencia y tarea: recepción, veterinarios y administración lo usan a diario para encontrar a un propietario y actuar (llamar, agendar, atender, cobrar) sin saltar entre pantallas.

Restricciones: sin backend (localStorage). Datos derivados con funciones puras en `src/app/core/utils/clientes.ts` (con `clientes.spec.ts`); "para recuperar" y "nuevo este mes" salen de `resumenClientes` (metricas.ts) para que lista y dashboard cuenten lo mismo. Colecciones agrupadas por cliente una sola vez (Map), nunca getById por fila. Permisos de permisos.ts: saldo, total pagado, pagos y "Cobrar" solo para quien puede ir a Pagos (admin, recepción), como en el dashboard. WhatsApp por enlace wa.me.

## Direction contract

THESIS: Cada fila y cada expediente responden "¿quién es y qué necesita?": mascotas, cuándo vino, cuándo vuelve y si debe dinero, con la acción a un clic. Rechaza la tabla de datos de alta (correo, fecha de registro) y las pestañas aisladas.
OWN-WORLD: Sistema VetSystem vigente (tokens --vs-*, Inter, teal #006b5e, radios 10/16/20/28). Ámbar solo para atención (saldo, para recuperar, vacuna vencida, atención inmediata); rojo solo para alergias y eliminar. Estados con punto + texto (.vs-status). Filtros rápidos con el control global `.vs-segmentado` (pista tonal, píldora blanca, conteo).
FIRST VIEWPORT: Lista = cabecera (Clientes + total, "Nuevo cliente"), filtros Todos / Con saldo / Para recuperar / Nuevos este mes con conteos, búsqueda (nombre, cédula, teléfono, correo, dirección o nombre de mascota); tabla Cliente (avatar, nombre-enlace "Ver expediente de …", cédula) · Contacto (llamar con el número visible, WhatsApp) · Mascotas (fichas con icono de especie) · Última visita (relativa, + "Para recuperar"/"Nuevo") · Próxima cita · Saldo (ámbar) · Atención inmediata + menú (Nueva cita, Editar datos, Eliminar cliente). Expediente = nombre como h1 con acciones (Clientes, Editar, Atención inmediata, Nueva cita); ficha elevada con contacto y cuatro cifras (última visita, próxima cita, total pagado, saldo); bloque ámbar "Por cobrar" con "Cobrar" por pago; tarjetas de mascota (especie, raza, sexo, edad, peso, alergia en rojo, vacunas al día / vencidas); historial unificado agrupado por mes con filtros Todo / Consultas / Citas / Vacunas / Pagos y "Próximas citas" arriba.
Signature move: la línea de tiempo unificada del expediente (una cita ya atendida no se repite: la representa su consulta).

## Built (oct 2026)

- Lista: mat-table con orden por nombre, última visita, próxima cita y saldo; en móvil (<= 768px) tarjeta en rejilla propia (nombre + acciones, fichas, tres datos con etiqueta, contacto). Vacíos por filtro y por búsqueda con acción.
- "Atención inmediata" de la lista ahora abre la cita en modo inmediata (`tipo=inmediata`), igual que el expediente.
- Expediente: sin pestañas; el veterinario no ve dinero (coherente con el dashboard). Cobrar reutiliza `PagosService.marcarPagado` con la misma confirmación que Pagos.
- Formulario: secciones con fieldset/legend ("Datos personales", "Contacto y dirección"), ayudas de formato de cédula y teléfono, autocomplete, botón "Registrar cliente" / "Guardar cambios"; al editar vuelve al expediente.
- Hojas: lista 4.4 kB, expediente 6.0 kB + historial.scss 2.2 kB, formulario 0.9 kB (bajo el presupuesto de 6 kB por hoja).
- Contraste nuevo medido: conteo muted #55655f sobre la pista #cfe7e0 4.73:1; ámbar texto #9a4800 sobre fila hover 5.75:1 y sobre --vs-surface-urgent 5.84:1; alergia en píldora #8c1016 sobre #fde3e0 7.83:1.
