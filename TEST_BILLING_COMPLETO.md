# 🧪 Test Completo del Sistema de Billing

## 📋 Checklist de Pruebas

### ✅ 1. Verificar Página de Pricing

- [ ] La página `/pricing` carga correctamente
- [ ] Se muestran todos los planes (FREE, STARTER, PRO, ENTERPRISE)
- [ ] Los precios se muestran correctamente en ARS
- [ ] Las features de cada plan se muestran correctamente
- [ ] El plan actual está marcado (si hay suscripción activa)
- [ ] El botón "Elegir Plan" funciona para cada plan

---

### ✅ 2. Verificar API de Planes

**Endpoint:** `GET /api/billing/plans`

- [ ] Retorna lista de planes
- [ ] Cada plan tiene todos los campos necesarios:
  - `id`, `name`, `display_name`, `description`
  - `price_monthly`, `currency`
  - `max_users`, `max_operations_per_month`, `max_integrations`
  - `features` (trello, manychat, emilia, whatsapp, reports)

**Comando de prueba:**
```bash
curl https://app.vibook.ai/api/billing/plans
```

---

### ✅ 3. Verificar Checkout Flow

**Endpoint:** `POST /api/billing/checkout`

**Pruebas:**
- [ ] Crear checkout para plan STARTER
- [ ] Crear checkout para plan PRO
- [ ] Crear checkout para plan ENTERPRISE
- [ ] Verificar que retorna `initPoint` o `sandboxInitPoint`
- [ ] Verificar que redirige a Mercado Pago
- [ ] Verificar que los campos de tarjeta se pueden completar (sin error 403)
- [ ] Verificar que `external_reference` contiene `agency_id`, `plan_id`, `user_id`
- [ ] Verificar que `back_urls` apuntan a `app.vibook.ai`

**Flujo completo:**
1. Ir a `/pricing`
2. Hacer clic en "Elegir Plan" para cualquier plan (excepto FREE)
3. Verificar que se redirige a Mercado Pago
4. Verificar que la URL de Mercado Pago es correcta
5. Verificar que los campos de tarjeta se pueden completar

---

### ✅ 4. Verificar Webhook de Mercado Pago

**Endpoint:** `POST /api/billing/webhook` y `GET /api/billing/webhook`

**Pruebas:**
- [ ] El webhook responde a GET (para pruebas de Mercado Pago)
- [ ] El webhook responde a POST con notificaciones
- [ ] Verificar que procesa notificaciones de tipo `payment`
- [ ] Verificar que procesa notificaciones de tipo `preapproval`
- [ ] Verificar que actualiza la suscripción en la base de datos
- [ ] Verificar que registra eventos en `billing_events`

**Comando de prueba:**
```bash
# Prueba GET (simulación de Mercado Pago)
curl "https://app.vibook.ai/api/billing/webhook?topic=payment&id=123456"

# Debe retornar: {"received": true, "message": "Webhook configurado correctamente"}
```

**En Mercado Pago:**
1. Ir a NOTIFICACIONES → Webhooks
2. Hacer clic en "Probar" o "Simular notificación"
3. Verificar que el webhook recibe la notificación
4. Verificar en los logs de Vercel que se procesó correctamente

---

### ✅ 5. Verificar Página de Billing Settings

**Ruta:** `/settings/billing`

**Pruebas:**
- [ ] La página carga correctamente
- [ ] Muestra el plan actual
- [ ] Muestra el estado de la suscripción (ACTIVE, TRIAL, CANCELED, etc.)
- [ ] Muestra las métricas de uso (usuarios, operaciones, integraciones)
- [ ] Muestra el progreso de uso con barras de progreso
- [ ] Muestra la fecha del próximo pago
- [ ] Muestra la fecha de fin de prueba (si está en TRIAL)
- [ ] Los botones "Cambiar Plan", "Pausar", "Cancelar" funcionan

---

### ✅ 6. Verificar Gestión de Suscripciones

**Endpoint:** `POST /api/billing/portal`

**Pruebas:**

**Cancelar suscripción:**
- [ ] Enviar `{ action: 'cancel' }`
- [ ] Verificar que llama a `cancelPreApproval` en Mercado Pago
- [ ] Verificar que actualiza el estado a `CANCELED` en la BD
- [ ] Verificar que registra el evento en `billing_events`

**Pausar suscripción:**
- [ ] Enviar `{ action: 'pause' }`
- [ ] Verificar que llama a `updatePreApproval` con status `paused`
- [ ] Verificar que actualiza el estado a `SUSPENDED` en la BD
- [ ] Verificar que registra el evento en `billing_events`

---

### ✅ 7. Verificar Hook useSubscription

**Archivo:** `hooks/use-subscription.ts`

**Pruebas:**
- [ ] El hook carga la suscripción correctamente
- [ ] El hook carga las métricas de uso correctamente
- [ ] `isActive` retorna `true` para suscripciones ACTIVE y TRIAL
- [ ] `isTrial` retorna `true` solo para suscripciones TRIAL
- [ ] `planName` retorna el nombre correcto del plan
- [ ] `canUseFeature` retorna `true` para features incluidas en el plan
- [ ] `canUseFeature` retorna `true` durante el período de prueba (TRIAL)
- [ ] `hasReachedLimit` retorna `true` cuando se alcanza el límite

---

### ✅ 8. Verificar Límites de Suscripción

**Archivo:** `lib/billing/limits.ts`

**Pruebas:**

**checkSubscriptionLimit:**
- [ ] Verifica límite de usuarios correctamente
- [ ] Verifica límite de operaciones correctamente
- [ ] Verifica límite de integraciones correctamente
- [ ] Retorna `limitReached: true` cuando se alcanza el límite
- [ ] Retorna mensaje de error apropiado cuando se alcanza el límite
- [ ] Permite acciones ilimitadas cuando el límite es `null`

**checkFeatureAccess:**
- [ ] Verifica acceso a feature `trello` correctamente
- [ ] Verifica acceso a feature `manychat` correctamente
- [ ] Verifica acceso a feature `emilia` correctamente
- [ ] Verifica acceso a feature `whatsapp` correctamente
- [ ] Verifica acceso a feature `reports` correctamente
- [ ] Permite acceso durante el período de prueba (TRIAL)
- [ ] Retorna mensaje de error apropiado cuando no hay acceso

**En API de operaciones:**
- [ ] Verificar que `/api/operations` (POST) verifica el límite antes de crear
- [ ] Verificar que retorna 403 cuando se alcanza el límite
- [ ] Verificar que el mensaje de error es claro

---

### ✅ 9. Verificar PaywallGate Component

**Archivo:** `components/billing/paywall-gate.tsx`

**Pruebas:**
- [ ] Muestra el contenido cuando el usuario tiene acceso
- [ ] Bloquea el contenido cuando el usuario NO tiene acceso
- [ ] Muestra mensaje de upgrade apropiado
- [ ] El botón "Ver Planes" redirige a `/pricing`
- [ ] Funciona correctamente para cada feature:
  - `trello` (requiere plan Starter o superior)
  - `manychat` (requiere plan Pro o superior)
  - `emilia` (requiere plan Pro o superior)
  - `whatsapp` (requiere plan Starter o superior)
  - `reports` (requiere plan Starter o superior)

**Páginas con PaywallGate:**
- [ ] `/sales/leads` (Trello) - Bloqueado si no tiene acceso
- [ ] `/sales/crm-manychat` (Manychat) - Bloqueado si no tiene acceso
- [ ] `/emilia` (Emilia) - Bloqueado si no tiene acceso
- [ ] `/messages` (WhatsApp) - Bloqueado si no tiene acceso
- [ ] `/reports` (Reports) - Bloqueado si no tiene acceso

---

### ✅ 10. Verificar Redirecciones Post-Pago

**Pruebas:**
- [ ] Después de pago exitoso, redirige a `/settings/billing?status=success`
- [ ] Después de pago fallido, redirige a `/pricing?status=failure`
- [ ] Después de pago pendiente, redirige a `/settings/billing?status=pending`
- [ ] Las URLs de redirección usan el dominio correcto (`app.vibook.ai`)

---

### ✅ 11. Verificar Variables de Entorno

**Variables necesarias:**
- [ ] `NEXT_PUBLIC_APP_URL` = `https://app.vibook.ai`
- [ ] `MERCADOPAGO_ACCESS_TOKEN` está configurado
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` está configurado (opcional pero recomendado)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` está configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurado

---

### ✅ 12. Verificar Base de Datos

**Tablas a verificar:**
- [ ] `subscription_plans` - Tiene los 4 planes (FREE, STARTER, PRO, ENTERPRISE)
- [ ] `subscriptions` - Se crean correctamente con el trigger
- [ ] `usage_metrics` - Se actualizan correctamente
- [ ] `billing_events` - Se registran eventos correctamente

**Queries de verificación:**
```sql
-- Verificar planes
SELECT * FROM subscription_plans ORDER BY price_monthly;

-- Verificar suscripciones
SELECT s.*, sp.name as plan_name 
FROM subscriptions s 
JOIN subscription_plans sp ON s.plan_id = sp.id;

-- Verificar métricas de uso
SELECT * FROM usage_metrics ORDER BY period_start DESC LIMIT 10;

-- Verificar eventos de billing
SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 10;
```

---

## 🐛 Problemas Comunes y Soluciones

### Error 403 en campos de tarjeta de Mercado Pago

**Causa:** El dominio no está configurado correctamente en Mercado Pago.

**Solución:**
1. Ir a Mercado Pago → Tu aplicación → Información general
2. Verificar que "URL del sitio en producción" sea `https://app.vibook.ai`
3. Guardar cambios
4. Esperar unos minutos para que se propague

---

### Webhook no recibe notificaciones

**Causa:** La URL del webhook no está configurada o es incorrecta.

**Solución:**
1. Ir a Mercado Pago → NOTIFICACIONES → Webhooks
2. Verificar que la URL sea `https://app.vibook.ai/api/billing/webhook`
3. Hacer clic en "Probar" para verificar
4. Verificar los logs de Vercel

---

### Checkout no redirige a Mercado Pago

**Causa:** Error en la creación de la preferencia o falta el token de Mercado Pago.

**Solución:**
1. Verificar que `MERCADOPAGO_ACCESS_TOKEN` esté configurado en Vercel
2. Verificar los logs de Vercel para ver el error
3. Verificar que el plan existe en la base de datos

---

### PaywallGate bloquea contenido cuando debería permitirlo

**Causa:** El hook `useSubscription` no está cargando la suscripción correctamente.

**Solución:**
1. Verificar que la suscripción existe en la base de datos
2. Verificar que el usuario está vinculado a una agencia
3. Verificar los logs del navegador para errores
4. Verificar que `canUseFeature` está funcionando correctamente

---

## 📊 Resultados de la Prueba

**Fecha:** _______________

**Tester:** _______________

**Dominio probado:** `app.vibook.ai`

### Resumen:

- [ ] ✅ Todas las pruebas pasaron
- [ ] ⚠️ Algunas pruebas fallaron (ver detalles abajo)
- [ ] ❌ Muchas pruebas fallaron

### Detalles de fallos:

1. **Prueba fallida:** _______________
   - **Descripción:** _______________
   - **Error:** _______________
   - **Solución aplicada:** _______________

2. **Prueba fallida:** _______________
   - **Descripción:** _______________
   - **Error:** _______________
   - **Solución aplicada:** _______________

---

**Última actualización:** 2026-01-11
