# 🔐 INSTRUCCIONES: Configuración de Auth para Vibook Gestión

## ✅ Paso 1: Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto `vibook-services` (o como lo hayas nombrado)
3. Ve a **Settings** → **Environment Variables**
4. Asegúrate de tener estas variables configuradas:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

5. Si falta alguna, agrégalas desde Supabase Dashboard:
   - **NEXT_PUBLIC_SUPABASE_URL**: Settings → API → Project URL
   - **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Settings → API → Project API keys → `anon` `public`
   - **SUPABASE_SERVICE_ROLE_KEY**: Settings → API → Project API keys → `service_role` `secret` ⚠️ **CUIDADO: No exponer esta key públicamente**

6. Después de agregar/modificar variables, **redeploy** el proyecto en Vercel

---

## ✅ Paso 2: Configurar Redirect URLs en Supabase

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. Configura:

   **Site URL:**
   ```
   https://tu-dominio.vercel.app
   ```

   **Redirect URLs** (agrega todas estas líneas, una por una):
   ```
   https://tu-dominio.vercel.app/auth/callback
   https://tu-dominio.vercel.app/auth/verify-email
   https://tu-dominio.vercel.app/auth/reset-password
   https://tu-dominio.vercel.app/dashboard
   https://tu-dominio.vercel.app/onboarding
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/verify-email
   http://localhost:3000/auth/reset-password
   http://localhost:3000/dashboard
   http://localhost:3000/onboarding
   ```

5. Click en **Save**

---

## ✅ Paso 3: Configurar Google OAuth (Recomendado)

### 3.1 Crear proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Si no tienes un proyecto, crea uno:
   - Click en el selector de proyecto (arriba)
   - Click en **New Project**
   - Nombre: `vibook-gestion` (o el que prefieras)
   - Click **Create**

### 3.2 Configurar OAuth Consent Screen

1. En Google Cloud Console, ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **External** (a menos que tengas cuenta de Google Workspace)
3. Completa el formulario:
   - **App name**: Vibook Gestión
   - **User support email**: Tu email
   - **Developer contact information**: Tu email
   - Click **Save and Continue**
4. En **Scopes**, click **Save and Continue** (dejamos los scopes por defecto)
5. En **Test users** (si estás en modo testing), agrega tu email
6. Click **Save and Continue** hasta completar

### 3.3 Crear credenciales OAuth

1. Ve a **APIs & Services** → **Credentials**
2. Click en **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Selecciona **Web application**
4. Completa:
   - **Name**: Vibook Gestión Web Client
   - **Authorized JavaScript origins**:
     ```
     https://tu-dominio.vercel.app
     http://localhost:3000
     ```
   - **Authorized redirect URIs**:
     ```
     https://tu-proyecto-id.supabase.co/auth/v1/callback
     ```
     ⚠️ **IMPORTANTE**: Reemplaza `tu-proyecto-id` con el ID de tu proyecto Supabase (lo encuentras en la URL de Supabase Dashboard o en Settings → General → Reference ID)
5. Click **Create**
6. **Copia** el **Client ID** y **Client Secret** (los necesitarás en el siguiente paso)

### 3.4 Configurar Google OAuth en Supabase

1. Ve a Supabase Dashboard → **Authentication** → **Providers**
2. Busca **Google** en la lista
3. Click para habilitarlo
4. Completa:
   - **Enabled**: ✅ (activar el toggle)
   - **Client ID (for OAuth)**: Pega el Client ID que copiaste
   - **Client Secret (for OAuth)**: Pega el Client Secret que copiaste
5. Click **Save**

---

## ✅ Paso 4: Configurar GitHub OAuth (Opcional)

Si querés permitir login con GitHub:

### 4.1 Crear OAuth App en GitHub

1. Ve a GitHub → **Settings** (tu perfil) → **Developer settings** → **OAuth Apps**
2. Click en **New OAuth App**
3. Completa:
   - **Application name**: Vibook Gestión
   - **Homepage URL**: `https://tu-dominio.vercel.app`
   - **Authorization callback URL**: `https://tu-proyecto-id.supabase.co/auth/v1/callback`
     ⚠️ Reemplaza `tu-proyecto-id` con el ID de tu proyecto Supabase
4. Click **Register application**
5. **Copia** el **Client ID**
6. Click **Generate a new client secret**
7. **Copia** el **Client Secret** (solo se muestra una vez)

### 4.2 Configurar GitHub OAuth en Supabase

1. Ve a Supabase Dashboard → **Authentication** → **Providers**
2. Busca **GitHub** en la lista
3. Click para habilitarlo
4. Completa:
   - **Enabled**: ✅ (activar el toggle)
   - **Client ID (for OAuth)**: Pega el Client ID
   - **Client Secret (for OAuth)**: Pega el Client Secret
5. Click **Save**

---

## ✅ Paso 5: Personalizar Email Templates (Opcional pero Recomendado)

1. Ve a Supabase Dashboard → **Authentication** → **Email Templates**
2. Personaliza estos templates:

   **Confirm signup:**
   - Puedes personalizar el HTML
   - Asegúrate de que el enlace de confirmación funcione: `{{ .ConfirmationURL }}`

   **Reset Password:**
   - Personaliza el mensaje
   - Asegúrate de que el enlace funcione: `{{ .ConfirmationURL }}`

   **Magic Link:**
   - Si planeas usar magic links, personalízalo también

3. Click **Save** en cada template

---

## ✅ Paso 6: Verificar que las migraciones estén aplicadas

1. Ve a Supabase Dashboard → **SQL Editor**
2. Verifica que estas tablas existan ejecutando:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 
  'agencies', 
  'user_agencies', 
  'tenant_branding',
  'customer_settings',
  'operation_settings',
  'financial_settings'
);
```

3. Si falta alguna tabla, ejecuta las migraciones:
   - Ve a **SQL Editor** → **New query**
   - Copia y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`
   - Repite para `002_financial_modules.sql` y `003_additional_modules.sql`

---

## ✅ Paso 7: Testing - Verificar que todo funciona

### 7.1 Probar Signup con Email/Password

1. Ve a `https://tu-dominio.vercel.app/signup`
2. Completa el formulario:
   - Nombre completo
   - Email válido (usa uno real para recibir el email)
   - Password: mínimo 8 caracteres, con mayúscula, minúscula y número
   - Nombre de agencia
   - Ciudad
3. Click en **Crear cuenta**
4. Deberías ser redirigido a `/auth/verify-email`
5. **Revisa tu email** (también la carpeta de spam)
6. Click en el enlace de verificación
7. Deberías ser redirigido al dashboard o onboarding

### 7.2 Probar Social Login (Google)

1. Ve a `https://tu-dominio.vercel.app/login` o `/signup`
2. Click en el botón **Google**
3. Deberías ver la pantalla de consentimiento de Google
4. Selecciona tu cuenta
5. Si es primera vez, debería crear la agencia automáticamente y redirigir a `/onboarding`
6. Si ya tienes cuenta, debería redirigir a `/dashboard`

### 7.3 Probar Onboarding

1. Después de signup/OAuth, deberías llegar a `/onboarding`
2. Completa los 3 steps:
   - Step 1: Información básica
   - Step 2: Branding
   - Step 3: Confirmación
3. Click en **Completar setup**
4. Deberías ser redirigido a `/dashboard`

### 7.4 Verificar que se creó todo correctamente

En Supabase Dashboard → **Table Editor**, verifica que se crearon:

1. **agencies**: Debería tener una agencia con el nombre que ingresaste
2. **users**: Debería tener un usuario con tu email y rol `SUPER_ADMIN`
3. **user_agencies**: Debería tener un link entre tu usuario y tu agencia
4. **tenant_branding**: Debería tener branding para tu agencia
5. **customer_settings**, **operation_settings**, **financial_settings**: Deberían tener configuraciones default

---

## 🚨 Troubleshooting

### Error: "User not found in database"
- **Causa**: El usuario se creó en Supabase Auth pero no en la tabla `users`
- **Solución**: Verifica que la API route `/api/auth/signup` se ejecutó correctamente. Revisa los logs en Vercel.

### Error: "Invalid redirect URL"
- **Causa**: La URL de redirect no está en la lista de URLs permitidas en Supabase
- **Solución**: Verifica el Paso 2, agrega la URL exacta que aparece en el error.

### Error: "OAuth provider not configured"
- **Causa**: Google/GitHub OAuth no está configurado correctamente
- **Solución**: 
  - Verifica que habilitaste el provider en Supabase
  - Verifica que el Client ID y Secret son correctos
  - Verifica que el redirect URI en Google/GitHub coincide con el de Supabase

### Error: "Email not verified"
- **Causa**: No clickeaste el enlace de verificación
- **Solución**: Revisa tu email (incluyendo spam) y clickea el enlace. O usa el botón "Reenviar email" en `/auth/verify-email`

### El callback no funciona después de OAuth
- **Causa**: El redirect URI en Google/GitHub no coincide con Supabase
- **Solución**: Verifica que el redirect URI en ambos lados sea exactamente: `https://tu-proyecto-id.supabase.co/auth/v1/callback`

### Variables de entorno no se actualizan en Vercel
- **Causa**: Vercel cachea las variables de entorno
- **Solución**: Después de agregar/modificar variables, haz un **Redeploy** manual del proyecto en Vercel

---

## 📝 Checklist Final

Antes de considerar todo configurado, verifica:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Redirect URLs configuradas en Supabase
- [ ] Google OAuth configurado (si lo usas)
- [ ] GitHub OAuth configurado (si lo usas)
- [ ] Email templates personalizados (opcional)
- [ ] Migraciones aplicadas
- [ ] Signup con email/password funciona
- [ ] Verificación de email funciona
- [ ] Social login funciona (si configuraste)
- [ ] Onboarding funciona
- [ ] Redirecciones funcionan correctamente

---

## 🎉 ¡Listo!

Si todos los pasos están completados y el testing funciona, ya tenés el sistema de autenticación completamente funcional.

**Próximo paso según roadmap**: FASE 2 - Sistema de Suscripciones y Billing con Stripe.

---

## 📞 Soporte

Si tenés problemas:
1. Revisa los logs en Vercel: Dashboard → Tu proyecto → Deployments → Click en el último deploy → Functions → Ver logs
2. Revisa los logs en Supabase: Dashboard → Logs → Postgres Logs o Auth Logs
3. Revisa la consola del navegador para errores de frontend
4. Verifica que todas las variables de entorno estén correctas
