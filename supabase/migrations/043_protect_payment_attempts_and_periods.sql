-- =====================================================
-- MIGRACIÓN 043: Proteger payment_attempts y current_period_end
-- =====================================================
-- Previene manipulación manual de campos críticos

-- 1. Nota sobre payment_attempts:
-- Las funciones RPC increment_payment_attempt y reset_payment_attempts
-- usan SECURITY DEFINER, por lo que pueden modificar sin problemas
-- La protección viene de RLS en subscriptions que bloquea UPDATE para authenticated
-- Solo admin client (service_role) puede modificar directamente

-- 2. Marcar funciones RPC con SECURITY DEFINER para que puedan modificar
-- Las funciones increment_payment_attempt y reset_payment_attempts ya existen
-- pero necesitamos asegurarnos de que tienen SECURITY DEFINER
ALTER FUNCTION increment_payment_attempt(UUID) SECURITY DEFINER;
ALTER FUNCTION reset_payment_attempts(UUID) SECURITY DEFINER;

-- Nota: No podemos crear un trigger que distinga si viene de RPC o no
-- La protección viene de RLS que bloquea UPDATE para authenticated
-- Las funciones RPC con SECURITY DEFINER pueden modificar porque usan service_role

-- 3. Función RPC especial para admin extender período (con auditoría)
CREATE OR REPLACE FUNCTION admin_extend_period(
  subscription_id_param UUID,
  new_period_end TIMESTAMP WITH TIME ZONE,
  reason_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_period_start_val TIMESTAMP WITH TIME ZONE;
  days_diff INTEGER;
BEGIN
  -- Obtener current_period_start
  SELECT current_period_start INTO current_period_start_val
  FROM subscriptions
  WHERE id = subscription_id_param;
  
  IF current_period_start_val IS NULL THEN
    RAISE EXCEPTION 'No se encontró la suscripción o no tiene current_period_start';
  END IF;
  
  -- Validar que no exceda 35 días desde current_period_start
  days_diff := EXTRACT(DAY FROM (new_period_end - current_period_start_val))::INTEGER;
  
  IF days_diff > 35 THEN
    RAISE EXCEPTION 'El período no puede exceder 35 días desde current_period_start. Días calculados: %', days_diff;
  END IF;
  
  -- Actualizar período
  UPDATE subscriptions
  SET current_period_end = new_period_end,
      updated_at = NOW()
  WHERE id = subscription_id_param;
  
  -- Registrar en auditoría
  PERFORM log_admin_action(
    NULL, -- Se llenará desde la aplicación
    'PERIOD_EXTENDED_BY_ADMIN',
    'subscription',
    subscription_id_param,
    jsonb_build_object('current_period_end', (SELECT current_period_end FROM subscriptions WHERE id = subscription_id_param)),
    jsonb_build_object('current_period_end', new_period_end),
    reason_param,
    NULL,
    NULL
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para prevenir modificación manual de current_period_end
-- Solo permitir si viene de webhook o función RPC admin_extend_period
CREATE OR REPLACE FUNCTION prevent_manual_period_end_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si current_period_end cambió, verificar que sea válido
  IF OLD.current_period_end IS DISTINCT FROM NEW.current_period_end THEN
    -- Validar que no exceda 35 días
    IF (NEW.current_period_end - NEW.current_period_start) > INTERVAL '35 days' THEN
      RAISE EXCEPTION 'current_period_end no puede ser más de 35 días desde current_period_start. Use la función admin_extend_period() para extensiones especiales.';
    END IF;
    
    -- Nota: No podemos distinguir fácilmente si viene de webhook o admin
    -- Por eso confiamos en que el endpoint admin use admin_extend_period()
    -- y el webhook actualice directamente (que es válido)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_manual_period_end_change_trigger ON subscriptions;
CREATE TRIGGER prevent_manual_period_end_change_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.current_period_end IS DISTINCT FROM NEW.current_period_end)
  EXECUTE FUNCTION prevent_manual_period_end_change();

-- 5. Comentarios
COMMENT ON FUNCTION admin_extend_period(UUID, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Función RPC especial para admin extender período con auditoría. Usar esta función en lugar de modificar current_period_end directamente.';
COMMENT ON FUNCTION prevent_manual_period_end_change() IS 'Previene modificación manual de current_period_end sin validación - usar admin_extend_period() o webhook';
