# 🔗 URLs de Redirect para Supabase - Vibook Gestión

## Dominio de Producción
**https://vibookservicessaas.vercel.app**

---

## 📋 URLs para configurar en Supabase Dashboard

### Site URL (Authentication → URL Configuration)
```
https://vibookservicessaas.vercel.app
```

### Redirect URLs (Authentication → URL Configuration)
Agregar todas estas URLs, una por línea:

```
https://vibookservicessaas.vercel.app/auth/callback
https://vibookservicessaas.vercel.app/auth/verify-email
https://vibookservicessaas.vercel.app/auth/verified
https://vibookservicessaas.vercel.app/auth/reset-password
https://vibookservicessaas.vercel.app/dashboard
https://vibookservicessaas.vercel.app/onboarding
https://vibookservicessaas.vercel.app/login
https://vibookservicessaas.vercel.app/signup
http://localhost:3000/auth/callback
http://localhost:3000/auth/verify-email
http://localhost:3000/auth/verified
http://localhost:3000/auth/reset-password
http://localhost:3000/dashboard
http://localhost:3000/onboarding
http://localhost:3000/login
http://localhost:3000/signup
```

⚠️ **IMPORTANTE**: Agrega especialmente `https://vibookservicessaas.vercel.app/auth/verified` porque es donde Supabase redirige después de verificar el email.

---

## 🔧 Para OAuth Providers (Google/GitHub)

### Redirect URI en Google Cloud Console / GitHub OAuth App
```
https://TU-PROYECTO-ID.supabase.co/auth/v1/callback
```

⚠️ **IMPORTANTE**: Reemplaza `TU-PROYECTO-ID` con el ID de tu proyecto Supabase.

Para encontrar tu Project ID:
1. Ve a Supabase Dashboard
2. Selecciona tu proyecto
3. Ve a Settings → General
4. Copia el **Reference ID** (ese es tu Project ID)

O puedes verlo en la URL de tu proyecto en Supabase Dashboard:
`https://supabase.com/dashboard/project/[TU-PROYECTO-ID]`

---

## 📝 Pasos para configurar

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL**: `https://vibookservicessaas.vercel.app`
3. **Redirect URLs**: Agregar todas las URLs de arriba
4. **Save**

5. **Para Google OAuth** (si lo configuras):
   - Google Cloud Console → Tu OAuth Client → Authorized redirect URIs
   - Agregar: `https://TU-PROYECTO-ID.supabase.co/auth/v1/callback`

6. **Para GitHub OAuth** (si lo configuras):
   - GitHub → Settings → Developer settings → OAuth Apps → Tu app
   - Authorization callback URL: `https://TU-PROYECTO-ID.supabase.co/auth/v1/callback`

---

## ✅ Verificación

Después de configurar, prueba:
1. Ir a `https://vibookservicessaas.vercel.app` → Debería redirigir a `/login`
2. Ir a `https://vibookservicessaas.vercel.app/signup` → Debería mostrar formulario de signup
3. Crear cuenta → Debería redirigir correctamente a verificación de email
