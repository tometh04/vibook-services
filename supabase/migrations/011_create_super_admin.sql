-- Migración para crear el SUPER_ADMIN del sistema (admin@vibook.ai)
-- Este usuario es el único SUPER_ADMIN y puede ver TODO el sistema

-- IMPORTANTE: Ejecutar esta migración manualmente después de verificar que:
-- 1. El usuario admin@vibook.ai NO existe en auth.users
-- 2. O si existe, obtener su auth_id para vincularlo

-- Paso 1: Crear usuario en Supabase Auth (si no existe)
-- Esto debe hacerse manualmente desde Supabase Dashboard o usando la API
-- Email: admin@vibook.ai
-- Password: _Vibook042308

-- Paso 2: Obtener el auth_id del usuario creado
-- SELECT id FROM auth.users WHERE email = 'admin@vibook.ai';

-- Paso 3: Insertar en tabla users con rol SUPER_ADMIN
-- Reemplazar 'AUTH_ID_DEL_USUARIO' con el ID real de auth.users

DO $$
DECLARE
  admin_auth_id uuid;
  admin_user_id uuid;
BEGIN
  -- Buscar el auth_id del usuario admin@vibook.ai
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@vibook.ai'
  LIMIT 1;

  -- Si no existe, crear el usuario en auth.users primero
  IF admin_auth_id IS NULL THEN
    -- Insertar en auth.users usando la función admin
    -- NOTA: Esto requiere permisos de service_role
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@vibook.ai',
      crypt('_Vibook042308', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin Vibook"}',
      false,
      '',
      ''
    )
    RETURNING id INTO admin_auth_id;
  END IF;

  -- Verificar si ya existe en la tabla users
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
  ELSE
    -- Si existe, actualizar a SUPER_ADMIN
    UPDATE public.users
    SET 
      role = 'SUPER_ADMIN',
      is_active = true,
      updated_at = NOW()
    WHERE id = admin_user_id;
  END IF;

  RAISE NOTICE '✅ SUPER_ADMIN creado/actualizado: admin@vibook.ai (user_id: %)', admin_user_id;
END $$;

-- Verificar que se creó correctamente
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_active,
  CASE 
    WHEN u.role = 'SUPER_ADMIN' THEN '✅ SUPER_ADMIN correcto'
    ELSE '❌ Rol incorrecto'
  END as estado
FROM public.users u
WHERE u.email = 'admin@vibook.ai';
