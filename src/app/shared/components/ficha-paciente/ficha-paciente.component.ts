import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatAnchor } from '@angular/material/button';
import { FichaPaciente } from '../../../core/utils/ficha';
import { ICONO_ESPECIE } from '../../../core/utils/clientes';
import { EdadPipe } from '../../pipes/edad.pipe';

/** Ficha del paciente (atención inmediata, nueva cita, consulta): alergias, vacunas, última consulta y dueño. */
@Component({
  selector: 'app-ficha-paciente',
  templateUrl: './ficha-paciente.component.html',
  styleUrl: './ficha-paciente.component.scss',
  imports: [MatIcon, MatAnchor, EdadPipe],
  host: { role: 'complementary', 'aria-labelledby': 'ficha-titulo' }
})
export class FichaPacienteComponent {
  readonly ficha = input<FichaPaciente | null>(null);
  /** Motivo de la visita (de la cita), si lo hay. */
  readonly motivo = input<string>('');
  readonly notas = input<string>('');
  readonly tituloMotivo = input('Motivo de la visita');
  readonly textoVacio = input('Busque al paciente para ver sus alergias, vacunas y la última consulta.');
  readonly iconoEspecie = ICONO_ESPECIE;
}
