-- Migración para agregar constraint UNIQUE al nombre de agencia
-- En un SaaS, cada agencia debe tener un nombre único

-- Agregar constraint UNIQUE si no existe
DO $$
DECLARE
  duplicates_detected BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.agencies
    GROUP BY name
    HAVING COUNT(*) > 1
  ) INTO duplicates_detected;

  IF duplicates_detected THEN
    RAISE WARNING '⚠️  No se pudo agregar UNIQUE a agencies.name porque hay nombres duplicados. Resuelve duplicados y vuelve a intentar.';
    RETURN;
  END IF;

  -- Verificar si ya existe el constraint
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agencies_name_unique'
    AND conrelid = 'public.agencies'::regclass
  ) THEN
    -- Agregar constraint UNIQUE
    ALTER TABLE public.agencies
    ADD CONSTRAINT agencies_name_unique UNIQUE (name);

    RAISE NOTICE '✅ Constraint UNIQUE agregado a agencies.name';
  ELSE
    RAISE NOTICE '⚠️  Constraint agencies_name_unique ya existe';
  END IF;
END $$;

-- Verificar que se aplicó correctamente
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.agencies'::regclass
AND conname = 'agencies_name_unique';
