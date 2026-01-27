-- =====================================================
-- MIGRACIÓN 041: Validación de system_config
-- =====================================================
-- Límites en configuraciones críticas para prevenir abusos

-- 1. Función para validar cambios en system_config
CREATE OR REPLACE FUNCTION validate_system_config_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar trial_days (máximo 30 días)
  IF NEW.key = 'trial_days' THEN
    DECLARE
      trial_days_value INTEGER;
    BEGIN
      trial_days_value := CAST(NEW.value AS INTEGER);
      
      IF trial_days_value IS NULL OR trial_days_value < 1 OR trial_days_value > 30 THEN
        RAISE EXCEPTION 'trial_days debe estar entre 1 y 30 días';
      END IF;
    END;
  END IF;
  
  -- Validar otros valores críticos si es necesario
  -- Agregar más validaciones según sea necesario
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger para validar cambios en system_config
CREATE TRIGGER validate_system_config_change_trigger
  BEFORE INSERT OR UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION validate_system_config_change();

-- 3. Comentarios
COMMENT ON FUNCTION validate_system_config_change() IS 'Valida que los cambios en system_config estén dentro de rangos permitidos (ej: trial_days máximo 30)';
