# 📋 Pasos Detallados para Migración de Dominio

## 🎯 Objetivo

**Cambiar de:**
- ❌ `vibookservicessaas.vercel.app`

**A:**
- ✅ `app.vibook.ai` (sistema SaaS)
- ✅ `vibook.ai` (página principal - opcional)

---

## ⚠️ IMPORTANTE: Orden de Ejecución

**EJECUTA LOS PASOS EN ESTE ORDEN EXACTO.** No saltes pasos.

---

## 📝 Paso 1: Configurar Dominio en Vercel (PRIMERO - Crítico)

### 1.1 Preparar DNS

1. Ve a tu proveedor de DNS (donde tengas `vibook.ai`)
2. Prepara agregar estos registros (NO los agregues todavía):
   - `CNAME` para `app` → `cname.vercel-dns.com` (Vercel te dará el valor exacto)

### 1.2 Agregar Dominio en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Domains**
4. Haz clic en **"Add Domain"**
5. Ingresa: `app.vibook.ai`
6. Haz clic en **"Add"**
7. Vercel te mostrará las instrucciones de DNS
8. **Copia el valor exacto** que Vercel te da (puede ser `cname.vercel-dns.com` o similar)

### 1.3 Configurar DNS

1. Ve a tu proveedor de DNS
2. Agrega el registro:
   - **Tipo:** `CNAME`
   - **Nombre/Host:** `app`
   - **Valor/Target:** El que te dio Vercel (ej: `cname.vercel-dns.com`)
   - **TTL:** 3600 (o el default)
3. **Guarda** el registro DNS

### 1.4 Esperar Verificación

1. Vuelve a Vercel
2. Espera a que el dominio se verifique (puede tardar **5 minutos a 48 horas**, normalmente 10-30 minutos)
3. Verás un checkmark verde cuando esté listo
4. Vercel generará automáticamente el certificado SSL

**⏸️ NO CONTINÚES hasta que el dominio esté verificado en Vercel**

---

## 📝 Paso 2: Actualizar Variables de Entorno en Vercel

### 2.1 Actualizar NEXT_PUBLIC_APP_URL

1. En Vercel → Tu proyecto → **Settings** → **Environment Variables**
2. Busca `NEXT_PUBLIC_APP_URL`
3. Si existe, edítala. Si no existe, créala.
4. Cambia el valor a:
   ```
   https://app.vibook.ai
   ```
5. Verifica que esté marcada para:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
6. Haz clic en **"Save"**

### 2.2 Redeploy

1. Ve a **Deployments**
2. Haz clic en los **3 puntos** (⋯) del último deployment
3. Selecciona **"Redeploy"**
4. Espera a que termine (1-2 minutos)

**⏸️ NO CONTINÚES hasta que el redeploy termine**

---

## 📝 Paso 3: Actualizar Supabase

### 3.1 Actualizar Site URL

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. En **"Site URL"**, cambia a:
   ```
   https://app.vibook.ai
   ```
5. Haz clic en **"Save"**

### 3.2 Actualizar Redirect URLs

1. En la misma página (URL Configuration)
2. En **"Redirect URLs"**, **ELIMINA** las URLs antiguas que contengan `vibookservicessaas.vercel.app`
3. **AGREGA** estas nuevas URLs (una por línea):

   **Producción:**
   ```
   https://app.vibook.ai/auth/callback
   https://app.vibook.ai/auth/verify-email
   https://app.vibook.ai/auth/verified
   https://app.vibook.ai/auth/reset-password
   https://app.vibook.ai/dashboard
   https://app.vibook.ai/onboarding
   https://app.vibook.ai/login
   https://app.vibook.ai/signup
   ```

   **Desarrollo (mantener estas):**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/verify-email
   http://localhost:3000/auth/verified
   http://localhost:3000/auth/reset-password
   http://localhost:3000/dashboard
   http://localhost:3000/onboarding
   http://localhost:3000/login
   http://localhost:3000/signup
   ```

4. Haz clic en **"Save"**

**⏸️ NO CONTINÚES hasta que hayas guardado en Supabase**

---

## 📝 Paso 4: Actualizar Mercado Pago

### 4.1 Actualizar URL del Sitio

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación **"Vibook Services"**
3. Ve a **"Información general"**
4. En **"URL del sitio en producción"**, cambia a:
   ```
   https://app.vibook.ai
   ```
5. Haz clic en **"Guardar"** o **"Actualizar"**
6. Espera a que se guarde

### 4.2 Actualizar URLs de Redirección

1. Ve a **"Configuraciones avanzadas"**
2. En **"URLs de redireccionamiento"**, elimina las URLs antiguas
3. Agrega estas nuevas URLs (una por una):
   - `https://app.vibook.ai/settings/billing?status=success`
   - `https://app.vibook.ai/pricing?status=failure`
   - `https://app.vibook.ai/settings/billing?status=pending`
4. Haz clic en **"Guardar cambios"**

### 4.3 Actualizar Webhook

1. Ve a **NOTIFICACIONES** → **Webhooks**
2. En **"Modo productivo"**, actualiza la **"URL de producción"** a:
   ```
   https://app.vibook.ai/api/billing/webhook
   ```
3. Haz clic en **"Probar"** para verificar que funciona
4. Si pasa la prueba, haz clic en **"Guardar configuración"**
5. Si falla, espera unos minutos y vuelve a probar

**⏸️ NO CONTINÚES hasta que el webhook pase la prueba**

---

## 📝 Paso 5: Verificar Google OAuth (Opcional)

**Nota:** Normalmente NO necesitas cambiar nada aquí, pero verifica:

1. Ve a: https://console.cloud.google.com/
2. Ve a **APIs & Services** → **Credentials**
3. Selecciona tu OAuth 2.0 Client ID
4. En **Authorized redirect URIs**, verifica que esté:
   ```
   https://TU-PROYECTO-ID.supabase.co/auth/v1/callback
   ```
5. Si está correcto, **NO cambies nada**
6. Si no está, agrégalo

**Este URI NO cambia** porque es del proyecto de Supabase, no de tu dominio.

---

## 📝 Paso 6: Actualizar Código (Si hay URLs hardcodeadas)

**Nota:** El código usa variables de entorno, así que probablemente NO necesites cambiar nada. Pero verifica:

1. Busca en el código referencias a `vibookservicessaas.vercel.app`
2. Si encuentras alguna, reemplázala por `app.vibook.ai` o usa la variable de entorno
3. Actualiza `.env.example` si existe

**Comando para buscar:**
```bash
grep -r "vibookservicessaas.vercel.app" .
```

---

## 📝 Paso 7: Verificación Completa

### 7.1 Verificar Dominio

1. Abre una nueva ventana de incógnito
2. Ve a: `https://app.vibook.ai`
3. Verifica que cargue correctamente
4. Verifica que el certificado SSL esté activo (candado verde)

### 7.2 Probar Login

1. Ve a: `https://app.vibook.ai/login`
2. Intenta iniciar sesión
3. Verifica que funcione correctamente

### 7.3 Probar Signup

1. Ve a: `https://app.vibook.ai/signup`
2. Crea una cuenta de prueba
3. Verifica que el email de verificación llegue
4. Verifica que el link de verificación funcione

### 7.4 Probar OAuth (Google)

1. Ve a: `https://app.vibook.ai/login`
2. Haz clic en "Continuar con Google"
3. Verifica que funcione y redirija correctamente

### 7.5 Probar Webhook de Mercado Pago

1. En Mercado Pago → Webhooks → "Simular notificación"
2. Haz clic en "Enviar prueba"
3. Verifica que pase (200 OK)

### 7.6 Probar Checkout de Mercado Pago

1. Ve a: `https://app.vibook.ai/pricing`
2. Haz clic en "Elegir Plan"
3. Verifica que el checkout cargue
4. Verifica que puedas escribir en los campos de tarjeta
5. (No completes el pago, solo verifica que los campos funcionen)

---

## ✅ Checklist Final

Marca cada item cuando esté completo:

- [ ] Dominio `app.vibook.ai` configurado en Vercel y verificado
- [ ] DNS configurado correctamente
- [ ] Variable `NEXT_PUBLIC_APP_URL` actualizada en Vercel
- [ ] Redeploy completado
- [ ] Site URL actualizada en Supabase
- [ ] Redirect URLs actualizadas en Supabase
- [ ] URL del sitio actualizada en Mercado Pago
- [ ] URLs de redirección actualizadas en Mercado Pago
- [ ] Webhook actualizado en Mercado Pago y probado
- [ ] Dominio `app.vibook.ai` carga correctamente
- [ ] Login funciona
- [ ] Signup funciona
- [ ] OAuth funciona
- [ ] Webhook funciona
- [ ] Checkout funciona

---

## 🆘 Si Algo Sale Mal

### Problema: El dominio no se verifica en Vercel

**Solución:**
1. Verifica que el registro DNS esté correcto
2. Usa una herramienta como `nslookup app.vibook.ai` para verificar
3. Espera más tiempo (hasta 48 horas)
4. Contacta a Vercel support si pasa de 48 horas

### Problema: El webhook falla

**Solución:**
1. Verifica que el dominio esté funcionando
2. Espera unos minutos después de actualizar
3. Verifica los logs de Vercel
4. Prueba manualmente: `curl https://app.vibook.ai/api/billing/webhook?topic=payment&id=123456`

### Problema: OAuth no funciona

**Solución:**
1. Verifica que las Redirect URLs en Supabase estén correctas
2. Verifica que el Redirect URI en Google Cloud Console sea correcto
3. Limpia el cache del navegador
4. Prueba en modo incógnito

---

## 📞 Contacto de Soporte

Si necesitas ayuda:

- **Vercel:** https://vercel.com/support
- **Supabase:** https://supabase.com/support
- **Mercado Pago:** https://www.mercadopago.com.ar/developers/support

---

**Última actualización:** 2026-01-11
