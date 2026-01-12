# 🔧 Solución Definitiva: Error 403 en Preapproval Plan

## 🎯 Situación Actual

Estás usando **Preapproval Plans** de Mercado Pago (NO Card Payment Brick), y el error 403 ocurre en la página de checkout de Mercado Pago, no en tu código.

**Flujo actual:**
1. Usuario hace clic en "Suscribirme" → Redirige a Mercado Pago
2. Mercado Pago muestra su página de checkout con los campos de tarjeta
3. Los campos están bloqueados (error 403) → **Este es el problema**

---

## 🔍 Causa Real

El Preapproval Plan **no tiene el dominio `app.vibook.ai` autorizado**. Aunque la aplicación de Mercado Pago tenga el dominio configurado, el Preapproval Plan necesita su propia autorización.

---

## ✅ Solución: Verificar y Configurar el Preapproval Plan

### Paso 1: Ir al Preapproval Plan en Mercado Pago

1. **Ve a Mercado Pago:**
   - https://www.mercadopago.com.ar/subscriptions
   - O desde Developers → Suscripciones

2. **Busca tu plan:**
   - Busca el plan con ID: `5e365ad7ca4540a5a0fd28511fa5ac46`
   - O busca "Plan Test" o el nombre que le diste

3. **Haz clic en el plan para ver los detalles**

---

### Paso 2: Verificar Configuración del Plan

**Campos a verificar:**

1. **"URL de retorno" o "Return URL":**
   - Debe ser: `https://app.vibook.ai/api/billing/preapproval-callback`
   - O al menos: `https://app.vibook.ai`

2. **"Sitio web" o "Website":**
   - Debe ser: `https://app.vibook.ai`

3. **"Dominio autorizado" o "Authorized domain":**
   - Debe ser: `app.vibook.ai` o `https://app.vibook.ai`

4. **"Origen permitido" o "Allowed origin":**
   - Debe incluir: `https://app.vibook.ai`

---

### Paso 3: Si NO Puedes Editar el Preapproval Plan

**Los Preapproval Plans a veces NO permiten editar el dominio después de crearlos.**

**Solución: Crear un NUEVO Preapproval Plan**

#### 3.1 Crear Nuevo Plan

1. **Ve a Mercado Pago → Suscripciones → Crear plan**

2. **Configura el plan:**
   - **Nombre:** `Vibook Starter` o `Starter - Vibook Gestión`
   - **Descripción:** `Suscripción mensual Starter para Vibook Gestión`
   - **Monto:** `15000` ARS
   - **Frecuencia:** Mensual (30 días)
   - **URL de retorno:** `https://app.vibook.ai/api/billing/preapproval-callback`
   - **Sitio web:** `https://app.vibook.ai` (si hay campo)
   - **Dominio autorizado:** `app.vibook.ai` (si hay campo)

3. **Guardar el plan**

4. **Copiar el nuevo Preapproval Plan ID:**
   - Después de crear, copia el nuevo ID (será diferente a `5e365ad7ca4540a5a0fd28511fa5ac46`)

#### 3.2 Actualizar el Código

Una vez que tengas el nuevo ID, avísame y actualizo el código con el nuevo Preapproval Plan ID.

---

### Paso 4: Verificar la Aplicación de Mercado Pago

Aunque el Preapproval Plan es lo más importante, también verifica la aplicación:

1. **Ve a:** https://www.mercadopago.com.ar/developers/
2. **Selecciona tu aplicación:** "Vibook Services"
3. **Ve a "Información general":**
   - **"URL del sitio en producción"** debe ser: `https://app.vibook.ai`
4. **Guarda** si hiciste cambios

---

### Paso 5: Esperar y Probar

1. **Espera 15-30 minutos** después de crear/configurar el plan
2. **Cierra completamente el navegador**
3. **Abre el navegador de nuevo**
4. **Limpia el cache:**
   - `Cmd+Shift+Delete` (Mac) o `Ctrl+Shift+Delete` (Windows)
   - Selecciona "Caché" y "Cookies"
5. **Prueba nuevamente:**
   - Ve a `https://app.vibook.ai/pricing`
   - Haz clic en "Suscribirme" para STARTER
   - Verifica que los campos de tarjeta funcionen

---

## 🆘 Si Nada Funciona: Contactar Soporte de Mercado Pago

Si después de crear un nuevo plan y esperar 30 minutos sigue sin funcionar:

1. **Contacta soporte:**
   - https://www.mercadopago.com.ar/developers/support

2. **Explica:**
   - Tienes un Preapproval Plan para suscripciones
   - Los campos de tarjeta están bloqueados (error 403 en secure-fields)
   - El dominio `https://app.vibook.ai` está configurado en la aplicación
   - Necesitas que autoricen el dominio para el Preapproval Plan
   - El Preapproval Plan ID es: `5e365ad7ca4540a5a0fd28511fa5ac46` (o el nuevo si creaste uno)

3. **Información a proporcionar:**
   - Preapproval Plan ID
   - Dominio: `https://app.vibook.ai`
   - Application ID (de tu aplicación en Mercado Pago)
   - Captura de pantalla del error 403 en la consola
   - Captura de pantalla de la configuración del Preapproval Plan

---

## 📋 Checklist Completo

- [ ] Verificaste la aplicación de Mercado Pago → "URL del sitio" = `https://app.vibook.ai`
- [ ] Intentaste editar el Preapproval Plan existente (si es posible)
- [ ] Creaste un nuevo Preapproval Plan con el dominio correcto
- [ ] Copiaste el nuevo Preapproval Plan ID
- [ ] Actualizaste el código con el nuevo ID (o me avisaste para actualizarlo)
- [ ] Esperaste 30 minutos después de crear/configurar
- [ ] Cerraste y abriste el navegador completamente
- [ ] Limpiaste el cache del navegador
- [ ] Probaste en modo incógnito
- [ ] Verificaste que no hay errores 403 en la consola

---

## ⚠️ Nota Importante

**El problema NO es del código.** Estamos usando el botón HTML de Mercado Pago que redirige a su página de checkout. El error 403 ocurre en la página de Mercado Pago, no en nuestro código.

**El problema ES de configuración** del Preapproval Plan en Mercado Pago. El plan necesita tener el dominio autorizado explícitamente.

---

## 🔄 Próximos Pasos

1. **Intenta editar el Preapproval Plan existente** (si es posible)
2. **Si no puedes editarlo, crea un nuevo plan** con el dominio correcto desde el inicio
3. **Avísame el nuevo Preapproval Plan ID** y actualizo el código
4. **Espera 30 minutos y prueba**

---

**Última actualización:** 2026-01-11
