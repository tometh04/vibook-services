# 🔄 Migrar de IPN a Webhooks de Mercado Pago

## ⚠️ Importante

Según la [documentación oficial de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications):
- ❌ **IPN será descontinuado pronto**
- ✅ **Webhooks son la forma recomendada** de recibir notificaciones
- ✅ Webhooks ofrecen mayor seguridad mediante validación de firma (`x-signature`)
- ✅ Webhooks son más rápidos e instantáneos

---

## ✅ Solución Implementada

El webhook ya está actualizado para soportar **ambos formatos**:
- ✅ **Webhooks (POST con body JSON y header x-signature)** - Recomendado
- ✅ **IPN (GET con parámetros topic e id)** - Legacy, mantenido por compatibilidad

---

## 📋 Configurar Webhooks en Mercado Pago

### Paso 1: Ir a la Configuración de Webhooks

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación **"Vibook Services"**
3. En el menú izquierdo, ve a **"NOTIFICACIONES"** → **"Webhooks"** (NO IPN)
4. Haz clic en **"Crear webhook"** o **"Configurar webhook"**

### Paso 2: Configurar la URL del Webhook

1. **URL del webhook:**
   ```
   https://vibookservicessaas.vercel.app/api/billing/webhook
   ```

2. Haz clic en **"Probar"** o **"Test"**

3. Debería pasar la prueba correctamente

### Paso 3: Seleccionar Eventos

Selecciona los eventos que quieres recibir:

- ✅ **Pagos (payments)** - `payment`
- ✅ **Planes y suscripciones** - `subscription_preapproval`
  - Esto incluye:
    - `subscription_preapproval` - Vinculación de suscripción
    - `subscription_authorized_payment` - Pago recurrente de suscripción

### Paso 4: Guardar

1. Haz clic en **"Guardar"** o **"Crear webhook"**
2. ✅ Listo! Ahora recibirás notificaciones vía Webhooks

---

## 🔐 Opcional: Configurar Webhook Secret (Recomendado)

Para mayor seguridad, puedes configurar un secret para validar las firmas:

1. En la configuración del webhook, busca **"Webhook Secret"** o **"Clave secreta"**
2. Genera un secret aleatorio (o usa el que te proporciona Mercado Pago)
3. Agrega a Vercel como variable de entorno:
   ```
   MERCADOPAGO_WEBHOOK_SECRET=tu_secret_aqui
   ```
4. El webhook validará automáticamente las firmas

**Nota:** Si no configuras el secret, el webhook funcionará pero sin validación de firma (menos seguro).

---

## 🔄 Diferencias entre IPN y Webhooks

| Característica | IPN | Webhooks |
|----------------|-----|----------|
| **Método HTTP** | GET con query params | POST con body JSON |
| **Validación** | No disponible | Header `x-signature` |
| **Velocidad** | Puede tardar minutos | Instantáneo |
| **Estado** | ⚠️ Será descontinuado | ✅ Recomendado |
| **Formato** | `?topic=payment&id=123` | `{"type":"payment","data":{"id":"123"}}` |

---

## ✅ Verificación

Después de configurar Webhooks:

1. **Prueba el webhook** haciendo clic en "Probar" en Mercado Pago
2. **Revisa los logs de Vercel** para ver las notificaciones recibidas
3. **Haz un pago de prueba** y verifica que se reciba la notificación

---

## 🆘 Si el Webhook Sigue Fallando

### Verificar Logs de Vercel

1. Ve a Vercel → **Deployments** → Último deployment
2. Ve a **Functions** → `/api/billing/webhook`
3. Revisa los logs para ver errores

### Verificar Variables de Entorno

1. En Vercel, Settings → Environment Variables
2. Verifica que esté configurado:
   - ✅ `MERCADOPAGO_ACCESS_TOKEN`
   - ✅ (Opcional) `MERCADOPAGO_WEBHOOK_SECRET`

### Probar Manualmente

```bash
# Test GET (para IPN legacy)
curl "https://vibookservicessaas.vercel.app/api/billing/webhook?topic=payment&id=123456"

# Test POST (para Webhooks)
curl -X POST https://vibookservicessaas.vercel.app/api/billing/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: test" \
  -d '{"type":"payment","data":{"id":"123456"}}'
```

Ambos deberían retornar `{"received": true}`

---

**Última actualización:** 2026-01-11
