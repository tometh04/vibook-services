# 📋 Plan: Nuevo Flujo de Billing con Paywall Post-Signup

## 🎯 Objetivo

Implementar un flujo donde:
1. Usuario hace **Sign Up**
2. Ve **Paywall** (pantalla con 7 días de prueba)
3. Usuario completa el pago (no se cobra por 7 días)
4. A los 7 días se cobra automáticamente
5. Si se da de baja o deja de pagar → se bloquea el servicio

---

## ✅ Estado Actual de la Lógica

### ✅ Lo que YA está implementado:

1. **Cancelación de suscripción:**
   - ✅ Endpoint `/api/billing/portal` con acción `cancel`
   - ✅ Cancela el preapproval en Mercado Pago
   - ✅ Actualiza estado a `CANCELED` en BD
   - ✅ Registra evento en `billing_events`

2. **Suspensión de suscripción:**
   - ✅ Endpoint `/api/billing/portal` con acción `pause`
   - ✅ Pausa el preapproval en Mercado Pago
   - ✅ Actualiza estado a `SUSPENDED` en BD

3. **Estados de suscripción:**
   - ✅ `TRIAL` - Período de prueba
   - ✅ `ACTIVE` - Suscripción activa
   - ✅ `CANCELED` - Cancelada
   - ✅ `PAST_DUE` - Pago pendiente
   - ✅ `UNPAID` - No pagado
   - ✅ `SUSPENDED` - Suspendida

4. **Webhook de Mercado Pago:**
   - ✅ Maneja notificaciones de preapproval
   - ✅ Actualiza estados según Mercado Pago
   - ✅ Mapea estados correctamente

### ❌ Lo que FALTA implementar:

1. **Cambiar período de prueba a 7 días:**
   - ❌ Migración para cambiar de 30 a 7 días
   - ❌ Actualizar lógica en callbacks

2. **Página de Paywall después del signup:**
   - ❌ Crear página `/paywall` o `/pricing` después del signup
   - ❌ Redirigir desde `/onboarding` o `/auth/verified` al paywall
   - ❌ Mostrar mensaje de 7 días de prueba

3. **Bloquear acceso cuando está CANCELED/PAST_DUE/UNPAID/SUSPENDED:**
   - ❌ Verificar que `checkFeatureAccess` y `checkSubscriptionLimit` bloquean cuando no está ACTIVE o TRIAL
   - ❌ Verificar que `PaywallGate` bloquea cuando está cancelado/suspendido
   - ❌ Middleware o verificación para bloquear acceso al dashboard

4. **Manejo de pago fallido:**
   - ❌ Verificar que cuando Mercado Pago reporta pago fallido, se actualiza a `PAST_DUE` o `UNPAID`
   - ❌ Bloquear acceso cuando está en `PAST_DUE` o `UNPAID`

---

## 📝 Cambios a Realizar

### 1. Cambiar Período de Prueba a 7 Días

**Archivo:** `supabase/migrations/006_update_trial_to_7_days.sql`

```sql
-- Cambiar período de prueba de 30 a 7 días
CREATE OR REPLACE FUNCTION create_free_subscription_for_agency()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'FREE' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (
      agency_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end,
      billing_cycle
    ) VALUES (
      NEW.id,
      free_plan_id,
      'TRIAL',
      NOW(),
      NOW() + INTERVAL '7 days', -- Cambiado de 30 a 7 días
      NOW(),
      NOW() + INTERVAL '7 days', -- Cambiado de 30 a 7 días
      'MONTHLY'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Archivos a actualizar:**
- `app/api/billing/preapproval-callback/route.ts` - Cambiar trial de 30 a 7 días
- `app/api/billing/checkout/route.ts` - Cambiar trial de 30 a 7 días (si aplica)

---

### 2. Crear Página de Paywall Post-Signup

**Archivo:** `app/paywall/page.tsx` (NUEVO)

**Funcionalidad:**
- Mostrar planes disponibles
- Mensaje destacado: "7 días de prueba gratis"
- Botón para elegir plan
- Redirigir a Mercado Pago para completar pago
- Después del pago, redirigir al dashboard

**Flujo:**
1. Usuario completa signup → `/auth/verified`
2. `/auth/verified` redirige a `/paywall` (en lugar de `/onboarding`)
3. Usuario elige plan en `/paywall`
4. Completa pago en Mercado Pago
5. Callback redirige a `/dashboard`

---

### 3. Actualizar Flujo de Signup

**Archivos a modificar:**

1. **`app/(auth)/auth/verified/page.tsx`:**
   - Cambiar redirección de `/onboarding` a `/paywall`

2. **`app/(auth)/auth/callback/route.ts`:**
   - Para nuevos usuarios OAuth, redirigir a `/paywall` en lugar de `/onboarding`

3. **`app/onboarding/page.tsx`:**
   - Opcional: Mantener para usuarios que ya pagaron pero quieren configurar más cosas

---

### 4. Bloquear Acceso cuando está Cancelado/Suspendido

**Archivos a modificar:**

1. **`lib/billing/limits.ts`:**
   - `checkFeatureAccess`: Verificar que solo permite acceso si status es `ACTIVE` o `TRIAL`
   - `checkSubscriptionLimit`: Verificar que solo permite si status es `ACTIVE` o `TRIAL`

2. **`hooks/use-subscription.ts`:**
   - `canUseFeature`: Verificar que solo retorna `true` si status es `ACTIVE` o `TRIAL`
   - `isActive`: Ya verifica `ACTIVE` o `TRIAL`, está bien

3. **Middleware o verificación global:**
   - Crear middleware que verifique suscripción antes de acceder al dashboard
   - Si está `CANCELED`, `PAST_DUE`, `UNPAID`, `SUSPENDED` → redirigir a `/paywall` o `/pricing`

---

### 5. Manejo de Pago Fallido

**Archivo:** `app/api/billing/webhook/route.ts`

**Verificar:**
- Cuando Mercado Pago reporta pago fallido, actualizar a `PAST_DUE` o `UNPAID`
- Registrar evento en `billing_events`
- El webhook ya maneja estados de Mercado Pago, pero necesitamos verificar el mapeo

**Estados de Mercado Pago:**
- `authorized` → `ACTIVE`
- `pending` → `TRIAL`
- `cancelled` → `CANCELED`
- `paused` → `SUSPENDED`
- ¿Qué pasa con pagos fallidos? → Necesitamos mapear a `PAST_DUE` o `UNPAID`

---

## 🔄 Flujo Completo Propuesto

### Flujo de Nuevo Usuario:

1. **Sign Up** (`/signup`)
   - Usuario crea cuenta
   - Se crea agencia automáticamente
   - Se crea suscripción FREE con status `TRIAL` (7 días)

2. **Verificación de Email** (`/auth/verify-email`)
   - Usuario verifica email
   - Redirige a `/auth/verified`

3. **Email Verificado** (`/auth/verified`)
   - Muestra mensaje de éxito
   - Redirige a `/paywall` (NUEVO)

4. **Paywall** (`/paywall`) (NUEVO)
   - Muestra planes disponibles
   - Mensaje: "7 días de prueba gratis"
   - Usuario elige plan
   - Redirige a Mercado Pago

5. **Pago en Mercado Pago**
   - Usuario completa pago
   - No se cobra por 7 días (trial)
   - Redirige a `/api/billing/preapproval-callback`

6. **Callback**
   - Crea/actualiza suscripción con status `TRIAL`
   - `trial_end` = 7 días desde ahora
   - Redirige a `/dashboard`

7. **Dashboard**
   - Usuario puede usar todas las funcionalidades durante 7 días
   - Después de 7 días, Mercado Pago cobra automáticamente
   - Status cambia a `ACTIVE`

### Flujo de Usuario Existente:

1. **Login** (`/login`)
   - Usuario inicia sesión
   - Middleware verifica suscripción

2. **Verificación de Suscripción:**
   - Si status es `ACTIVE` o `TRIAL` → Acceso permitido
   - Si status es `CANCELED`, `PAST_DUE`, `UNPAID`, `SUSPENDED` → Redirigir a `/paywall`

3. **Dashboard**
   - Acceso normal si está activo

### Flujo de Cancelación/Suspensión:

1. **Usuario cancela** (`/settings/billing` → Cancelar)
   - Se llama a `/api/billing/portal` con `action: 'cancel'`
   - Se cancela preapproval en Mercado Pago
   - Status cambia a `CANCELED`
   - Próximo acceso → Redirigir a `/paywall`

2. **Pago fallido:**
   - Mercado Pago envía webhook
   - Status cambia a `PAST_DUE` o `UNPAID`
   - Próximo acceso → Redirigir a `/paywall`

---

## 📋 Checklist de Implementación

### Fase 1: Cambiar Período de Prueba
- [ ] Crear migración `006_update_trial_to_7_days.sql`
- [ ] Actualizar `app/api/billing/preapproval-callback/route.ts`
- [ ] Actualizar `app/api/billing/checkout/route.ts` (si aplica)
- [ ] Ejecutar migración en Supabase

### Fase 2: Crear Página de Paywall
- [ ] Crear `app/paywall/page.tsx`
- [ ] Diseñar UI con mensaje de 7 días de prueba
- [ ] Integrar botones de Mercado Pago
- [ ] Manejar redirección después del pago

### Fase 3: Actualizar Flujo de Signup
- [ ] Actualizar `app/(auth)/auth/verified/page.tsx` → Redirigir a `/paywall`
- [ ] Actualizar `app/(auth)/auth/callback/route.ts` → Redirigir a `/paywall` para nuevos usuarios
- [ ] Opcional: Mantener `/onboarding` para configuración adicional

### Fase 4: Bloquear Acceso
- [ ] Actualizar `lib/billing/limits.ts` → Bloquear si no está ACTIVE o TRIAL
- [ ] Actualizar `hooks/use-subscription.ts` → Verificar estados
- [ ] Crear middleware o verificación en dashboard para bloquear acceso
- [ ] Actualizar `PaywallGate` para mostrar mensaje cuando está cancelado

### Fase 5: Manejo de Pago Fallido
- [ ] Verificar mapeo de estados en webhook
- [ ] Agregar lógica para `PAST_DUE` y `UNPAID`
- [ ] Probar escenario de pago fallido

---

## 🎯 Próximos Pasos

1. **Crear migración** para cambiar trial a 7 días
2. **Crear página de paywall** con diseño atractivo
3. **Actualizar flujo de signup** para redirigir al paywall
4. **Implementar bloqueo de acceso** cuando está cancelado/suspendido
5. **Verificar manejo de pagos fallidos**

---

**Última actualización:** 2026-01-11
