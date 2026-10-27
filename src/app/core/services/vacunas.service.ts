import { DIAS_AVISO_VACUNA } from '../utils/vacunas';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Mascota, Vacuna } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_vacunas';
const MASCOTAS_KEY = 'vet_mascotas';

/** Clave mascota + vacuna (sin distinguir mayúsculas ni espacios). */
function claveDosis(v: Vacuna): string {
  return `${v.mascotaId}|${(v.nombre || '').trim().toLowerCase()}`;
}

/** Devuelve solo la dosis más reciente (por fecha de aplicación) de cada vacuna de cada mascota. */
export function ultimasDosis(vacunas: Vacuna[]): Vacuna[] {
  const ultimas = new Map<string, Vacuna>();
  for (const v of vacunas) {
    const previa = ultimas.get(claveDosis(v));
    if (!previa || new Date(v.fechaAplicacion).getTime() > new Date(previa.fechaAplicacion).getTime()) {
      ultimas.set(claveDosis(v), v);
    }
  }
  return [...ultimas.values()];
}

@Injectable({ providedIn: 'root' })
export class VacunasService {
  private storage = inject(StorageService);

  private subject = new BehaviorSubject<Vacuna[]>([]);
  vacunas$: Observable<Vacuna[]> = this.subject.asObservable();

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Vacuna>(KEY));
  }

  getAll(): Vacuna[] {
    return this.storage.get<Vacuna>(KEY);
  }

  getById(id: string): Vacuna | undefined {
    return this.getAll().find(v => v.id === id);
  }

  getByMascota(mascotaId: string): Vacuna[] {
    return this.getAll().filter(v => v.mascotaId === mascotaId);
  }

  /**
   * B5: vacunas vencidas o que vencen dentro de la ventana de aviso (DIAS_AVISO_VACUNA).
   * Solo cuenta la dosis más reciente de cada vacuna por mascota (una dosis posterior
   * reemplaza a la anterior) y excluye mascotas inactivas.
   */
  getPendientes(hoy: Date = new Date()): Vacuna[] {
    const limite = new Date(hoy.getTime() + DIAS_AVISO_VACUNA * 24 * 60 * 60 * 1000);
    const activas = new Set(this.storage.get<Mascota>(MASCOTAS_KEY).filter(m => m.activo).map(m => m.id));
    return ultimasDosis(this.getAll())
      .filter(v => activas.has(v.mascotaId))
      .filter(v => new Date(v.proximaFecha) <= limite);
  }

  create(data: Omit<Vacuna, 'id'>): Vacuna {
    const vacuna: Vacuna = { ...data, id: this.storage.generateId() };
    const all = this.getAll();
    all.push(vacuna);
    this.storage.set(KEY, all);
    this.refresh();
    return vacuna;
  }

  update(id: string, data: Partial<Vacuna>): void {
    const all = this.getAll().map(v => v.id === id ? { ...v, ...data } : v);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().filter(v => v.id !== id);
    this.storage.set(KEY, all);
    this.refresh();
  }
}
