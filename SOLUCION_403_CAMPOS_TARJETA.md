# 🚨 Solución: No se puede escribir en campos de tarjeta (Error 403)

## 🔍 Problema Identificado

- ✅ El webhook funciona correctamente (200 OK)
- ❌ No se puede escribir en los campos de tarjeta, CVV, vencimiento
- ❌ Error 403 en `secure-fields.mercadopago.com` en la consola
- ❌ Solo permite escribir el nombre del titular

**Causa:** Mercado Pago está bloqueando los campos seguros porque la aplicación no está correctamente configurada o el dominio no está autorizado.

---

## ✅ Solución: Verificar Configuración Completa de la Aplicación

### Paso 1: Verificar "Sitio web" en Información General

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación **"Vibook Services"**
3. Ve a **"Información general"** o **"Detalles de la aplicación"**
4. Verifica que el campo **"URL del sitio en producción"** esté configurado:
   ```
   https://vibookservicessaas.vercel.app
   ```
5. **IMPORTANTE:** Debe ser exactamente tu dominio, sin `/` al final
6. Haz clic en **"Guardar"** o **"Actualizar"**

### Paso 2: Verificar URLs de Redirección en Configuraciones Avanzadas

1. En la misma aplicación, ve a **"Configuraciones avanzadas"**
2. En **"URLs de redireccionamiento"**, verifica que estén configuradas:
   - `https://vibookservicessaas.vercel.app/settings/billing?status=success`
   - `https://vibookservicessaas.vercel.app/pricing?status=failure`
   - `https://vibookservicessaas.vercel.app/settings/billing?status=pending`
3. Haz clic en **"Guardar cambios"**

### Paso 3: Verificar Estado de la Aplicación

1. En **"Información general"**, verifica el **estado**:
   - ✅ Debe estar en **"Activo"** o **"Habilitado"**
   - ❌ Si está en **"En revisión"**, debes esperar la aprobación

### Paso 4: Esperar y Limpiar Cache

1. **Espera 10-15 minutos** después de guardar los cambios
2. **Limpia el cache del navegador:**
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) o `Cmd+Shift+Delete` (Mac)
   - Selecciona "Caché" y "Cookies"
   - Período: "Última hora" o "Todo el tiempo"
3. **Cierra completamente el navegador**
4. **Vuelve a abrir** y prueba nuevamente

---

## 🔍 Verificación Adicional

### Verificar que el Dominio Coincida

El dominio configurado en Mercado Pago debe coincidir **exactamente** con el que estás usando:

- ✅ Correcto: `https://vibookservicessaas.vercel.app`
- ❌ Incorrecto: `https://vibookservicessaas.vercel.app/`
- ❌ Incorrecto: `http://vibookservicessaas.vercel.app` (sin HTTPS)
- ❌ Incorrecto: `vibookservicessaas.vercel.app` (sin protocolo)

### Verificar en Modo Producción vs Prueba

Si estás usando credenciales de **producción**:
- Asegúrate de estar en **"Modo productivo"** en la configuración de Webhooks
- El dominio debe estar configurado en **"URL del sitio en producción"**

Si estás usando credenciales de **test**:
- Asegúrate de estar en **"Modo de prueba"** en la configuración de Webhooks
- El dominio puede estar en **"URL para prueba"** (si existe)

---

## 🆘 Si Nada Funciona: Crear Nueva Aplicación

Si después de verificar todo sigue sin funcionar:

1. Ve a Mercado Pago Developers
2. Haz clic en **"Crear aplicación"**
3. Completa **TODOS** los campos desde el inicio:
   - **Nombre:** `Vibook Gestión SaaS V3`
   - **Descripción:** `Sistema de gestión para agencias de viajes`
   - **Categoría:** `Transporte/Turismo` o `Servicios`
   - **URL del sitio en producción:** `https://vibookservicessaas.vercel.app` ⚠️ MUY IMPORTANTE
   - **Tipo de solución:** Pagos online
   - **Plataforma e-commerce:** No
   - **Producto:** Suscripciones
4. **Guarda** la aplicación
5. Ve a **"Configuraciones avanzadas"**:
   - Agrega las 3 URLs de redirección
   - Guarda
6. Obtén el nuevo **Access Token de PRODUCCIÓN**
7. Actualiza `MERCADOPAGO_ACCESS_TOKEN` en Vercel
8. Haz redeploy
9. Configura el webhook nuevamente

---

## ⚠️ Importante: Diferencias entre Test y Producción

### Si estás en PRODUCCIÓN (credenciales APP_USR-):
- El dominio debe estar en **"URL del sitio en producción"**
- Los pagos son **REALES**
- Mercado Pago es más estricto con la configuración

### Si estás en TEST (credenciales TEST-):
- Puede haber limitaciones en funcionalidades
- Los pagos son ficticios
- Puede ser más permisivo con la configuración

---

## 📋 Checklist de Verificación

- [ ] "URL del sitio en producción" configurada correctamente
- [ ] URLs de redirección configuradas en Configuraciones avanzadas
- [ ] Aplicación en estado "Activo" (no en revisión)
- [ ] Esperaste 10-15 minutos después de guardar
- [ ] Limpiaste el cache del navegador
- [ ] Cerraste y volviste a abrir el navegador
- [ ] Probaste en modo incógnito/privado

---

## 🔍 Debug: Verificar en Logs de Vercel

1. Ve a Vercel → Deployments → Último deployment → Functions
2. Revisa los logs de `/api/billing/checkout`
3. Verifica que la preferencia se cree correctamente
4. Verifica que la URL `init_point` sea correcta

---

## 🆘 Contactar Soporte de Mercado Pago

Si después de todo sigue sin funcionar:

1. Contacta a Soporte de Mercado Pago:
   - https://www.mercadopago.com.ar/developers/support
2. Explica:
   - Recibes error 403 en secure-fields
   - No puedes escribir en campos de tarjeta
   - El webhook funciona correctamente
   - La aplicación está en producción
   - El dominio está configurado: `https://vibookservicessaas.vercel.app`

---

**Última actualización:** 2026-01-11
