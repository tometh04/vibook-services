# 🔴 SOLUCIÓN AL ERROR 500 - MIDDLEWARE_INVOCATION_FAILED

## ⚠️ Problema Identificado

El error `MIDDLEWARE_INVOCATION_FAILED` persiste incluso después de:
- ✅ Simplificar el middleware al máximo (solo retorna `NextResponse.next()`)
- ✅ Remover toda lógica de Supabase del middleware
- ✅ Verificar que todas las rutas públicas estén configuradas correctamente
- ✅ Verificar que `sonner` esté instalado

**Esto significa que el problema NO está en el middleware**, sino en otra parte.

## 🔍 Diagnóstico

Si incluso `/api/test` (endpoint mínimo) está fallando con error 500, entonces el problema debe estar en:

1. **Variables de Entorno No Configuradas** (MÁS PROBABLE)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

2. **Error en el Build de Next.js** (no visible en logs)
   - Build exitoso pero código generado tiene errores

3. **Problema con el Runtime de Vercel**
   - Edge Runtime vs Node.js Runtime
   - Configuración incorrecta del proyecto

4. **Error en el Layout Root** (`app/layout.tsx`)
   - Componentes globales causando errores
   - ThemeProvider o Toaster causando problemas

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Verificar Variables de Entorno en Vercel

1. Ve a **Vercel Dashboard**: https://vercel.com/dashboard
2. Selecciona el proyecto **vibook-services**
3. Ve a **Settings** → **Environment Variables**
4. **VERIFICA** que estas variables estén configuradas:
   - `NEXT_PUBLIC_SUPABASE_URL` (debe empezar con `https://`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (debe ser un string largo)
   - `SUPABASE_SERVICE_ROLE_KEY` (debe ser un string largo)
   - `NEXT_PUBLIC_APP_URL` (debe ser `https://vibookservicessaas.vercel.app`)

5. Si falta alguna variable, **AGREGALA** y haz **redeploy**

### Paso 2: Ver Logs de Runtime en Vercel

1. Ve a **Deployments** → Último deploy
2. Click en **Functions** o **Runtime Logs**
3. **Copia y comparte** los errores que aparecen ahí

Los logs te mostrarán:
- Qué error específico está ocurriendo
- En qué archivo está fallando
- Qué línea está causando el problema

### Paso 3: Verificar Build Logs

1. Ve a **Deployments** → Último deploy
2. Click en **Build Logs**
3. Verifica si hay **warnings** o **errores** que no se están mostrando como críticos

### Paso 4: Probar Localmente en Modo Producción

Ejecuta estos comandos localmente:

```bash
cd maxeva-saas
npm run build
npm start
```

Si funciona localmente pero no en Vercel, el problema está en:
- Variables de entorno
- Configuración de Vercel
- Runtime de Vercel

Si NO funciona localmente, entonces el problema está en el código.

## 🔧 Solución Temporal: Simplificar Layout

Si el problema está en el layout, puedes probar simplificándolo temporalmente:

```typescript
// app/layout.tsx - VERSIÓN SIMPLIFICADA PARA DEBUG
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Vibook Gestión",
  description: "Sistema de gestión",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

Si esto funciona, entonces el problema está en `ThemeProvider` o `Toaster`.

## 📋 Checklist de Verificación

- [ ] Variables de entorno configuradas en Vercel
- [ ] Redeploy después de configurar variables
- [ ] Logs de runtime revisados
- [ ] Logs de build revisados
- [ ] Probar localmente en modo producción
- [ ] Verificar que `package.json` tenga todas las dependencias
- [ ] Verificar que `node_modules` esté actualizado

## 🆘 Próximos Pasos

**Sin los logs de Vercel, no puedo diagnosticar el problema específico.** Por favor:

1. **Comparte los logs de runtime de Vercel** (Functions/Runtime Logs)
2. **Comparte los logs de build** si hay warnings o errores
3. **Confirma que las variables de entorno están configuradas**

Con esa información, podré identificar y solucionar el problema específico.

---

**NOTA**: El middleware está completamente simplificado ahora. Una vez que resolvamos el error 500, podremos restaurar la lógica de autenticación gradualmente.
