-- =====================================================
-- MIGRACIÓN: Crear SUPER_ADMIN del sistema (admin@vibook.ai)
-- =====================================================
-- Este usuario es el único SUPER_ADMIN y puede ver TODO el sistema
--
-- INSTRUCCIONES:
-- 1. PRIMERO: Crear el usuario en Supabase Auth manualmente:
--    - Ir a Supabase Dashboard → Authentication → Users → Add User
--    - Email: admin@vibook.ai
--    - Password: _Vibook042308
--    - Auto Confirm User: ✅ (marcar)
--
-- 2. SEGUNDO: Ejecutar esta migración para crear/actualizar el registro en public.users
-- =====================================================

DO $$
DECLARE
  admin_auth_id uuid;
  admin_user_id uuid;
BEGIN
  -- Buscar el auth_id del usuario admin@vibook.ai en auth.users
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@vibook.ai'
  LIMIT 1;

  -- Si no existe en auth.users, mostrar error
  IF admin_auth_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: El usuario admin@vibook.ai no existe en auth.users. Por favor, créalo primero en Supabase Dashboard → Authentication → Users';
  END IF;

  -- Verificar si ya existe en la tabla public.users
  SELECT id INTO admin_user_id
  FROM public.users
  WHERE auth_id = admin_auth_id
  LIMIT 1;

  -- Si no existe, crear el registro en users
  IF admin_user_id IS NULL THEN
    INSERT INTO public.users (
      auth_id,
      name,
      email,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      admin_auth_id,
      'Admin Vibook',
      'admin@vibook.ai',
      'SUPER_ADMIN',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO admin_user_id;
    
    RAISE NOTICE '✅ SUPER_ADMIN creado: admin@vibook.ai (user_id: %)', admin_user_id;
  ELSE
    -- Si existe, actualizar a SUPER_ADMIN (por si acaso)
    UPDATE public.users
    SET 
      role = 'SUPER_ADMIN',
      is_active = true,
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    RAISE NOTICE '✅ SUPER_ADMIN actualizado: admin@vibook.ai (user_id: %)', admin_user_id;
  END IF;
END $$;

-- Verificar que se creó correctamente
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_active,
  au.id as auth_id,
  CASE 
    WHEN u.role = 'SUPER_ADMIN' THEN '✅ SUPER_ADMIN correcto'
    ELSE '❌ Rol incorrecto'
  END as estado
FROM public.users u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE u.email = 'admin@vibook.ai';
