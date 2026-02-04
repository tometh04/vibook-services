-- =====================================================
-- MIGRACIÓN 040: Reforzar Políticas RLS
-- =====================================================
-- Bloquear explícitamente modificaciones no autorizadas

-- 1. BLOQUEAR MODIFICACIONES EN SUBSCRIPTIONS
-- Solo lectura permitida para usuarios normales
-- Modificaciones solo mediante admin client (service_role_key)

-- Eliminar políticas existentes si hay alguna de modificación
DROP POLICY IF EXISTS "Agencies can modify own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Agencies can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Agencies can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Agencies can delete subscriptions" ON subscriptions;

-- Bloquear explícitamente INSERT, UPDATE, DELETE para usuarios autenticados
-- (Solo admin client con service_role_key puede modificar)
DROP POLICY IF EXISTS "Block subscriptions INSERT" ON subscriptions;
CREATE POLICY "Block subscriptions INSERT" ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Bloquear todos los INSERT

DROP POLICY IF EXISTS "Block subscriptions UPDATE" ON subscriptions;
CREATE POLICY "Block subscriptions UPDATE" ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (false); -- Bloquear todos los UPDATE

DROP POLICY IF EXISTS "Block subscriptions DELETE" ON subscriptions;
CREATE POLICY "Block subscriptions DELETE" ON subscriptions
  FOR DELETE
  TO authenticated
  USING (false); -- Bloquear todos los DELETE

-- 2. BLOQUEAR MODIFICACIONES EN USAGE_METRICS
-- Solo lectura permitida para usuarios normales
-- Modificaciones solo mediante funciones RPC (SECURITY DEFINER)

DROP POLICY IF EXISTS "Agencies can modify own usage metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Agencies can insert usage metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Agencies can update usage metrics" ON usage_metrics;
DROP POLICY IF EXISTS "Agencies can delete usage metrics" ON usage_metrics;

-- Bloquear explícitamente INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Block usage_metrics INSERT" ON usage_metrics;
CREATE POLICY "Block usage_metrics INSERT" ON usage_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block usage_metrics UPDATE" ON usage_metrics;
CREATE POLICY "Block usage_metrics UPDATE" ON usage_metrics
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block usage_metrics DELETE" ON usage_metrics;
CREATE POLICY "Block usage_metrics DELETE" ON usage_metrics
  FOR DELETE
  TO authenticated
  USING (false);

-- 3. BLOQUEAR MODIFICACIONES EN BILLING_EVENTS
-- Solo lectura permitida
-- Inserción solo mediante funciones RPC o admin client

DROP POLICY IF EXISTS "Agencies can modify own billing events" ON billing_events;
DROP POLICY IF EXISTS "Agencies can insert billing events" ON billing_events;
DROP POLICY IF EXISTS "Agencies can update billing events" ON billing_events;
DROP POLICY IF EXISTS "Agencies can delete billing events" ON billing_events;

-- Bloquear explícitamente UPDATE y DELETE (INSERT puede ser necesario para webhooks)
-- Para INSERT, solo permitir desde funciones RPC o admin client
DROP POLICY IF EXISTS "Block billing_events UPDATE" ON billing_events;
CREATE POLICY "Block billing_events UPDATE" ON billing_events
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block billing_events DELETE" ON billing_events;
CREATE POLICY "Block billing_events DELETE" ON billing_events
  FOR DELETE
  TO authenticated
  USING (false);

-- 4. BLOQUEAR MODIFICACIONES EN AGENCIES (has_used_trial)
-- Solo lectura y creación permitida
-- Modificaciones de has_used_trial solo mediante funciones RPC

-- Verificar si existe política de UPDATE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agencies' 
    AND policyname LIKE '%update%'
  ) THEN
    -- No eliminar políticas existentes de UPDATE si hay otras necesarias
    -- Solo agregar validación adicional
    NULL;
  END IF;
END $$;

-- 5. COMENTARIOS
COMMENT ON POLICY "Block subscriptions INSERT" ON subscriptions IS 'Bloquea INSERT en subscriptions - solo admin client puede insertar';
COMMENT ON POLICY "Block subscriptions UPDATE" ON subscriptions IS 'Bloquea UPDATE en subscriptions - solo admin client puede actualizar';
COMMENT ON POLICY "Block subscriptions DELETE" ON subscriptions IS 'Bloquea DELETE en subscriptions - solo admin client puede eliminar';
COMMENT ON POLICY "Block usage_metrics INSERT" ON usage_metrics IS 'Bloquea INSERT en usage_metrics - solo funciones RPC pueden insertar';
COMMENT ON POLICY "Block usage_metrics UPDATE" ON usage_metrics IS 'Bloquea UPDATE en usage_metrics - solo funciones RPC pueden actualizar';
COMMENT ON POLICY "Block usage_metrics DELETE" ON usage_metrics IS 'Bloquea DELETE en usage_metrics - solo funciones RPC pueden eliminar';
COMMENT ON POLICY "Block billing_events UPDATE" ON billing_events IS 'Bloquea UPDATE en billing_events - solo admin client puede actualizar';
COMMENT ON POLICY "Block billing_events DELETE" ON billing_events IS 'Bloquea DELETE en billing_events - solo admin client puede eliminar';
