export type MetodoPago = 'efectivo' | 'tarjeta' | 'yappy' | 'transferencia';
export type EstadoPago = 'pendiente' | 'pagado' | 'anulado';

export interface ItemPago {
  descripcion: string;
  categoria: 'consulta' | 'medicamento' | 'vacuna' | 'cirugia' | 'examen' | 'otro';
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pago {
  id: string;
  clienteId: string;
  mascotaId: string;
  consultaId?: string;
  fecha: Date | string;
  items: ItemPago[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: MetodoPago;
  estado: EstadoPago;
  referencia?: string;
  notas?: string;
}
