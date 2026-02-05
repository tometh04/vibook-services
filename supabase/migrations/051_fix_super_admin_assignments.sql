-- Asegura que solo admin@vibook.ai sea SUPER_ADMIN
-- Cualquier otro usuario con SUPER_ADMIN se degrada a ADMIN

UPDATE users
SET role = 'ADMIN',
    updated_at = NOW()
WHERE role = 'SUPER_ADMIN'
  AND email != 'admin@vibook.ai';
