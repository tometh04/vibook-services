# ✅ SOLUCIÓN: Error 405 en Configuración de IPN

## 🔍 Problema Identificado

En la configuración de IPN de Mercado Pago:
- ❌ **URL configurada:** `https://vibookservicessaas.vercel.app`
- ❌ **Error:** `405 - Method Not Allowed`
- ❌ **Causa:** Mercado Pago está probando la URL base, no el endpoint del webhook

---

## ✅ Solución

### Paso 1: Cambiar la URL del IPN

En la configuración de IPN de Mercado Pago:

1. **Cambia la URL de:**
   ```
   https://vibookservicessaas.vercel.app
   ```

2. **A:**
   ```
   https://vibookservicessaas.vercel.app/api/billing/webhook
   ```

3. Haz clic en **"Probar"** nuevamente
4. Debería pasar la prueba correctamente
5. Haz clic en **"Guardar"**

---

## 🔍 Verificación

### ¿Por qué la URL base falla?

- La URL base (`/`) no acepta POST requests
- Mercado Pago envía notificaciones IPN mediante **POST** a la URL que configures
- Nuestro endpoint `/api/billing/webhook` acepta tanto GET como POST

### Verificar que el Webhook Funciona

Después de cambiar la URL, puedes verificar manualmente:

```bash
# Test GET (Mercado Pago usa GET para verificar)
curl https://vibookservicessaas.vercel.app/api/billing/webhook?topic=payment&id=123456

# Test POST (Mercado Pago usa POST para notificaciones)
curl -X POST https://vibookservicessaas.vercel.app/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456"}}'
```

Ambos deberían responder con `{"received": true}` o similar.

---

## 📋 Configuración Correcta del IPN

1. **URL del sitio web en producción:**
   ```
   https://vibookservicessaas.vercel.app/api/billing/webhook
   ```

2. **Eventos a escuchar:**
   - ✅ `payment` (Pagos)
   - ✅ `preapproval` (Suscripciones)

3. Haz clic en **"Guardar"**

---

## ✅ Después de Configurar Correctamente

1. La prueba debería pasar (sin error 405)
2. Mercado Pago enviará notificaciones a tu webhook
3. Los pagos y suscripciones se actualizarán automáticamente

---

**Última actualización:** 2026-01-11
