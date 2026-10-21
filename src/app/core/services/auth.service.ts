import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from '../models';
import { StorageService } from './storage.service';
import { DEMO_MODE } from '../config/demo-mode.token';

const KEY = 'vet_usuarios';
export const SESSION_KEY = 'vet_session';

/** Lo único que se guarda de la sesión: el id del usuario (nunca su contraseña ni su rol). */
interface SesionGuardada {
  id: string;
}

/** Copia del usuario sin la contraseña, para exponerla al resto de la app. */
function sinPassword(u: Usuario): Usuario {
  return { ...u, password: '' };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageService);
  private demo = inject(DEMO_MODE);

  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    if (this.demo) this.seedAdminIfEmpty();
    this.revalidarSesion();
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
        nombre: 'Carlos',
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
      const sesion: SesionGuardada = { id: user.id };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
      this.currentUserSubject.next(sinPassword(user));
      return true;
    }
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.currentUserSubject.next(null);
  }

  /**
   * Vuelve a leer el usuario de la sesión desde el almacén de usuarios.
   * Si ya no existe o está inactivo, cierra la sesión. El rol siempre sale del almacén,
   * no de lo guardado en sessionStorage.
   */
  revalidarSesion(): Usuario | null {
    const id = this.leerIdSesion();
    if (!id) {
      if (this.currentUserSubject.value) this.currentUserSubject.next(null);
      return null;
    }
    const user = this.storage.get<Usuario>(KEY).find(u => u.id === id && u.activo);
    if (!user) {
      this.logout();
      return null;
    }
    const publico = sinPassword(user);
    this.currentUserSubject.next(publico);
    return publico;
  }

  /** Lee el id de la sesión. Migra el formato antiguo (usuario completo con contraseña) a `{ id }`. */
  private leerIdSesion(): string | null {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data) as Partial<Usuario>;
      if (!parsed || typeof parsed.id !== 'string') {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      if (Object.keys(parsed).length > 1) {
        const sesion: SesionGuardada = { id: parsed.id };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
      }
      return parsed.id;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  get currentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  /** Revalida la sesión contra el almacén (lo usan los guards en cada navegación). */
  isLoggedIn(): boolean {
    return !!this.revalidarSesion();
  }

  hasRole(roles: string[]): boolean {
    const user = this.revalidarSesion();
    return user ? roles.includes(user.rol) : false;
  }
}
