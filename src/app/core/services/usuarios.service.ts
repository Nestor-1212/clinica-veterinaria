import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Usuario } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_usuarios';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private storage = inject(StorageService);

  private subject = new BehaviorSubject<Usuario[]>([]);
  usuarios$: Observable<Usuario[]> = this.subject.asObservable();

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Usuario>(KEY));
  }

  getAll(): Usuario[] {
    return this.storage.get<Usuario>(KEY);
  }

  getById(id: string): Usuario | undefined {
    return this.getAll().find(u => u.id === id);
  }

  getVeterinarios(): Usuario[] {
    return this.getAll().filter(u => u.rol === 'veterinario' && u.activo);
  }

  getNombreCompleto(id: string): string {
    const u = this.getById(id);
    return u ? `${u.nombre} ${u.apellido}` : 'Desconocido';
  }

  create(data: Omit<Usuario, 'id' | 'createdAt'>): Usuario {
    const usuario: Usuario = { ...data, id: this.storage.generateId(), createdAt: new Date() };
    const all = this.getAll();
    all.push(usuario);
    this.storage.set(KEY, all);
    this.refresh();
    return usuario;
  }

  update(id: string, data: Partial<Usuario>): void {
    const all = this.getAll().map(u => u.id === id ? { ...u, ...data } : u);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().map(u => u.id === id ? { ...u, activo: false } : u);
    this.storage.set(KEY, all);
    this.refresh();
  }

  existeCorreo(correo: string, excludeId?: string): boolean {
    return this.getAll().some(u => u.correo === correo && u.id !== excludeId);
  }
}
