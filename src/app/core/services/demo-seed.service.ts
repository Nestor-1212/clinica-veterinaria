import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { DEMO_MODE } from '../config/demo-mode.token';
import { Cliente, Mascota, Usuario, Cita, Consulta, Examen, Pago, Receta, Vacuna, ItemPago, MetodoPago, TipoMascota, SexoMascota } from '../models';

/**
 * Versión de los datos de demostración. Al subirla, los navegadores en modo demo
 * regeneran los datos una vez (se reemplazan las colecciones clínicas; los usuarios se conservan).
 */
export const VERSION_DATOS_DEMO = 6;
const CLAVE_VERSION = 'vet_demo_version';
const COLECCIONES_CLINICAS = ['vet_clientes', 'vet_mascotas', 'vet_citas', 'vet_consultas', 'vet_examenes', 'vet_recetas', 'vet_pagos', 'vet_vacunas'];

/** Días de historia que se generan hacia atrás y agenda futura. */
const DIAS_HISTORIA = 180;
const DIAS_FUTURO = 14;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function conHora(dia: Date, hora: string): Date {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(dia);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Generador pseudoaleatorio con semilla (mulberry32): los mismos datos en cada siembra. */
function crearAzar(semilla: number) {
  let a = semilla >>> 0;
  const siguiente = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    num: siguiente,
    entero: (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1)),
    uno: <T>(lista: readonly T[]): T => lista[Math.floor(siguiente() * lista.length)],
    prob: (p: number) => siguiente() < p,
    /** Elige según pesos: [[valor, peso], ...] */
    pesado: <T>(opciones: readonly (readonly [T, number])[]): T => {
      const total = opciones.reduce((s, [, w]) => s + w, 0);
      let r = siguiente() * total;
      for (const [v, w] of opciones) { r -= w; if (r <= 0) return v; }
      return opciones[opciones.length - 1][0];
    }
  };
}
type Azar = ReturnType<typeof crearAzar>;

// ---------- Catálogos ficticios (Panamá) ----------
const NOMBRES = ['José', 'Ana', 'Luis', 'Carmen', 'Jorge', 'Gabriela', 'Ricardo', 'Patricia', 'Fernando', 'Isabel', 'Andrés', 'Mariela', 'Eduardo', 'Yaneth', 'Héctor', 'Daniela', 'Raúl', 'Itzel', 'Óscar', 'Valeria', 'Alexis', 'Melissa', 'Javier', 'Yamileth', 'Rubén', 'Karina', 'Abdiel', 'Lorena', 'Iván', 'Marisol', 'Edwin', 'Rosa', 'Kevin', 'Anabel', 'Omar', 'Nathalie'];
const APELLIDOS = ['Rodríguez', 'Batista', 'Castillo', 'Vásquez', 'Moreno', 'Samaniego', 'De León', 'Ortega', 'Pinzón', 'Quintero', 'Barría', 'Sánchez', 'Cedeño', 'Arosemena', 'Guerra', 'Montenegro', 'Abrego', 'Caballero', 'Pitti', 'Vergara', 'Saavedra', 'Delgado', 'Núñez', 'Herrera'];
const BARRIOS = ['San Francisco', 'Bella Vista', 'El Cangrejo', 'Costa del Este', 'Condado del Rey', 'Clayton', 'Albrook', 'Obarrio', 'Betania', 'Juan Díaz', 'Brisas del Golf', 'Villa Lucre', 'Altos de Panamá', 'Punta Pacífica', 'Coco del Mar'];
const NOMBRES_MASCOTA = ['Bruno', 'Canela', 'Toby', 'Lola', 'Simba', 'Nala', 'Rocco', 'Maya', 'Zeus', 'Kira', 'Oreo', 'Chispa', 'Milo', 'Pelusa', 'Duke', 'Princesa', 'Copito', 'Tango', 'Frida', 'Bobby', 'Lucky', 'Mía', 'Pancho', 'Tita', 'Hachi', 'Sasha', 'Rambo', 'Cleo', 'Pipo', 'Moka', 'Benji', 'Kiara'];
const RAZAS: Record<TipoMascota, string[]> = {
  Perro: ['Mestizo', 'Labrador', 'Golden Retriever', 'Shih Tzu', 'Poodle', 'Chihuahua', 'Pastor Alemán', 'Beagle', 'Schnauzer', 'Pitbull', 'Yorkshire'],
  Gato: ['Doméstico', 'Siamés', 'Persa', 'Angora', 'Maine Coon'],
  Ave: ['Periquito', 'Cotorra', 'Cacatúa'],
  Conejo: ['Holandés', 'Cabeza de león', 'Mini Lop'],
  Reptil: ['Iguana', 'Tortuga de orejas rojas'],
  Otro: ['Hámster', 'Cobayo']
};
const COLORES = ['Negro', 'Blanco', 'Café', 'Dorado', 'Gris', 'Atigrado', 'Crema', 'Negro y blanco', 'Tricolor', 'Canela'];

interface Servicio {
  motivo: string;
  peso: number;
  /** Solo para estas especies (todas si no se indica). */
  especies?: TipoMascota[];
  items: ItemPago[];
  diagnostico: string;
  tratamiento: string;
  sintomas: string;
  receta?: { medicamento: string; dosis: string; frecuencia: string; duracion: string; indicaciones?: string }[];
  examen?: { tipo: string; descripcion: string; resultado: string; precio: number };
  vacuna?: { nombre: string; laboratorio: string; meses: number };
}

const item = (descripcion: string, categoria: ItemPago['categoria'], precio: number, cantidad = 1): ItemPago =>
  ({ descripcion, categoria, cantidad, precioUnitario: precio, subtotal: precio * cantidad });

const SERVICIOS: Servicio[] = [
  { motivo: 'Consulta general de rutina', peso: 22, items: [item('Consulta veterinaria', 'consulta', 25)], sintomas: 'Revisión anual sin molestias', diagnostico: 'Paciente sano', tratamiento: 'Mantener alimentación y ejercicio' },
  { motivo: 'Vacunación anual', peso: 16, especies: ['Perro'], items: [item('Consulta veterinaria', 'consulta', 15), item('Vacuna Óctuple Canina', 'vacuna', 28)], sintomas: 'Refuerzo de vacunación', diagnostico: 'Apto para vacunación', tratamiento: 'Vacuna aplicada, control en 12 meses', vacuna: { nombre: 'Óctuple Canina', laboratorio: 'Zoetis', meses: 12 } },
  { motivo: 'Vacuna antirrábica', peso: 9, especies: ['Perro', 'Gato'], items: [item('Consulta veterinaria', 'consulta', 15), item('Vacuna antirrábica', 'vacuna', 22)], sintomas: 'Refuerzo antirrábico', diagnostico: 'Apto para vacunación', tratamiento: 'Vacuna aplicada', vacuna: { nombre: 'Rabia', laboratorio: 'Zoetis', meses: 12 } },
  { motivo: 'Vacunación felina', peso: 9, especies: ['Gato'], items: [item('Consulta veterinaria', 'consulta', 15), item('Vacuna Triple Felina', 'vacuna', 26)], sintomas: 'Refuerzo de vacunación', diagnostico: 'Apto para vacunación', tratamiento: 'Vacuna aplicada', vacuna: { nombre: 'Triple Felina', laboratorio: 'MSD', meses: 12 } },
  { motivo: 'Desparasitación', peso: 8, items: [item('Consulta veterinaria', 'consulta', 15), item('Antiparasitario interno', 'medicamento', 12)], sintomas: 'Control de parásitos', diagnostico: 'Desparasitación preventiva', tratamiento: 'Antiparasitario oral, repetir en 3 meses', receta: [{ medicamento: 'Antiparasitario interno', dosis: '1 tableta', frecuencia: 'Dosis única', duracion: '1 día', indicaciones: 'Repetir en 3 meses' }] },
  { motivo: 'Control de dermatitis', peso: 8, especies: ['Perro', 'Gato', 'Conejo'], items: [item('Consulta dermatológica', 'consulta', 30), item('Antihistamínico + crema tópica', 'medicamento', 18)], sintomas: 'Picazón y enrojecimiento en la piel', diagnostico: 'Dermatitis alérgica', tratamiento: 'Antihistamínico y crema tópica por 10 días', receta: [{ medicamento: 'Cetirizina', dosis: '0.5 mg/kg', frecuencia: 'Cada 24 horas', duracion: '10 días' }, { medicamento: 'Crema de hidrocortisona', dosis: 'Capa fina', frecuencia: '2 veces al día', duracion: '10 días', indicaciones: 'Solo en zonas afectadas' }], examen: { tipo: 'Raspado de piel', descripcion: 'Descartar ácaros y hongos', resultado: 'Sin ácaros ni hongos', precio: 22 } },
  { motivo: 'Problema digestivo', peso: 7, items: [item('Consulta veterinaria', 'consulta', 25), item('Probiótico + dieta gastrointestinal', 'medicamento', 16)], sintomas: 'Vómito y pérdida de apetito', diagnostico: 'Gastroenteritis leve', tratamiento: 'Dieta blanda y probiótico por 5 días', receta: [{ medicamento: 'Probiótico veterinario', dosis: '1 sobre', frecuencia: 'Cada 24 horas', duracion: '7 días', indicaciones: 'Mezclar con la comida' }], examen: { tipo: 'Hemograma completo', descripcion: 'Evaluación general', resultado: 'Valores dentro de rango normal', precio: 35 } },
  { motivo: 'Limpieza dental', peso: 5, especies: ['Perro', 'Gato'], items: [item('Profilaxis dental con anestesia', 'cirugia', 85)], sintomas: 'Sarro y mal aliento', diagnostico: 'Enfermedad periodontal leve', tratamiento: 'Limpieza dental bajo anestesia', receta: [{ medicamento: 'Amoxicilina', dosis: '10 mg/kg', frecuencia: 'Cada 12 horas', duracion: '7 días' }] },
  { motivo: 'Esterilización', peso: 4, especies: ['Perro', 'Gato'], items: [item('Cirugía de esterilización', 'cirugia', 140), item('Analgésico postoperatorio', 'medicamento', 14)], sintomas: 'Cirugía programada', diagnostico: 'Apto para cirugía', tratamiento: 'Esterilización sin complicaciones, control en 10 días', receta: [{ medicamento: 'Meloxicam', dosis: '0.1 mg/kg', frecuencia: 'Cada 24 horas', duracion: '3 días', indicaciones: 'Administrar con comida' }], examen: { tipo: 'Perfil bioquímico prequirúrgico', descripcion: 'Control preoperatorio', resultado: 'Función renal y hepática normal', precio: 40 } },
  { motivo: 'Control post-operatorio', peso: 5, items: [item('Control postoperatorio', 'consulta', 20)], sintomas: 'Revisión de herida quirúrgica', diagnostico: 'Cicatrización correcta', tratamiento: 'Retiro de puntos' },
  { motivo: 'Otitis', peso: 5, especies: ['Perro', 'Gato'], items: [item('Consulta veterinaria', 'consulta', 25), item('Gotas óticas', 'medicamento', 15)], sintomas: 'Sacude la cabeza y se rasca las orejas', diagnostico: 'Otitis externa', tratamiento: 'Limpieza y gotas óticas por 7 días', receta: [{ medicamento: 'Gotas óticas con antibiótico', dosis: '4 gotas', frecuencia: 'Cada 12 horas', duracion: '7 días' }] },
  { motivo: 'Cojera', peso: 4, especies: ['Perro'], items: [item('Consulta veterinaria', 'consulta', 25), item('Radiografía', 'examen', 40), item('Antiinflamatorio', 'medicamento', 18)], sintomas: 'Cojera en una extremidad', diagnostico: 'Esguince leve', tratamiento: 'Reposo y antiinflamatorio por 7 días', receta: [{ medicamento: 'Carprofeno', dosis: '2 mg/kg', frecuencia: 'Cada 12 horas', duracion: '7 días', indicaciones: 'Con comida' }] },
  { motivo: 'Revisión de ave o exótico', peso: 4, especies: ['Ave', 'Conejo', 'Reptil', 'Otro'], items: [item('Consulta de exóticos', 'consulta', 30)], sintomas: 'Revisión general', diagnostico: 'Déficit nutricional leve', tratamiento: 'Suplemento vitamínico y ajuste de dieta', receta: [{ medicamento: 'Complejo vitamínico', dosis: '2 gotas en el agua', frecuencia: 'Diaria', duracion: '14 días' }] }
];

const HORAS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

@Injectable({ providedIn: 'root' })
export class DemoSeedService {
  private storage = inject(StorageService);
  private demo = inject(DEMO_MODE);

  /**
   * Siembra datos de ejemplo solo en modo demo: si no hay clientes o si los datos
   * demo son de una versión anterior (se regeneran una vez).
   */
  seedIfEmpty(): void {
    if (!this.demo) return;
    const version = Number(localStorage.getItem(CLAVE_VERSION) || '0');
    const hayClientes = this.storage.get<Cliente>('vet_clientes').length > 0;
    if (hayClientes && version >= VERSION_DATOS_DEMO) return;
    this.sembrar(new Date());
    localStorage.setItem(CLAVE_VERSION, String(VERSION_DATOS_DEMO));
  }

  /** Genera todas las colecciones demo con `hoy` como referencia (expuesto para pruebas). */
  sembrar(hoy: Date): void {
    const azar = crearAzar(20261022);
    const id = () => this.storage.generateId();
    for (const clave of COLECCIONES_CLINICAS) this.storage.set(clave, []);

    // --- Usuarios: conserva las 3 cuentas demo del login y asegura 2 veterinarios extra ---
    const usuarios: Usuario[] = this.storage.get<Usuario>('vet_usuarios');
    if (usuarios.length === 0) {
      usuarios.push(
        { id: id(), nombre: 'Admin', apellido: 'Sistema', correo: 'admin@clinica.com', password: 'admin123', rol: 'admin', activo: true, createdAt: hoy },
        { id: id(), nombre: 'Carlos', apellido: 'Rodríguez', correo: 'vet@clinica.com', password: 'vet123', rol: 'veterinario', especialidad: 'Medicina General', activo: true, createdAt: hoy },
        { id: id(), nombre: 'María', apellido: 'López', correo: 'recepcion@clinica.com', password: 'rec123', rol: 'recepcion', activo: true, createdAt: hoy }
      );
    }
    if (!usuarios.some(u => u.correo === 'sfernandez@clinica.com')) {
      usuarios.push(
        { id: id(), nombre: 'Sofía', apellido: 'Fernández', correo: 'sfernandez@clinica.com', password: 'vet123', rol: 'veterinario', especialidad: 'Cirugía', activo: true, createdAt: hoy },
        { id: id(), nombre: 'Luis', apellido: 'Morales', correo: 'lmorales@clinica.com', password: 'vet123', rol: 'veterinario', especialidad: 'Dermatología', activo: true, createdAt: hoy }
      );
    }
    this.storage.set('vet_usuarios', usuarios);
    const veterinarios = usuarios.filter(u => u.rol === 'veterinario' && u.activo).map(u => u.id);

    // --- Clientes: los 6 conocidos de la demo + clientes generados ---
    const clientes: Cliente[] = [
      { id: id(), nombre: 'María González', cedula: '8-888-1234', telefono: '6000-1111', correo: 'maria.gonzalez@example.com', direccion: 'Calle 50, Panamá', fechaRegistro: addDays(hoy, -420), activo: true },
      { id: id(), nombre: 'Carlos Pérez', cedula: '8-777-5678', telefono: '6000-2222', correo: 'carlos.perez@example.com', direccion: 'Vía España, Panamá', fechaRegistro: addDays(hoy, -380), activo: true },
      { id: id(), nombre: 'Ana Castillo', cedula: '4-123-9988', telefono: '6000-3333', correo: 'ana.castillo@example.com', direccion: 'San Francisco, Panamá', fechaRegistro: addDays(hoy, -300), activo: true },
      { id: id(), nombre: 'Roberto Jiménez', cedula: '9-456-2211', telefono: '6000-4444', correo: 'roberto.jimenez@example.com', direccion: 'Costa del Este, Panamá', fechaRegistro: addDays(hoy, -260), activo: true },
      { id: id(), nombre: 'Lucía Herrera', cedula: '2-321-6677', telefono: '6000-5555', correo: 'lucia.herrera@example.com', direccion: 'Bella Vista, Panamá', fechaRegistro: addDays(hoy, -200), activo: true },
      { id: id(), nombre: 'Diego Santamaría', cedula: '7-654-3322', telefono: '6000-6666', correo: 'diego.santamaria@example.com', direccion: 'El Cangrejo, Panamá', fechaRegistro: addDays(hoy, -150), activo: true }
    ];
    const usados = new Set(clientes.map(c => c.nombre));
    while (clientes.length < 42) {
      const nombre = `${azar.uno(NOMBRES)} ${azar.uno(APELLIDOS)}`;
      if (usados.has(nombre)) continue;
      usados.add(nombre);
      const n = clientes.length;
      // Los últimos clientes son recientes (altas del mes en curso)
      const antiguedad = n >= 37 ? azar.entero(0, Math.max(0, hoy.getDate() - 1)) : azar.entero(30, 720);
      const slug = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').replace(/ /g, '.');
      clientes.push({
        id: id(), nombre,
        cedula: `${azar.entero(1, 9)}-${azar.entero(100, 999)}-${azar.entero(1000, 9999)}`,
        telefono: `6${azar.entero(100, 999)}-${azar.entero(1000, 9999)}`,
        correo: `${slug}@example.com`,
        direccion: `${azar.uno(BARRIOS)}, Panamá`,
        fechaRegistro: addDays(hoy, -antiguedad), activo: true
      });
    }
    this.storage.set('vet_clientes', clientes);

    // --- Mascotas: las 8 conocidas + 1-2 por cliente generado ---
    const conocidas: [number, string, TipoMascota, string, SexoMascota, number, number, string, string?][] = [
      [0, 'Rocky', 'Perro', 'Labrador', 'macho', 3, 28, 'Dorado'],
      [0, 'Michi', 'Gato', 'Doméstico', 'hembra', 1, 3.5, 'Negro'],
      [1, 'Luna', 'Gato', 'Siamés', 'hembra', 2, 4, 'Blanco'],
      [2, 'Max', 'Perro', 'Bulldog Francés', 'macho', 4, 12, 'Atigrado'],
      [3, 'Kiwi', 'Ave', 'Periquito', 'macho', 1, 0.04, 'Verde'],
      [4, 'Coco', 'Conejo', 'Holandés', 'hembra', 2, 2.1, 'Blanco y café', 'Sensibilidad a ciertos antibióticos'],
      [5, 'Thor', 'Perro', 'Pastor Alemán', 'macho', 5, 34, 'Negro y café'],
      [1, 'Nube', 'Perro', 'Poodle', 'hembra', 6, 6, 'Blanco']
    ];
    const mascotas: Mascota[] = conocidas.map(([ci, nombre, tipo, raza, sexo, edad, peso, color, alergias]) => ({
      id: id(), clienteId: clientes[ci].id, nombre, tipo, raza, sexo, edad, peso, color,
      fechaNacimiento: addDays(hoy, -Math.round(edad * 365)), activo: true, ...(alergias ? { alergias } : {})
    }));
    for (const cliente of clientes.slice(6)) {
      const cuantas = azar.pesado([[1, 70], [2, 30]] as const);
      for (let i = 0; i < cuantas; i++) {
        const tipo = azar.pesado<TipoMascota>([['Perro', 55], ['Gato', 32], ['Ave', 5], ['Conejo', 4], ['Reptil', 2], ['Otro', 2]]);
        const edad = azar.entero(0, 13) || 1;
        const peso = tipo === 'Perro' ? azar.entero(3, 38) : tipo === 'Gato' ? azar.entero(2, 7) : Math.round(azar.num() * 20) / 10 + 0.1;
        mascotas.push({
          id: id(), clienteId: cliente.id, nombre: azar.uno(NOMBRES_MASCOTA), tipo, raza: azar.uno(RAZAS[tipo]),
          sexo: azar.prob(0.5) ? 'macho' : 'hembra', edad, peso, color: azar.uno(COLORES),
          fechaNacimiento: addDays(hoy, -edad * 365 - azar.entero(0, 300)), activo: true,
          ...(azar.prob(0.08) ? { alergias: azar.uno(['Alergia al pollo', 'Sensibilidad a la penicilina', 'Alergia a pulgas']) } : {})
        });
      }
    }
    this.storage.set('vet_mascotas', mascotas);

    // Cada cliente tiene un ritmo de visitas; ~1 de cada 5 dejó de venir hace más de 90 días
    const perfil = new Map(clientes.map((c, i) => {
      const registro = new Date(c.fechaRegistro);
      const desde = Math.max(-DIAS_HISTORIA, Math.round((registro.getTime() - hoy.getTime()) / 86400000));
      const inactivo = i >= 6 && i < 37 && azar.prob(0.22);
      return [c.id, { desde, hasta: inactivo ? -azar.entero(95, 170) : DIAS_FUTURO, peso: azar.pesado([[1, 50], [2, 35], [4, 15]] as const) }];
    }));

    const citas: Cita[] = [];
    const consultas: Consulta[] = [];
    const recetas: Receta[] = [];
    const examenes: Examen[] = [];
    const pagos: Pago[] = [];
    const vacunas: Vacuna[] = [];
    const ultimaVacuna = new Map<string, Vacuna>();
    const ahoraHora = `${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`;

    for (let d = -DIAS_HISTORIA; d <= DIAS_FUTURO; d++) {
      const dia = addDays(hoy, d);
      const semana = dia.getDay();
      if (semana === 0) continue; // domingo cerrado
      // Volumen: sábado medio día; agenda futura cada vez más vacía
      // Clínica pequeña: ~7-8 citas al día entre los 3 veterinarios (cabe holgado en localStorage)
      let ocupacion = semana === 6 ? 0.08 : 0.12 + azar.num() * 0.06;
      if (d > 0) ocupacion *= Math.max(0.12, 1 - d / 10);
      // Una mascota no tiene dos citas el mismo día
      const atendidasHoy = new Set<string>();
      for (const vet of veterinarios) {
        for (const hora of HORAS) {
          if (semana === 6 && hora >= '13:00') continue;
          if (!azar.prob(ocupacion)) continue;
          const elegibles = mascotas.filter(m => { const p = perfil.get(m.clienteId)!; return d >= p.desde && d <= p.hasta && !atendidasHoy.has(m.id); });
          if (elegibles.length === 0) continue;
          const mascota = this.elegirMascota(azar, elegibles, perfil);
          atendidasHoy.add(mascota.id);
          const servicio = this.elegirServicio(azar, mascota.tipo);
          const pasado = d < 0 || (d === 0 && hora < ahoraHora);
          const inmediata = pasado && azar.prob(0.07);
          const motivo = inmediata ? `Atención inmediata — ${servicio.motivo.toLowerCase()}` : servicio.motivo;

          let estado: Cita['estado'];
          // Pasado: ~9 % canceladas, ~5 % sin atender (no llegó: queda pendiente/confirmada) y el resto atendidas
          if (pasado) estado = azar.pesado([['completada', 86], ['cancelada', 9], ['confirmada', 3], ['pendiente', 2]] as const);
          else if (d === 0 && hora < this.sumarMinutos(ahoraHora, 45) && azar.prob(0.15)) estado = 'inmediata';
          else estado = d <= 1 ? azar.pesado([['confirmada', 60], ['pendiente', 40]] as const) : azar.pesado([['pendiente', 70], ['confirmada', 30]] as const);

          const cita: Cita = { id: id(), clienteId: mascota.clienteId, mascotaId: mascota.id, veterinarioId: vet, fecha: conHora(dia, hora), hora, motivo, estado, createdAt: addDays(dia, -azar.entero(0, 10)) };
          citas.push(cita);
          if (estado !== 'completada') continue;

          const fechaAtencion = conHora(dia, hora);
          const consulta: Consulta = {
            id: id(), clienteId: mascota.clienteId, mascotaId: mascota.id, veterinarioId: vet, citaId: cita.id, fecha: fechaAtencion,
            sintomas: servicio.sintomas, temperatura: Math.round((37.8 + azar.num() * 1.4) * 10) / 10, peso: mascota.peso,
            diagnostico: servicio.diagnostico, tratamiento: servicio.tratamiento, tipo: inmediata ? 'inmediata' : 'cita', createdAt: fechaAtencion
          };
          consultas.push(consulta);

          const items = servicio.items.map(i => ({ ...i }));
          if (inmediata) items.unshift(item('Recargo por atención inmediata', 'consulta', 20));
          if (servicio.receta && azar.prob(0.8)) {
            recetas.push({ id: id(), consultaId: consulta.id, mascotaId: mascota.id, clienteId: mascota.clienteId, veterinarioId: vet, fecha: fechaAtencion, items: servicio.receta.map(r => ({ ...r })) });
          }
          if (servicio.examen && azar.prob(0.45)) {
            examenes.push({ id: id(), mascotaId: mascota.id, clienteId: mascota.clienteId, consultaId: consulta.id, veterinarioId: vet, tipo: servicio.examen.tipo, descripcion: servicio.examen.descripcion, resultado: servicio.examen.resultado, fecha: fechaAtencion });
            items.push(item(servicio.examen.tipo, 'examen', servicio.examen.precio));
          }
          if (servicio.vacuna) {
            const vacuna: Vacuna = {
              id: id(), mascotaId: mascota.id, clienteId: mascota.clienteId, veterinarioId: vet, nombre: servicio.vacuna.nombre,
              lote: `${servicio.vacuna.nombre.slice(0, 2).toUpperCase()}-${azar.entero(1000, 9999)}`, fechaAplicacion: fechaAtencion,
              proximaFecha: addDays(dia, servicio.vacuna.meses * 30), laboratorio: servicio.vacuna.laboratorio
            };
            vacunas.push(vacuna);
            ultimaVacuna.set(`${mascota.id}|${vacuna.nombre}`, vacuna);
          }

          const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
          const descuento = azar.prob(0.08) ? Math.round(subtotal * 0.1) : 0;
          // Los cobros recientes pueden seguir pendientes; casi todo lo antiguo está cobrado
          const probPendiente = d >= -2 ? 0.3 : d >= -25 ? 0.12 : d >= -75 ? 0.025 : 0;
          const estadoPago = azar.prob(probPendiente) ? 'pendiente' : azar.prob(0.012) ? 'anulado' : 'pagado';
          const metodo = azar.pesado<MetodoPago>([['yappy', 34], ['tarjeta', 32], ['efectivo', 24], ['transferencia', 10]]);
          pagos.push({
            id: id(), clienteId: mascota.clienteId, mascotaId: mascota.id, consultaId: consulta.id, fecha: fechaAtencion, items,
            subtotal, descuento, total: subtotal - descuento, metodoPago: metodo, estado: estadoPago,
            ...(metodo === 'yappy' ? { referencia: `YP-${azar.entero(100000, 999999)}` } : metodo === 'tarjeta' ? { referencia: `AUTH-${azar.entero(1000, 9999)}` } : {}),
            ...(estadoPago === 'pagado' ? { fechaPago: fechaAtencion } : {}),
            ...(estadoPago === 'anulado' ? { motivoAnulacion: 'Cobro registrado por error', fechaAnulacion: fechaAtencion } : {})
          });
        }
      }
    }

    // Vacunas históricas (aplicadas antes de la ventana): dan vencidas y próximas realistas
    for (const mascota of mascotas.filter(m => m.tipo === 'Perro' || m.tipo === 'Gato')) {
      const nombre = mascota.tipo === 'Perro' ? azar.uno(['Rabia', 'Óctuple Canina']) : azar.uno(['Rabia', 'Triple Felina']);
      if (ultimaVacuna.has(`${mascota.id}|${nombre}`) || !azar.prob(0.85)) continue;
      // Aplicadas hace 10-13 meses: refuerzos vencidos hace poco o por vencer en las próximas semanas
      const aplicada = addDays(hoy, -azar.entero(300, 395));
      vacunas.push({
        id: id(), mascotaId: mascota.id, clienteId: mascota.clienteId, veterinarioId: azar.uno(veterinarios), nombre,
        lote: `${nombre.slice(0, 2).toUpperCase()}-${azar.entero(1000, 9999)}`, fechaAplicacion: aplicada,
        proximaFecha: addDays(aplicada, 365), laboratorio: nombre === 'Triple Felina' ? 'MSD' : 'Zoetis'
      });
    }

    this.storage.set('vet_citas', citas);
    this.storage.set('vet_consultas', consultas);
    this.storage.set('vet_recetas', recetas);
    this.storage.set('vet_examenes', examenes);
    this.storage.set('vet_pagos', pagos);
    this.storage.set('vet_vacunas', vacunas);
  }

  private elegirMascota(azar: Azar, elegibles: Mascota[], perfil: Map<string, { peso: number }>): Mascota {
    return azar.pesado(elegibles.map(m => [m, perfil.get(m.clienteId)!.peso] as const));
  }

  private elegirServicio(azar: Azar, tipo: TipoMascota): Servicio {
    const posibles = SERVICIOS.filter(s => !s.especies || s.especies.includes(tipo));
    return azar.pesado(posibles.map(s => [s, s.peso] as const));
  }

  private sumarMinutos(hora: string, minutos: number): string {
    const [h, m] = hora.split(':').map(Number);
    const total = h * 60 + m + minutos;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
}
