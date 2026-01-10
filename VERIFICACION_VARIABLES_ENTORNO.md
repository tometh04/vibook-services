# 🔍 Verificación de Variables de Entorno - Error Signup

## Error Actual
```
Error [AuthUnknownError]: Unexpected end of JSON input
```

Este error generalmente significa que **Supabase Auth está retornando una respuesta vacía o inválida**, lo que indica un problema de configuración.

---

## ✅ PASO 1: Verificar Variables de Entorno en Vercel

1. **Ir a Vercel Dashboard**
   - https://vercel.com/dashboard
   - Selecciona tu proyecto `vibook-services` o `vibookservicessaas`

2. **Ir a Settings → Environment Variables**

3. **Verificar que estas variables estén configuradas**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[TU-PROJECT-ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_APP_URL=https://vibookservicessaas.vercel.app
   ```

4. **⚠️ IMPORTANTE - Verificar el formato de NEXT_PUBLIC_SUPABASE_URL**:
   - ✅ **Correcto**: `https://abcdefghijklmnop.supabase.co`
   - ❌ **Incorrecto**: `https://supabase.co/dashboard/project/abcdefghijklmnop`
   - ❌ **Incorrecto**: `https://abcdefghijklmnop.supabase.co/` (con barra al final)

5. **⚠️ IMPORTANTE - Verificar SUPABASE_SERVICE_ROLE_KEY**:
   - Debe empezar con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - No debe tener espacios ni saltos de línea
   - Debe ser el **Service Role Key** (secret), NO el **anon key**

---

## ✅ PASO 2: Obtener las Variables Correctas desde Supabase

### NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY:

1. **Ir a Supabase Dashboard**
   - https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Settings → API**

3. **Project URL** (esta es tu `NEXT_PUBLIC_SUPABASE_URL`):
   ```
   https://[PROJECT-ID].supabase.co
   ```
   Copia exactamente esta URL (sin barras al final)

4. **Project API keys → anon public** (esta es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   Haz clic en el ícono de "eye" para ver la key completa y cópiala

### SUPABASE_SERVICE_ROLE_KEY:

1. **En la misma página (Settings → API)**

2. **Project API keys → service_role secret** (esta es tu `SUPABASE_SERVICE_ROLE_KEY`):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   ⚠️ **CUIDADO**: Esta key tiene permisos completos. Nunca la expongas públicamente.
   
   Haz clic en "Reveal" o el ícono de "eye" para ver la key completa y cópiala

---

## ✅ PASO 3: Actualizar Variables en Vercel

1. **En Vercel Dashboard → Settings → Environment Variables**

2. **Para cada variable**:
   - Si existe, haz clic en ella y verifica/actualiza el valor
   - Si no existe, haz clic en "Add New" y agrega:
     - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
     - **Value**: `https://[TU-PROJECT-ID].supabase.co` (sin comillas)
     - **Environment**: Production, Preview, Development (marca todos)

3. **Repite para todas las variables**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

4. **Guardar cambios**

---

## ✅ PASO 4: Redeploy en Vercel

**IMPORTANTE**: Después de cambiar variables de entorno, necesitas hacer un **nuevo deploy**.

1. **En Vercel Dashboard → Deployments**
2. Haz clic en el último deployment
3. Haz clic en los tres puntos (⋯) → **Redeploy**
4. O simplemente haz un nuevo push a GitHub (trigger automático)

---

## ✅ PASO 5: Verificar que las Variables Están Cargadas

1. **Después del deploy**, ve a:
   ```
   https://vibookservicessaas.vercel.app/api/health
   ```

2. **Deberías ver algo como**:
   ```json
   {
     "status": "ok",
     "envVars": {
       "NEXT_PUBLIC_SUPABASE_URL": "Configured",
       "NEXT_PUBLIC_SUPABASE_ANON_KEY": "Configured",
       "SUPABASE_SERVICE_ROLE_KEY": "Configured",
       "NEXT_PUBLIC_APP_URL": "Configured"
     }
   }
   ```

3. **Si alguna dice "Missing"**, esa variable no está configurada correctamente.

---

## 🔍 Debugging Adicional

Si después de verificar todo lo anterior sigue fallando:

### Verificar en los Logs de Vercel:

1. **Vercel Dashboard → Deployments → Tu último deployment → Functions Logs**

2. **Busca mensajes que empiecen con**:
   - `❌ Missing Supabase environment variables`
   - `❌ Error creating Supabase admin client`
   - `❌ Supabase Auth returned invalid response`

3. **Estos mensajes te dirán exactamente qué variable falta o está mal configurada**

### Test Manual de Supabase Auth:

Puedes probar directamente si Supabase Auth funciona usando curl:

```bash
curl -X POST 'https://[TU-PROJECT-ID].supabase.co/auth/v1/admin/users' \
  -H "apikey: [TU-SERVICE-ROLE-KEY]" \
  -H "Authorization: Bearer [TU-SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "email_confirm": true
  }'
```

**Si esto funciona**, el problema está en la aplicación.
**Si esto falla**, el problema está en las credenciales de Supabase.

---

## ✅ Checklist Final

- [ ] `NEXT_PUBLIC_SUPABASE_URL` está configurada y tiene el formato correcto (sin barra final)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurada (anon public key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada (service_role secret key)
- [ ] `NEXT_PUBLIC_APP_URL` está configurada
- [ ] Todas las variables están marcadas para Production, Preview y Development
- [ ] Se hizo un redeploy después de cambiar las variables
- [ ] `/api/health` muestra que todas las variables están "Configured"
- [ ] Los logs de Vercel no muestran errores de variables faltantes

---

## 🆘 Si Nada Funciona

1. **Verifica que el proyecto de Supabase esté activo** (no suspendido)
2. **Verifica que tengas permisos** en el proyecto de Supabase
3. **Intenta crear un nuevo Service Role Key** en Supabase:
   - Settings → API → Project API keys
   - Haz clic en "Reset" junto a service_role secret
   - Copia la nueva key y actualízala en Vercel
4. **Contacta soporte de Supabase** si el problema persiste
