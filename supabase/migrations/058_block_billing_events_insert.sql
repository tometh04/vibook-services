-- 058: Bloquear INSERT en billing_events para usuarios autenticados
-- Solo el admin client (service_role) y funciones RPC pueden insertar
-- Complementa migración 040 que ya bloqueó UPDATE y DELETE

DROP POLICY IF EXISTS "Block billing_events INSERT" ON billing_events;
CREATE POLICY "Block billing_events INSERT" ON billing_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

COMMENT ON POLICY "Block billing_events INSERT" ON billing_events IS
  'Bloquea INSERT directo - solo admin client (service_role) y funciones RPC pueden insertar eventos de billing';
