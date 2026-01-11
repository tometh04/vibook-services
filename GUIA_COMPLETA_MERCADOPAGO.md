# 💳 Guía Completa: Configuración de Mercado Pago

Esta guía te ayudará a configurar Mercado Pago para el sistema de suscripciones de Vibook Gestión.

---

## 📋 Requisitos Previos

1. Cuenta en Mercado Pago (Argentina)
2. Acceso a la cuenta de desarrollador de Mercado Pago
3. Acceso a las variables de entorno de Vercel (o tu entorno de producción)
4. Acceso a Supabase Dashboard

---

## 🚀 Paso 1: Crear una Aplicación en Mercado Pago

### 1.1 Acceder al Panel de Desarrolladores

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Inicia sesión con tu cuenta de Mercado Pago
3. Haz clic en **"Tus integraciones"** o **"Aplicaciones"**

### 1.2 Crear Nueva Aplicación

1. Haz clic en **"Crear aplicación"** o **"Nueva aplicación"**
2. Completa los datos:
   - **Nombre:** `Vibook Gestión SaaS`
   - **Descripción:** `Sistema de gestión para agencias de viajes con suscripciones recurrentes`
   - **Categoría:** `Servicios`
   - **Sitio web:** Tu dominio (ej: `https://vibookservicessaas.vercel.app`)
   - **URL de redirección:** `https://vibookservicessaas.vercel.app/api/billing/callback`

3. Guarda la aplicación

### 1.3 Obtener Credenciales

Una vez creada la aplicación, verás dos tipos de credenciales:

#### **Credenciales de Producción:**
- **Access Token (Producción):** `APP_USR-XXXXX...` (Largo, empieza con APP_USR-)
- **Public Key (Producción):** `APP_USR-XXXXX...` (Opcional, para frontend)

#### **Credenciales de Prueba (Test):**
- **Access Token (Test):** `TEST-XXXXX...` (Empieza con TEST-)
- **Public Key (Test):** `TEST-XXXXX...` (Opcional)

**⚠️ IMPORTANTE:**
- Para desarrollo/testing: Usa las credenciales de **TEST**
- Para producción: Usa las credenciales de **Producción**

---

## 🔑 Paso 2: Configurar Variables de Entorno

### 2.1 Variables Necesarias

Necesitas configurar estas variables en Vercel (o tu entorno):

```bash
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXXXXXXXXX  # O TEST-XXXXX para desarrollo
```

### 2.2 Configurar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto `vibook-services` (o el nombre que tengas)
3. Ve a **Settings** → **Environment Variables**
4. Agrega la variable:
   - **Key:** `MERCADOPAGO_ACCESS_TOKEN`
   - **Value:** Tu Access Token (de Producción o Test)
   - **Environments:** Selecciona todas (Production, Preview, Development)
5. Haz clic en **Save**

### 2.3 Configurar en Desarrollo Local (Opcional)

Si quieres probar localmente, agrega al archivo `.env.local`:

```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-XXXXX...  # Usa TEST para desarrollo
```

**⚠️ NO subas `.env.local` a Git** (ya está en `.gitignore`)

---

## 🔔 Paso 3: Configurar Webhooks

Los webhooks permiten que Mercado Pago notifique a tu aplicación cuando hay cambios en pagos o suscripciones.

### 3.1 Obtener URL del Webhook

Tu URL de webhook será:
```
https://vibookservicessaas.vercel.app/api/billing/webhook
```

(Asegúrate de que tu dominio esté desplegado y funcionando)

### 3.2 Configurar Webhook en Mercado Pago

1. En el panel de Mercado Pago, ve a tu aplicación
2. Busca la sección **"Webhooks"** o **"Notificaciones IPN"**
3. Agrega la URL del webhook:
   ```
   https://vibookservicessaas.vercel.app/api/billing/webhook
   ```
4. Selecciona los eventos a recibir:
   - ✅ **Pagos (payments)**
   - ✅ **Suscripciones (preapproval)**
5. Guarda la configuración

### 3.3 Verificar Webhook (Opcional)

Mercado Pago puede enviar una solicitud GET de verificación. Tu endpoint ya está preparado para recibirla.

---

## 💰 Paso 4: Configurar Planes en la Base de Datos

Los planes ya están definidos en la migración `004_billing_system.sql`, pero puedes verificar/ajustar los precios:

### 4.1 Verificar Planes en Supabase

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Table Editor** → `subscription_plans`
4. Verifica que existan estos planes:
   - **FREE:** $0 ARS
   - **STARTER:** $15.000 ARS/mes
   - **PRO:** $50.000 ARS/mes
   - **ENTERPRISE:** Custom (precio 0, se configura manualmente)

### 4.2 Ajustar Precios (Opcional)

Si necesitas cambiar los precios:

1. En Supabase, edita la tabla `subscription_plans`
2. Actualiza el campo `price_monthly` para cada plan
3. También actualiza `mp_preapproval_amount` (debe ser igual a `price_monthly`)

---

## 🧪 Paso 5: Probar en Modo Test (Recomendado)

### 5.1 Usar Credenciales de Test

1. En Vercel, agrega la variable de entorno con el Access Token de **TEST**:
   ```
   MERCADOPAGO_ACCESS_TOKEN=TEST-XXXXX...
   ```

2. Reinicia el deployment en Vercel

### 5.2 Tarjetas de Prueba

Mercado Pago proporciona tarjetas de prueba para testing:

**Tarjeta Aprobada:**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Fecha: Cualquier fecha futura
- Nombre: Cualquier nombre

**Tarjeta Rechazada:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Fecha: Cualquier fecha futura

**Tarjeta Pendiente:**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Fecha: Cualquier fecha futura

### 5.3 Probar Flujo Completo

1. Crea una cuenta de prueba en tu aplicación
2. Ve a `/pricing`
3. Selecciona un plan (Starter o Pro)
4. Haz clic en "Upgrade"
5. Completa el pago con una tarjeta de prueba
6. Verifica que la suscripción se actualice en `/settings/billing`

---

## 🚀 Paso 6: Activar en Producción

### 6.1 Cambiar a Credenciales de Producción

1. En Vercel, edita la variable `MERCADOPAGO_ACCESS_TOKEN`
2. Reemplaza el token de TEST con el token de **PRODUCCIÓN**
3. Guarda y reinicia el deployment

### 6.2 Verificar Webhook en Producción

1. Asegúrate de que el webhook apunte a tu dominio de producción
2. Prueba con un pago real pequeño para verificar que funciona

### 6.3 Monitoreo

1. En Mercado Pago, ve a **"Tus ventas"** para ver los pagos
2. En tu aplicación, ve a `/settings/billing` para ver las suscripciones
3. En Supabase, revisa la tabla `billing_events` para ver eventos de billing

---

## 📝 Información que Necesitas Compartir (Para Debug)

Si algo no funciona, puedes compartir esta información (sin tokens completos):

1. **Tipo de credenciales:** Test o Producción
2. **Primeros 5 caracteres del token:** `APP_USR-...` o `TEST-...`
3. **URL del webhook configurado:** `https://...`
4. **Dominio de producción:** `https://...`
5. **Error específico:** Mensaje de error completo
6. **Logs de Vercel:** Errores en `/api/billing/webhook` o `/api/billing/checkout`

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Mercado Pago creada
- [ ] Aplicación creada en Mercado Pago Developers
- [ ] Access Token obtenido (Test y/o Producción)
- [ ] Variable `MERCADOPAGO_ACCESS_TOKEN` configurada en Vercel
- [ ] Webhook configurado en Mercado Pago
- [ ] Planes verificados en Supabase
- [ ] Prueba exitosa con tarjetas de test
- [ ] Credenciales de producción configuradas (para producción)

---

## 🆘 Problemas Comunes

### Error: "Mercado Pago no está configurado"

**Causa:** La variable `MERCADOPAGO_ACCESS_TOKEN` no está configurada o es inválida.

**Solución:**
1. Verifica que la variable esté en Vercel
2. Verifica que el token sea correcto (debe empezar con `APP_USR-` o `TEST-`)
3. Reinicia el deployment en Vercel

### Error: "Webhook no recibido"

**Causa:** El webhook no está configurado o la URL es incorrecta.

**Solución:**
1. Verifica la URL del webhook en Mercado Pago
2. Asegúrate de que tu aplicación esté desplegada
3. Verifica los logs en Vercel para ver si llegan las notificaciones

### Error: "Payment not found"

**Causa:** El pago no se procesó correctamente o el webhook no se recibió.

**Solución:**
1. Verifica en Mercado Pago si el pago se procesó
2. Revisa los logs en Vercel
3. Verifica que el webhook esté configurado correctamente

---

## 📚 Documentación Adicional

- **Mercado Pago Developers:** https://www.mercadopago.com.ar/developers/
- **Documentación de Preapproval:** https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-configuration
- **Webhooks:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

---

**Última actualización:** 2026-01-10
