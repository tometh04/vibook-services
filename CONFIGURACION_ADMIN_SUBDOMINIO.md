# 🔒 Configuración del Panel de Admin en Subdominio Separado

## 🎯 Objetivo

El panel de administración está configurado para funcionar **exclusivamente** en el subdominio `admin.vibook.ai`, separado de la aplicación principal. Esto proporciona una capa adicional de seguridad.

---

## 🔐 Seguridad Implementada

### 1. **Subdominio Exclusivo**
- El panel de admin **solo** funciona en `admin.vibook.ai`
- Si alguien intenta acceder a `/admin` desde `app.vibook.ai`, será bloqueado
- El middleware detecta el subdominio y aplica reglas diferentes

### 2. **Autenticación Basic Auth**
- **Usuario:** `admin@vibook.ai`
- **Contraseña:** `_Vibook042308`
- El navegador pedirá estas credenciales antes de mostrar cualquier contenido

### 3. **Verificación de Rol**
- Después de Basic Auth, se verifica que el usuario tenga rol `SUPER_ADMIN`
- Si no es SUPER_ADMIN, se redirige al dashboard

---

## 📋 Configuración en Vercel

### Paso 1: Agregar Dominio Personalizado

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Ve a **Settings** → **Domains**
3. Agrega el dominio: `admin.vibook.ai`
4. Vercel te dará instrucciones para configurar el DNS

### Paso 2: Configurar DNS

En tu proveedor de DNS (donde está configurado `vibook.ai`):

1. Agrega un registro **CNAME**:
   - **Nombre:** `admin`
   - **Valor:** `cname.vercel-dns.com` (o el que Vercel te indique)
   - **TTL:** 3600 (o el que prefieras)

2. Espera a que se propague (puede tardar unos minutos)

### Paso 3: Verificar en Vercel

1. Vercel verificará automáticamente el dominio
2. Una vez verificado, `admin.vibook.ai` apuntará a tu aplicación
3. El middleware detectará el subdominio y aplicará las reglas de seguridad

---

## 🔄 Cómo Funciona

### Flujo de Acceso a Admin:

1. **Usuario accede a `admin.vibook.ai`**
   - El middleware detecta el subdominio `admin.`
   - Verifica Basic Auth (usuario/contraseña)
   - Si no tiene Basic Auth → Error 401

2. **Usuario ingresa credenciales Basic Auth**
   - Usuario: `admin@vibook.ai`
   - Contraseña: `_Vibook042308`
   - Si son incorrectas → Error 401

3. **Verificación de sesión**
   - El middleware verifica que el usuario esté autenticado en Supabase
   - Si no está autenticado → Redirige a `/login`

4. **Verificación de rol**
   - El layout del admin verifica que el usuario sea `SUPER_ADMIN`
   - Si no es SUPER_ADMIN → Redirige a `/dashboard`

5. **Acceso al panel**
   - Si pasa todas las verificaciones → Muestra el panel de admin

### Bloqueo de Acceso desde App Principal:

- Si alguien intenta acceder a `/admin` desde `app.vibook.ai`:
  - El middleware detecta que NO viene del subdominio admin
  - Redirige automáticamente a `/dashboard`
  - No puede ver el panel de admin

---

## ✅ Ventajas de Esta Configuración

1. **Separación física:** El admin está en un subdominio diferente
2. **Doble autenticación:** Basic Auth + verificación de rol
3. **Bloqueo automático:** No se puede acceder desde la app principal
4. **Más seguro:** Incluso si alguien encuentra la ruta `/admin`, no puede acceder desde `app.vibook.ai`

---

## 🧪 Pruebas

### Probar Acceso Correcto:

1. Ir a `https://admin.vibook.ai/admin`
2. El navegador pedirá usuario y contraseña
3. Ingresar: `admin@vibook.ai` / `_Vibook042308`
4. Debe mostrar el panel de admin

### Probar Bloqueo:

1. Ir a `https://app.vibook.ai/admin`
2. Debe redirigir automáticamente a `/dashboard`
3. No debe mostrar el panel de admin

---

## 🔧 Troubleshooting

### El subdominio no funciona:

1. Verifica que el DNS esté configurado correctamente
2. Verifica que Vercel haya verificado el dominio
3. Espera unos minutos para la propagación del DNS

### Basic Auth no aparece:

1. Verifica que estés accediendo desde `admin.vibook.ai` (no `app.vibook.ai`)
2. Limpia el cache del navegador
3. Prueba en modo incógnito

### Error 403:

- Verifica que el usuario tenga rol `SUPER_ADMIN` en la base de datos
- Verifica que el usuario esté autenticado en Supabase

---

**Última actualización:** 2026-01-11
