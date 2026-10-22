---
version: 1
slug: "src-app-modules-dashboard-dashboard-component-html"
primary_target: "src/app/modules/dashboard/dashboard.component.html"
related_targets: ["src/app/modules/dashboard/pestanas/hoy.component.html","src/app/modules/dashboard/pestanas/negocio.component.html","src/app/modules/dashboard/pestanas/clientes.component.html"]
---

# Dashboard (/dashboard)

Scope: `/dashboard` (src/app/modules/dashboard y pestanas/). Mode: operate.
Audiencia y tarea por rol:
- Recepción: organizar la jornada (agenda, confirmar las citas de mañana, avisar vacunas).
- Veterinario: atender (próximo paciente con alergias y última consulta, su agenda).
- Administración: entender cómo va el negocio (ingresos, cobros, servicios, asistencia, veterinarios) y recuperar clientes.

Restricciones: sin backend; los datos salen de localStorage (demo de 6 meses generada con semilla, VERSION_DATOS_DEMO). No se muestran métricas que la app no puede calcular con honestidad (sin "ocupación", porque no hay horarios de trabajo registrados). Los permisos de permisos.ts deciden las pestañas y los enlaces. WhatsApp mediante enlace wa.me (no hay integración).
Decidido por el usuario: un dashboard por rol; indicadores de admin: ingresos y tendencia, agenda y asistencia, servicios que más venden, clientes; 6 meses de datos demo; estructura "Pestañas por área".

## Direction contract

THESIS: Cada rol abre el día en la pestaña que responde a su pregunta (Hoy, Negocio, Clientes). Las métricas de ritmo (ingresos, ticket, atenciones, clientes nuevos) se comparan con un periodo nombrado, el mismo tramo del mes anterior hasta la misma hora, o en valores absolutos cuando la base es menor que 5. Los saldos (por cobrar) muestran su antigüedad. Cada lista termina en una acción. Rechaza el tablero genérico de conteos sueltos igual para todos.
OWN-WORLD: Sistema establecido de VetSystem (tokens --vs-*, Material 3, Inter, primario #006b5e). Datos en una sola serie con --vs-chart-1 #00876f (validado con dataviz). Sin tarjetas por métrica: una banda de cifras con filetes verticales, un solo "escenario" elevado por vista (--vs-stage-shadow, radio 16, sin borde) para el protagonista, y secciones de contexto sobre --vs-bg con filete superior. Lo urgente usa --vs-surface-urgent o tono de acento; lo atendido y los ceros se retiran a gris. Estados con chips .vs-status (texto + color). Mat-tab-group como navegación entre vistas. Ancho máximo --vs-dashboard-max 1840px.
STORY: Recepción ve la agenda con la línea "Ahora" (las citas pasadas sin atender se marcan "No llegó"), qué cobrar hoy, a quién llamar por vacunas (teléfono o WhatsApp) y confirma las citas de mañana con un clic. El veterinario ve su próximo paciente y lo atiende. Administración compara el mes con el mismo tramo del mes anterior, ve de dónde viene el dinero y qué cobros se atrasan, y recupera a los clientes que no vuelven.
FIRST VIEWPORT: Saludo "Hola, {nombre}" con la fecha; acciones (Atención inmediata, Nueva cita, Nuevo cliente) a la derecha; pestañas debajo. Hoy = banda (cifra héroe "Citas de hoy" 56px + inmediatas, por confirmar, vacunas) y rejilla 1.75fr/1fr: columna principal con el escenario "Agenda de hoy" como línea de tiempo (riel, nodos por estado, fila "siguiente" destacada con cuenta regresiva, línea Ahora) seguida de "Confirmar citas" (o "Tus citas de mañana" para el veterinario, con "Próximo paciente" arriba); lateral con "Por cobrar hoy" (bloque urgente si hay) y "Llamar hoy por vacunas". Negocio = escenario con la cifra héroe "Ingresos del mes" y sus secundarias (ticket, atenciones, por cobrar) a la izquierda y el gráfico de 6 meses a lo ancho; debajo 4 secciones de contexto (2×2 por debajo de 1600px). Clientes = banda con héroe "Clientes para recuperar"; escenario "Para recuperar" (2 columnas de filas desde 1600px) + vacunas a 30 días y nuevos (tres columnas desde 1600px).
FORM: Pestañas por área, posición 5 de la lista ordenada (repartida por el sorteo). seed:0cdf3aba8da4fc15
Signature move: la agenda como línea de tiempo del día; la línea "Ahora · HH:MM" en naranja de acento cruza el riel en el punto exacto de la jornada, separando el tramo pasado (gris, filas compactas) del que viene (serie teal), y la siguiente cita queda resaltada con "en N min".
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Built (rediseño visual, oct 2026)

- KpiComponent sin caja: inputs `hero` (cifra protagonista, una por vista) y `tono` ('atencion' | 'alerta'); un valor "0" se retira a gris; los enlaces muestran flecha y siguen siendo `a.kpi--enlace`.
- Tokens nuevos en _tokens.scss: --vs-stage-shadow, --vs-surface-urgent, --vs-surface-next, --vs-text-hero(-sm), --vs-text-figure, --vs-tracking-hero, --vs-dashboard-max, --vs-timeline-past/next.
- Hojas: pestanas.scss (banda, escenario, contexto, listas), agenda.scss (línea de tiempo), hoy/negocio/clientes.component.scss; cada una bajo 6 kB.
- Filas de contacto: nombre completo (envuelve) y teléfono legible dentro del botón de llamar.
- Arreglos: "por llegar" excluye inasistencias y la ayuda añade "· N no llegó"; ayuda de Atenciones del mes con plural correcto y "no asistieron".
