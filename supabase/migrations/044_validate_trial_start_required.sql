-- =====================================================
-- MIGRACIÓN 044: Validar que trial_start es obligatorio si hay trial_end
-- =====================================================
-- Previene suscripciones con trial_end pero sin trial_start

-- 1. Constraint para validar que si hay trial_end, debe haber trial_start
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS check_trial_start_required;

ALTER TABLE subscriptions
ADD CONSTRAINT check_trial_start_required
CHECK (
  (trial_end IS NULL) OR (trial_start IS NOT NULL)
);

-- 2. Función para validar y corregir datos existentes
CREATE OR REPLACE FUNCTION validate_and_fix_trial_dates()
RETURNS INTEGER AS $$
DECLARE
  fixed_count INTEGER := 0;
  sub_record RECORD;
BEGIN
  -- Buscar suscripciones con trial_end pero sin trial_start
  FOR sub_record IN
    SELECT id, trial_end, created_at
    FROM subscriptions
    WHERE trial_end IS NOT NULL
      AND trial_start IS NULL
  LOOP
    -- Establecer trial_start como created_at o 7 días antes de trial_end
    UPDATE subscriptions
    SET trial_start = COALESCE(
      created_at,
      trial_end - INTERVAL '7 days'
    )
    WHERE id = sub_record.id;
    
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Ejecutar corrección de datos existentes
DO $$
DECLARE
  fixed INTEGER;
BEGIN
  fixed := validate_and_fix_trial_dates();
  RAISE NOTICE 'Corregidas % suscripciones sin trial_start', fixed;
END $$;

-- 4. Trigger para prevenir crear suscripciones con trial_end sin trial_start
CREATE OR REPLACE FUNCTION validate_trial_start_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Si hay trial_end, debe haber trial_start
  IF NEW.trial_end IS NOT NULL AND NEW.trial_start IS NULL THEN
    RAISE EXCEPTION 'Si hay trial_end, trial_start es obligatorio';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trial_start_on_insert_trigger ON subscriptions;
CREATE TRIGGER validate_trial_start_on_insert_trigger
  BEFORE INSERT ON subscriptions
  FOR EACH ROW
  WHEN (NEW.trial_end IS NOT NULL)
  EXECUTE FUNCTION validate_trial_start_on_insert();

-- 5. Comentarios
COMMENT ON CONSTRAINT check_trial_start_required ON subscriptions IS 'Valida que si hay trial_end, debe haber trial_start';
COMMENT ON FUNCTION validate_and_fix_trial_dates() IS 'Valida y corrige suscripciones existentes sin trial_start';
COMMENT ON FUNCTION validate_trial_start_on_insert() IS 'Valida que no se cree suscripción con trial_end sin trial_start';
