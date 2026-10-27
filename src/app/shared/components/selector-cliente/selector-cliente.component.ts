import { Component, computed, input, output, signal, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatHint } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteTrigger, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { Cliente } from '../../../core/models';

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Elegir dueño buscando por nombre, cédula o teléfono (en vez de una lista de decenas de
 * clientes). Elegido, se muestra como tarjeta con "Cambiar". Hermano de app-selector-paciente.
 */
@Component({
  selector: 'app-selector-cliente',
  templateUrl: './selector-cliente.component.html',
  styleUrl: '../selector-paciente/selector-paciente.component.scss',
  imports: [MatIcon, MatButton, MatFormField, MatLabel, MatInput, MatSuffix, MatHint, MatAutocomplete, MatAutocompleteTrigger, MatOption]
})
export class SelectorClienteComponent {
  readonly clientes = input<Cliente[]>([]);
  /** Id del cliente elegido ('' si ninguno). */
  readonly seleccion = input('');
  readonly invalido = input(false);
  readonly elegir = output<string>();

  readonly texto = signal('');
  private readonly trigger = viewChild(MatAutocompleteTrigger);
  private porClic = false;

  /**
   * El foco puesto por código (al llegar o tras un envío fallido) no abre la lista: taparía el
   * paso siguiente y el resumen de errores. Se abre al hacer clic, escribir o pulsar flecha abajo.
   */
  porClicar(): void { this.porClic = true; }

  alEnfocar(): void {
    if (!this.porClic) setTimeout(() => this.trigger()?.closePanel());
    this.porClic = false;
  }

  private readonly opciones = computed(() => this.clientes()
    .map(c => ({ cliente: c, texto: sinTildes(`${c.nombre} ${c.cedula} ${c.telefono} ${c.telefono.replace(/\D/g, '')}`) }))
    .sort((a, b) => a.cliente.nombre.localeCompare(b.cliente.nombre, 'es')));

  readonly filtrados = computed(() => {
    const t = sinTildes(this.texto().trim());
    const lista = t ? this.opciones().filter(o => t.split(/\s+/).every(p => o.texto.includes(p))) : this.opciones();
    return lista.slice(0, 12).map(o => o.cliente);
  });

  readonly elegido = computed(() => this.clientes().find(c => c.id === this.seleccion()) ?? null);

  alEscribir(ev: Event): void { this.texto.set((ev.target as HTMLInputElement).value); }

  alElegir(ev: MatAutocompleteSelectedEvent): void {
    this.texto.set('');
    this.elegir.emit(ev.option.value);
  }

  cambiar(): void { this.elegir.emit(''); }
}
