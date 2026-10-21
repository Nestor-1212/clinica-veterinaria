// Entorno de desarrollo. En el build de producción se reemplaza por environment.prod.ts
// (ver `fileReplacements` en angular.json).
export const environment = {
  production: false,
  /**
   * Modo demo: siembra datos de ejemplo y muestra los botones de acceso rápido del login.
   * Sin backend es la única forma de tener usuarios iniciales, por eso está activo.
   */
  demo: true
};
