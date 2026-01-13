-- Actualizar límites de usuarios por plan
-- Starter: 5 usuarios
-- Pro: 15 usuarios
-- Business: ilimitado (null)

-- Actualizar STARTER
UPDATE subscription_plans
SET 
  max_users = 5,
  updated_at = NOW()
WHERE name = 'STARTER';

-- Actualizar PRO
UPDATE subscription_plans
SET 
  max_users = 15,
  updated_at = NOW()
WHERE name = 'PRO';

-- Actualizar BUSINESS (ilimitado)
UPDATE subscription_plans
SET 
  max_users = NULL, -- NULL significa ilimitado
  updated_at = NOW()
WHERE name = 'BUSINESS';

-- Actualizar TESTER (ilimitado - para pruebas)
UPDATE subscription_plans
SET 
  max_users = NULL,
  updated_at = NOW()
WHERE name = 'TESTER';

-- Verificar los cambios
SELECT name, max_users, price_monthly FROM subscription_plans WHERE is_active = true ORDER BY price_monthly;
