# 🔧 Solución: Error 403 en Campos de Tarjeta con Preapproval Plan

## 🚨 Problema

Los campos de tarjeta en Mercado Pago están bloqueados (no se puede escribir) incluso usando Preapproval Plans. El iframe se renderiza pero los campos no son interactivos.

**Síntomas:**
- ✅ El formulario de Mercado Pago carga correctamente
- ✅ Los campos son visibles (número de tarjeta, vencimiento, CVC)
- ❌ Los campos están bloqueados/grises (no se puede escribir)
- ❌ Error 403 en `secure-fields.mercadopago.com` en la consola
- ⚠️ Se ve una "barra" horizontal en los campos (indicando que el iframe está bloqueado)

---

## 🔍 Causa Raíz

El error 403 en `secure-fields.mercadopago.com` ocurre porque:

1. **El Preapproval Plan no tiene el dominio autorizado**
2. **La aplicación de Mercado Pago no tiene el dominio configurado correctamente**
3. **El Preapproval Plan fue creado antes de configurar el dominio**

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar Configuración de la Aplicación en Mercado Pago

1. **Ir a Mercado Pago Developers:**
   - Ve a: https://www.mercadopago.com.ar/developers/
   - Inicia sesión

2. **Seleccionar tu aplicación:**
   - Haz clic en tu aplicación "Vibook Services"

3. **Ir a "Información general":**
   - En el menú lateral, haz clic en **"Información general"**

4. **Verificar "URL del sitio en producción":**
   - **DEBE ser exactamente:** `https://app.vibook.ai`
   - ⚠️ **IMPORTANTE:**
     - ✅ Correcto: `https://app.vibook.ai` (sin barra al final)
     - ❌ Incorrecto: `https://vibookservicessaas.vercel.app`
     - ❌ Incorrecto: `https://app.vibook.ai/`
     - ❌ Incorrecto: `http://app.vibook.ai` (sin HTTPS)

5. **Guardar cambios:**
   - Haz clic en **"Guardar"** o **"Actualizar"**
   - Espera a que se guarde

---

### Paso 2: Verificar/Actualizar el Preapproval Plan

1. **Ir a Suscripciones en Mercado Pago:**
   - Ve a: https://www.mercadopago.com.ar/subscriptions
   - O desde Developers → Suscripciones

2. **Buscar tu Preapproval Plan:**
   - Busca el plan con ID: `5e365ad7ca4540a5a0fd28511fa5ac46`
   - O busca "Plan Test" o el nombre que le diste

3. **Editar el Preapproval Plan:**
   - Haz clic en el plan
   - Busca la opción **"Editar"** o **"Configuración"**

4. **Verificar/Actualizar "URL de retorno":**
   - Debe ser: `https://app.vibook.ai/api/billing/preapproval-callback`
   - O al menos: `https://app.vibook.ai`

5. **Verificar "Dominio autorizado":**
   - Si hay un campo para "Dominio autorizado" o "Sitio web", debe ser: `https://app.vibook.ai`

6. **Guardar cambios:**
   - Haz clic en **"Guardar"** o **"Actualizar"**

---

### Paso 3: Si el Preapproval Plan No Permite Editar el Dominio

**Opción A: Crear un Nuevo Preapproval Plan**

1. **Crear nuevo plan:**
   - Ve a Mercado Pago → Suscripciones → Crear plan
   - **Nombre:** "Vibook Starter" o "Starter - Vibook Gestión"
   - **Monto:** $15,000 ARS
   - **Frecuencia:** Mensual
   - **URL de retorno:** `https://app.vibook.ai/api/billing/preapproval-callback`
   - **Dominio autorizado:** `https://app.vibook.ai` (si hay campo)

2. **Copiar el nuevo Preapproval Plan ID:**
   - Después de crear, copia el nuevo ID

3. **Actualizar el código:**
   - Actualiza el `preapproval_plan_id` en `app/(dashboard)/pricing/page.tsx`

**Opción B: Contactar Soporte de Mercado Pago**

Si no puedes editar el Preapproval Plan:

1. Contacta a soporte: https://www.mercadopago.com.ar/developers/support
2. Explica que:
   - Tienes un Preapproval Plan con ID `5e365ad7ca4540a5a0fd28511fa5ac46`
   - Los campos de tarjeta están bloqueados (error 403)
   - Necesitas autorizar el dominio `https://app.vibook.ai` para este plan
   - La aplicación ya tiene el dominio configurado en "Información general"

---

### Paso 4: Esperar Propagación

**⏰ IMPORTANTE:** Después de cambiar cualquier configuración:

1. **Espera 15-30 minutos** para que Mercado Pago actualice la configuración
2. **Cierra completamente el navegador** (no solo la pestaña)
3. **Abre el navegador de nuevo**
4. **Limpia el cache:**
   - Chrome/Edge: `Cmd+Shift+Delete` (Mac) o `Ctrl+Shift+Delete` (Windows)
   - Selecciona "Caché" y "Cookies"
   - Período: "Última hora" o "Todo el tiempo"
5. **Prueba nuevamente**

---

### Paso 5: Verificar que Funciona

1. **Ir a tu aplicación:**
   - Ve a: `https://app.vibook.ai/pricing`
   - Haz clic en "Suscribirme" para el plan STARTER

2. **Verificar campos de tarjeta:**
   - Los campos deberían estar **habilitados** (no grises)
   - Deberías poder escribir en el campo "Número de tarjeta"
   - No debería haber errores 403 en la consola del navegador

3. **Verificar en la consola:**
   - Abre DevTools (F12)
   - Ve a la pestaña **"Network"**
   - Filtra por `secure-fields`
   - Verifica que las requests a `secure-fields.mercadopago.com` retornen **200 OK** (no 403)

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
   - Verifica que las requests retornen **200 OK** (no 403)

---

## 🐛 Si Aún No Funciona Después de 30 Minutos

### Opción 1: Verificar que el Dominio Está Verificado

1. **En Mercado Pago:**
   - Ve a **"Información general"**
   - Verifica que el dominio `app.vibook.ai` esté listado y verificado
   - Si no está verificado, sigue las instrucciones para verificarlo

### Opción 2: Crear Nueva Aplicación y Preapproval Plan

1. **Crear nueva aplicación:**
   - Crea una nueva aplicación desde cero en Mercado Pago
   - Configura el dominio `https://app.vibook.ai` desde el inicio
   - Obtén el nuevo Access Token

2. **Crear nuevo Preapproval Plan:**
   - Crea un nuevo plan con el dominio correcto desde el inicio
   - Copia el nuevo Preapproval Plan ID

3. **Actualizar código:**
   - Actualiza `MERCADOPAGO_ACCESS_TOKEN` en Vercel
   - Actualiza el `preapproval_plan_id` en el código
   - Haz redeploy

### Opción 3: Contactar Soporte de Mercado Pago

1. **Contactar soporte:**
   - Ve a: https://www.mercadopago.com.ar/developers/support
   - Explica:
     - Tienes un Preapproval Plan con ID `5e365ad7ca4540a5a0fd28511fa5ac46`
     - Los campos de tarjeta están bloqueados (error 403)
     - El dominio `https://app.vibook.ai` está configurado en "Información general"
     - Necesitas que autoricen el dominio para el Preapproval Plan

2. **Información a proporcionar:**
   - Preapproval Plan ID: `5e365ad7ca4540a5a0fd28511fa5ac46`
   - Dominio: `https://app.vibook.ai`
   - Application ID: (el ID de tu aplicación)
   - Captura de pantalla del error 403 en la consola
   - Captura de pantalla de la configuración en "Información general"

---

## 📋 Checklist de Verificación

Antes de reportar que no funciona, verifica:

- [ ] En Mercado Pago → Información general → "URL del sitio en producción" = `https://app.vibook.ai`
- [ ] Guardaste los cambios en la aplicación
- [ ] Verificaste/actualizaste el Preapproval Plan (si es posible)
- [ ] Esperaste al menos 30 minutos después de guardar
- [ ] Cerraste y abriste el navegador completamente
- [ ] Limpiaste el cache del navegador
- [ ] Probaste en modo incógnito
- [ ] Verificaste que no hay errores 403 en la consola del navegador
- [ ] Verificaste que las requests a `secure-fields.mercadopago.com` retornan 200 OK

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
- ✅ El iframe tiene el tamaño correcto (no se ve una "barra" bloqueando el campo)

---

**Última actualización:** 2026-01-11
