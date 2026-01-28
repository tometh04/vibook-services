-- =====================================================
-- MIGRACIÓN 047: Función execute_readonly_query para Cerebro
-- =====================================================
-- Esta función permite a Cerebro ejecutar queries de solo lectura
-- de forma segura, validando que sean SELECT únicamente

-- 1. Crear función para ejecutar queries de solo lectura
CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB AS $$
DECLARE
  result_data JSONB;
  normalized_query TEXT;
BEGIN
  -- Normalizar el query (quitar espacios y convertir a mayúsculas)
  normalized_query := UPPER(TRIM(query_text));

  -- Validar que solo sea SELECT
  IF NOT normalized_query LIKE 'SELECT %' THEN
    RAISE EXCEPTION 'Solo se permiten queries SELECT';
  END IF;

  -- Validar que no contenga comandos peligrosos
  IF normalized_query LIKE '%INSERT%'
     OR normalized_query LIKE '%UPDATE%'
     OR normalized_query LIKE '%DELETE%'
     OR normalized_query LIKE '%DROP%'
     OR normalized_query LIKE '%CREATE%'
     OR normalized_query LIKE '%ALTER%'
     OR normalized_query LIKE '%TRUNCATE%'
     OR normalized_query LIKE '%GRANT%'
     OR normalized_query LIKE '%REVOKE%' THEN
    RAISE EXCEPTION 'Query contiene comandos no permitidos';
  END IF;

  -- Ejecutar el query y convertir a JSONB
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text)
  INTO result_data;

  -- Si no hay resultados, devolver array vacío
  IF result_data IS NULL THEN
    result_data := '[]'::jsonb;
  END IF;

  RETURN result_data;

EXCEPTION
  WHEN OTHERS THEN
    -- Si hay un error, devolver el mensaje
    RAISE EXCEPTION 'Error ejecutando query: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;

-- 3. Comentarios
COMMENT ON FUNCTION execute_readonly_query(TEXT) IS
  'Ejecuta queries SQL de solo lectura (SELECT) de forma segura para Cerebro AI.
   Valida que el query sea SELECT y no contenga comandos peligrosos.';
