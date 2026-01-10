# 🔍 Debug: Error 500 en Vercel

## Problema
El sitio está dando error 500 en todas las rutas, incluso en rutas públicas.

## Pasos para diagnosticar

### 1. Verificar Logs de Vercel
1. Ve a **Vercel Dashboard** → Tu proyecto → **Deployments**
2. Click en el **último deploy**
3. Ve a la pestaña **Functions** o **Logs**
4. Busca errores relacionados con:
   - Variables de entorno faltantes
   - Errores de build
   - Errores de runtime

### 2. Verificar Variables de Entorno
1. Ve a **Settings** → **Environment Variables**
2. Verifica que estén configuradas estas 4 variables:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `NEXT_PUBLIC_APP_URL`

### 3. Verificar Build
1. Ve a **Deployments** → Último deploy
2. Verifica que el build haya sido **exitoso** (✓)
3. Si el build falló, revisa los logs de build

### 4. Probar Health Check
Una vez que el deploy termine, probar:
```
https://vibookservicessaas.vercel.app/api/health
```

Esto debería mostrar si las variables de entorno están configuradas:
- Si muestra `status: "ok"` → Variables configuradas correctamente
- Si muestra `status: "error"` → Faltan variables de entorno

### 5. Verificar Supabase Connection
Si las variables están configuradas, verifica:
1. Que el Project ID en la URL sea correcto
2. Que las keys sean válidas (no hayan expirado)
3. Que el proyecto de Supabase esté activo

## Posibles causas del error 500

### Causa 1: Variables de entorno no configuradas
**Solución**: Configurar todas las variables en Vercel y hacer redeploy

### Causa 2: Build falló pero no se notó
**Solución**: Revisar logs de build en Vercel

### Causa 3: Error en código que se ejecuta en todas las páginas
**Solución**: Revisar `app/layout.tsx` y componentes globales

### Causa 4: Problema con Supabase Client
**Solución**: Verificar que las credenciales sean correctas

## Comandos útiles para verificar localmente

```bash
# Verificar variables de entorno localmente
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
echo $NEXT_PUBLIC_APP_URL

# Probar build localmente
npm run build

# Probar servidor localmente
npm run dev
```

## Próximos pasos

1. ✅ Verificar logs de Vercel
2. ✅ Verificar variables de entorno
3. ✅ Hacer redeploy si es necesario
4. ✅ Probar health check: `/api/health`
5. ✅ Probar ruta de login: `/login`

## Si sigue fallando

1. Revisar los logs detallados en Vercel
2. Comparar con configuración local (si funciona localmente)
3. Verificar que el proyecto de Supabase esté activo
4. Contactar soporte de Vercel si es necesario
