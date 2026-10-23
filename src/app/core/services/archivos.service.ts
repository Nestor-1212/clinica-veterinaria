import { Injectable } from '@angular/core';

const BD = 'vetsystem-archivos';
const ALMACEN = 'archivos';

/** Tipos aceptados como adjunto de un examen. */
export const TIPOS_ADJUNTO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
/** Tamaño máximo por archivo (10 MB). */
export const MAX_ADJUNTO = 10 * 1024 * 1024;

/** Motivo por el que un archivo no se acepta, o null si es válido. */
export function validarAdjunto(archivo: Pick<File, 'type' | 'size' | 'name'>): string | null {
  if (!TIPOS_ADJUNTO.includes(archivo.type)) return `«${archivo.name}» no es PDF ni imagen (JPG, PNG o WebP).`;
  if (archivo.size > MAX_ADJUNTO) return `«${archivo.name}» pesa más de 10 MB.`;
  return null;
}

/** "850 KB", "2.4 MB". */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Contenido de los archivos adjuntos en IndexedDB del navegador. localStorage solo admite
 * unos 5 MB en total (unos pocos PDF lo llenarían); aquí se guarda el archivo y el examen
 * conserva solo sus datos (nombre, tipo, tamaño).
 */
@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private bd: Promise<IDBDatabase> | null = null;

  private abrir(): Promise<IDBDatabase> {
    this.bd ??= new Promise((resolve, reject) => {
      const peticion = indexedDB.open(BD, 1);
      peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN);
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(peticion.error);
    });
    return this.bd;
  }

  private async operar<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const bd = await this.abrir();
    return new Promise((resolve, reject) => {
      const peticion = accion(bd.transaction(ALMACEN, modo).objectStore(ALMACEN));
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(peticion.error);
    });
  }

  async guardar(id: string, contenido: Blob): Promise<void> {
    await this.operar('readwrite', a => a.put(contenido, id));
  }

  obtener(id: string): Promise<Blob | undefined> {
    return this.operar<Blob | undefined>('readonly', a => a.get(id) as IDBRequest<Blob | undefined>);
  }

  async eliminar(id: string): Promise<void> {
    await this.operar('readwrite', a => a.delete(id));
  }
}
