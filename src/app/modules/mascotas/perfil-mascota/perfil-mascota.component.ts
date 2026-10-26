import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MascotasService } from '../../../core/services/mascotas.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { ExamenesService } from '../../../core/services/examenes.service';
import { RecetasService } from '../../../core/services/recetas.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ArchivosService } from '../../../core/services/archivos.service';
import { AuthService } from '../../../core/services/auth.service';
import { puedeAcceder } from '../../../core/auth/permisos';
import { Mascota, Cliente, Consulta, Vacuna, Examen, Receta, TipoMascota } from '../../../core/models';
import { FichaPaciente, fichaPaciente } from '../../../core/utils/ficha';
import { ICONO_ESPECIE, tiempoRelativo } from '../../../core/utils/clientes';
import { examenPendiente } from '../../../core/utils/examenes';
import { FichaPacienteComponent } from '../../../shared/components/ficha-paciente/ficha-paciente.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';

type TipoEvento = 'consulta' | 'vacuna' | 'examen' | 'receta';

/** Un hecho del expediente, para la línea de tiempo (lo más reciente primero). */
interface Evento {
  tipo: TipoEvento;
  fecha: Date;
  consulta?: Consulta;
  vacuna?: Vacuna;
  examen?: Examen;
  receta?: Receta;
}

const PAGINA = 15;

@Component({
    selector: 'app-perfil-mascota',
    templateUrl: './perfil-mascota.component.html',
    styleUrls: ['./perfil-mascota.component.scss'],
    imports: [MatIcon, MatButton, MatAnchor, RouterLink, MatMenu, MatMenuItem, MatMenuTrigger, DatePipe, FichaPacienteComponent]
})
export class PerfilMascotaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mascotasService = inject(MascotasService);
  private clientesService = inject(ClientesService);
  private consultasService = inject(ConsultasService);
  private vacunasService = inject(VacunasService);
  private examenesService = inject(ExamenesService);
  private recetasService = inject(RecetasService);
  private usuariosService = inject(UsuariosService);
  private archivosService = inject(ArchivosService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  /** Acciones según el rol: nunca se ofrece un camino que el rol no puede completar. */
  readonly puede = {
    consulta: puedeAcceder(this.auth.currentUser?.rol, 'consultas'),
    examen: puedeAcceder(this.auth.currentUser?.rol, 'examenes'),
    receta: puedeAcceder(this.auth.currentUser?.rol, 'recetas'),
    cita: puedeAcceder(this.auth.currentUser?.rol, 'citas'),
    vacuna: puedeAcceder(this.auth.currentUser?.rol, 'vacunas')
  };
  readonly filtros: { valor: TipoEvento | 'todo'; texto: string }[] = [
    { valor: 'todo', texto: 'Todo' }, { valor: 'consulta', texto: 'Consultas' }, { valor: 'vacuna', texto: 'Vacunas' },
    { valor: 'examen', texto: 'Exámenes' }, { valor: 'receta', texto: 'Recetas' }
  ];

  mascota!: Mascota;
  cliente?: Cliente;
  ficha: FichaPaciente | null = null;
  eventos: Evento[] = [];
  conteos: Record<TipoEvento | 'todo', number> = { todo: 0, consulta: 0, vacuna: 0, examen: 0, receta: 0 };
  filtro: TipoEvento | 'todo' = 'todo';
  mostrar = PAGINA;
  hoy = new Date();

  ngOnInit(): void {
    const id = this.route.snapshot.params.id;
    const m = this.mascotasService.getById(id);
    if (!m) { this.router.navigate(['/mascotas']); return; }
    this.mascota = m;
    this.cliente = this.clientesService.getById(m.clienteId);
    const consultas = this.consultasService.getByMascota(id).filter(c => new Date(c.fecha) <= this.hoy);
    this.ficha = fichaPaciente(m, this.cliente, consultas, this.vacunasService.getAll(), this.hoy);
    this.eventos = [
      ...consultas.map(c => ({ tipo: 'consulta' as const, fecha: new Date(c.fecha), consulta: c })),
      ...this.vacunasService.getByMascota(id).map(v => ({ tipo: 'vacuna' as const, fecha: new Date(v.fechaAplicacion), vacuna: v })),
      ...this.examenesService.getByMascota(id).map(e => ({ tipo: 'examen' as const, fecha: new Date(e.fecha), examen: e })),
      ...this.recetasService.getByMascota(id).map(r => ({ tipo: 'receta' as const, fecha: new Date(r.fecha), receta: r }))
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    this.conteos = {
      todo: this.eventos.length,
      consulta: this.eventos.filter(e => e.tipo === 'consulta').length,
      vacuna: this.eventos.filter(e => e.tipo === 'vacuna').length,
      examen: this.eventos.filter(e => e.tipo === 'examen').length,
      receta: this.eventos.filter(e => e.tipo === 'receta').length
    };
  }

  get visibles(): Evento[] {
    const lista = this.filtro === 'todo' ? this.eventos : this.eventos.filter(e => e.tipo === this.filtro);
    return lista.slice(0, this.mostrar);
  }

  get restantes(): number {
    const total = this.filtro === 'todo' ? this.eventos.length : this.conteos[this.filtro];
    return Math.max(0, total - this.mostrar);
  }

  elegirFiltro(f: TipoEvento | 'todo'): void { this.filtro = f; this.mostrar = PAGINA; }
  verMas(): void { this.mostrar += PAGINA; }

  especie(): string { return ICONO_ESPECIE[(this.mascota?.tipo ?? 'Otro') as TipoMascota]; }
  relativo(f: Date): string { return tiempoRelativo(f, this.hoy); }
  vet(id: string): string {
    const n = this.usuariosService.getNombreCompleto(id).split(' ');
    return n.length > 1 ? `${n[0]} ${n[1].charAt(0)}.` : n[0];
  }
  pendiente(e: Examen): boolean { return examenPendiente(e); }
  /** Refuerzo vencido (la próxima fecha ya pasó). */
  vencida(v: Vacuna): boolean { return new Date(v.proximaFecha) < this.hoy; }

  // ---------- Acciones ----------
  nuevaConsulta(): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: this.mascota.clienteId, mascotaId: this.mascota.id, tipo: 'inmediata' } });
  }
  nuevaCita(): void {
    this.router.navigate(['/citas/nueva'], { queryParams: { clienteId: this.mascota.clienteId, mascotaId: this.mascota.id } });
  }
  nuevaVacuna(): void { this.router.navigate(['/vacunas/nueva'], { queryParams: { mascotaId: this.mascota.id } }); }
  nuevoExamen(): void { this.router.navigate(['/examenes/nuevo'], { queryParams: { mascotaId: this.mascota.id } }); }
  editar(): void { this.router.navigate(['/mascotas/editar', this.mascota.id]); }

  async verInforme(e: Examen): Promise<void> {
    const archivo = e.archivos?.[0];
    const contenido = archivo ? await this.archivosService.obtener(archivo.id).catch(() => undefined) : undefined;
    if (!contenido) { this.snack.open('El informe no está guardado en este navegador', 'OK', { duration: 3000 }); return; }
    const url = URL.createObjectURL(contenido);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
