# 🚀 Configuración de Mercado Pago en PRODUCCIÓN

## ✅ Credenciales de Producción Configuradas

### Variables en Vercel:

1. **MERCADOPAGO_ACCESS_TOKEN** (Producción)
   ```
   APP_USR-3454575128482507-011109-643ac413bf8f233732d77de2f15d862c-34941995
   ```

2. **MERCADOPAGO_WEBHOOK_SECRET** (Producción)
   - Configurado en Vercel (valor oculto por seguridad)

### Credenciales Adicionales (Referencia):

- **Public Key:** `APP_USR-b1c32ffd-1ef9-45e7-b497-eb47ea3c5205`
- **Client ID:** `3454575128482507`
- **Client Secret:** `N1NknUXqOkYlil9VAe1iKtgzo7sj4Bmw` ⚠️ **NO compartir públicamente**

**Nota:** El Client Secret es información sensible. Solo úsalo si necesitas implementar OAuth (no necesario para nuestra implementación actual).

---

## ⚠️ IMPORTANTE: Diferencias entre Sandbox y Producción

### Sandbox (TEST):
- ✅ Pagos ficticios (no se cobra dinero real)
- ✅ Tarjetas de prueba
- ✅ Ideal para desarrollo y testing
- ❌ Puede tener limitaciones en funcionalidades

### Producción:
- ⚠️ **Pagos REALES** (se cobra dinero real)
- ⚠️ Tarjetas reales de clientes
- ⚠️ Transacciones reales
- ✅ Funcionalidad completa

---

## 🔄 Pasos para Activar Producción

### 1. Verificar Variables en Vercel

1. Ve a Vercel → Tu proyecto → **Settings** → **Environment Variables**
2. Verifica que estas variables estén configuradas:
   - ✅ `MERCADOPAGO_ACCESS_TOKEN` = `APP_USR-3454575128482507-011109-...`
   - ✅ `MERCADOPAGO_WEBHOOK_SECRET` = (tu secret de producción)

### 2. Hacer Redeploy

**IMPORTANTE:** Después de cambiar las variables, debes hacer redeploy:

1. Ve a Vercel → Tu proyecto → **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **"Redeploy"**
4. O simplemente haz un commit nuevo y se redeployará automáticamente

### 3. Verificar Webhook en Producción

1. Ve a Mercado Pago Developers: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación
3. Ve a **NOTIFICACIONES** → **Webhooks**
4. Verifica que la URL esté configurada:
   ```
   https://vibookservicessaas.vercel.app/api/billing/webhook
   ```
5. Haz clic en **"Probar"** para verificar que funciona

### 4. Configurar Webhook Secret (Opcional pero Recomendado)

Si configuraste `MERCADOPAGO_WEBHOOK_SECRET` en Vercel:

1. En Mercado Pago → Webhooks → Configuración
2. Busca **"Webhook Secret"** o **"Clave secreta"**
3. Copia el secret que te proporciona Mercado Pago
4. Verifica que coincida con el que configuraste en Vercel

---

## ✅ Checklist de Producción

- [ ] `MERCADOPAGO_ACCESS_TOKEN` configurado en Vercel (producción)
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` configurado en Vercel (si aplica)
- [ ] Redeploy realizado después de configurar variables
- [ ] Webhook configurado en Mercado Pago (producción)
- [ ] Webhook probado y funcionando
- [ ] URLs de redirección configuradas en Mercado Pago
- [ ] Aplicación en estado "Activo" en Mercado Pago

---

## 🧪 Probar en Producción

### ⚠️ ADVERTENCIA

En producción, los pagos son **REALES**. Asegúrate de:

1. **Probar con montos pequeños** primero
2. **Verificar que el webhook funcione** antes de procesar pagos reales
3. **Tener un plan de rollback** si algo sale mal

### Pasos para Probar:

1. Ve a `/pricing` en tu aplicación
2. Selecciona un plan
3. Completa el checkout con una tarjeta REAL
4. Verifica que:
   - El pago se procese correctamente
   - El webhook reciba la notificación
   - La suscripción se cree/actualice en la base de datos
   - El usuario sea redirigido correctamente

---

## 🔍 Verificar que Está en Producción

### En el Código:

El código detecta automáticamente si estás en producción o test basándose en el Access Token:

- **TEST:** Empieza con `TEST-`
- **PRODUCCIÓN:** Empieza con `APP_USR-`

### En Mercado Pago Checkout:

- **Sandbox:** Muestra "Sandbox de Mercado Pago" y "Los pagos que realices aquí son ficticios"
- **Producción:** NO muestra mensajes de sandbox, es el checkout real

---

## 🆘 Si Algo Sale Mal

### Volver a Sandbox:

1. Cambia `MERCADOPAGO_ACCESS_TOKEN` en Vercel a tu token de TEST
2. Haz redeploy
3. Listo, vuelves a sandbox

### Verificar Logs:

1. Ve a Vercel → Deployments → Último deployment → Functions
2. Revisa los logs de:
   - `/api/billing/checkout`
   - `/api/billing/webhook`

### Contactar Soporte:

Si hay problemas con pagos reales:
- Soporte Mercado Pago: https://www.mercadopago.com.ar/developers/support

---

## 📋 Información de Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** compartas el Client Secret públicamente
- **NUNCA** commitees credenciales al repositorio
- **SIEMPRE** usa variables de entorno para credenciales
- **SIEMPRE** verifica que las URLs sean HTTPS en producción

---

**Última actualización:** 2026-01-11
