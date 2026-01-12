# 🔧 Solución: Error 403 en Campos de Tarjeta (Dominio Nuevo)

## 🚨 Problema

Los campos de tarjeta en Mercado Pago están bloqueados (grises) y no se puede escribir. Esto es causado por un error 403 en `secure-fields.mercadopago.com`.

**Causa:** El dominio `app.vibook.ai` no está correctamente configurado en Mercado Pago.

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar Configuración en Mercado Pago

1. **Ir a Mercado Pago Developers:**
   - Ve a: https://www.mercadopago.com.ar/developers/
   - Inicia sesión con tu cuenta

2. **Seleccionar tu aplicación:**
   - Haz clic en tu aplicación "Vibook Services" (o como la hayas nombrado)

3. **Ir a Información General:**
   - En el menú lateral, haz clic en **"Información general"**

4. **Verificar/Cambiar "URL del sitio en producción":**
   - Busca el campo **"URL del sitio en producción"**
   - **DEBE ser exactamente:** `https://app.vibook.ai`
   - ⚠️ **IMPORTANTE:**
     - ✅ Correcto: `https://app.vibook.ai` (sin barra al final)
     - ❌ Incorrecto: `https://vibookservicessaas.vercel.app`
     - ❌ Incorrecto: `https://app.vibook.ai/`
     - ❌ Incorrecto: `http://app.vibook.ai` (sin HTTPS)

5. **Guardar cambios:**
   - Haz clic en **"Guardar"** o **"Actualizar"**
   - Espera a que se guarde (puede tardar unos segundos)

---

### Paso 2: Esperar Propagación

**⏰ IMPORTANTE:** Después de cambiar la URL, Mercado Pago puede tardar **5-15 minutos** en actualizar la configuración.

**Qué hacer:**
1. Espera 5-15 minutos después de guardar
2. Cierra completamente el navegador (no solo la pestaña)
3. Abre el navegador de nuevo
4. Intenta el checkout nuevamente

---

### Paso 3: Verificar que Funciona

1. **Ir a tu aplicación:**
   - Ve a: `https://app.vibook.ai/pricing`
   - Haz clic en "Elegir Plan" para cualquier plan (STARTER o PRO)

2. **Verificar campos de tarjeta:**
   - Los campos de tarjeta deberían estar **habilitados** (no grises)
   - Deberías poder escribir en el campo "Número de tarjeta"
   - No debería haber errores en la consola del navegador

3. **Si sigue sin funcionar:**
   - Verifica que esperaste al menos 15 minutos
   - Verifica que cerraste y abriste el navegador de nuevo
   - Verifica que la URL en Mercado Pago es exactamente `https://app.vibook.ai`

---

## 🔍 Verificación Adicional

### Verificar en la Consola del Navegador

1. **Abrir DevTools:**
   - Presiona `F12` o `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Ve a la pestaña **"Console"**

2. **Buscar errores:**
   - Busca errores que contengan `403` o `secure-fields.mercadopago.com`
   - Si ves errores 403, significa que la configuración aún no se propagó

3. **Verificar Network:**
   - Ve a la pestaña **"Network"**
   - Filtra por `secure-fields`
   - Verifica que las requests a `secure-fields.mercadopago.com` retornen **200 OK** (no 403)

---

## 🐛 Si Aún No Funciona

### Opción 1: Verificar que el Dominio Está Verificado

1. **En Mercado Pago:**
   - Ve a **"Información general"**
   - Verifica que el dominio `app.vibook.ai` esté listado y verificado
   - Si no está verificado, sigue las instrucciones para verificarlo

### Opción 2: Limpiar Cache del Navegador

1. **Chrome/Edge:**
   - Presiona `Cmd+Shift+Delete` (Mac) o `Ctrl+Shift+Delete` (Windows)
   - Selecciona "Caché" o "Cached images and files"
   - Haz clic en "Borrar datos"

2. **Firefox:**
   - Presiona `Cmd+Shift+Delete` (Mac) o `Ctrl+Shift+Delete` (Windows)
   - Selecciona "Caché"
   - Haz clic en "Limpiar ahora"

3. **Safari:**
   - Ve a Safari → Preferencias → Avanzado
   - Marca "Mostrar menú Desarrollo"
   - Ve a Desarrollo → Vaciar cachés

### Opción 3: Probar en Modo Incógnito

1. Abre una ventana de incógnito/privada
2. Ve a `https://app.vibook.ai/pricing`
3. Intenta el checkout de nuevo

---

## 📋 Checklist de Verificación

Antes de reportar que no funciona, verifica:

- [ ] En Mercado Pago → Información general → "URL del sitio en producción" = `https://app.vibook.ai`
- [ ] Guardaste los cambios en Mercado Pago
- [ ] Esperaste al menos 15 minutos después de guardar
- [ ] Cerraste y abriste el navegador completamente
- [ ] Limpiaste el cache del navegador
- [ ] Probaste en modo incógnito
- [ ] Verificaste que no hay errores 403 en la consola del navegador
- [ ] Verificaste que las requests a `secure-fields.mercadopago.com` retornan 200 OK

---

## 🆘 Contactar Soporte de Mercado Pago

Si después de seguir todos los pasos aún no funciona:

1. **Contactar soporte:**
   - Ve a: https://www.mercadopago.com.ar/developers/support
   - Explica que los campos de tarjeta están bloqueados con error 403
   - Menciona que el dominio configurado es `https://app.vibook.ai`
   - Incluye una captura de pantalla del error en la consola

2. **Información a proporcionar:**
   - URL del sitio: `https://app.vibook.ai`
   - ID de la aplicación de Mercado Pago
   - Captura de pantalla del error 403 en la consola
   - Captura de pantalla de la configuración en "Información general"

---

## ✅ Confirmación de que Funciona

Cuando funcione correctamente, deberías ver:

- ✅ Los campos de tarjeta están **habilitados** (no grises)
- ✅ Puedes escribir en el campo "Número de tarjeta"
- ✅ Puedes escribir en el campo "Nombre del titular"
- ✅ Puedes escribir en el campo "Vencimiento"
- ✅ Puedes escribir en el campo "Código de seguridad"
- ✅ No hay errores 403 en la consola del navegador
- ✅ Las requests a `secure-fields.mercadopago.com` retornan 200 OK

---

**Última actualización:** 2026-01-11
