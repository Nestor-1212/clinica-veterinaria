import { ApplicationConfig, LOCALE_ID, inject, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withViewTransitions } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeEsPA from '@angular/common/locales/es-PA';
import { routes } from './app.routes';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TituloPaginaStrategy } from './core/i18n/titulo-pagina.strategy';
import { PaginatorEs } from './core/i18n/paginator-es';
import { TransicionEntradaService, prefiereMenosMovimiento } from './core/ui/transicion-entrada.service';

// Panamá: $2,102.00 (coma de miles, punto decimal), igual que toLocaleString('es-PA') en pagos y reportes
registerLocaleData(localeEsPA, 'es-PA');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions({
      skipInitialTransition: true,
      // Solo la entrada desde el login se anima; el resto de la navegación queda igual
      onViewTransitionCreated: ({ transition }) => {
        const esEntrada = inject(TransicionEntradaService).consumir();
        // Al saltarla, Angular registra en consola el rechazo de `ready` solo en desarrollo
        if (!esEntrada || prefiereMenosMovimiento()) transition.skipTransition();
      }
    })),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'es-PA' },
    { provide: TitleStrategy, useClass: TituloPaginaStrategy },
    { provide: MatPaginatorIntl, useClass: PaginatorEs }
  ]
};
