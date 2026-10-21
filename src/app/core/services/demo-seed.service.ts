import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { DEMO_MODE } from '../config/demo-mode.token';
import { Cliente, Mascota, Usuario, Cita, Consulta, Examen, Pago, Receta, Vacuna } from '../models';

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable({ providedIn: 'root' })
export class DemoSeedService {
  private storage = inject(StorageService);
  private demo = inject(DEMO_MODE);

  /** Siembra datos de ejemplo solo en modo demo y si no hay clientes. */
  seedIfEmpty(): void {
    if (!this.demo) return;
    if (this.storage.get<Cliente>('vet_clientes').length > 0) return;

    const today = new Date();
    const id = () => this.storage.generateId();

    // --- Usuarios: conserva las 3 cuentas demo del login y agrega 2 veterinarios extra ---
    const usuarios: Usuario[] = this.storage.get<Usuario>('vet_usuarios');
    if (usuarios.length === 0) {
      usuarios.push(
        { id: id(), nombre: 'Admin', apellido: 'Sistema', correo: 'admin@clinica.com', password: 'admin123', rol: 'admin', activo: true, createdAt: today },
        { id: id(), nombre: 'Carlos', apellido: 'Rodríguez', correo: 'vet@clinica.com', password: 'vet123', rol: 'veterinario', especialidad: 'Medicina General', activo: true, createdAt: today },
        { id: id(), nombre: 'María', apellido: 'López', correo: 'recepcion@clinica.com', password: 'rec123', rol: 'recepcion', activo: true, createdAt: today }
      );
    }
    const yaTieneExtras = usuarios.some(u => u.correo === 'sfernandez@clinica.com');
    if (!yaTieneExtras) {
      usuarios.push(
        { id: id(), nombre: 'Sofía', apellido: 'Fernández', correo: 'sfernandez@clinica.com', password: 'vet123', rol: 'veterinario', especialidad: 'Cirugía', activo: true, createdAt: today },
        { id: id(), nombre: 'Luis', apellido: 'Morales', correo: 'lmorales@clinica.com', password: 'vet123', rol: 'veterinario', especialidad: 'Dermatología', activo: true, createdAt: today }
      );
    }
    this.storage.set('vet_usuarios', usuarios);
    const vets = usuarios.filter(u => u.rol === 'veterinario');
    const vet1 = vets[0].id, vet2 = vets[1]?.id || vet1, vet3 = vets[2]?.id || vet1;

    // --- Clientes ---
    const clientes: Cliente[] = [
      { id: id(), nombre: 'María González', cedula: '8-888-1234', telefono: '6000-1111', correo: 'maria.gonzalez@example.com', direccion: 'Calle 50, Panamá', fechaRegistro: addDays(today, -120), activo: true },
      { id: id(), nombre: 'Carlos Pérez', cedula: '8-777-5678', telefono: '6000-2222', correo: 'carlos.perez@example.com', direccion: 'Vía España, Panamá', fechaRegistro: addDays(today, -95), activo: true },
      { id: id(), nombre: 'Ana Castillo', cedula: '4-123-9988', telefono: '6000-3333', correo: 'ana.castillo@example.com', direccion: 'San Francisco, Panamá', fechaRegistro: addDays(today, -60), activo: true },
      { id: id(), nombre: 'Roberto Jiménez', cedula: '9-456-2211', telefono: '6000-4444', correo: 'roberto.jimenez@example.com', direccion: 'Costa del Este, Panamá', fechaRegistro: addDays(today, -40), activo: true },
      { id: id(), nombre: 'Lucía Herrera', cedula: '2-321-6677', telefono: '6000-5555', correo: 'lucia.herrera@example.com', direccion: 'Bella Vista, Panamá', fechaRegistro: addDays(today, -20), activo: true },
      { id: id(), nombre: 'Diego Santamaría', cedula: '7-654-3322', telefono: '6000-6666', correo: 'diego.santamaria@example.com', direccion: 'El Cangrejo, Panamá', fechaRegistro: addDays(today, -5), activo: true },
    ];
    this.storage.set('vet_clientes', clientes);
    const [c1, c2, c3, c4, c5, c6] = clientes.map(c => c.id);

    // --- Mascotas ---
    const mascotas: Mascota[] = [
      { id: id(), clienteId: c1, nombre: 'Rocky', tipo: 'Perro', raza: 'Labrador', sexo: 'macho', edad: 3, peso: 28, color: 'Dorado', fechaNacimiento: addDays(today, -1100), activo: true },
      { id: id(), clienteId: c1, nombre: 'Michi', tipo: 'Gato', raza: 'Doméstico', sexo: 'hembra', edad: 1, peso: 3.5, color: 'Negro', fechaNacimiento: addDays(today, -400), activo: true },
      { id: id(), clienteId: c2, nombre: 'Luna', tipo: 'Gato', raza: 'Siamés', sexo: 'hembra', edad: 2, peso: 4, color: 'Blanco', fechaNacimiento: addDays(today, -700), activo: true },
      { id: id(), clienteId: c3, nombre: 'Max', tipo: 'Perro', raza: 'Bulldog Francés', sexo: 'macho', edad: 4, peso: 12, color: 'Atigrado', fechaNacimiento: addDays(today, -1500), activo: true },
      { id: id(), clienteId: c4, nombre: 'Kiwi', tipo: 'Ave', raza: 'Periquito', sexo: 'macho', edad: 1, peso: 0.04, color: 'Verde', fechaNacimiento: addDays(today, -300), activo: true },
      { id: id(), clienteId: c5, nombre: 'Coco', tipo: 'Conejo', raza: 'Holandés', sexo: 'hembra', edad: 2, peso: 2.1, color: 'Blanco y café', fechaNacimiento: addDays(today, -650), activo: true, alergias: 'Sensibilidad a ciertos antibióticos' },
      { id: id(), clienteId: c6, nombre: 'Thor', tipo: 'Perro', raza: 'Pastor Alemán', sexo: 'macho', edad: 5, peso: 34, color: 'Negro y café', fechaNacimiento: addDays(today, -1850), activo: true },
      { id: id(), clienteId: c2, nombre: 'Nube', tipo: 'Perro', raza: 'Poodle', sexo: 'hembra', edad: 6, peso: 6, color: 'Blanco', fechaNacimiento: addDays(today, -2200), activo: true },
    ];
    this.storage.set('vet_mascotas', mascotas);
    const [rocky, michi, luna, max, kiwi, coco, thor, nube] = mascotas.map(m => m.id);

    // --- Citas ---
    const citas: Cita[] = [
      { id: id(), clienteId: c1, mascotaId: rocky, veterinarioId: vet1, fecha: today, hora: '09:00', motivo: 'Consulta general de rutina', estado: 'pendiente', createdAt: addDays(today, -1) },
      { id: id(), clienteId: c2, mascotaId: luna, veterinarioId: vet2, fecha: today, hora: '11:00', motivo: 'Vacunación anual', estado: 'confirmada', createdAt: addDays(today, -1) },
      { id: id(), clienteId: c3, mascotaId: max, veterinarioId: vet1, fecha: today, hora: '15:30', motivo: 'Control post-operatorio', estado: 'confirmada', createdAt: addDays(today, -2) },
      { id: id(), clienteId: c6, mascotaId: thor, veterinarioId: vet1, fecha: today, hora: '10:15', motivo: 'Emergencia — cojera en pata trasera', estado: 'inmediata', createdAt: today },
      { id: id(), clienteId: c1, mascotaId: michi, veterinarioId: vet3, fecha: addDays(today, -1), hora: '15:00', motivo: 'Chequeo de peso y alergias', estado: 'completada', createdAt: addDays(today, -3) },
      { id: id(), clienteId: c4, mascotaId: kiwi, veterinarioId: vet3, fecha: addDays(today, -2), hora: '10:00', motivo: 'Revisión de plumaje', estado: 'completada', createdAt: addDays(today, -4) },
      { id: id(), clienteId: c5, mascotaId: coco, veterinarioId: vet2, fecha: addDays(today, -3), hora: '13:00', motivo: 'Control de alergia cutánea', estado: 'cancelada', createdAt: addDays(today, -5) },
      { id: id(), clienteId: c2, mascotaId: nube, veterinarioId: vet1, fecha: addDays(today, 1), hora: '09:30', motivo: 'Limpieza dental', estado: 'pendiente', createdAt: today },
      { id: id(), clienteId: c3, mascotaId: max, veterinarioId: vet2, fecha: addDays(today, 2), hora: '16:00', motivo: 'Seguimiento de dermatitis', estado: 'confirmada', createdAt: today },
      { id: id(), clienteId: c6, mascotaId: thor, veterinarioId: vet3, fecha: addDays(today, -7), hora: '11:30', motivo: 'Consulta general de rutina', estado: 'completada', createdAt: addDays(today, -8) },
    ];
    this.storage.set('vet_citas', citas);
    const citaCompletada1 = citas[4].id, citaCompletada2 = citas[9].id;

    // --- Consultas (derivadas de algunas citas completadas + una inmediata) ---
    const consultas: Consulta[] = [
      {
        id: id(), clienteId: c1, mascotaId: michi, veterinarioId: vet3, citaId: citaCompletada1,
        fecha: addDays(today, -1), sintomas: 'Pérdida leve de apetito', temperatura: 38.4, peso: 3.5,
        diagnostico: 'Gastritis leve', tratamiento: 'Dieta blanda por 5 días y probiótico', tipo: 'cita', createdAt: addDays(today, -1)
      },
      {
        id: id(), clienteId: c6, mascotaId: thor, veterinarioId: vet1, fecha: addDays(today, -1),
        sintomas: 'Cojera en pata trasera derecha tras salto', temperatura: 38.7, peso: 34,
        diagnostico: 'Esguince leve de rodilla', tratamiento: 'Reposo 7 días y antiinflamatorio', tipo: 'inmediata', createdAt: addDays(today, -1)
      },
      {
        id: id(), clienteId: c3, mascotaId: max, veterinarioId: vet1, fecha: addDays(today, -7),
        sintomas: 'Control postoperatorio de esterilización', temperatura: 38.2, peso: 12,
        diagnostico: 'Cicatrización correcta', tratamiento: 'Retiro de puntos, sin medicación adicional', tipo: 'cita', createdAt: addDays(today, -7)
      },
      {
        id: id(), clienteId: c4, mascotaId: kiwi, veterinarioId: vet3, citaId: citaCompletada2,
        fecha: addDays(today, -2), sintomas: 'Plumaje opaco', temperatura: 40.5, peso: 0.04,
        diagnostico: 'Déficit nutricional leve', tratamiento: 'Suplemento vitamínico en el agua', tipo: 'cita', createdAt: addDays(today, -2)
      },
      {
        id: id(), clienteId: c5, mascotaId: coco, veterinarioId: vet2, fecha: addDays(today, -10),
        sintomas: 'Enrojecimiento y picazón en la piel', temperatura: 38.1, peso: 2.1,
        diagnostico: 'Dermatitis alérgica', tratamiento: 'Crema tópica y antihistamínico', observaciones: 'Evitar cambio de alimento por ahora', tipo: 'cita', createdAt: addDays(today, -10)
      },
      {
        id: id(), clienteId: c2, mascotaId: nube, veterinarioId: vet1, fecha: addDays(today, -15),
        sintomas: 'Revisión dental de rutina', temperatura: 38.3, peso: 6,
        diagnostico: 'Sarro moderado', tratamiento: 'Programada limpieza dental', tipo: 'cita', createdAt: addDays(today, -15)
      },
    ];
    this.storage.set('vet_consultas', consultas);
    const consultaMichi = consultas[0].id, consultaThor = consultas[1].id;

    // --- Exámenes de laboratorio ---
    const examenes: Examen[] = [
      { id: id(), mascotaId: michi, clienteId: c1, consultaId: consultaMichi, veterinarioId: vet3, tipo: 'Hemograma completo', descripcion: 'Evaluación general por pérdida de apetito', resultado: 'Valores dentro de rango normal', fecha: addDays(today, -1) },
      { id: id(), mascotaId: thor, clienteId: c6, consultaId: consultaThor, veterinarioId: vet1, tipo: 'Radiografía de rodilla', descripcion: 'Descartar fractura por cojera', resultado: 'Sin fractura, esguince de ligamento leve', fecha: addDays(today, -1) },
      { id: id(), mascotaId: max, clienteId: c3, veterinarioId: vet1, tipo: 'Perfil bioquímico', descripcion: 'Control preoperatorio', resultado: 'Función renal y hepática normal', fecha: addDays(today, -8) },
      { id: id(), mascotaId: coco, clienteId: c5, veterinarioId: vet2, tipo: 'Raspado de piel', descripcion: 'Estudio de dermatitis alérgica', resultado: 'Sin presencia de ácaros ni hongos', fecha: addDays(today, -10) },
    ];
    this.storage.set('vet_examenes', examenes);

    // --- Recetas ---
    const recetas: Receta[] = [
      {
        id: id(), consultaId: consultaMichi, mascotaId: michi, clienteId: c1, veterinarioId: vet3, fecha: addDays(today, -1),
        items: [
          { medicamento: 'Probiótico veterinario', dosis: '1 sobre', frecuencia: 'Cada 24 horas', duracion: '7 días', indicaciones: 'Mezclar con la comida' },
          { medicamento: 'Dieta gastrointestinal', dosis: '1/2 taza', frecuencia: '2 veces al día', duracion: '5 días' },
        ],
        observaciones: 'Reevaluar si persisten los síntomas después de 5 días'
      },
      {
        id: id(), consultaId: consultaThor, mascotaId: thor, clienteId: c6, veterinarioId: vet1, fecha: addDays(today, -1),
        items: [
          { medicamento: 'Carprofeno 75mg', dosis: '1 tableta', frecuencia: 'Cada 12 horas', duracion: '7 días', indicaciones: 'Administrar con comida' },
        ],
        observaciones: 'Reposo estricto, evitar saltos y escaleras'
      },
      {
        id: id(), consultaId: consultas[4].id, mascotaId: coco, clienteId: c5, veterinarioId: vet2, fecha: addDays(today, -10),
        items: [
          { medicamento: 'Cetirizina pediátrica', dosis: '0.5ml', frecuencia: 'Cada 24 horas', duracion: '10 días' },
          { medicamento: 'Crema hidrocortisona tópica', dosis: 'Capa fina', frecuencia: '2 veces al día', duracion: '10 días', indicaciones: 'Solo en zonas afectadas' },
        ]
      },
    ];
    this.storage.set('vet_recetas', recetas);

    // --- Pagos ---
    const pagos: Pago[] = [
      {
        id: id(), clienteId: c1, mascotaId: michi, consultaId: consultaMichi, fecha: addDays(today, -1),
        items: [
          { descripcion: 'Consulta veterinaria', categoria: 'consulta', cantidad: 1, precioUnitario: 25, subtotal: 25 },
          { descripcion: 'Hemograma completo', categoria: 'examen', cantidad: 1, precioUnitario: 35, subtotal: 35 },
        ],
        subtotal: 60, descuento: 0, total: 60, metodoPago: 'tarjeta', estado: 'pagado', referencia: 'AUTH-4821'
      },
      {
        id: id(), clienteId: c6, mascotaId: thor, consultaId: consultaThor, fecha: addDays(today, -1),
        items: [
          { descripcion: 'Atención inmediata', categoria: 'consulta', cantidad: 1, precioUnitario: 45, subtotal: 45 },
          { descripcion: 'Radiografía de rodilla', categoria: 'examen', cantidad: 1, precioUnitario: 40, subtotal: 40 },
          { descripcion: 'Carprofeno 75mg', categoria: 'medicamento', cantidad: 1, precioUnitario: 18, subtotal: 18 },
        ],
        subtotal: 103, descuento: 3, total: 100, metodoPago: 'yappy', estado: 'pagado', referencia: 'YP-993211'
      },
      {
        id: id(), clienteId: c3, mascotaId: max, fecha: addDays(today, -7),
        items: [
          { descripcion: 'Control postoperatorio', categoria: 'consulta', cantidad: 1, precioUnitario: 20, subtotal: 20 },
        ],
        subtotal: 20, descuento: 0, total: 20, metodoPago: 'efectivo', estado: 'pagado'
      },
      {
        id: id(), clienteId: c5, mascotaId: coco, consultaId: consultas[4].id, fecha: addDays(today, -10),
        items: [
          { descripcion: 'Consulta dermatológica', categoria: 'consulta', cantidad: 1, precioUnitario: 25, subtotal: 25 },
          { descripcion: 'Raspado de piel', categoria: 'examen', cantidad: 1, precioUnitario: 22, subtotal: 22 },
          { descripcion: 'Cetirizina + crema tópica', categoria: 'medicamento', cantidad: 1, precioUnitario: 15, subtotal: 15 },
        ],
        subtotal: 62, descuento: 0, total: 62, metodoPago: 'transferencia', estado: 'pendiente'
      },
      {
        id: id(), clienteId: c4, mascotaId: kiwi, consultaId: consultas[3].id, fecha: addDays(today, -2),
        items: [
          { descripcion: 'Consulta veterinaria', categoria: 'consulta', cantidad: 1, precioUnitario: 20, subtotal: 20 },
        ],
        subtotal: 20, descuento: 0, total: 20, metodoPago: 'efectivo', estado: 'pendiente'
      },
      {
        id: id(), clienteId: c2, mascotaId: nube, fecha: addDays(today, -15),
        items: [
          { descripcion: 'Revisión dental', categoria: 'consulta', cantidad: 1, precioUnitario: 25, subtotal: 25 },
        ],
        subtotal: 25, descuento: 5, total: 20, metodoPago: 'tarjeta', estado: 'anulado', notas: 'Cliente canceló el procedimiento'
      },
    ];
    this.storage.set('vet_pagos', pagos);

    // --- Vacunas (mezcla de vencidas, próximas y al día) ---
    const vacunas: Vacuna[] = [
      { id: id(), mascotaId: rocky, clienteId: c1, veterinarioId: vet2, nombre: 'Rabia', lote: 'RB-2091', fechaAplicacion: addDays(today, -358), proximaFecha: addDays(today, 7), laboratorio: 'Zoetis' },
      { id: id(), mascotaId: luna, clienteId: c2, veterinarioId: vet2, nombre: 'Triple Felina', lote: 'TF-1187', fechaAplicacion: addDays(today, -360), proximaFecha: addDays(today, 5), laboratorio: 'MSD' },
      { id: id(), mascotaId: max, clienteId: c3, veterinarioId: vet1, nombre: 'Óctuple Canina', lote: 'OC-4432', fechaAplicacion: addDays(today, -200), proximaFecha: addDays(today, 165), laboratorio: 'Zoetis' },
      { id: id(), mascotaId: thor, clienteId: c6, veterinarioId: vet3, nombre: 'Rabia', lote: 'RB-2077', fechaAplicacion: addDays(today, -400), proximaFecha: addDays(today, -35), laboratorio: 'Zoetis', observaciones: 'Vencida — reagendar con urgencia' },
      { id: id(), mascotaId: coco, clienteId: c5, veterinarioId: vet2, nombre: 'Mixomatosis', lote: 'MX-0098', fechaAplicacion: addDays(today, -300), proximaFecha: addDays(today, 3), laboratorio: 'Boehringer' },
      { id: id(), mascotaId: nube, clienteId: c2, veterinarioId: vet1, nombre: 'Bordetella', lote: 'BD-5521', fechaAplicacion: addDays(today, -180), proximaFecha: addDays(today, 185), laboratorio: 'MSD' },
    ];
    this.storage.set('vet_vacunas', vacunas);
  }
}
