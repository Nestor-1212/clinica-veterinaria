import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Receta } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_recetas';

@Injectable({ providedIn: 'root' })
export class RecetasService {
  private subject = new BehaviorSubject<Receta[]>([]);
  recetas$: Observable<Receta[]> = this.subject.asObservable();

  constructor(private storage: StorageService) {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Receta>(KEY));
  }

  getAll(): Receta[] {
    return this.storage.get<Receta>(KEY);
  }

  getById(id: string): Receta | undefined {
    return this.getAll().find(r => r.id === id);
  }

  getByConsulta(consultaId: string): Receta | undefined {
    return this.getAll().find(r => r.consultaId === consultaId);
  }

  getByMascota(mascotaId: string): Receta[] {
    return this.getAll().filter(r => r.mascotaId === mascotaId);
  }

  create(data: Omit<Receta, 'id'>): Receta {
    const receta: Receta = { ...data, id: this.storage.generateId() };
    const all = this.getAll();
    all.push(receta);
    this.storage.set(KEY, all);
    this.refresh();
    return receta;
  }

  update(id: string, data: Partial<Receta>): void {
    const all = this.getAll().map(r => r.id === id ? { ...r, ...data } : r);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().filter(r => r.id !== id);
    this.storage.set(KEY, all);
    this.refresh();
  }
}
