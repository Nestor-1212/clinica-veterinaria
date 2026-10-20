import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cita } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_citas';

@Injectable({ providedIn: 'root' })
export class CitasService {
  private storage = inject(StorageService);

  private subject = new BehaviorSubject<Cita[]>([]);
  citas$: Observable<Cita[]> = this.subject.asObservable();

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Cita>(KEY));
  }

  getAll(): Cita[] {
    return this.storage.get<Cita>(KEY);
  }

  getById(id: string): Cita | undefined {
    return this.getAll().find(c => c.id === id);
  }

  getByCliente(clienteId: string): Cita[] {
    return this.getAll().filter(c => c.clienteId === clienteId);
  }

  getByMascota(mascotaId: string): Cita[] {
    return this.getAll().filter(c => c.mascotaId === mascotaId);
  }

  getHoy(): Cita[] {
    const hoy = new Date().toDateString();
    return this.getAll().filter(c => new Date(c.fecha).toDateString() === hoy);
  }

  create(data: Omit<Cita, 'id' | 'createdAt'>): Cita {
    const cita: Cita = { ...data, id: this.storage.generateId(), createdAt: new Date() };
    const all = this.getAll();
    all.push(cita);
    this.storage.set(KEY, all);
    this.refresh();
    return cita;
  }

  crearInmediata(clienteId: string, mascotaId: string, veterinarioId: string, motivo: string): Cita {
    return this.create({
      clienteId,
      mascotaId,
      veterinarioId,
      fecha: new Date(),
      hora: new Date().toTimeString().substr(0, 5),
      motivo,
      estado: 'inmediata'
    });
  }

  update(id: string, data: Partial<Cita>): void {
    const all = this.getAll().map(c => c.id === id ? { ...c, ...data } : c);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().filter(c => c.id !== id);
    this.storage.set(KEY, all);
    this.refresh();
  }
}
