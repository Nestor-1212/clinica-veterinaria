import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cliente } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_clientes';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  clientes$: Observable<Cliente[]> = this.clientesSubject.asObservable();

  constructor(private storage: StorageService) {
    this.refresh();
  }

  private refresh(): void {
    this.clientesSubject.next(this.storage.get<Cliente>(KEY));
  }

  getAll(): Cliente[] {
    return this.storage.get<Cliente>(KEY);
  }

  getById(id: string): Cliente | undefined {
    return this.getAll().find(c => c.id === id);
  }

  search(query: string): Cliente[] {
    const q = query.toLowerCase().trim();
    return this.getAll().filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.cedula.includes(q) ||
      c.telefono.includes(q)
    );
  }

  create(data: Omit<Cliente, 'id' | 'fechaRegistro' | 'activo'>): Cliente {
    const cliente: Cliente = {
      ...data,
      id: this.storage.generateId(),
      fechaRegistro: new Date(),
      activo: true
    };
    const all = this.getAll();
    all.push(cliente);
    this.storage.set(KEY, all);
    this.refresh();
    return cliente;
  }

  update(id: string, data: Partial<Cliente>): void {
    const all = this.getAll().map(c => c.id === id ? { ...c, ...data } : c);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().map(c => c.id === id ? { ...c, activo: false } : c);
    this.storage.set(KEY, all);
    this.refresh();
  }

  existeCedula(cedula: string, excludeId?: string): boolean {
    return this.getAll().some(c => c.cedula === cedula && c.id !== excludeId && c.activo);
  }
}
