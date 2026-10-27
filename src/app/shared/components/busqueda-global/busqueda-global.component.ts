import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatAutocomplete, MatAutocompleteOrigin, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOptgroup, MatOption } from '@angular/material/core';
import { ClientesService } from '../../../core/services/clientes.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';
import { TipoMascota } from '../../../core/models';

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface Resultado { tipo: 'mascota' | 'cliente'; id: string; titulo: string; detalle: string; icono: string; ruta: unknown[]; }

const POR_GRUPO = 5;

/**
 * Búsqueda global de la barra superior: mascotas y clientes por nombre, dueño, cédula o teléfono,
 * para llegar al expediente desde cualquier pantalla. Ctrl+K o "/" la enfocan.
 */
@Component({
  selector: 'app-busqueda-global',
  templateUrl: './busqueda-global.component.html',
  styleUrl: './busqueda-global.component.scss',
  imports: [MatIcon, MatIconButton, MatAutocomplete, MatAutocompleteTrigger, MatAutocompleteOrigin, MatOption, MatOptgroup]
})
export class BusquedaGlobalComponent {
  private clientesService = inject(ClientesService);
  private mascotasService = inject(MascotasService);
  private router = inject(Router);
  private campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  readonly texto = signal('');
  /** En el celular la búsqueda se despliega sobre la barra al tocar la lupa. */
  readonly abierta = signal(false);
  readonly atajo = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K';

  readonly resultados = computed(() => {
    const t = sinTildes(this.texto().trim());
    if (t.length < 2) return { mascotas: [] as Resultado[], clientes: [] as Resultado[] };
    const partes = t.split(/\s+/);
    const coincide = (texto: string) => partes.every(p => texto.includes(p));
    const clientes = this.clientesService.getAll().filter(c => c.activo);
    const porId = new Map(clientes.map(c => [c.id, c]));
    const mascotas = this.mascotasService.getAll()
      .filter(m => m.activo && porId.has(m.clienteId))
      .filter(m => coincide(sinTildes(`${m.nombre} ${m.tipo} ${m.raza} ${porId.get(m.clienteId)!.nombre}`)))
      .slice(0, POR_GRUPO)
      .map<Resultado>(m => ({
        tipo: 'mascota', id: m.id, titulo: m.nombre, detalle: `${m.tipo} · ${porId.get(m.clienteId)!.nombre}`,
        icono: ICONO_ESPECIE[m.tipo as TipoMascota] ?? ICONO_ESPECIE.Otro, ruta: ['/mascotas', m.id]
      }));
    const resClientes = clientes
      .filter(c => coincide(sinTildes(`${c.nombre} ${c.cedula} ${c.telefono} ${c.telefono.replace(/\D/g, '')}`)))
      .slice(0, POR_GRUPO)
      .map<Resultado>(c => ({ tipo: 'cliente', id: c.id, titulo: c.nombre, detalle: `${c.cedula} · ${c.telefono}`, icono: 'person', ruta: ['/clientes', c.id] }));
    return { mascotas, clientes: resClientes };
  });

  readonly sinResultados = computed(() => this.texto().trim().length >= 2 && !this.resultados().mascotas.length && !this.resultados().clientes.length);

  @HostListener('document:keydown', ['$event'])
  alPulsar(ev: KeyboardEvent): void {
    const enCampo = (ev.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
    const atajo = (ev.key.toLowerCase() === 'k' && (ev.ctrlKey || ev.metaKey)) || (ev.key === '/' && !enCampo);
    if (!atajo) return;
    ev.preventDefault();
    this.abrir();
  }

  abrir(): void {
    this.abierta.set(true);
    // Foco inmediato para no perder lo que se escribe justo después del atajo; en el celular
    // el campo aparece al abrirse, así que se reintenta tras el render
    const el = this.campo()?.nativeElement;
    el?.focus();
    if (typeof document !== 'undefined' && document.activeElement !== el) setTimeout(() => this.campo()?.nativeElement.focus());
  }

  alEscribir(ev: Event): void { this.texto.set((ev.target as HTMLInputElement).value); }

  alElegir(ev: MatAutocompleteSelectedEvent): void {
    const r = ev.option.value as Resultado;
    this.limpiar();
    this.router.navigate(r.ruta);
  }

  /** El campo muestra lo escrito, no el objeto elegido. */
  mostrar = (): string => this.texto();

  limpiar(): void {
    this.texto.set('');
    const el = this.campo()?.nativeElement;
    if (el) { el.value = ''; el.blur(); }
    this.abierta.set(false);
  }
}
