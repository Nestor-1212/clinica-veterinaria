import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Mascota } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_mascotas';

@Injectable({ providedIn: 'root' })
export class MascotasService {
  private subject = new BehaviorSubject<Mascota[]>([]);
  mascotas$: Observable<Mascota[]> = this.subject.asObservable();

  constructor(private storage: StorageService) {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Mascota>(KEY));
  }

  getAll(): Mascota[] {
    return this.storage.get<Mascota>(KEY);
  }

  getById(id: string): Mascota | undefined {
    return this.getAll().find(m => m.id === id);
  }

  getByCliente(clienteId: string): Mascota[] {
    return this.getAll().filter(m => m.clienteId === clienteId && m.activo);
  }

  searchByNombre(query: string): Mascota[] {
    const q = query.toLowerCase();
    return this.getAll().filter(m => m.nombre.toLowerCase().includes(q) && m.activo);
  }

  create(data: Omit<Mascota, 'id' | 'activo'>): Mascota {
    const mascota: Mascota = { ...data, id: this.storage.generateId(), activo: true };
    const all = this.getAll();
    all.push(mascota);
    this.storage.set(KEY, all);
    this.refresh();
    return mascota;
  }

  update(id: string, data: Partial<Mascota>): void {
    const all = this.getAll().map(m => m.id === id ? { ...m, ...data } : m);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().map(m => m.id === id ? { ...m, activo: false } : m);
    this.storage.set(KEY, all);
    this.refresh();
  }
}
