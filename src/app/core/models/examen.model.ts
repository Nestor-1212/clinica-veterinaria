/** Archivo adjunto (PDF del laboratorio, imagen). El contenido vive en IndexedDB (ArchivosService). */
export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  /** Bytes. */
  tamano: number;
  fecha: Date | string;
}

export interface Examen {
  id: string;
  mascotaId: string;
  clienteId: string;
  consultaId?: string;
  veterinarioId: string;
  tipo: string;
  descripcion: string;
  resultado: string;
  fecha: Date | string;
  archivos?: ArchivoAdjunto[];
}
