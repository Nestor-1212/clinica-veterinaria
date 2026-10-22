import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject, input, viewChild } from '@angular/core';

/** Una huella impresa: aparece, se sostiene y se desvanece. */
interface Huella {
  x: number;
  y: number;
  angulo: number;
  nace: number;
}

/** Un animal que cruza la franja dejando huellas alternas (izquierda/derecha). */
interface Caminante {
  x: number;
  y: number;
  rumbo: number;
  giro: number;
  paso: number;
  proximoPaso: number;
  escala: number;
}

/** Tono de las huellas según el fondo sobre el que caminan. */
export type TonoHuellas = 'claro' | 'marca';

const TONOS: Record<TonoHuellas, { color: string; base: number; cursor: number }> = {
  // --vs-primary-soft sobre la franja teal
  claro: { color: '229, 255, 248', base: 0.13, cursor: 0.3 },
  // Verde puro (#00965a), de la familia de la marca, sobre el fondo claro de la app
  marca: { color: '0, 150, 90', base: 0.28, cursor: 0.45 }
};
const RADIO_CURSOR = 150;
const VIDA_MS = 4200;
const APARECE_MS = 260;
const DESVANECE_MS = 1400;
const INTERVALO_PASO_MS = 300;
const LARGO_PASO = 30;
const SEPARACION_PISADA = 9;
const MAX_CAMINANTES = 3;

/**
 * Fondo vivo de la franja del login: huellas de mascota que cruzan caminando y
 * se iluminan cerca del cursor. Decorativo (aria-hidden), en canvas 2D, fuera de la
 * zona de Angular, en pausa cuando no se ve y estático con prefers-reduced-motion.
 */
@Component({
  selector: 'app-huellas',
  template: '<canvas #lienzo aria-hidden="true"></canvas>',
  styles: [':host { position: absolute; inset: 0; display: block; pointer-events: none; } canvas { display: block; width: 100%; height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HuellasComponent {
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly zona = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  /** 'claro' sobre la franja teal; 'marca' (verde) sobre el fondo claro. */
  readonly tono = input<TonoHuellas>('claro');

  private ctx: CanvasRenderingContext2D | null = null;
  private ancho = 0;
  private alto = 0;
  private huellas: Huella[] = [];
  private caminantes: Caminante[] = [];
  private cursor: { x: number; y: number } | null = null;
  private raf = 0;
  private visible = true;
  private reducido = false;

  constructor() {
    afterNextRender(() => this.zona.runOutsideAngular(() => this.iniciar()));
  }

  private iniciar(): void {
    const canvas = this.lienzo().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    const consulta = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducido = !!consulta?.matches;
    const alCambiarMovimiento = (e: MediaQueryListEvent) => { this.reducido = e.matches; this.reiniciar(); };
    consulta?.addEventListener?.('change', alCambiarMovimiento);

    const redimensionar = new ResizeObserver(() => this.ajustarTamano());
    redimensionar.observe(canvas);

    const observador = new IntersectionObserver(([entrada]) => {
      this.visible = entrada.isIntersecting;
      if (this.visible) this.programar();
    });
    observador.observe(canvas);

    const alMoverCursor = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      this.cursor = x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null;
    };
    const alSalirCursor = () => { this.cursor = null; };
    const alCambiarPestana = () => { if (!document.hidden) this.programar(); };
    window.addEventListener('pointermove', alMoverCursor, { passive: true });
    document.addEventListener('pointerleave', alSalirCursor);
    document.addEventListener('visibilitychange', alCambiarPestana);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.raf);
      redimensionar.disconnect();
      observador.disconnect();
      consulta?.removeEventListener?.('change', alCambiarMovimiento);
      window.removeEventListener('pointermove', alMoverCursor);
      document.removeEventListener('pointerleave', alSalirCursor);
      document.removeEventListener('visibilitychange', alCambiarPestana);
    });

    this.ajustarTamano();
  }

  private ajustarTamano(): void {
    const canvas = this.lienzo().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.ancho = canvas.clientWidth;
    this.alto = canvas.clientHeight;
    canvas.width = Math.round(this.ancho * dpr);
    canvas.height = Math.round(this.alto * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.reiniciar();
  }

  private reiniciar(): void {
    cancelAnimationFrame(this.raf);
    this.huellas = [];
    this.caminantes = [];
    if (this.reducido) {
      this.dibujarRastroEstatico();
    } else {
      // Arranca con caminantes ya en marcha para que la franja no empiece vacía
      for (let i = 0; i < MAX_CAMINANTES; i++) this.caminantes.push(this.nuevoCaminante(performance.now() - i * 1600, true));
      this.programar();
    }
  }

  private programar(): void {
    if (this.reducido || !this.visible || document.hidden) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(t => this.cuadro(t));
  }

  private cuadro(ahora: number): void {
    this.avanzar(ahora);
    this.pintar(ahora);
    this.programar();
  }

  private nuevoCaminante(ahora: number, enMedio = false): Caminante {
    // Entra por un borde lateral y cruza hacia el otro con una ligera curva
    const desdeIzquierda = Math.random() < 0.5;
    const y = this.alto * (0.15 + Math.random() * 0.7);
    const rumbo = (desdeIzquierda ? 0 : Math.PI) + (Math.random() - 0.5) * 0.6;
    const x = enMedio ? this.ancho * Math.random() : desdeIzquierda ? -20 : this.ancho + 20;
    return { x, y, rumbo, giro: (Math.random() - 0.5) * 0.0009, paso: 0, proximoPaso: ahora, escala: 0.8 + Math.random() * 0.45 };
  }

  private avanzar(ahora: number): void {
    for (let i = 0; i < this.caminantes.length; i++) {
      const c = this.caminantes[i];
      while (ahora >= c.proximoPaso) {
        c.rumbo += c.giro * INTERVALO_PASO_MS;
        c.x += Math.cos(c.rumbo) * LARGO_PASO * c.escala;
        c.y += Math.sin(c.rumbo) * LARGO_PASO * c.escala;
        const lado = c.paso % 2 === 0 ? 1 : -1;
        const normal = c.rumbo + Math.PI / 2;
        this.huellas.push({
          x: c.x + Math.cos(normal) * SEPARACION_PISADA * lado * c.escala,
          y: c.y + Math.sin(normal) * SEPARACION_PISADA * lado * c.escala,
          angulo: c.rumbo,
          nace: c.proximoPaso
        });
        c.paso++;
        c.proximoPaso += INTERVALO_PASO_MS;
      }
      const fuera = c.x < -60 || c.x > this.ancho + 60 || c.y < -60 || c.y > this.alto + 60;
      if (fuera) this.caminantes[i] = this.nuevoCaminante(ahora);
    }
    this.huellas = this.huellas.filter(h => ahora - h.nace < VIDA_MS);
  }

  private pintar(ahora: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.ancho, this.alto);
    for (const h of this.huellas) {
      const edad = ahora - h.nace;
      const entrada = Math.min(1, edad / APARECE_MS);
      const salida = Math.min(1, (VIDA_MS - edad) / DESVANECE_MS);
      const { base, cursor } = TONOS[this.tono()];
      let alfa = base * Math.min(entrada, salida);
      let escala = 1;
      if (this.cursor) {
        const d = Math.hypot(h.x - this.cursor.x, h.y - this.cursor.y);
        if (d < RADIO_CURSOR) {
          const cerca = 1 - d / RADIO_CURSOR;
          alfa += (cursor - base) * cerca * Math.min(entrada, salida);
          escala += 0.12 * cerca;
        }
      }
      this.dibujarHuella(ctx, h.x, h.y, h.angulo, escala * (0.92 + 0.08 * entrada), alfa);
    }
  }

  private dibujarRastroEstatico(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.ancho, this.alto);
    const rastros = [
      { x: this.ancho * 0.08, y: this.alto * 0.78, rumbo: -0.35 },
      { x: this.ancho * 0.66, y: this.alto * 0.2, rumbo: 0.25 }
    ];
    for (const r of rastros) {
      for (let i = 0; i < 7; i++) {
        const lado = i % 2 === 0 ? 1 : -1;
        const normal = r.rumbo + Math.PI / 2;
        const x = r.x + Math.cos(r.rumbo) * LARGO_PASO * i + Math.cos(normal) * SEPARACION_PISADA * lado;
        const y = r.y + Math.sin(r.rumbo) * LARGO_PASO * i + Math.sin(normal) * SEPARACION_PISADA * lado;
        this.dibujarHuella(ctx, x, y, r.rumbo, 1, TONOS[this.tono()].base * (0.4 + 0.6 * (i / 6)));
      }
    }
  }

  /** Almohadilla principal y cuatro dedos, orientados hacia el rumbo. */
  private dibujarHuella(ctx: CanvasRenderingContext2D, x: number, y: number, rumbo: number, escala: number, alfa: number): void {
    if (alfa <= 0.005) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rumbo + Math.PI / 2);
    ctx.scale(escala * 0.62, escala * 0.62);
    ctx.fillStyle = `rgba(${TONOS[this.tono()].color}, ${alfa})`;
    ctx.beginPath();
    ctx.ellipse(0, 5, 9.5, 8, 0, 0, Math.PI * 2);
    ctx.moveTo(-6.2, -9);
    ctx.ellipse(-9.5, -5, 3.3, 4.5, -0.45, 0, Math.PI * 2);
    ctx.moveTo(0, -12);
    ctx.ellipse(-3.6, -11.5, 3.3, 4.6, -0.12, 0, Math.PI * 2);
    ctx.moveTo(7, -12);
    ctx.ellipse(3.6, -11.5, 3.3, 4.6, 0.12, 0, Math.PI * 2);
    ctx.moveTo(12.8, -5);
    ctx.ellipse(9.5, -5, 3.3, 4.5, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
