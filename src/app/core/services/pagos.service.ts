import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pago } from '../models';
import { StorageService } from './storage.service';

const KEY = 'vet_pagos';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private storage = inject(StorageService);

  private subject = new BehaviorSubject<Pago[]>([]);
  pagos$: Observable<Pago[]> = this.subject.asObservable();

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.subject.next(this.storage.get<Pago>(KEY));
  }

  getAll(): Pago[] {
    return this.storage.get<Pago>(KEY);
  }

  getById(id: string): Pago | undefined {
    return this.getAll().find(p => p.id === id);
  }

  getByCliente(clienteId: string): Pago[] {
    return this.getAll().filter(p => p.clienteId === clienteId);
  }

  getByMascota(mascotaId: string): Pago[] {
    return this.getAll().filter(p => p.mascotaId === mascotaId);
  }

  getHoy(): Pago[] {
    const hoy = new Date().toDateString();
    return this.getAll().filter(p => new Date(p.fecha).toDateString() === hoy);
  }

  getTotalMes(): number {
    const now = new Date();
    return this.getAll()
      .filter(p => {
        const f = new Date(p.fecha);
        return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear() && p.estado === 'pagado';
      })
      .reduce((acc, p) => acc + p.total, 0);
  }

  create(data: Omit<Pago, 'id'>): Pago {
    const pago: Pago = { ...data, id: this.storage.generateId() };
    const all = this.getAll();
    all.push(pago);
    this.storage.set(KEY, all);
    this.refresh();
    return pago;
  }

  /** Cobra un pago pendiente. Devuelve false si no existe o no estaba pendiente. */
  marcarPagado(id: string): boolean {
    const pago = this.getById(id);
    if (!pago || pago.estado !== 'pendiente') return false;
    this.update(id, { estado: 'pagado', fechaPago: new Date() });
    return true;
  }

  /** Anula un pago pendiente o pagado. El motivo es obligatorio. */
  anular(id: string, motivo: string, usuarioId?: string): boolean {
    const pago = this.getById(id);
    const motivoLimpio = (motivo || '').trim();
    if (!pago || pago.estado === 'anulado' || !motivoLimpio) return false;
    this.update(id, { estado: 'anulado', motivoAnulacion: motivoLimpio, fechaAnulacion: new Date(), anuladoPor: usuarioId });
    return true;
  }

  update(id: string, data: Partial<Pago>): void {
    const all = this.getAll().map(p => p.id === id ? { ...p, ...data } : p);
    this.storage.set(KEY, all);
    this.refresh();
  }

  delete(id: string): void {
    const all = this.getAll().filter(p => p.id !== id);
    this.storage.set(KEY, all);
    this.refresh();
  }
}
