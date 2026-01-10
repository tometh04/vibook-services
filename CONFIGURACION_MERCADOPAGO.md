# 🔧 CONFIGURACIÓN DE MERCADO PAGO - PASO A PASO

## Variables de Entorno Requeridas

Agrega esta variable en **Vercel Dashboard** → **Settings** → **Environment Variables**:

```bash
# Mercado Pago (obligatoria)
MERCADOPAGO_ACCESS_TOKEN=TEST-... # Token de acceso de Mercado Pago

# Ya deberías tener estas:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://vibookservicessaas.vercel.app
```

## Pasos de Configuración

### 1. Crear cuenta en Mercado Pago

1. Ve a https://www.mercadopago.com.ar
2. Crea una cuenta o inicia sesión
3. Ve a **Tu negocio** → **Desarrolladores** → **Tus integraciones**

### 2. Obtener Access Token

1. En **Tus integraciones**, selecciona tu aplicación o crea una nueva
2. Ve a la pestaña **Credenciales**
3. Copia el **Access Token** (de producción o de prueba)
   - **TEST**: Para desarrollo/testing (empieza con `TEST-`)
   - **PROD**: Para producción (empieza con `APP_USR-`)
4. Agrégalo como `MERCADOPAGO_ACCESS_TOKEN` en Vercel

### 3. Configurar Webhooks (IPN)

1. En **Tus integraciones**, ve a la pestaña **Webhooks**
2. Agrega una nueva URL de notificaciones:
   - **URL**: `https://vibookservicessaas.vercel.app/api/billing/webhook`
   - **Eventos a escuchar**:
     - ✅ `payment`
     - ✅ `preapproval`
3. Guarda la configuración

**Nota**: Mercado Pago enviará notificaciones tanto por GET como por POST a esta URL.

### 4. Ejecutar Migración SQL

1. Ve a tu proyecto de Supabase
2. Ve a **SQL Editor**
3. Ejecuta el contenido de `supabase/migrations/004_billing_system.sql`
4. Verifica que las tablas se crearon correctamente

### 5. Configurar Precios de Planes

Los planes ya están configurados en la migración con precios en ARS:
- **FREE**: $0 ARS (gratis)
- **STARTER**: $15.000 ARS/mes
- **PRO**: $50.000 ARS/mes
- **ENTERPRISE**: Precio custom

Si necesitas cambiar los precios, ejecuta:

```sql
UPDATE subscription_plans 
SET price_monthly = 20000, mp_preapproval_amount = 20000
WHERE name = 'STARTER';
```

### 6. Probar en Modo Test

1. Usa el Access Token de **TEST** (empieza con `TEST-`)
2. Ve a `/pricing` en tu app
3. Click en "Elegir Plan"
4. Serás redirigido a Mercado Pago Checkout
5. Usa las tarjetas de prueba:
   - **Aprobada**: `5031 7557 3453 0604` (Visa)
   - **Otros**: Ver https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/testing
6. Completa el checkout
7. Verifica que la suscripción se creó en `/settings/billing`

### 7. Flujo de Suscripción Recurrente

Mercado Pago usa **Preapproval** para suscripciones recurrentes:

1. **Primer pago**: Se crea una preferencia de pago inicial
2. **Autorización**: Cuando el usuario paga, Mercado Pago crea automáticamente un preapproval
3. **Pagos recurrentes**: Mercado Pago cobra automáticamente cada 30 días
4. **Notificaciones**: Recibirás webhooks cuando:
   - Se apruebe un pago
   - Se cree un preapproval
   - Se actualice el estado de un preapproval
   - Falle un pago

### 8. Activar Modo Producción

Cuando estés listo para producción:

1. Cambia a modo **PROD** en Mercado Pago Dashboard
2. Obtén el Access Token de producción
3. Actualiza `MERCADOPAGO_ACCESS_TOKEN` en Vercel con el token de producción
4. Verifica que los webhooks estén configurados para producción
5. Hace redeploy

---

## ✅ Verificación

Después de configurar todo:

1. ✅ `/pricing` muestra los planes en ARS
2. ✅ Click en "Elegir Plan" redirige a Mercado Pago Checkout
3. ✅ Después del checkout, `/settings/billing` muestra la suscripción
4. ✅ Los webhooks se reciben correctamente (ver logs en Vercel)
5. ✅ Los pagos recurrentes se procesan automáticamente

---

## 📚 Recursos Útiles

- **Documentación oficial**: https://www.mercadopago.com.ar/developers/es/docs
- **Suscripciones**: https://www.mercadopago.com.ar/developers/es/docs/subscriptions
- **Preapproval API**: https://www.mercadopago.com.ar/developers/es/reference/preapproval/_preapproval/post
- **Webhooks/IPN**: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/ipn

---

## 🔍 Troubleshooting

### Error: "Mercado Pago no está configurado"
- Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado en Vercel
- Hace redeploy después de agregar la variable

### Webhooks no se reciben
- Verifica que la URL del webhook sea accesible públicamente
- Mercado Pago hace una petición GET para verificar la URL
- Revisa los logs en Vercel para ver las peticiones recibidas

### Preapproval no se crea automáticamente
- El preapproval se crea después del primer pago aprobado
- Verifica que el webhook se esté procesando correctamente
- Revisa los logs en Vercel

---

**Nota**: El plan FREE no requiere configuración en Mercado Pago ya que es gratuito.
