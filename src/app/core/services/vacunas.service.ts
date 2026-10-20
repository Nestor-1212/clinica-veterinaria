import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Vacuna } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_vacunas';

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

  getPendientes(): Vacuna[] {
    const hoy = new Date();
    const en7dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.getAll().filter(v => new Date(v.proximaFecha) <= en7dias);
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
