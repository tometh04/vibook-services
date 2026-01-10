# 🔧 Solución: Error 404 en OAuth y Signup

## Problema 1: Error 404 después de hacer login con Google

### Causa
El error 404 aparece cuando las **Redirect URLs** no están configuradas correctamente en Supabase.

### Solución

1. **Ir a Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Configurar Redirect URLs**
   - Ve a: **Authentication** → **URL Configuration**
   - En **Redirect URLs**, agrega estas URLs (una por línea):
   
   ```
   https://vibookservicessaas.vercel.app/auth/callback
   https://vibookservicessaas.vercel.app/dashboard
   https://vibookservicessaas.vercel.app/onboarding
   https://vibookservicessaas.vercel.app/login
   https://vibookservicessaas.vercel.app/signup
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   http://localhost:3000/onboarding
   ```

3. **Configurar Site URL**
   - En el mismo lugar, asegúrate de que **Site URL** sea:
   ```
   https://vibookservicessaas.vercel.app
   ```

4. **Guardar**
   - Haz clic en **Save**

5. **Verificar en Google Cloud Console** (si usas Google OAuth)
   - Ve a: https://console.cloud.google.com/
   - **APIs & Services** → **Credentials**
   - Selecciona tu OAuth 2.0 Client ID
   - En **Authorized redirect URIs**, debe estar:
   ```
   https://[TU-PROJECT-ID].supabase.co/auth/v1/callback
   ```
   - ⚠️ **IMPORTANTE**: Reemplaza `[TU-PROJECT-ID]` con el ID de tu proyecto Supabase
   - Para encontrar tu Project ID:
     - Ve a Supabase Dashboard → Settings → General
     - O mira la URL de tu proyecto: `https://supabase.com/dashboard/project/[TU-PROJECT-ID]`

---

## Problema 2: Error "Unexpected end of JSON input" en signup normal

### Causa
Este error aparece cuando:
1. El email ya está registrado
2. Hay un problema con la validación
3. El servidor retorna un error pero el frontend no lo maneja correctamente

### Solución

1. **Verificar que el email no esté ya registrado**
   - Intenta con un email diferente
   - O ve a Supabase Dashboard → Authentication → Users
   - Verifica si el email ya existe

2. **Verificar la contraseña**
   - Debe tener mínimo 8 caracteres
   - Debe tener al menos una mayúscula
   - Debe tener al menos una minúscula
   - Debe tener al menos un número

3. **Revisar los logs en Vercel**
   - Ve a Vercel Dashboard → Tu proyecto → Deployments
   - Haz clic en el último deployment → Functions Logs
   - Busca errores relacionados con `/api/auth/signup`

4. **Verificar variables de entorno**
   - Asegúrate de que estas variables estén configuradas en Vercel:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_APP_URL`

---

## Checklist de Verificación

### Para OAuth (Google):
- [ ] Redirect URLs configuradas en Supabase
- [ ] Site URL configurada en Supabase
- [ ] Redirect URI configurada en Google Cloud Console
- [ ] Google OAuth habilitado en Supabase
- [ ] Client ID y Secret configurados en Supabase

### Para Signup Normal:
- [ ] Variables de entorno configuradas en Vercel
- [ ] Email no está ya registrado
- [ ] Contraseña cumple los requisitos
- [ ] No hay errores en los logs de Vercel

---

## Errores Comunes y Soluciones

### "redirect_uri_mismatch"
- **Causa**: La redirect URI en Google Cloud Console no coincide
- **Solución**: Verifica que sea exactamente: `https://[PROJECT-ID].supabase.co/auth/v1/callback`

### "access_denied"
- **Causa**: App en modo testing y el email no está en la lista
- **Solución**: Agrega el email en Google Cloud Console → OAuth consent screen → Test users

### "invalid_client"
- **Causa**: Client ID o Secret incorrectos
- **Solución**: Verifica que estén correctamente configurados en Supabase

### "Este email ya está registrado"
- **Causa**: El email ya existe en la base de datos
- **Solución**: Usa otro email o intenta iniciar sesión en lugar de registrarte

---

## Pasos de Debugging

Si después de seguir estos pasos aún tienes problemas:

1. **Abrir la consola del navegador** (F12)
2. **Intentar el signup/login de nuevo**
3. **Revisar los errores en la consola**
4. **Copiar los errores y revisarlos**
5. **Verificar los logs en Vercel** para más detalles del servidor

---

## Próximos Pasos

Una vez que configures las Redirect URLs, el OAuth debería funcionar correctamente. Si sigues teniendo problemas, comparte:
1. Los errores exactos de la consola del navegador
2. Los logs de Vercel
3. Una captura de pantalla de la configuración de Redirect URLs en Supabase
