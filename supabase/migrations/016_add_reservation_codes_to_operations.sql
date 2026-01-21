-- Migración: Agregar códigos de reserva a operaciones
-- Fecha: 2025-01-21
-- Descripción: Agrega campos opcionales para registrar códigos de reserva aéreo y hotel

-- Agregar columnas de códigos de reserva
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS reservation_code_air TEXT,
ADD COLUMN IF NOT EXISTS reservation_code_hotel TEXT;

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_operations_reservation_code_air 
  ON operations(reservation_code_air) 
  WHERE reservation_code_air IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operations_reservation_code_hotel 
  ON operations(reservation_code_hotel) 
  WHERE reservation_code_hotel IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN operations.reservation_code_air IS 'Código de reserva del vuelo/aéreo (ej: ABC123)';
COMMENT ON COLUMN operations.reservation_code_hotel IS 'Código de reserva del hotel (ej: HOTEL-456)';
