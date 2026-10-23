import { Component, computed, input, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatHint } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteTrigger, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { Cliente, Mascota } from '../../../core/models';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface OpcionPaciente { mascota: Mascota; cliente?: Cliente; texto: string; }

/**
 * Elegir paciente buscando por mascota, dueño o teléfono (en vez de una lista de decenas
 * de mascotas). Elegido, se muestra como tarjeta con "Cambiar".
 */
@Component({
  selector: 'app-selector-paciente',
  templateUrl: './selector-paciente.component.html',
  styleUrl: './selector-paciente.component.scss',
  imports: [MatIcon, MatButton, MatFormField, MatLabel, MatInput, MatSuffix, MatHint, MatAutocomplete, MatAutocompleteTrigger, MatOption]
})
export class SelectorPacienteComponent {
  readonly mascotas = input<Mascota[]>([]);
  readonly clientes = input<Cliente[]>([]);
  /** Id de la mascota elegida ('' si ninguna). */
  readonly seleccion = input('');
  /** Mostrar el error (el formulario se intentó enviar sin paciente). */
  readonly invalido = input(false);
  readonly elegir = output<string>();

  readonly texto = signal('');
  readonly iconoEspecie = ICONO_ESPECIE;

  private readonly opciones = computed<OpcionPaciente[]>(() => {
    const clientes = new Map(this.clientes().map(c => [c.id, c]));
    return this.mascotas()
      .map(m => {
        const cliente = clientes.get(m.clienteId);
        return { mascota: m, cliente, texto: sinTildes(`${m.nombre} ${m.tipo} ${cliente?.nombre ?? ''} ${cliente?.telefono ?? ''}`) };
      })
      .sort((a, b) => a.mascota.nombre.localeCompare(b.mascota.nombre, 'es'));
  });

  readonly filtradas = computed(() => {
    const t = sinTildes(this.texto().trim());
    const lista = t ? this.opciones().filter(o => t.split(/\s+/).every(p => o.texto.includes(p))) : this.opciones();
    return lista.slice(0, 12);
  });

  readonly elegida = computed(() => this.opciones().find(o => o.mascota.id === this.seleccion()) ?? null);

  alEscribir(ev: Event): void { this.texto.set((ev.target as HTMLInputElement).value); }

  alElegir(ev: MatAutocompleteSelectedEvent): void {
    this.texto.set('');
    this.elegir.emit(ev.option.value);
  }

  cambiar(): void { this.elegir.emit(''); }
}
