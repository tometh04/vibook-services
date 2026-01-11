# 🚀 Plan de Migración de Dominio

## 📋 Resumen

**Dominio Actual:** `vibookservicessaas.vercel.app`  
**Nuevo Dominio Principal:** `vibook.ai` (página web/landing)  
**Nuevo Subdominio Sistema:** `app.vibook.ai` (aplicación SaaS)

---

## ✅ Checklist de Migración

### Fase 1: Preparación (ANTES de cambiar el dominio)

- [ ] **Verificar dominio en Vercel:**
  - Dominio `vibook.ai` configurado en Vercel
  - Dominio `app.vibook.ai` configurado en Vercel
  - DNS configurado correctamente
  - SSL certificado automáticamente

- [ ] **Backup de configuración actual:**
  - Anotar todas las URLs actuales
  - Exportar variables de entorno actuales

---

### Fase 2: Actualizar Variables de Entorno

- [ ] **Vercel Environment Variables:**
  - `NEXT_PUBLIC_APP_URL` → `https://app.vibook.ai`
  - (Si existe `NEXT_PUBLIC_SITE_URL` → `https://vibook.ai`)

- [ ] **Supabase (si aplica):**
  - Site URL → `https://app.vibook.ai`
  - Redirect URLs → Ver lista completa abajo

---

### Fase 3: Actualizar Configuración de Mercado Pago

- [ ] **Información general de la aplicación:**
  - "URL del sitio en producción" → `https://app.vibook.ai`

- [ ] **Configuraciones avanzadas:**
  - URLs de redireccionamiento → Ver lista completa abajo

- [ ] **Webhooks:**
  - URL de producción → `https://app.vibook.ai/api/billing/webhook`
  - Probar webhook después del cambio

---

### Fase 4: Actualizar Configuración de Supabase

- [ ] **Authentication → URL Configuration:**
  - Site URL → `https://app.vibook.ai`
  - Redirect URLs → Agregar todas las nuevas URLs

- [ ] **OAuth Providers (Google):**
  - Verificar Redirect URI en Google Cloud Console

---

### Fase 5: Actualizar Código (si hay URLs hardcodeadas)

- [ ] Buscar y reemplazar URLs hardcodeadas
- [ ] Actualizar `.env.example`
- [ ] Commit y push

---

### Fase 6: Configurar Dominio en Vercel

- [ ] Agregar dominio `app.vibook.ai` al proyecto
- [ ] Configurar dominio `vibook.ai` (si es necesario)
- [ ] Esperar propagación DNS (puede tardar minutos/horas)

---

### Fase 7: Verificación y Testing

- [ ] Verificar que el dominio funciona
- [ ] Probar login/signup
- [ ] Probar OAuth (Google)
- [ ] Probar webhook de Mercado Pago
- [ ] Probar checkout de Mercado Pago
- [ ] Verificar emails de verificación

---

## 📝 Detalle de Cambios por Servicio

### 1. Vercel Environment Variables

**Variables a actualizar:**

```bash
# Cambiar:
NEXT_PUBLIC_APP_URL=https://app.vibook.ai
```

**Pasos:**
1. Ve a Vercel → Tu proyecto → Settings → Environment Variables
2. Edita `NEXT_PUBLIC_APP_URL`
3. Cambia el valor a: `https://app.vibook.ai`
4. Guarda
5. **Redeploy** (importante)

---

### 2. Mercado Pago

#### 2.1 Información General

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación "Vibook Services"
3. Ve a **"Información general"**
4. En **"URL del sitio en producción"**, cambia a:
   ```
   https://app.vibook.ai
   ```
5. Haz clic en **"Guardar"**

#### 2.2 Configuraciones Avanzadas → URLs de Redirección

1. Ve a **"Configuraciones avanzadas"**
2. En **"URLs de redireccionamiento"**, actualiza a:
   - `https://app.vibook.ai/settings/billing?status=success`
   - `https://app.vibook.ai/pricing?status=failure`
   - `https://app.vibook.ai/settings/billing?status=pending`
3. Haz clic en **"Guardar cambios"**

#### 2.3 Webhooks

1. Ve a **NOTIFICACIONES** → **Webhooks**
2. En **"URL de producción"**, cambia a:
   ```
   https://app.vibook.ai/api/billing/webhook
   ```
3. Haz clic en **"Probar"** para verificar
4. Haz clic en **"Guardar configuración"**

---

### 3. Supabase

#### 3.1 Authentication → URL Configuration

1. Ve a Supabase Dashboard → Tu proyecto
2. Ve a **Authentication** → **URL Configuration**
3. **Site URL:** Cambia a:
   ```
   https://app.vibook.ai
   ```

4. **Redirect URLs:** Agrega todas estas URLs (reemplaza las antiguas):

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

   **Desarrollo (mantener):**
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

5. Haz clic en **"Save"**

#### 3.2 OAuth Providers (Google)

1. En Supabase Dashboard → Authentication → Providers → Google
2. Verifica que el Redirect URI sea correcto:
   ```
   https://TU-PROYECTO-ID.supabase.co/auth/v1/callback
   ```
   (Este NO cambia, es del proyecto de Supabase)

3. En Google Cloud Console:
   - Ve a: https://console.cloud.google.com/
   - Ve a **APIs & Services** → **Credentials**
   - Selecciona tu OAuth 2.0 Client ID
   - En **Authorized redirect URIs**, verifica que esté:
     ```
     https://TU-PROYECTO-ID.supabase.co/auth/v1/callback
     ```
   - (Este NO cambia)

---

### 4. Vercel Domain Configuration

#### 4.1 Agregar Dominio al Proyecto

1. Ve a Vercel → Tu proyecto → Settings → Domains
2. Haz clic en **"Add Domain"**
3. Ingresa: `app.vibook.ai`
4. Vercel te mostrará las instrucciones de DNS
5. Configura los registros DNS según las instrucciones
6. Espera a que el dominio se verifique (puede tardar minutos/horas)

#### 4.2 Configurar Dominio Principal (Opcional)

Si quieres que `vibook.ai` también apunte a tu proyecto:
1. Agrega también `vibook.ai` en Domains
2. Configura DNS según instrucciones
3. Puedes usar esto para la landing page

---

### 5. DNS Configuration

**Registros DNS necesarios:**

En tu proveedor de DNS (donde tengas `vibook.ai`):

1. **Para app.vibook.ai:**
   - Tipo: `CNAME`
   - Nombre: `app`
   - Valor: `cname.vercel-dns.com` (o el que te indique Vercel)

2. **Para vibook.ai (si aplica):**
   - Tipo: `A` o `CNAME`
   - Según las instrucciones de Vercel

**Nota:** Los cambios de DNS pueden tardar hasta 48 horas, pero normalmente es más rápido (minutos/horas).

---

### 6. Actualizar Código (Buscar URLs Hardcodeadas)

**Buscar en el código:**

1. Buscar referencias a `vibookservicessaas.vercel.app`
2. Actualizar `.env.example` si existe
3. Commit y push

**Comandos para buscar:**
```bash
grep -r "vibookservicessaas.vercel.app" .
```

---

## 🔄 Orden de Ejecución Recomendado

### Paso 1: Configurar Dominio en Vercel (PRIMERO)
1. Agrega `app.vibook.ai` en Vercel Domains
2. Configura DNS según instrucciones
3. Espera a que se verifique el dominio

### Paso 2: Actualizar Variables de Entorno en Vercel
1. Actualiza `NEXT_PUBLIC_APP_URL` a `https://app.vibook.ai`
2. Haz redeploy

### Paso 3: Actualizar Supabase
1. Actualiza Site URL
2. Actualiza Redirect URLs
3. Guarda

### Paso 4: Actualizar Mercado Pago
1. Actualiza "URL del sitio en producción"
2. Actualiza URLs de redirección
3. Actualiza URL de webhook
4. Prueba el webhook

### Paso 5: Actualizar Google OAuth (Si aplica)
1. Verificar Redirect URIs en Google Cloud Console
2. (Normalmente NO cambia)

### Paso 6: Verificación
1. Probar login
2. Probar signup
3. Probar OAuth
4. Probar webhook
5. Probar checkout

---

## ⚠️ Importante

1. **NO elimines el dominio viejo inmediatamente:**
   - Mantén `vibookservicessaas.vercel.app` funcionando durante la migración
   - Una vez que todo funcione con el nuevo dominio, puedes eliminarlo

2. **Propagación DNS:**
   - Los cambios de DNS pueden tardar hasta 48 horas
   - Normalmente es más rápido (minutos/horas)
   - Puedes verificar con: `nslookup app.vibook.ai`

3. **SSL Certificates:**
   - Vercel genera automáticamente certificados SSL
   - Puede tardar unos minutos después de verificar el dominio

4. **Testing:**
   - Prueba TODO después de cada cambio
   - No hagas todos los cambios a la vez
   - Verifica cada paso antes de continuar

---

## 🆘 Si Algo Sale Mal

### Rollback Plan:

1. **Mantener dominio viejo funcionando:**
   - No elimines `vibookservicessaas.vercel.app`
   - Puedes revertir cambios fácilmente

2. **Revertir variables de entorno:**
   - En Vercel, vuelve a cambiar `NEXT_PUBLIC_APP_URL` al dominio viejo
   - Haz redeploy

3. **Revertir configuraciones:**
   - En Mercado Pago, vuelve a cambiar las URLs
   - En Supabase, vuelve a cambiar las URLs

---

## ✅ Checklist Final

Después de completar la migración, verifica:

- [ ] Dominio `app.vibook.ai` funciona y carga la aplicación
- [ ] Login funciona correctamente
- [ ] Signup funciona correctamente
- [ ] OAuth (Google) funciona correctamente
- [ ] Email de verificación funciona y redirige correctamente
- [ ] Webhook de Mercado Pago funciona (prueba en Mercado Pago)
- [ ] Checkout de Mercado Pago funciona
- [ ] Redirecciones después del pago funcionan
- [ ] SSL certificado activo (HTTPS funcionando)
- [ ] Sin errores en la consola del navegador

---

**Última actualización:** 2026-01-11
