# ⚙️ Configuración Rápida de Mercado Pago en Vercel

## 🔑 Credenciales Obtenidas

✅ **Access Token TEST:** `TEST-3454575128482507-011109-...`
✅ **Access Token PRODUCCIÓN:** `APP_USR-3454575128482507-011109-...`

---

## 📝 Paso 1: Configurar en Vercel (TEST)

### 1.1 Ir a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto **vibook-services** (o el nombre que tengas)

### 1.2 Agregar Variable de Entorno

1. Ve a **Settings** → **Environment Variables**
2. Haz clic en **Add New**
3. Completa:
   - **Key:** `MERCADOPAGO_ACCESS_TOKEN`
   - **Value:** `TEST-3454575128482507-011109-8abbc6cff088f53a84522b49aea1ae9d-34941995`
   - **Environments:** 
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
4. Haz clic en **Save**

### 1.3 Redeploy

1. Ve a **Deployments**
2. Haz clic en el menú (⋯) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine el deployment

---

## ✅ Paso 2: Verificar que Funciona

### 2.1 Probar Checkout

1. Ve a tu app: `https://vibookservicessaas.vercel.app/pricing`
2. Haz clic en **"Upgrade"** en cualquier plan (Starter o Pro)
3. Deberías ser redirigido a Mercado Pago Checkout

### 2.2 Probar con Tarjeta de Test

1. En el checkout de Mercado Pago, usa:
   - **Tarjeta:** `5031 7557 3453 0604`
   - **CVV:** `123`
   - **Fecha:** Cualquier fecha futura (ej: 12/25)
   - **Nombre:** Cualquier nombre
2. Completa el pago
3. Deberías ser redirigido a `/settings/billing?status=success`

### 2.3 Verificar Suscripción

1. Ve a `/settings/billing`
2. Deberías ver tu suscripción activa
3. El plan debería estar actualizado

---

## 🚀 Paso 3: Activar Producción (Cuando Estés Listo)

### 3.1 Cambiar a Token de Producción

1. En Vercel, ve a **Settings** → **Environment Variables**
2. Edita `MERCADOPAGO_ACCESS_TOKEN`
3. Cambia el valor a: `APP_USR-3454575128482507-011109-643ac413bf8f233732d77de2f15d862c-34941995`
4. Guarda
5. **Redeploy** (importante)

### 3.2 Verificar Webhook en Producción

1. En Mercado Pago Dashboard, verifica que el webhook esté configurado:
   - URL: `https://vibookservicessaas.vercel.app/api/billing/webhook`
   - Eventos: `payment` y `preapproval`

---

## 🔔 Configurar Webhook (Importante)

Si aún no lo configuraste:

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación
3. Ve a **Webhooks** o **Notificaciones IPN**
4. Agrega URL: `https://vibookservicessaas.vercel.app/api/billing/webhook`
5. Selecciona eventos:
   - ✅ `payment`
   - ✅ `preapproval`
6. Guarda

---

## 📊 Información Adicional (No Necesaria para Configuración)

- **Public Key:** `APP_USR-b1c32ffd-1ef9-45e7-b497-eb47ea3c5205` (no se usa en nuestra implementación actual)
- **Client ID:** `3454575128482507` (no se usa)
- **Client Secret:** (no se usa)
- **User ID:** `34941995` (no se usa)
- **Número de Aplicación:** `3454575128482507` (no se usa)

**Nota:** Solo necesitamos el **Access Token**. Los demás datos no son necesarios para nuestra implementación.

---

## ✅ Checklist

- [ ] Variable `MERCADOPAGO_ACCESS_TOKEN` agregada en Vercel (con token TEST)
- [ ] Redeploy realizado en Vercel
- [ ] Probado checkout con tarjeta de test
- [ ] Verificado que la suscripción se crea correctamente
- [ ] Webhook configurado en Mercado Pago
- [ ] (Opcional) Cambiado a token de producción cuando estés listo

---

## 🆘 Si Algo No Funciona

1. **Verifica los logs en Vercel:**
   - Ve a **Deployments** → Selecciona deployment → **Functions** → `/api/billing/checkout` o `/api/billing/webhook`
   - Revisa los logs para ver errores

2. **Verifica la variable de entorno:**
   - En Vercel, Settings → Environment Variables
   - Asegúrate de que `MERCADOPAGO_ACCESS_TOKEN` esté configurada
   - El valor debe empezar con `TEST-` o `APP_USR-`

3. **Verifica el webhook:**
   - En Mercado Pago, revisa que la URL del webhook sea correcta
   - La URL debe ser pública (no localhost)

---

**Última actualización:** 2026-01-10
