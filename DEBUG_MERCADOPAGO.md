# 🐛 Debug: Problemas con Mercado Pago Checkout

## Problema Reportado
"No funciona, ni siquiera me deja poner la tarjeta en el modo sandbox"

---

## 🔍 Diagnóstico Paso a Paso

### 1. Verificar Logs en Vercel

1. Ve a Vercel Dashboard → Tu proyecto → **Deployments**
2. Selecciona el último deployment
3. Ve a **Functions** → `/api/billing/checkout`
4. Intenta hacer un checkout nuevamente
5. Revisa los logs para ver errores

**Errores comunes:**
- `Mercado Pago no está configurado` → Variable de entorno no configurada
- `Invalid access token` → Token incorrecto
- `Invalid URL` → URL de retorno inválida

### 2. Verificar Variable de Entorno

1. En Vercel: **Settings** → **Environment Variables**
2. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurada
3. Verifica que el valor sea correcto (debe empezar con `TEST-` para sandbox)
4. **IMPORTANTE:** Después de agregar/modificar, hacer **Redeploy**

### 3. Verificar URL de la Aplicación

1. En Vercel: **Settings** → **Environment Variables**
2. Verifica que `NEXT_PUBLIC_APP_URL` esté configurada:
   ```
   https://vibookservicessaas.vercel.app
   ```
3. Si no existe, agrégala y haz redeploy

### 4. Verificar Configuración en Mercado Pago

En https://www.mercadopago.com.ar/developers/:

1. Selecciona tu aplicación
2. Ve a **"Configuración"** o **"Credenciales"**
3. Verifica que el **"Redirect URI"** o **"URL de retorno"** esté configurada:
   ```
   https://vibookservicessaas.vercel.app/api/billing/callback
   ```
   (O puede estar vacío, no es crítico para preferencias)

4. Verifica que estés usando credenciales de **TEST** (no producción)

### 5. Probar API de Checkout Directamente

Puedes probar el endpoint directamente:

1. Abre la consola del navegador (F12)
2. Ve a `/pricing`
3. Abre la pestaña **Network**
4. Haz clic en "Upgrade"
5. Busca la llamada a `/api/billing/checkout`
6. Revisa la respuesta:
   - Debe tener `preferenceId` e `initPoint`
   - Si hay error, verás el mensaje

### 6. Verificar Código del Checkout

El checkout debería:
1. Crear una preferencia de pago
2. Devolver `initPoint` (URL de checkout)
3. Redirigir al usuario a esa URL

**Si el `initPoint` es `null` o `undefined`, hay un error.**

---

## 🛠️ Soluciones Comunes

### Error: "Mercado Pago no está configurado"

**Causa:** Variable de entorno no configurada o incorrecta

**Solución:**
1. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté en Vercel
2. Verifica que el token sea correcto (debe empezar con `TEST-` para sandbox)
3. Haz **Redeploy** completo

### Error: "Invalid access token"

**Causa:** Token incorrecto o expirado

**Solución:**
1. Ve a Mercado Pago Developers
2. Regenera el Access Token de TEST
3. Actualiza la variable en Vercel
4. Haz redeploy

### Error: La página de checkout no carga

**Causa:** URL de checkout incorrecta o preferencia no creada

**Solución:**
1. Revisa los logs en Vercel para ver si la preferencia se crea
2. Verifica que `initPoint` no sea null en la respuesta
3. Verifica que la URL sea correcta (debe ser de Mercado Pago)

### Error: "Invalid URL" o "Invalid redirect URL"

**Causa:** URL de retorno inválida

**Solución:**
1. Verifica que `NEXT_PUBLIC_APP_URL` esté configurada
2. La URL debe ser HTTPS (no HTTP)
3. La URL no debe terminar en `/`

---

## 🧪 Test Rápido

Ejecuta este test en la consola del navegador (en `/pricing`):

```javascript
// Test del endpoint de checkout
fetch('/api/billing/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ planId: 'TU_PLAN_ID' })
})
.then(r => r.json())
.then(data => {
  console.log('Response:', data);
  if (data.error) {
    console.error('Error:', data.error);
  } else if (data.initPoint) {
    console.log('✅ Checkout OK, URL:', data.initPoint);
  } else {
    console.error('❌ No se recibió initPoint');
  }
});
```

---

## 📋 Checklist de Debug

- [ ] Variable `MERCADOPAGO_ACCESS_TOKEN` configurada en Vercel
- [ ] Variable `NEXT_PUBLIC_APP_URL` configurada en Vercel
- [ ] Redeploy realizado después de agregar variables
- [ ] Logs en Vercel revisados (sin errores)
- [ ] Prueba directa del endpoint `/api/billing/checkout`
- [ ] La respuesta tiene `initPoint` (no null)
- [ ] Credenciales de TEST (no producción) en sandbox

---

## 🔗 URLs Importantes

- **Checkout API:** `/api/billing/checkout`
- **Webhook:** `/api/billing/webhook`
- **Billing Settings:** `/settings/billing`
- **Pricing:** `/pricing`

---

## 📞 Información para Debug

Si el problema persiste, comparte:

1. **Error específico** que ves (mensaje completo)
2. **Logs de Vercel** (del endpoint `/api/billing/checkout`)
3. **Respuesta del endpoint** (consola del navegador, pestaña Network)
4. **Screenshot** de la página de Mercado Pago (si llega a cargar)

---

**Última actualización:** 2026-01-10
