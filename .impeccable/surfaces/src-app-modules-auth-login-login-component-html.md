---
version: 1
slug: "src-app-modules-auth-login-login-component-html"
primary_target: "src/app/modules/auth/login/login.component.html"
related_targets: ["src/app/modules/auth/login/login.component.scss","src/app/modules/auth/login/login.component.ts"]
---

# Inicio de sesión (login)

Scope: `/login` (src/app/modules/auth/login). Mode: operate.
Audiencia: personal de la clínica (administración, veterinarios, recepción) desde su propio equipo, PC o celular.
Tarea: entrar rápido y sin errores; en modo demo, poder probar con una cuenta de cada rol.
Restricciones: sin backend, así que no hay recuperación automática de contraseña (la restablece el administrador desde Usuarios). "Recordar mi correo" guarda solo el correo, nunca la contraseña. Las cuentas demo van visibles pero discretas y solo con el flag `demo`. WCAG 2.2 AA.
Decidido por el usuario: estructura "Hoja inferior"; ayudas: recordar correo, ¿olvidaste tu contraseña?, aviso de Bloq Mayús.

## Direction contract

THESIS: El acceso como una hoja de app que sube sobre la franja de marca: una sola tarea, a un pulgar de distancia en el celular y centrada en escritorio. Rechaza la tarjeta flotante sobre un degradado a pantalla completa.
OWN-WORLD: Franja sólida en el primario del tema (#006b5e) con la marca VetSystem en blanco sobre el fondo neutro de la app (#f0f4f2). Hoja blanca con radio de 24px solo arriba en móvil y en los cuatro lados en escritorio, sombra de nivel 3. Campos outline de Material 3, botón flat en píldora, Inter, tokens --vs-*.
STORY: El usuario reconoce VetSystem, escribe su correo (o lo encuentra recordado), su contraseña y entra. Si se equivoca, lee qué pasó junto al formulario. En demo, toca un rol y el formulario se rellena.
FIRST VIEWPORT: En móvil (390), la franja de marca ocupa el ~32% superior con el icono, VetSystem y "Gestión de la clínica veterinaria"; la hoja sube desde abajo con "Inicia sesión", correo, contraseña con mostrar/ocultar y aviso de Bloq Mayús, la fila recordar correo / ¿olvidaste?, el botón Entrar (acción primaria, ancho completo) y las cuentas demo al pie en un bloque gris. En escritorio, la franja ocupa los 440px superiores y la hoja de 440px queda centrada solapándola.
FORM: Hoja inferior, posición 7 de la lista ordenada (repartida por el sorteo). seed:19b2390e3b3d42a6
Signature move: la hoja sube 16px y aparece en 240ms (cubic-bezier(.2,0,0,1)) al cargar; se desactiva con prefers-reduced-motion.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
