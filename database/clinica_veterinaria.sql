-- ============================================================
--  CLÍNICA VETERINARIA — Script completo de base de datos
--  Motor: MySQL 8.0+ / MariaDB 10.5+
--  Codificación: UTF-8
--  Fecha: 2026-05-11
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

DROP DATABASE IF EXISTS clinica_veterinaria;
CREATE DATABASE clinica_veterinaria
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clinica_veterinaria;


-- ============================================================
--  1. USUARIOS  (autenticación y control de acceso)
-- ============================================================
CREATE TABLE usuarios (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  nombre        VARCHAR(80)   NOT NULL,
  apellido      VARCHAR(80)   NOT NULL,
  correo        VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  rol           ENUM('admin','veterinario','recepcion') NOT NULL DEFAULT 'recepcion',
  telefono      VARCHAR(20)   NULL,
  especialidad  VARCHAR(100)  NULL,
  foto_url      VARCHAR(500)  NULL,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,
  ultimo_acceso DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo)
) ENGINE=InnoDB COMMENT='Usuarios del sistema: admin, veterinarios y recepcionistas';

CREATE INDEX idx_usuarios_rol    ON usuarios (rol);
CREATE INDEX idx_usuarios_activo ON usuarios (activo);


-- ============================================================
--  2. CLIENTES  (propietarios de mascotas)
-- ============================================================
CREATE TABLE clientes (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  nombre          VARCHAR(150)  NOT NULL,
  cedula          VARCHAR(20)   NOT NULL,
  telefono        VARCHAR(20)   NOT NULL,
  telefono_alt    VARCHAR(20)   NULL,
  correo          VARCHAR(150)  NULL,
  direccion       VARCHAR(300)  NULL,
  ciudad          VARCHAR(100)  NULL,
  notas           TEXT          NULL,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  fecha_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_clientes PRIMARY KEY (id),
  CONSTRAINT uq_clientes_cedula UNIQUE (cedula)
) ENGINE=InnoDB COMMENT='Propietarios / dueños de mascotas';

CREATE INDEX idx_clientes_nombre ON clientes (nombre);
CREATE INDEX idx_clientes_activo ON clientes (activo);
CREATE FULLTEXT INDEX ft_clientes_busqueda ON clientes (nombre, cedula, correo);


-- ============================================================
--  3. MASCOTAS
-- ============================================================
CREATE TABLE mascotas (
  id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  cliente_id       VARCHAR(36)  NOT NULL,
  nombre           VARCHAR(80)  NOT NULL,
  tipo             ENUM('Perro','Gato','Ave','Conejo','Reptil','Otro') NOT NULL,
  raza             VARCHAR(80)  NULL,
  sexo             ENUM('macho','hembra') NOT NULL,
  color            VARCHAR(60)  NULL,
  fecha_nacimiento DATE         NULL,
  edad_aprox       SMALLINT     NULL COMMENT 'Edad en meses cuando no se conoce fecha exacta',
  peso_kg          DECIMAL(5,2) NULL,
  foto_url         VARCHAR(500) NULL,
  alergias         TEXT         NULL,
  enfermedades_previas TEXT     NULL,
  esterilizado     TINYINT(1)   NOT NULL DEFAULT 0,
  microchip        VARCHAR(50)  NULL,
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_mascotas PRIMARY KEY (id),
  CONSTRAINT fk_mascotas_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Mascotas / pacientes';

CREATE INDEX idx_mascotas_cliente ON mascotas (cliente_id);
CREATE INDEX idx_mascotas_tipo    ON mascotas (tipo);
CREATE INDEX idx_mascotas_activo  ON mascotas (activo);
CREATE FULLTEXT INDEX ft_mascotas_busqueda ON mascotas (nombre, raza);


-- ============================================================
--  4. CITAS
-- ============================================================
CREATE TABLE citas (
  id              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  cliente_id      VARCHAR(36)  NOT NULL,
  mascota_id      VARCHAR(36)  NOT NULL,
  veterinario_id  VARCHAR(36)  NOT NULL,
  fecha           DATE         NOT NULL,
  hora            TIME         NOT NULL,
  motivo          VARCHAR(300) NOT NULL,
  estado          ENUM('pendiente','confirmada','completada','cancelada','inmediata')
                               NOT NULL DEFAULT 'pendiente',
  tipo            ENUM('cita','inmediata') NOT NULL DEFAULT 'cita',
  notas           TEXT         NULL,
  motivo_cancelacion VARCHAR(300) NULL,
  duracion_min    SMALLINT     NOT NULL DEFAULT 30,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_citas PRIMARY KEY (id),
  CONSTRAINT fk_citas_cliente     FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_citas_mascota     FOREIGN KEY (mascota_id)
    REFERENCES mascotas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_citas_veterinario FOREIGN KEY (veterinario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Agenda de citas médicas';

CREATE INDEX idx_citas_fecha        ON citas (fecha);
CREATE INDEX idx_citas_estado       ON citas (estado);
CREATE INDEX idx_citas_cliente      ON citas (cliente_id);
CREATE INDEX idx_citas_mascota      ON citas (mascota_id);
CREATE INDEX idx_citas_veterinario  ON citas (veterinario_id);
CREATE INDEX idx_citas_fecha_estado ON citas (fecha, estado);


-- ============================================================
--  5. CONSULTAS  (historial médico)
-- ============================================================
CREATE TABLE consultas (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  cliente_id      VARCHAR(36)   NOT NULL,
  mascota_id      VARCHAR(36)   NOT NULL,
  veterinario_id  VARCHAR(36)   NOT NULL,
  cita_id         VARCHAR(36)   NULL,
  fecha           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo            ENUM('cita','inmediata') NOT NULL DEFAULT 'cita',
  sintomas        TEXT          NOT NULL,
  temperatura     DECIMAL(4,1)  NULL COMMENT 'Temperatura en °C',
  peso_kg         DECIMAL(5,2)  NULL,
  frecuencia_cardiaca SMALLINT  NULL COMMENT 'Latidos por minuto',
  frecuencia_resp     SMALLINT  NULL COMMENT 'Respiraciones por minuto',
  diagnostico     TEXT          NOT NULL,
  tratamiento     TEXT          NOT NULL,
  pronostico      VARCHAR(100)  NULL,
  observaciones   TEXT          NULL,
  proxima_visita  DATE          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_consultas PRIMARY KEY (id),
  CONSTRAINT fk_consultas_cliente     FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_consultas_mascota     FOREIGN KEY (mascota_id)
    REFERENCES mascotas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_consultas_veterinario FOREIGN KEY (veterinario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_consultas_cita        FOREIGN KEY (cita_id)
    REFERENCES citas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Historial de consultas / atenciones médicas';

CREATE INDEX idx_consultas_fecha       ON consultas (fecha);
CREATE INDEX idx_consultas_cliente     ON consultas (cliente_id);
CREATE INDEX idx_consultas_mascota     ON consultas (mascota_id);
CREATE INDEX idx_consultas_veterinario ON consultas (veterinario_id);
CREATE INDEX idx_consultas_cita        ON consultas (cita_id);


-- ============================================================
--  6. VACUNAS
-- ============================================================
CREATE TABLE vacunas (
  id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  mascota_id       VARCHAR(36)  NOT NULL,
  cliente_id       VARCHAR(36)  NOT NULL,
  veterinario_id   VARCHAR(36)  NOT NULL,
  consulta_id      VARCHAR(36)  NULL,
  nombre           VARCHAR(150) NOT NULL,
  lote             VARCHAR(80)  NULL,
  laboratorio      VARCHAR(100) NULL,
  dosis_ml         DECIMAL(4,2) NULL,
  via_aplicacion   ENUM('subcutanea','intramuscular','intranasal','oral') NULL,
  fecha_aplicacion DATE         NOT NULL,
  proxima_fecha    DATE         NULL,
  recordatorio_enviado TINYINT(1) NOT NULL DEFAULT 0,
  observaciones    TEXT         NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_vacunas PRIMARY KEY (id),
  CONSTRAINT fk_vacunas_mascota     FOREIGN KEY (mascota_id)
    REFERENCES mascotas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_vacunas_cliente     FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_vacunas_veterinario FOREIGN KEY (veterinario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_vacunas_consulta    FOREIGN KEY (consulta_id)
    REFERENCES consultas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Registro de vacunación de mascotas';

CREATE INDEX idx_vacunas_mascota       ON vacunas (mascota_id);
CREATE INDEX idx_vacunas_proxima_fecha ON vacunas (proxima_fecha);
CREATE INDEX idx_vacunas_nombre        ON vacunas (nombre);


-- ============================================================
--  7. RECETAS
-- ============================================================
CREATE TABLE recetas (
  id             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  consulta_id    VARCHAR(36)  NOT NULL,
  mascota_id     VARCHAR(36)  NOT NULL,
  cliente_id     VARCHAR(36)  NOT NULL,
  veterinario_id VARCHAR(36)  NOT NULL,
  fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones  TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_recetas PRIMARY KEY (id),
  CONSTRAINT fk_recetas_consulta    FOREIGN KEY (consulta_id)
    REFERENCES consultas (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_recetas_mascota     FOREIGN KEY (mascota_id)
    REFERENCES mascotas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recetas_cliente     FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recetas_veterinario FOREIGN KEY (veterinario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Cabecera de recetas médicas';

CREATE INDEX idx_recetas_consulta ON recetas (consulta_id);
CREATE INDEX idx_recetas_mascota  ON recetas (mascota_id);
CREATE INDEX idx_recetas_fecha    ON recetas (fecha);


-- ============================================================
--  7b. RECETA_ITEMS  (líneas de medicamento de cada receta)
-- ============================================================
CREATE TABLE receta_items (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  receta_id    VARCHAR(36)   NOT NULL,
  medicamento  VARCHAR(150)  NOT NULL,
  dosis        VARCHAR(100)  NOT NULL,
  frecuencia   VARCHAR(100)  NOT NULL,
  duracion     VARCHAR(80)   NOT NULL,
  indicaciones TEXT          NULL,
  orden        TINYINT       NOT NULL DEFAULT 1,
  CONSTRAINT pk_receta_items PRIMARY KEY (id),
  CONSTRAINT fk_receta_items_receta FOREIGN KEY (receta_id)
    REFERENCES recetas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Líneas de medicamentos de cada receta';

CREATE INDEX idx_receta_items_receta ON receta_items (receta_id);


-- ============================================================
--  8. EXAMENES  (laboratorio / diagnóstico por imagen)
-- ============================================================
CREATE TABLE examenes (
  id             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  mascota_id     VARCHAR(36)  NOT NULL,
  cliente_id     VARCHAR(36)  NOT NULL,
  veterinario_id VARCHAR(36)  NOT NULL,
  consulta_id    VARCHAR(36)  NULL,
  tipo           VARCHAR(100) NOT NULL COMMENT 'Hemograma, Rayos X, Ecografía, etc.',
  descripcion    TEXT         NOT NULL,
  resultado      TEXT         NOT NULL,
  valores_referencia TEXT     NULL,
  interpretacion TEXT         NULL,
  fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado         ENUM('solicitado','en_proceso','completado','cancelado')
                              NOT NULL DEFAULT 'completado',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_examenes PRIMARY KEY (id),
  CONSTRAINT fk_examenes_mascota     FOREIGN KEY (mascota_id)
    REFERENCES mascotas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_examenes_cliente     FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_examenes_veterinario FOREIGN KEY (veterinario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_examenes_consulta    FOREIGN KEY (consulta_id)
    REFERENCES consultas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Exámenes de laboratorio y diagnóstico';

CREATE INDEX idx_examenes_mascota ON examenes (mascota_id);
CREATE INDEX idx_examenes_fecha   ON examenes (fecha);
CREATE INDEX idx_examenes_tipo    ON examenes (tipo);


-- ============================================================
--  8b. EXAMEN_ARCHIVOS  (adjuntos: imágenes, PDFs)
-- ============================================================
CREATE TABLE examen_archivos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  examen_id   VARCHAR(36)  NOT NULL,
  nombre      VARCHAR(200) NOT NULL,
  url         VARCHAR(500) NOT NULL,
  tipo_mime   VARCHAR(80)  NULL,
  tamanio_kb  INT          NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_examen_archivos PRIMARY KEY (id),
  CONSTRAINT fk_examen_archivos_examen FOREIGN KEY (examen_id)
    REFERENCES examenes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Archivos adjuntos de exámenes';

CREATE INDEX idx_examen_archivos_examen ON examen_archivos (examen_id);


-- ============================================================
--  9. PAGOS  (facturación)
-- ============================================================
CREATE TABLE pagos (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  cliente_id    VARCHAR(36)   NOT NULL,
  mascota_id    VARCHAR(36)   NOT NULL,
  consulta_id   VARCHAR(36)   NULL,
  cajero_id     VARCHAR(36)   NULL COMMENT 'Usuario que registró el pago',
  fecha         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  impuesto      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  metodo_pago   ENUM('efectivo','tarjeta','yappy','transferencia') NOT NULL,
  estado        ENUM('pendiente','pagado','anulado') NOT NULL DEFAULT 'pendiente',
  referencia    VARCHAR(100)  NULL COMMENT 'Número de transacción / comprobante',
  notas         TEXT          NULL,
  anulado_por   VARCHAR(36)   NULL,
  fecha_anulacion DATETIME    NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_pagos PRIMARY KEY (id),
  CONSTRAINT fk_pagos_cliente   FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_mascota   FOREIGN KEY (mascota_id)
    REFERENCES mascotas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_consulta  FOREIGN KEY (consulta_id)
    REFERENCES consultas (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_cajero    FOREIGN KEY (cajero_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_anulado   FOREIGN KEY (anulado_por)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Registro de pagos y facturación';

CREATE INDEX idx_pagos_fecha    ON pagos (fecha);
CREATE INDEX idx_pagos_estado   ON pagos (estado);
CREATE INDEX idx_pagos_cliente  ON pagos (cliente_id);
CREATE INDEX idx_pagos_mascota  ON pagos (mascota_id);


-- ============================================================
--  9b. PAGO_ITEMS  (líneas de detalle de cada pago)
-- ============================================================
CREATE TABLE pago_items (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pago_id         VARCHAR(36)   NOT NULL,
  descripcion     VARCHAR(200)  NOT NULL,
  categoria       ENUM('consulta','medicamento','vacuna','cirugia','examen','otro')
                                NOT NULL DEFAULT 'otro',
  cantidad        SMALLINT      NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  descuento_item  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal        DECIMAL(10,2) NOT NULL,
  CONSTRAINT pk_pago_items PRIMARY KEY (id),
  CONSTRAINT fk_pago_items_pago FOREIGN KEY (pago_id)
    REFERENCES pagos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Líneas de detalle de cada pago';

CREATE INDEX idx_pago_items_pago      ON pago_items (pago_id);
CREATE INDEX idx_pago_items_categoria ON pago_items (categoria);


-- ============================================================
--  10. MEDICAMENTOS  (catálogo de referencia)
-- ============================================================
CREATE TABLE medicamentos (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(150)  NOT NULL,
  nombre_generico VARCHAR(150)  NULL,
  laboratorio     VARCHAR(100)  NULL,
  presentacion    VARCHAR(100)  NULL COMMENT 'Tableta 500mg, Suspensión 250mg/5ml...',
  unidad_medida   VARCHAR(30)   NULL COMMENT 'ml, mg, tableta, ampolla...',
  precio_unitario DECIMAL(10,2) NULL,
  stock           INT           NOT NULL DEFAULT 0,
  stock_minimo    INT           NOT NULL DEFAULT 5,
  requiere_receta TINYINT(1)    NOT NULL DEFAULT 0,
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_medicamentos PRIMARY KEY (id),
  CONSTRAINT uq_medicamentos_nombre UNIQUE (nombre)
) ENGINE=InnoDB COMMENT='Catálogo de medicamentos del inventario';

CREATE INDEX idx_medicamentos_activo ON medicamentos (activo);
CREATE FULLTEXT INDEX ft_medicamentos_busqueda ON medicamentos (nombre, nombre_generico);


-- ============================================================
--  11. SERVICIOS  (catálogo de servicios y precios)
-- ============================================================
CREATE TABLE servicios (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(150)  NOT NULL,
  categoria   ENUM('consulta','vacuna','cirugia','examen','grooming','otro')
                            NOT NULL DEFAULT 'otro',
  descripcion TEXT          NULL,
  precio      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duracion_min SMALLINT     NOT NULL DEFAULT 30,
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_servicios PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='Catálogo de servicios ofrecidos y sus precios';

CREATE INDEX idx_servicios_categoria ON servicios (categoria);
CREATE INDEX idx_servicios_activo    ON servicios (activo);


-- ============================================================
--  12. HORARIOS_VETERINARIO
-- ============================================================
CREATE TABLE horarios_veterinario (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  veterinario_id VARCHAR(36)  NOT NULL,
  dia_semana     TINYINT      NOT NULL COMMENT '0=Domingo … 6=Sábado',
  hora_inicio    TIME         NOT NULL,
  hora_fin       TIME         NOT NULL,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT pk_horarios PRIMARY KEY (id),
  CONSTRAINT fk_horarios_veterinario FOREIGN KEY (veterinario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_horarios_dia CHECK (dia_semana BETWEEN 0 AND 6)
) ENGINE=InnoDB COMMENT='Disponibilidad semanal de cada veterinario';

CREATE INDEX idx_horarios_veterinario ON horarios_veterinario (veterinario_id, dia_semana);


-- ============================================================
--  13. NOTIFICACIONES
-- ============================================================
CREATE TABLE notificaciones (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  VARCHAR(36)  NULL COMMENT 'NULL = para todos',
  tipo        ENUM('cita','vacuna','pago','sistema') NOT NULL,
  titulo      VARCHAR(150) NOT NULL,
  mensaje     TEXT         NOT NULL,
  leida       TINYINT(1)   NOT NULL DEFAULT 0,
  referencia_id VARCHAR(36) NULL COMMENT 'ID del registro relacionado',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_notificaciones PRIMARY KEY (id),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Notificaciones internas del sistema';

CREATE INDEX idx_notificaciones_usuario ON notificaciones (usuario_id, leida);
CREATE INDEX idx_notificaciones_tipo    ON notificaciones (tipo);


-- ============================================================
--  14. AUDITORIA  (log de cambios importantes)
-- ============================================================
CREATE TABLE auditoria (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  VARCHAR(36)     NULL,
  accion      ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT') NOT NULL,
  tabla       VARCHAR(60)     NOT NULL,
  registro_id VARCHAR(36)     NULL,
  datos_antes JSON            NULL,
  datos_des   JSON            NULL,
  ip_address  VARCHAR(45)     NULL,
  user_agent  VARCHAR(300)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_auditoria PRIMARY KEY (id),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Log de auditoría para rastreo de cambios';

CREATE INDEX idx_auditoria_tabla      ON auditoria (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario    ON auditoria (usuario_id);
CREATE INDEX idx_auditoria_created_at ON auditoria (created_at);


-- ============================================================
--  VISTAS  (consultas frecuentes pre-definidas)
-- ============================================================

-- Vista: historial completo de cada mascota
CREATE OR REPLACE VIEW v_historial_mascota AS
SELECT
  m.id           AS mascota_id,
  m.nombre       AS mascota,
  m.tipo,
  m.raza,
  c.id           AS cliente_id,
  c.nombre       AS cliente,
  c.telefono,
  co.id          AS consulta_id,
  co.fecha,
  co.diagnostico,
  co.tratamiento,
  u.nombre       AS veterinario_nombre,
  u.apellido     AS veterinario_apellido
FROM mascotas m
JOIN clientes c  ON c.id = m.cliente_id
LEFT JOIN consultas co ON co.mascota_id = m.id
LEFT JOIN usuarios u   ON u.id = co.veterinario_id
ORDER BY m.nombre, co.fecha DESC;


-- Vista: citas del día con datos completos
CREATE OR REPLACE VIEW v_citas_hoy AS
SELECT
  ci.id,
  ci.fecha,
  ci.hora,
  ci.estado,
  ci.motivo,
  ci.duracion_min,
  m.nombre       AS mascota,
  m.tipo         AS tipo_mascota,
  cl.nombre      AS cliente,
  cl.telefono    AS telefono_cliente,
  u.nombre       AS veterinario_nombre,
  u.apellido     AS veterinario_apellido
FROM citas ci
JOIN mascotas m  ON m.id  = ci.mascota_id
JOIN clientes cl ON cl.id = ci.cliente_id
JOIN usuarios u  ON u.id  = ci.veterinario_id
WHERE ci.fecha = CURDATE()
  AND ci.estado NOT IN ('cancelada')
ORDER BY ci.hora;


-- Vista: vacunas pendientes en los próximos 30 días
CREATE OR REPLACE VIEW v_vacunas_pendientes AS
SELECT
  v.id,
  v.nombre       AS vacuna,
  v.proxima_fecha,
  DATEDIFF(v.proxima_fecha, CURDATE()) AS dias_restantes,
  m.nombre       AS mascota,
  m.tipo,
  cl.nombre      AS cliente,
  cl.telefono
FROM vacunas v
JOIN mascotas m  ON m.id  = v.mascota_id
JOIN clientes cl ON cl.id = v.cliente_id
WHERE v.proxima_fecha BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY v.proxima_fecha;


-- Vista: resumen de ingresos por mes
CREATE OR REPLACE VIEW v_ingresos_mensuales AS
SELECT
  YEAR(fecha)  AS anio,
  MONTH(fecha) AS mes,
  COUNT(*)     AS total_pagos,
  SUM(total)   AS ingresos_total,
  SUM(descuento) AS descuentos_total,
  AVG(total)   AS ticket_promedio
FROM pagos
WHERE estado = 'pagado'
GROUP BY YEAR(fecha), MONTH(fecha)
ORDER BY anio DESC, mes DESC;


-- Vista: pacientes con más consultas
CREATE OR REPLACE VIEW v_top_pacientes AS
SELECT
  m.id,
  m.nombre AS mascota,
  m.tipo,
  cl.nombre AS cliente,
  COUNT(co.id) AS total_consultas,
  MAX(co.fecha) AS ultima_consulta
FROM mascotas m
JOIN clientes cl   ON cl.id = m.cliente_id
LEFT JOIN consultas co ON co.mascota_id = m.id
GROUP BY m.id, m.nombre, m.tipo, cl.nombre
ORDER BY total_consultas DESC;


-- ============================================================
--  PROCEDIMIENTOS ALMACENADOS
-- ============================================================

DELIMITER $$

-- Obtener historial completo de una mascota
CREATE PROCEDURE sp_historial_mascota(IN p_mascota_id VARCHAR(36))
BEGIN
  SELECT
    'consulta' AS tipo_registro,
    co.id,
    co.fecha,
    co.diagnostico AS detalle,
    u.nombre AS profesional
  FROM consultas co
  JOIN usuarios u ON u.id = co.veterinario_id
  WHERE co.mascota_id = p_mascota_id
  UNION ALL
  SELECT
    'vacuna',
    v.id,
    CAST(v.fecha_aplicacion AS DATETIME),
    v.nombre,
    u.nombre
  FROM vacunas v
  JOIN usuarios u ON u.id = v.veterinario_id
  WHERE v.mascota_id = p_mascota_id
  UNION ALL
  SELECT
    'examen',
    e.id,
    e.fecha,
    CONCAT(e.tipo, ': ', LEFT(e.resultado, 80)),
    u.nombre
  FROM examenes e
  JOIN usuarios u ON u.id = e.veterinario_id
  WHERE e.mascota_id = p_mascota_id
  ORDER BY fecha DESC;
END$$


-- Reporte de ingresos por rango de fechas
CREATE PROCEDURE sp_reporte_ingresos(
  IN p_fecha_inicio DATE,
  IN p_fecha_fin    DATE
)
BEGIN
  SELECT
    p.id,
    p.fecha,
    cl.nombre AS cliente,
    m.nombre  AS mascota,
    p.total,
    p.metodo_pago,
    p.estado
  FROM pagos p
  JOIN clientes cl ON cl.id = p.cliente_id
  JOIN mascotas m  ON m.id  = p.mascota_id
  WHERE DATE(p.fecha) BETWEEN p_fecha_inicio AND p_fecha_fin
    AND p.estado = 'pagado'
  ORDER BY p.fecha DESC;
END$$


-- Buscar cliente y sus mascotas
CREATE PROCEDURE sp_buscar_cliente(IN p_termino VARCHAR(100))
BEGIN
  SELECT
    cl.id,
    cl.nombre,
    cl.cedula,
    cl.telefono,
    cl.correo,
    COUNT(m.id) AS total_mascotas
  FROM clientes cl
  LEFT JOIN mascotas m ON m.cliente_id = cl.id AND m.activo = 1
  WHERE cl.activo = 1
    AND (
      cl.nombre  LIKE CONCAT('%', p_termino, '%') OR
      cl.cedula  LIKE CONCAT('%', p_termino, '%') OR
      cl.correo  LIKE CONCAT('%', p_termino, '%') OR
      cl.telefono LIKE CONCAT('%', p_termino, '%')
    )
  GROUP BY cl.id
  ORDER BY cl.nombre;
END$$

DELIMITER ;


-- ============================================================
--  DATOS INICIALES  (seed data)
-- ============================================================

-- Usuarios del sistema
-- Contraseñas almacenadas como hash bcrypt (texto plano entre paréntesis para referencia)
INSERT INTO usuarios (id, nombre, apellido, correo, password_hash, rol, especialidad, activo) VALUES
  ('usr-admin-0001', 'Admin',     'Sistema',   'admin@clinica.com',     '$2b$10$placeholder_admin_hash',     'admin',       NULL,                   1),
  ('usr-vet-0001',   'Dr. Carlos','Rodríguez', 'vet@clinica.com',       '$2b$10$placeholder_vet_hash',       'veterinario', 'Medicina General',     1),
  ('usr-rec-0001',   'María',     'González',  'recepcion@clinica.com', '$2b$10$placeholder_recepcion_hash', 'recepcion',   NULL,                   1),
  ('usr-vet-0002',   'Dra. Ana',  'Martínez',  'ana@clinica.com',       '$2b$10$placeholder_vet2_hash',      'veterinario', 'Cirugía y Ortopedia',  1),
  ('usr-vet-0003',   'Dr. Luis',  'Pérez',     'luis@clinica.com',      '$2b$10$placeholder_vet3_hash',      'veterinario', 'Dermatología Animal',  1);


-- Servicios de la clínica
INSERT INTO servicios (nombre, categoria, precio, duracion_min) VALUES
  ('Consulta General',          'consulta', 25.00,  30),
  ('Consulta Especializada',    'consulta', 45.00,  45),
  ('Atención de Urgencia',      'consulta', 60.00,  30),
  ('Vacuna Antirrábica',        'vacuna',   18.00,  15),
  ('Vacuna Parvovirus',         'vacuna',   18.00,  15),
  ('Vacuna Triple Felina',      'vacuna',   20.00,  15),
  ('Vacuna Polivalente Canina', 'vacuna',   22.00,  15),
  ('Cirugía General',           'cirugia',  150.00, 120),
  ('Esterilización (macho)',    'cirugia',  80.00,  60),
  ('Esterilización (hembra)',   'cirugia',  110.00, 90),
  ('Hemograma Completo',        'examen',   30.00,  30),
  ('Rayos X (1 proyección)',    'examen',   35.00,  20),
  ('Ecografía Abdominal',       'examen',   50.00,  30),
  ('Baño y Corte Pequeño',      'grooming', 20.00,  60),
  ('Baño y Corte Grande',       'grooming', 35.00,  90);


-- Medicamentos frecuentes
INSERT INTO medicamentos (nombre, presentacion, unidad_medida, precio_unitario, stock, requiere_receta) VALUES
  ('Amoxicilina 500mg',       'Cápsulas x 20',           'unidad', 12.50, 100, 1),
  ('Metronidazol 250mg',      'Tabletas x 20',           'unidad',  8.00,  80, 1),
  ('Ivermectina 1%',          'Solución inyectable 50ml','ml',      15.00,  30, 1),
  ('Dexametasona 4mg',        'Solución inyectable 10ml','ml',       9.00,  40, 1),
  ('Meloxicam 1.5mg/ml',      'Suspensión oral 10ml',    'ml',      18.00,  50, 1),
  ('Cefalexina 300mg',        'Comprimidos x 20',        'unidad',  14.00,  60, 1),
  ('Omeprazol 20mg',          'Cápsulas x 14',           'unidad',   7.50,  90, 0),
  ('Suero fisiológico 0.9%',  'Bolsa 500ml',             'unidad',   4.00, 200, 0),
  ('Tramadol 50mg',           'Comprimidos x 10',        'unidad',  10.00,  30, 1),
  ('Furosemida 40mg',         'Comprimidos x 20',        'unidad',   6.00,  40, 1),
  ('Antipulgas Frontline',    'Pipeta 1ml',              'unidad',  12.00,  80, 0),
  ('Collar Antiparasitario',  'Collar 65cm',             'unidad',  15.00,  50, 0);


-- Horarios de los veterinarios (Lun-Vie 8:00-17:00)
INSERT INTO horarios_veterinario (veterinario_id, dia_semana, hora_inicio, hora_fin) VALUES
  ('usr-vet-0001', 1, '08:00', '17:00'),
  ('usr-vet-0001', 2, '08:00', '17:00'),
  ('usr-vet-0001', 3, '08:00', '17:00'),
  ('usr-vet-0001', 4, '08:00', '17:00'),
  ('usr-vet-0001', 5, '08:00', '17:00'),
  ('usr-vet-0002', 1, '08:00', '13:00'),
  ('usr-vet-0002', 2, '08:00', '13:00'),
  ('usr-vet-0002', 3, '08:00', '13:00'),
  ('usr-vet-0002', 4, '08:00', '13:00'),
  ('usr-vet-0002', 5, '08:00', '13:00'),
  ('usr-vet-0002', 6, '08:00', '12:00'),
  ('usr-vet-0003', 1, '13:00', '20:00'),
  ('usr-vet-0003', 2, '13:00', '20:00'),
  ('usr-vet-0003', 3, '13:00', '20:00'),
  ('usr-vet-0003', 4, '13:00', '20:00'),
  ('usr-vet-0003', 5, '13:00', '20:00');


-- Clientes de ejemplo
INSERT INTO clientes (id, nombre, cedula, telefono, correo, direccion, ciudad) VALUES
  ('cli-0001', 'Juan Pérez',      '8-123-456', '6000-1111', 'juan@email.com',    'Calle 1, Casa 5',     'Ciudad de Panamá'),
  ('cli-0002', 'María López',     '4-567-890', '6100-2222', 'maria@email.com',   'Av. Central 22',      'San Miguelito'),
  ('cli-0003', 'Carlos Gómez',    '2-345-678', '6200-3333', 'carlos@email.com',  'Urb. Los Pinos B-3',  'Chorrera'),
  ('cli-0004', 'Lucía Fernández', '9-876-543', '6300-4444', 'lucia@email.com',   'Calle 50, Apt 4B',    'Ciudad de Panamá'),
  ('cli-0005', 'Pedro Ríos',      '1-234-567', '6400-5555', 'pedro@email.com',   'Barrio El Carmen 7',  'Arraiján');


-- Mascotas de ejemplo
INSERT INTO mascotas (id, cliente_id, nombre, tipo, raza, sexo, color, fecha_nacimiento, peso_kg, esterilizado) VALUES
  ('mas-0001', 'cli-0001', 'Rocky',   'Perro', 'Labrador',        'macho',  'Amarillo', '2021-03-15', 28.50, 0),
  ('mas-0002', 'cli-0001', 'Luna',    'Gato',  'Persa',           'hembra', 'Blanco',   '2022-07-20', 4.20,  1),
  ('mas-0003', 'cli-0002', 'Max',     'Perro', 'Golden Retriever','macho',  'Dorado',   '2020-11-05', 32.00, 1),
  ('mas-0004', 'cli-0003', 'Mishi',   'Gato',  'Siamés',          'hembra', 'Crema',    '2023-01-10', 3.80,  0),
  ('mas-0005', 'cli-0004', 'Toby',    'Perro', 'Beagle',          'macho',  'Tricolor', '2019-05-22', 12.00, 1),
  ('mas-0006', 'cli-0005', 'Lola',    'Perro', 'Chihuahua',       'hembra', 'Café',     '2022-09-30', 3.10,  0),
  ('mas-0007', 'cli-0002', 'Piolín',  'Ave',   'Canario',         'macho',  'Amarillo', '2023-06-01', 0.03,  0);


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
--  FIN DEL SCRIPT
-- ============================================================
-- Tablas creadas : 14 tablas + 2 tablas de items normalizados
-- Vistas         : 5 vistas de consulta frecuente
-- Procedimientos : 3 procedimientos almacenados
-- Datos semilla  : usuarios, servicios, medicamentos, clientes y mascotas de ejemplo
-- ============================================================
