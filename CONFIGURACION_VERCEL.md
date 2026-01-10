# ⚙️ Configuración de Vercel - Vibook Gestión

## 🔴 PROBLEMA ACTUAL: Error 500

El sitio está dando error 500 porque **faltan las variables de entorno** en Vercel.

---

## ✅ Solución: Configurar Variables de Entorno

### Paso 1: Ir a Vercel Dashboard
1. Ve a https://vercel.com/dashboard
2. Selecciona el proyecto **vibook-services** (o como lo hayas nombrado)
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variables de Entorno
Agregar estas 4 variables (hacer click en "Add New" para cada una):

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://TU-PROYECTO-ID.supabase.co`
  - Reemplaza `TU-PROYECTO-ID` con el ID de tu proyecto Supabase
  - Lo encuentras en: Supabase Dashboard → Settings → API → Project URL
- **Environment**: Seleccionar todas (Production, Preview, Development)
- Click en **Save**

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Tu anon key de Supabase
  - Lo encuentras en: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **Environment**: Seleccionar todas (Production, Preview, Development)
- Click en **Save**

#### Variable 3: SUPABASE_SERVICE_ROLE_KEY
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Tu service role key de Supabase
  - Lo encuentras en: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
  - ⚠️ **CUIDADO**: Esta key es secreta, no la compartas públicamente
- **Environment**: Seleccionar todas (Production, Preview, Development)
- Click en **Save**

#### Variable 4: NEXT_PUBLIC_APP_URL
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://vibookservicessaas.vercel.app`
- **Environment**: Seleccionar todas (Production, Preview, Development)
- Click en **Save**

### Paso 3: Redeploy
Después de agregar todas las variables:

1. Ve a la pestaña **Deployments**
2. Click en los **3 puntos** del último deploy
3. Click en **Redeploy**
4. Espera a que termine el deploy (1-2 minutos)

### Paso 4: Verificar
1. Espera a que termine el redeploy
2. Ve a `https://vibookservicessaas.vercel.app`
3. Debería redirigir a `/login` sin error 500

---

## 📋 Checklist de Configuración

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada en Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada en Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada en Vercel
- [ ] `NEXT_PUBLIC_APP_URL` configurada en Vercel
- [ ] Redeploy hecho después de agregar variables
- [ ] Verificado que el sitio carga correctamente

---

## 🔍 Cómo encontrar tus credenciales de Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. Ahí encontrarás:
   - **Project URL**: Usar como `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys**:
     - `anon` `public`: Usar como `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` `secret`: Usar como `SUPABASE_SERVICE_ROLE_KEY`

---

## ⚠️ Notas Importantes

1. **Después de agregar variables, SIEMPRE hacer Redeploy** - Las variables no se aplican automáticamente a los deploys existentes
2. **Verifica que todas las variables estén en mayúsculas** - El nombre exacto importa
3. **El `NEXT_PUBLIC_APP_URL` debe ser exactamente** `https://vibookservicessaas.vercel.app` (con https, sin trailing slash)

---

## 🚨 Si sigue dando error 500

1. Verifica los logs de Vercel:
   - Ve a Deployments → Click en el último deploy → Logs
   - Busca errores relacionados con variables de entorno

2. Verifica que las variables estén correctamente escritas:
   - No deben tener espacios extra
   - No deben tener comillas (a menos que sean parte del valor)
   - Deben estar en mayúsculas

3. Verifica que el Project ID de Supabase sea correcto:
   - La URL debe ser: `https://[PROJECT-ID].supabase.co`
   - No debe tener `placeholder` en ningún lugar
