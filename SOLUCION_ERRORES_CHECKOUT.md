# 🚨 Solución: Errores 403/404 en Checkout de Mercado Pago

## 🔍 Problema Identificado

En la consola del navegador aparecen múltiples errores al intentar pagar:
- ❌ `403 Forbidden` en `secure-fields.mercadopago.com`
- ❌ `404 Not Found` en recursos de background de Mercado Pago
- ❌ No permite agregar tarjetas nuevas
- ❌ No permite usar tarjetas guardadas

**Esto NO es un problema del código**, sino de la **configuración de la aplicación en Mercado Pago**.

---

## ✅ Solución Paso a Paso

### 1. Verificar Configuración de la Aplicación

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación **"Vibook Services"**
3. Ve a **"Información general"** o **"Detalles de la aplicación"**
4. Verifica que **TODOS** estos campos estén completos:

   - ✅ **Nombre:** Vibook Services (o similar)
   - ✅ **Sitio web:** `https://vibookservicessaas.vercel.app` (MUY IMPORTANTE)
   - ✅ **Descripción:** Descripción completa de la aplicación
   - ✅ **Categoría:** Servicios (o la que corresponda)

5. **IMPORTANTE:** El campo **"Sitio web"** DEBE estar configurado y debe coincidir exactamente con tu dominio.

6. Haz clic en **"Guardar"** o **"Actualizar"**

### 2. Verificar Estado de la Aplicación

1. En la misma página, verifica el **estado** de la aplicación:
   - ✅ Debe estar en estado **"Activo"** o **"Habilitado"**
   - ❌ Si está en **"En revisión"**, debes esperar la aprobación

### 3. Verificar Permisos

1. Busca una sección llamada **"Permisos"**, **"Scopes"** o **"OAuth"**
2. Verifica que tenga permisos de:
   - ✅ Pagos
   - ✅ Preferencias de pago
   - ✅ Suscripciones

### 4. Limpiar Cache y Reintentar

1. Después de actualizar la configuración, espera **5-10 minutos**
2. Limpia el cache del navegador:
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) o `Cmd+Shift+Delete` (Mac)
   - Selecciona "Caché" y "Cookies"
3. Cierra y vuelve a abrir el navegador
4. Intenta el checkout nuevamente

---

## 🔍 ¿Por Qué Pasa Esto?

El error **403 Forbidden** en `secure-fields.mercadopago.com` ocurre porque:

1. **Mercado Pago verifica el dominio** antes de permitir usar secure-fields
2. Si el **"Sitio web"** no está configurado o no coincide, bloquea los recursos
3. Esto es una **medida de seguridad** de Mercado Pago

---

## 🆘 Si Nada Funciona: Crear Nueva Aplicación

Si después de verificar todo sigue sin funcionar:

1. Ve a Mercado Pago Developers
2. Haz clic en **"Crear aplicación"**
3. Completa **TODOS** los campos desde el inicio:
   - Nombre: `Vibook Gestión SaaS V2`
   - Descripción: `Sistema de gestión para agencias de viajes`
   - Categoría: `Servicios`
   - **Sitio web:** `https://vibookservicessaas.vercel.app` ⚠️ MUY IMPORTANTE
4. Guarda
5. Obtén el nuevo **Access Token de TEST**
6. Actualiza `MERCADOPAGO_ACCESS_TOKEN` en Vercel
7. Haz redeploy
8. Configura el webhook nuevamente

---

## ✅ Lo Que Está Funcionando

A pesar de los errores en el checkout, estas cosas SÍ están funcionando:
- ✅ El endpoint `/api/billing/checkout` responde correctamente
- ✅ La preferencia de pago se crea correctamente
- ✅ El checkout de Mercado Pago carga
- ✅ Se muestra correctamente en modo Sandbox
- ✅ Las tarjetas guardadas aparecen (aunque no se puedan usar)

**El único problema es que Mercado Pago no permite usar secure-fields porque la aplicación necesita estar completamente configurada.**

---

## 📋 Checklist de Verificación

- [ ] Todos los campos de la aplicación están completos (especialmente "Sitio web")
- [ ] El "Sitio web" coincide exactamente con tu dominio: `https://vibookservicessaas.vercel.app`
- [ ] La aplicación está en estado "Activo" (no en revisión)
- [ ] Guardaste los cambios en la aplicación
- [ ] Esperaste 5-10 minutos después de guardar
- [ ] Limpiaste el cache del navegador
- [ ] Reintentaste el checkout

---

## 🔗 Enlaces Útiles

- **Mercado Pago Developers:** https://www.mercadopago.com.ar/developers/
- **Documentación de Webhooks:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
- **Documentación de Notificaciones:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications

---

**Última actualización:** 2026-01-11
