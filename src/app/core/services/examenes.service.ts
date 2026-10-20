import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Examen } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_examenes';

@Injectable({ providedIn: 'root' })
export class ExamenesService {
  private storage = inject(StorageService);

  private subject = new BehaviorSubject<Examen[]>([]);
  examenes$: Observable<Examen[]> = this.subject.asObservable();

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Examen>(KEY));
  }

  getAll(): Examen[] {
    return this.storage.get<Examen>(KEY);
  }

  getById(id: string): Examen | undefined {
    return this.getAll().find(e => e.id === id);
  }

  getByMascota(mascotaId: string): Examen[] {
    return this.getAll().filter(e => e.mascotaId === mascotaId);
  }

  create(data: Omit<Examen, 'id'>): Examen {
    const examen: Examen = { ...data, id: this.storage.generateId() };
    const all = this.getAll();
    all.push(examen);
    this.storage.set(KEY, all);
    this.refresh();
    return examen;
  }

  update(id: string, data: Partial<Examen>): void {
    const all = this.getAll().map(e => e.id === id ? { ...e, ...data } : e);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().filter(e => e.id !== id);
    this.storage.set(KEY, all);
    this.refresh();
  }
}
