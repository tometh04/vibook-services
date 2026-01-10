# 🔐 Guía Completa: Configuración de Google OAuth para Vibook Gestión

Esta guía te llevará paso a paso para configurar el login con Google en tu aplicación SaaS.

---

## 📋 Paso 1: Crear Proyecto en Google Cloud Console

1. **Ir a Google Cloud Console**
   - Visita: https://console.cloud.google.com/
   - Inicia sesión con tu cuenta de Google

2. **Crear un nuevo proyecto** (o usar uno existente)
   - Clic en el selector de proyectos (arriba a la izquierda)
   - Clic en "Nuevo proyecto"
   - Nombre: `Vibook Gestión SaaS` (o el que prefieras)
   - Clic en "Crear"

3. **Seleccionar el proyecto**
   - Asegúrate de que tu nuevo proyecto esté seleccionado

---

## 📋 Paso 2: Configurar OAuth Consent Screen

1. **Ir a la pantalla de consentimiento**
   - En el menú lateral, ve a: **APIs & Services** → **OAuth consent screen**

2. **Seleccionar tipo de usuario**
   - Elige: **External** (para usuarios externos)
   - Clic en "Create"

3. **Completar información de la app**
   - **App name**: `Vibook Gestión`
   - **User support email**: Tu email de soporte
   - **App logo**: (Opcional) Sube el logo de Vibook
   - **App domain**: 
     - Homepage URL: `https://vibookservicessaas.vercel.app`
     - Privacy policy URL: `https://vibookservicessaas.vercel.app/privacy` (crear después si no existe)
     - Terms of service URL: `https://vibookservicessaas.vercel.app/terms` (crear después si no existe)
   - **Authorized domains**: 
     - `vercel.app`
     - `vibookservicessaas.vercel.app`
   - **Developer contact information**: Tu email

4. **Agregar scopes** (opcional por ahora)
   - Clic en "Add or Remove Scopes"
   - Selecciona los scopes básicos:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Clic en "Update" y luego "Save and Continue"

5. **Test users** (si estás en modo testing)
   - Agrega emails de test si necesitas probar antes de publicar
   - Clic en "Save and Continue"

6. **Resumen**
   - Revisa la información
   - Clic en "Back to Dashboard"

---

## 📋 Paso 3: Crear Credenciales OAuth 2.0

1. **Ir a Credentials**
   - En el menú lateral: **APIs & Services** → **Credentials**

2. **Crear credenciales**
   - Clic en "Create Credentials" → "OAuth client ID"

3. **Seleccionar tipo de aplicación**
   - Tipo: **Web application**
   - Nombre: `Vibook Gestión Web Client`

4. **Configurar URIs autorizadas**
   - **Authorized JavaScript origins**:
     ```
     https://vibookservicessaas.vercel.app
     http://localhost:3000 (para desarrollo local)
     ```
   
   - **Authorized redirect URIs**:
     ```
     https://[TU-PROJECT-ID].supabase.co/auth/v1/callback
     ```
     ⚠️ **IMPORTANTE**: Reemplaza `[TU-PROJECT-ID]` con tu Project ID de Supabase.
     
     Para encontrar tu Project ID:
     1. Ve a tu proyecto en Supabase Dashboard
     2. Settings → API
     3. Tu Project URL es: `https://[PROJECT-ID].supabase.co`
     4. Copia el `[PROJECT-ID]` y úsalo en la redirect URI

5. **Crear**
   - Clic en "Create"
   - **GUARDA ESTOS DATOS** (aparecerán en un popup):
     - **Client ID**: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`

---

## 📋 Paso 4: Configurar en Supabase

1. **Ir a Supabase Dashboard**
   - Visita: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ir a Authentication → Providers**
   - Menú lateral: **Authentication** → **Providers**

3. **Habilitar Google**
   - Busca "Google" en la lista de providers
   - Haz clic en el toggle para habilitarlo

4. **Agregar credenciales**
   - **Client ID (for OAuth)**: Pega el Client ID de Google Cloud Console
   - **Client Secret (for OAuth)**: Pega el Client Secret de Google Cloud Console
   - Clic en "Save"

---

## 📋 Paso 5: Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas en **Vercel**:

1. **Ir a Vercel Dashboard**
   - Ve a tu proyecto: https://vercel.com/dashboard
   - Settings → Environment Variables

2. **Verificar variables existentes**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[TU-PROJECT-ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   NEXT_PUBLIC_APP_URL=https://vibookservicessaas.vercel.app
   ```

3. **No necesitas agregar variables adicionales** para Google OAuth, ya que Supabase maneja todo internamente.

---

## 📋 Paso 6: Probar el Login con Google

1. **Ir a la página de signup/login**
   - Visita: `https://vibookservicessaas.vercel.app/signup`

2. **Hacer clic en "Continuar con Google"**
   - Deberías ser redirigido a Google para autorizar

3. **Autorizar la aplicación**
   - Selecciona tu cuenta de Google
   - Autoriza los permisos solicitados

4. **Verificar redirección**
   - Después de autorizar, deberías ser redirigido a `/auth/callback`
   - Si es la primera vez, serás redirigido a `/onboarding`
   - Si ya tienes cuenta, serás redirigido a `/dashboard`

---

## ❌ Solución de Problemas

### Error: "redirect_uri_mismatch"
- **Causa**: La redirect URI en Google Cloud Console no coincide con la de Supabase
- **Solución**: 
  1. Verifica que la redirect URI en Google Cloud Console sea exactamente: `https://[TU-PROJECT-ID].supabase.co/auth/v1/callback`
  2. Asegúrate de usar el Project ID correcto de Supabase

### Error: "invalid_client"
- **Causa**: Client ID o Client Secret incorrectos en Supabase
- **Solución**: 
  1. Verifica que hayas copiado correctamente el Client ID y Client Secret
  2. Asegúrate de haberlos pegado en Supabase Dashboard → Authentication → Providers → Google

### Error: "access_denied"
- **Causa**: El usuario canceló la autorización o la app está en modo testing y el email no está en la lista de test users
- **Solución**: 
  1. Si estás en modo testing, agrega el email del usuario en Google Cloud Console → OAuth consent screen → Test users
  2. O publica la app para producción

### El botón de Google no aparece o no funciona
- **Causa**: Google OAuth no está habilitado en Supabase
- **Solución**: 
  1. Ve a Supabase Dashboard → Authentication → Providers
  2. Asegúrate de que Google esté habilitado (toggle ON)
  3. Verifica que Client ID y Client Secret estén guardados

---

## 🔒 Seguridad

- **NUNCA** compartas tu Client Secret públicamente
- **NO** lo commits en el código fuente
- Supabase maneja el Client Secret de forma segura en su backend
- Solo necesitas el Client ID en el frontend (Supabase lo maneja automáticamente)

---

## 📝 Notas Importantes

1. **Primera vez con Google OAuth**:
   - Si un usuario se registra por primera vez con Google, se crea automáticamente:
     - Usuario en Supabase Auth
     - Agencia con nombre default (`[Nombre]'s Agency`)
     - Usuario como SUPER_ADMIN de su agencia
     - Settings iniciales (tenant_branding, customer_settings, etc.)
   - Luego es redirigido a `/onboarding` para completar la configuración

2. **Usuarios existentes**:
   - Si el usuario ya existe en la base de datos, simplemente inicia sesión y va al dashboard

3. **Redirect URIs**:
   - Asegúrate de agregar TODAS las URLs donde se usará OAuth:
     - Producción: `https://vibookservicessaas.vercel.app`
     - Desarrollo local: `http://localhost:3000`
     - El callback siempre es: `https://[PROJECT-ID].supabase.co/auth/v1/callback`

---

## ✅ Checklist Final

- [ ] Proyecto creado en Google Cloud Console
- [ ] OAuth consent screen configurado
- [ ] OAuth 2.0 credentials creadas (Client ID y Secret)
- [ ] Redirect URI configurada correctamente en Google Cloud Console
- [ ] Google habilitado en Supabase Dashboard
- [ ] Client ID y Secret agregados en Supabase
- [ ] Variables de entorno verificadas en Vercel
- [ ] Login con Google probado exitosamente

---

¿Necesitas ayuda? Revisa los logs en:
- Vercel: Deployment logs
- Supabase: Authentication logs (Dashboard → Authentication → Logs)
- Google Cloud: OAuth consent screen → Test users (si estás en modo testing)
