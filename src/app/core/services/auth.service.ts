import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_usuarios';
const SESSION_KEY = 'vet_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageService);

  private currentUserSubject = new BehaviorSubject<Usuario | null>(this.loadSession());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.seedAdminIfEmpty();
  }

  private seedAdminIfEmpty(): void {
    const users = this.storage.get<Usuario>(KEY);
    if (users.length === 0) {
      const admin: Usuario = {
        id: this.storage.generateId(),
        nombre: 'Admin',
        apellido: 'Sistema',
        correo: 'admin@clinica.com',
        password: 'admin123',
        rol: 'admin',
        activo: true,
        createdAt: new Date()
      };
      const vet: Usuario = {
        id: this.storage.generateId(),
        nombre: 'Dr. Carlos',
        apellido: 'Rodríguez',
        correo: 'vet@clinica.com',
        password: 'vet123',
        rol: 'veterinario',
        especialidad: 'Medicina General',
        activo: true,
        createdAt: new Date()
      };
      const recepcion: Usuario = {
        id: this.storage.generateId(),
        nombre: 'María',
        apellido: 'López',
        correo: 'recepcion@clinica.com',
        password: 'rec123',
        rol: 'recepcion',
        activo: true,
        createdAt: new Date()
      };
      this.storage.set(KEY, [admin, vet, recepcion]);
    }
  }

  login(correo: string, password: string): boolean {
    const users = this.storage.get<Usuario>(KEY);
    const user = users.find(u => u.correo === correo && u.password === password && u.activo);
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
      return true;
    }
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.currentUserSubject.next(null);
  }

  private loadSession(): Usuario | null {
    const data = sessionStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  get currentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return user ? roles.includes(user.rol) : false;
  }
}
