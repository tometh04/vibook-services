# 🚨 Solución: Error 403 en Checkout de Mercado Pago (No permite agregar tarjeta)

## 🔍 Problema Identificado

El checkout de Mercado Pago carga, pero:
- ❌ No permite agregar tarjetas nuevas
- ❌ No permite usar tarjetas guardadas
- ❌ Error 403 en `secure-fields.mercadopago.com`
- ❌ Error 404 en recursos de background

---

## 🛠️ Posibles Causas y Soluciones

### Causa 1: Configuración de la Aplicación en Mercado Pago

**Problema:** La aplicación no está configurada correctamente o falta información.

**Solución:**

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación
3. Ve a **"Configuración"** o **"Credenciales"**
4. Verifica que estos campos estén completos:
   - ✅ **Nombre de la aplicación**
   - ✅ **Sitio web:** `https://vibookservicessaas.vercel.app`
   - ✅ **URL de redirección:** `https://vibookservicessaas.vercel.app/api/billing/callback` (si existe)
   - ✅ **Descripción**

5. **GUARDA** los cambios

### Causa 2: Permisos de la Aplicación

**Problema:** La aplicación no tiene los permisos necesarios para procesar pagos.

**Solución:**

1. En Mercado Pago Developers, verifica que tu aplicación tenga:
   - ✅ Permisos de pago habilitados
   - ✅ Estado activo (no en revisión)

2. Si la aplicación está en revisión, espera a que se apruebe o usa otra aplicación

### Causa 3: Preferencia mal configurada

**Problema:** La preferencia de pago no tiene todos los campos requeridos.

**Posible solución:** Agregar campos faltantes a la preferencia (revisar código)

### Causa 4: Modo Sandbox vs Producción

**Problema:** Estás usando credenciales de TEST pero la preferencia se está creando como producción.

**Verificación:**
- ✅ Verifica que estés usando el Access Token de **TEST** (debe empezar con `TEST-`)
- ✅ El checkout debe mostrar claramente "Sandbox de Mercado Pago"

---

## 🔍 Verificación Paso a Paso

### Paso 1: Verificar Credenciales en Vercel

1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `MERCADOPAGO_ACCESS_TOKEN` sea:
   ```
   TEST-3454575128482507-011109-8abbc6cff088f53a84522b49aea1ae9d-34941995
   ```
3. Debe empezar con `TEST-` (no `APP_USR-`)
4. Haz redeploy si lo cambiaste

### Paso 2: Verificar Configuración de la Aplicación

En Mercado Pago Developers:

1. **Nombre:** Vibook Gestión SaaS (o similar)
2. **Sitio web:** `https://vibookservicessaas.vercel.app`
3. **Estado:** Activo (no en revisión)
4. **Permisos:** Pagos habilitados

### Paso 3: Probar con una Preferencia Simple

Puedes probar crear una preferencia manualmente desde Mercado Pago Dashboard para verificar que la aplicación funciona.

---

## 🆘 Solución Alternativa: Crear Nueva Aplicación

Si nada funciona, puedes crear una nueva aplicación:

1. Ve a Mercado Pago Developers
2. Crea una **nueva aplicación**
3. Configura:
   - Nombre: `Vibook Gestión SaaS V2`
   - Sitio web: `https://vibookservicessaas.vercel.app`
   - Categoría: `Servicios`
4. Obtén el nuevo Access Token de TEST
5. Actualiza `MERCADOPAGO_ACCESS_TOKEN` en Vercel
6. Haz redeploy

---

## 📋 Información Necesaria

Para diagnosticar mejor, necesito:

1. **¿La aplicación está en estado "Activo" o "En revisión"?**
   - Ve a Mercado Pago Developers → Tu aplicación → Estado

2. **¿Tienes todos los campos completos en la configuración de la aplicación?**
   - Nombre, Sitio web, Descripción, etc.

3. **¿Qué aparece en "Permisos" o "Scopes" de la aplicación?**
   - Debe tener permisos de pago

4. **¿Probaste crear una preferencia manualmente desde Mercado Pago Dashboard?**
   - Si eso tampoco funciona, el problema es de la aplicación, no del código

---

## ✅ Checklist de Verificación

- [ ] Access Token de TEST configurado en Vercel (empieza con `TEST-`)
- [ ] Redeploy realizado después de configurar variables
- [ ] Aplicación en estado "Activo" (no en revisión)
- [ ] Todos los campos de la aplicación completos (Sitio web, etc.)
- [ ] Permisos de pago habilitados en la aplicación
- [ ] El checkout muestra "Sandbox de Mercado Pago" claramente

---

## 🔗 Enlaces Útiles

- **Mercado Pago Developers:** https://www.mercadopago.com.ar/developers/
- **Documentación de Preferencias:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/checkout-customization/preferences

---

**Última actualización:** 2026-01-10
