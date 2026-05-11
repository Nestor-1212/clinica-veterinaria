import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Consulta } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_consultas';

@Injectable({ providedIn: 'root' })
export class ConsultasService {
  private subject = new BehaviorSubject<Consulta[]>([]);
  consultas$: Observable<Consulta[]> = this.subject.asObservable();

  constructor(private storage: StorageService) {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Consulta>(KEY));
  }

  getAll(): Consulta[] {
    return this.storage.get<Consulta>(KEY);
  }

  getById(id: string): Consulta | undefined {
    return this.getAll().find(c => c.id === id);
  }

  getByMascota(mascotaId: string): Consulta[] {
    return this.getAll().filter(c => c.mascotaId === mascotaId);
  }

  getByCliente(clienteId: string): Consulta[] {
    return this.getAll().filter(c => c.clienteId === clienteId);
  }

  getHoy(): Consulta[] {
    const hoy = new Date().toDateString();
    return this.getAll().filter(c => new Date(c.fecha).toDateString() === hoy);
  }

  create(data: Omit<Consulta, 'id' | 'createdAt'>): Consulta {
    const consulta: Consulta = { ...data, id: this.storage.generateId(), createdAt: new Date() };
    const all = this.getAll();
    all.push(consulta);
    this.storage.set(KEY, all);
    this.refresh();
    return consulta;
  }

  update(id: string, data: Partial<Consulta>): void {
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
