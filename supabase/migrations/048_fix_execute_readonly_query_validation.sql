-- =====================================================
-- MIGRACIÓN 048: Fix validación de execute_readonly_query
-- =====================================================
-- La validación anterior usaba LIKE '%CREATE%' que bloqueaba
-- columnas legítimas como created_at, updated_at, deleted_at.
-- Esta versión usa regex con word boundaries para solo detectar
-- comandos SQL reales, no partes de nombres de columnas.

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

  -- Validar que no contenga comandos peligrosos usando regex con word boundaries
  -- \m = inicio de palabra, \M = fin de palabra en PostgreSQL regex
  IF normalized_query ~ '\mINSERT\M'
     OR normalized_query ~ '\mUPDATE\M'
     OR normalized_query ~ '\mDELETE\M'
     OR normalized_query ~ '\mDROP\M'
     OR normalized_query ~ '\mCREATE\M'
     OR normalized_query ~ '\mALTER\M'
     OR normalized_query ~ '\mTRUNCATE\M'
     OR normalized_query ~ '\mGRANT\M'
     OR normalized_query ~ '\mREVOKE\M'
     OR normalized_query ~ '\mEXEC\M'
     OR normalized_query ~ '\mEXECUTE\M' THEN
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

-- Mantener permisos
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO service_role;

COMMENT ON FUNCTION execute_readonly_query(TEXT) IS
  'Ejecuta queries SQL de solo lectura (SELECT) de forma segura para Cerebro AI.
   Valida que el query sea SELECT y no contenga comandos SQL peligrosos.
   Usa regex word boundaries para no bloquear columnas como created_at, updated_at.';
