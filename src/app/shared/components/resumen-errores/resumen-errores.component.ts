import { Component, DestroyRef, ElementRef, OnInit, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

interface ErrorCampo { texto: string; destino: HTMLElement | null; }

const ETIQUETA = 'mat-label';
const MENSAJE = '.mat-mdc-form-field-error';
/** Texto visible sin los nombres de íconos (mat-icon usa ligaduras como "error"). */
const textoVisible = (el: Element | null): string => {
  if (!el) return '';
  const copia = el.cloneNode(true) as Element;
  copia.querySelectorAll('mat-icon').forEach(i => i.remove());
  return copia.textContent?.trim() ?? '';
};

const FOCO = 'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), mat-select, button:not([disabled]), [tabindex="0"]';

/**
 * Resumen de errores de un formulario largo: al intentar enviarlo con errores lista qué falta,
 * y cada línea lleva a su campo. Se coloca dentro del <form>; lee los errores ya visibles en
 * pantalla (mat-error de cada campo y los avisos role="alert" de grupos como especie o paciente),
 * así que no necesita conocer los controles de cada formulario. Se actualiza mientras se corrige.
 */
@Component({
  selector: 'app-resumen-errores',
  templateUrl: './resumen-errores.component.html',
  styleUrl: './resumen-errores.component.scss',
  imports: [MatIcon]
})
export class ResumenErroresComponent implements OnInit {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  readonly errores = signal<ErrorCampo[]>([]);
  private activo = false;

  ngOnInit(): void {
    const form = this.host.nativeElement.closest('form');
    if (!form) return;
    // Tras el submit, Angular marca los controles y pinta los errores en la siguiente vuelta
    const alEnviar = () => {
      this.activo = true;
      setTimeout(() => {
        this.leer(form);
        // Tras enfocar el primer error la página queda desplazada: el resumen tiene que verse
        if (this.errores().length) setTimeout(() => this.host.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'smooth' }));
      });
    };
    const alCorregir = () => { if (this.activo) setTimeout(() => this.leer(form)); };
    form.addEventListener('submit', alEnviar);
    form.addEventListener('input', alCorregir);
    form.addEventListener('change', alCorregir);
    form.addEventListener('click', alCorregir);
    this.destroyRef.onDestroy(() => {
      form.removeEventListener('submit', alEnviar);
      form.removeEventListener('input', alCorregir);
      form.removeEventListener('change', alCorregir);
      form.removeEventListener('click', alCorregir);
    });
  }

  private leer(form: HTMLFormElement): void {
    const lista: ErrorCampo[] = [];
    const vistos = new Set<string>();
    const agregar = (texto: string, destino: HTMLElement | null) => {
      texto = texto.replace(/\s+/g, ' ').trim();
      if (!texto || vistos.has(texto)) return;
      vistos.add(texto);
      lista.push({ texto, destino });
    };
    const elementos = form.querySelectorAll<HTMLElement>('.mat-mdc-form-field.mat-form-field-invalid, [role="alert"]');
    elementos.forEach(el => {
      if (this.host.nativeElement.contains(el)) return;
      if (el.matches('[role="alert"]')) {
        if (el.closest('.mat-mdc-form-field')) return; // ya cubierto por su campo
        const zona = el.closest('fieldset, section, app-selector-paciente') ?? el.parentElement;
        agregar(textoVisible(el), zona?.querySelector<HTMLElement>(FOCO) ?? null);
        return;
      }
      // Un campo sin mensaje propio (p. ej. el buscador de paciente) ya avisa con su role="alert"
      const mensaje = textoVisible(el.querySelector(MENSAJE));
      if (!mensaje) return;
      const etiqueta = textoVisible(el.querySelector(ETIQUETA));
      agregar(etiqueta ? `${etiqueta}: ${mensaje}` : mensaje, el.querySelector<HTMLElement>(FOCO));
    });
    this.errores.set(lista);
    if (!lista.length) this.activo = false;
  }

  ir(e: ErrorCampo, ev: Event): void {
    ev.preventDefault();
    e.destino?.scrollIntoView({ block: 'center' });
    e.destino?.focus({ preventScroll: true });
  }
}
