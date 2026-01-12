# 📊 Reporte de Pruebas del Sistema de Billing

**Fecha:** 2026-01-11  
**Dominio probado:** `app.vibook.ai`  
**Tester:** Auto (AI Assistant)

---

## ✅ Pruebas Completadas

### 1. API de Planes ✅

**Endpoint:** `GET /api/billing/plans`

**Resultado:** ✅ **PASÓ**

**Detalles:**
- La API retorna correctamente los 3 planes disponibles:
  - **FREE**: $0 ARS/mes, 1 usuario, 10 operaciones/mes, sin features premium
  - **STARTER**: $15,000 ARS/mes, 5 usuarios, 100 operaciones/mes, Trello + Reports + WhatsApp
  - **PRO**: $50,000 ARS/mes, usuarios ilimitados, operaciones ilimitadas, todas las features

**Respuesta JSON:**
```json
{
  "plans": [
    {
      "id": "24d99056-ce5b-466b-ab63-a99f3ca25c5b",
      "name": "FREE",
      "display_name": "Free",
      "price_monthly": 0,
      "features": {
        "emilia": false,
        "trello": false,
        "reports": false,
        "manychat": false,
        "whatsapp": false
      }
    },
    {
      "id": "8e2dac39-9a16-46fc-8fdc-51744ad4503b",
      "name": "STARTER",
      "display_name": "Starter",
      "price_monthly": 15000,
      "features": {
        "trello": true,
        "reports": true,
        "whatsapp": true
      }
    },
    {
      "id": "5b142531-9c84-4806-a6fd-7983898e1ffe",
      "name": "PRO",
      "display_name": "Pro",
      "price_monthly": 50000,
      "features": {
        "emilia": true,
        "trello": true,
        "reports": true,
        "manychat": true,
        "whatsapp": true
      }
    }
  ]
}
```

---

### 2. Webhook de Mercado Pago ✅

**Endpoint:** `GET /api/billing/webhook?topic=payment&id=123456`

**Resultado:** ✅ **PASÓ**

**Detalles:**
- El webhook responde correctamente a las pruebas de Mercado Pago
- Retorna el mensaje esperado: `{"received": true, "message": "Webhook configurado correctamente"}`

**Respuesta:**
```json
{
  "received": true,
  "message": "Webhook configurado correctamente"
}
```

---

### 3. Dominio y SSL ✅

**URL:** `https://app.vibook.ai`

**Resultado:** ✅ **PASÓ**

**Detalles:**
- El dominio carga correctamente
- El certificado SSL está activo (HTTPS funcionando)
- La página de login se muestra correctamente
- No hay errores de red en la consola

---

## ⏳ Pruebas Pendientes (Requieren Login)

Las siguientes pruebas requieren estar autenticado. Necesitas hacerlas manualmente:

### 4. Página de Pricing

**Ruta:** `/pricing`

**Pasos para probar:**
1. Hacer login en `https://app.vibook.ai/login`
2. Ir a `/pricing`
3. Verificar que se muestran los 3 planes
4. Verificar que los precios se muestran correctamente en ARS
5. Verificar que las features de cada plan se muestran correctamente
6. Verificar que el plan actual está marcado (si hay suscripción)

**Checklist:**
- [ ] La página carga correctamente
- [ ] Se muestran todos los planes
- [ ] Los precios están en formato ARS ($15,000, $50,000)
- [ ] Las features se muestran con checkmarks/X correctamente
- [ ] El botón "Elegir Plan" está visible y funciona

---

### 5. Checkout Flow

**Ruta:** `/pricing` → Click en "Elegir Plan"

**Pasos para probar:**
1. En `/pricing`, hacer clic en "Elegir Plan" para STARTER o PRO
2. Verificar que se redirige a Mercado Pago
3. Verificar que la URL de Mercado Pago es correcta
4. Verificar que los campos de tarjeta se pueden completar (sin error 403)
5. **NO completar el pago** (solo verificar que los campos funcionan)

**Checklist:**
- [ ] Al hacer clic en "Elegir Plan", se redirige a Mercado Pago
- [ ] La URL de Mercado Pago es correcta (sandbox o producción)
- [ ] Los campos de tarjeta se pueden completar (sin error 403)
- [ ] No hay errores en la consola del navegador
- [ ] El `external_reference` contiene la información correcta

**Nota:** Si ves error 403 en los campos de tarjeta, verifica que en Mercado Pago → Información general → "URL del sitio en producción" sea `https://app.vibook.ai`

---

### 6. Página de Billing Settings

**Ruta:** `/settings/billing`

**Pasos para probar:**
1. Hacer login
2. Ir a `/settings/billing`
3. Verificar que se muestra la información de la suscripción

**Checklist:**
- [ ] La página carga correctamente
- [ ] Muestra el plan actual
- [ ] Muestra el estado de la suscripción (ACTIVE, TRIAL, etc.)
- [ ] Muestra las métricas de uso (usuarios, operaciones)
- [ ] Muestra el progreso de uso con barras
- [ ] Muestra la fecha del próximo pago
- [ ] Los botones "Cambiar Plan", "Pausar", "Cancelar" están visibles

---

### 7. Redirecciones Post-Pago

**Pasos para probar:**
1. Completar un pago de prueba en Mercado Pago (usando tarjeta de prueba)
2. Verificar que después del pago exitoso, redirige a `/settings/billing?status=success`
3. Verificar que después de un pago fallido, redirige a `/pricing?status=failure`
4. Verificar que después de un pago pendiente, redirige a `/settings/billing?status=pending`

**Checklist:**
- [ ] Redirección exitosa → `/settings/billing?status=success`
- [ ] Redirección fallida → `/pricing?status=failure`
- [ ] Redirección pendiente → `/settings/billing?status=pending`
- [ ] Las URLs usan el dominio correcto (`app.vibook.ai`)

---

### 8. PaywallGate Component

**Páginas a probar:**
- `/sales/leads` (Trello)
- `/sales/crm-manychat` (Manychat)
- `/emilia` (Emilia)
- `/messages` (WhatsApp)
- `/reports` (Reports)

**Pasos para probar:**
1. Hacer login con una cuenta que tenga plan FREE
2. Intentar acceder a cada página protegida
3. Verificar que el contenido está bloqueado con el mensaje de upgrade
4. Verificar que el botón "Ver Planes" redirige a `/pricing`
5. Hacer upgrade a un plan superior
6. Verificar que después del upgrade, el contenido se desbloquea

**Checklist:**
- [ ] `/sales/leads` está bloqueado para plan FREE
- [ ] `/sales/crm-manychat` está bloqueado para plan FREE/STARTER
- [ ] `/emilia` está bloqueado para plan FREE/STARTER
- [ ] `/messages` está bloqueado para plan FREE
- [ ] `/reports` está bloqueado para plan FREE
- [ ] El mensaje de upgrade es claro
- [ ] El botón "Ver Planes" funciona correctamente

---

### 9. Límites de Suscripción

**Pasos para probar:**
1. Hacer login con una cuenta que tenga plan FREE (10 operaciones/mes)
2. Crear 10 operaciones
3. Intentar crear una operación más
4. Verificar que se muestra un error 403 con mensaje claro
5. Verificar que el mensaje indica que se alcanzó el límite

**Checklist:**
- [ ] El límite de operaciones se verifica correctamente
- [ ] Se retorna error 403 cuando se alcanza el límite
- [ ] El mensaje de error es claro y útil
- [ ] El mensaje indica cómo actualizar el plan

---

### 10. Gestión de Suscripciones

**Endpoint:** `POST /api/billing/portal`

**Pasos para probar:**
1. Hacer login con una cuenta que tenga suscripción activa
2. Ir a `/settings/billing`
3. Hacer clic en "Pausar Suscripción"
4. Verificar que la suscripción se pausa correctamente
5. Hacer clic en "Cancelar Suscripción"
6. Verificar que la suscripción se cancela correctamente

**Checklist:**
- [ ] "Pausar Suscripción" funciona correctamente
- [ ] "Cancelar Suscripción" funciona correctamente
- [ ] El estado se actualiza en la base de datos
- [ ] Se registran eventos en `billing_events`

---

## 🔍 Verificaciones Adicionales

### Variables de Entorno

Verifica en Vercel que estas variables estén configuradas:

- [ ] `NEXT_PUBLIC_APP_URL` = `https://app.vibook.ai`
- [ ] `MERCADOPAGO_ACCESS_TOKEN` está configurado
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` está configurado (opcional)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` está configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurado

---

### Configuración de Mercado Pago

Verifica en Mercado Pago:

- [ ] **Información general** → "URL del sitio en producción" = `https://app.vibook.ai`
- [ ] **Configuraciones avanzadas** → URLs de redirección incluyen:
  - `https://app.vibook.ai/settings/billing?status=success`
  - `https://app.vibook.ai/pricing?status=failure`
  - `https://app.vibook.ai/settings/billing?status=pending`
- [ ] **NOTIFICACIONES** → Webhooks → URL de producción = `https://app.vibook.ai/api/billing/webhook`
- [ ] El webhook pasa la prueba de simulación

---

### Configuración de Supabase

Verifica en Supabase:

- [ ] **Authentication** → **URL Configuration** → Site URL = `https://app.vibook.ai`
- [ ] **Authentication** → **URL Configuration** → Redirect URLs incluyen:
  - `https://app.vibook.ai/auth/callback`
  - `https://app.vibook.ai/auth/verify-email`
  - `https://app.vibook.ai/auth/verified`
  - `https://app.vibook.ai/auth/reset-password`
  - `https://app.vibook.ai/dashboard`
  - `https://app.vibook.ai/onboarding`
  - `https://app.vibook.ai/login`
  - `https://app.vibook.ai/signup`

---

## 📝 Resumen

### ✅ Pruebas Automatizadas Completadas:
1. ✅ API de Planes - **PASÓ**
2. ✅ Webhook de Mercado Pago - **PASÓ**
3. ✅ Dominio y SSL - **PASÓ**

### ⏳ Pruebas Manuales Pendientes:
1. ⏳ Página de Pricing
2. ⏳ Checkout Flow
3. ⏳ Página de Billing Settings
4. ⏳ Redirecciones Post-Pago
5. ⏳ PaywallGate Component
6. ⏳ Límites de Suscripción
7. ⏳ Gestión de Suscripciones

---

## 🎯 Próximos Pasos

1. **Hacer login** en `https://app.vibook.ai/login`
2. **Probar la página de pricing** (`/pricing`)
3. **Probar el checkout** (hacer clic en "Elegir Plan" y verificar que redirige a Mercado Pago)
4. **Verificar los campos de tarjeta** (que no haya error 403)
5. **Probar la página de billing** (`/settings/billing`)
6. **Probar el paywall** (acceder a páginas protegidas con plan FREE)
7. **Probar los límites** (crear operaciones hasta alcanzar el límite)

---

## 🐛 Problemas Conocidos

Ninguno detectado hasta ahora. Todas las pruebas automatizadas pasaron correctamente.

---

**Última actualización:** 2026-01-11
