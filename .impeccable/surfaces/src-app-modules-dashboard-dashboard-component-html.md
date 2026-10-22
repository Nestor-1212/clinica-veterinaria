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
OWN-WORLD: Sistema establecido de VetSystem (tokens --vs-*, Material 3, Inter, primario #006b5e). Datos en una sola serie con --vs-chart-1 #00876f (validado con dataviz). Paneles blancos con borde de 1px sobre --vs-bg. Estados con chips .vs-status (texto + color). Mat-tab-group como navegación entre vistas.
STORY: Recepción ve la agenda con la línea "Ahora" (las citas pasadas sin atender se marcan "No llegó"), qué cobrar hoy, a quién llamar por vacunas (teléfono o WhatsApp) y confirma las citas de mañana con un clic. El veterinario ve su próximo paciente y lo atiende. Administración compara el mes con el mismo tramo del mes anterior, ve de dónde viene el dinero y qué cobros se atrasan, y recupera a los clientes que no vuelven.
FIRST VIEWPORT: Saludo "Hola, {nombre}" con la fecha; acciones (Atención inmediata, Nueva cita, Nuevo cliente) a la derecha; pestañas debajo. Una fila de 3-4 KPI (valor, delta vs periodo nombrado, ayuda) y debajo una rejilla: Hoy = agenda 2/3 + lateral 1/3; Negocio = columnas de 6 meses 2/3 + categorías 1/3, luego cobros por antigüedad, asistencia y por veterinario; Clientes = recuperar, vacunas a 30 días y nuevos.
FORM: Pestañas por área, posición 5 de la lista ordenada (repartida por el sorteo). seed:0cdf3aba8da4fc15
Signature move: la línea "Ahora · HH:MM" en naranja de acento cruza la agenda del día en el punto exacto de la jornada, separando lo atendido de lo que viene.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
