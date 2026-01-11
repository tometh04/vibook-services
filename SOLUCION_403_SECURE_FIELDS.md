# 🚨 Solución: Error 403 en secure-fields.mercadopago.com

## 🔍 Problema Identificado

El checkout de Mercado Pago carga correctamente, pero:
- ❌ No permite agregar tarjetas nuevas
- ❌ No permite usar tarjetas guardadas
- ❌ Error 403 en `secure-fields.mercadopago.com`
- ❌ El botón "Pagar" probablemente no funciona

**Esto NO es un problema del código**, sino de la **configuración de la aplicación en Mercado Pago**.

---

## ✅ Solución: Verificar Configuración de la Aplicación

### Paso 1: Verificar Información de la Aplicación

1. Ve a: https://www.mercadopago.com.ar/developers/
2. Selecciona tu aplicación
3. Ve a **"Configuración"** o **"Credenciales"**
4. Verifica que estos campos estén **COMPLETOS**:

   - ✅ **Nombre:** Vibook Gestión SaaS (o similar)
   - ✅ **Sitio web:** `https://vibookservicessaas.vercel.app`
   - ✅ **URL de redirección:** `https://vibookservicessaas.vercel.app/api/billing/callback` (si existe)
   - ✅ **Descripción:** Descripción completa de la aplicación
   - ✅ **Categoría:** Servicios (o la que corresponda)

5. **IMPORTANTE:** Todos los campos deben estar completos, especialmente **"Sitio web"**

6. Haz clic en **"Guardar"** o **"Actualizar"**

### Paso 2: Verificar Estado de la Aplicación

1. En la misma página, verifica el **estado** de la aplicación:
   - ✅ Debe estar en estado **"Activo"** o **"Habilitado"**
   - ❌ Si está en **"En revisión"**, debes esperar la aprobación

2. Si está en revisión, puedes:
   - Esperar la aprobación (puede tardar horas/días)
   - O crear una nueva aplicación de prueba

### Paso 3: Verificar Permisos/Scopes

1. Busca una sección llamada **"Permisos"**, **"Scopes"** o **"OAuth"**
2. Verifica que tenga permisos de:
   - ✅ Pagos
   - ✅ Preferencias de pago
   - ✅ Suscripciones (si está disponible)

### Paso 4: Crear Nueva Aplicación (Si Nada Funciona)

Si la aplicación está en revisión o tiene problemas, crea una nueva:

1. Ve a Mercado Pago Developers
2. Haz clic en **"Crear aplicación"**
3. Completa **TODOS** los campos:
   - Nombre: `Vibook Gestión SaaS V2`
   - Descripción: `Sistema de gestión para agencias de viajes`
   - Categoría: `Servicios`
   - **Sitio web:** `https://vibookservicessaas.vercel.app` (IMPORTANTE)
   - URL de redirección: `https://vibookservicessaas.vercel.app/api/billing/callback`
4. Guarda
5. Obtén el nuevo **Access Token de TEST**
6. Actualiza `MERCADOPAGO_ACCESS_TOKEN` en Vercel
7. Haz redeploy

---

## 🔍 Información Importante

### ¿Por qué pasa esto?

El error 403 en `secure-fields.mercadopago.com` ocurre cuando:
- La aplicación no tiene la configuración completa
- La aplicación está en revisión
- Faltan permisos en la aplicación
- El dominio no está autorizado

### ¿Es un problema del código?

**NO.** El código está correcto. El checkout carga y la preferencia se crea correctamente. El problema es que Mercado Pago **no permite** usar secure-fields porque la aplicación no está correctamente configurada.

---

## 📋 Checklist de Verificación

- [ ] Todos los campos de la aplicación están completos (especialmente "Sitio web")
- [ ] La aplicación está en estado "Activo" (no en revisión)
- [ ] El sitio web configurado coincide con tu dominio: `https://vibookservicessaas.vercel.app`
- [ ] Guardaste los cambios en la aplicación
- [ ] (Opcional) Creaste una nueva aplicación si la anterior está en revisión

---

## 🆘 Si Nada Funciona

Si después de verificar todo sigue sin funcionar:

1. **Contacta a Soporte de Mercado Pago:**
   - https://www.mercadopago.com.ar/developers/support
   - Explica que recibes error 403 en secure-fields
   - Menciona que la aplicación está en modo TEST

2. **Crea una nueva aplicación** (más rápido):
   - A veces es más rápido crear una nueva aplicación limpia
   - Asegúrate de completar TODOS los campos
   - Especialmente el "Sitio web"

---

## ✅ Lo que Está Funcionando

A pesar del error, estas cosas SÍ están funcionando:
- ✅ El endpoint `/api/billing/checkout` responde correctamente (status 200)
- ✅ La preferencia de pago se crea correctamente
- ✅ El checkout de Mercado Pago carga
- ✅ Se muestra correctamente en modo Sandbox
- ✅ Las tarjetas guardadas aparecen

**El único problema es que Mercado Pago no permite usar secure-fields porque la aplicación necesita estar completamente configurada.**

---

**Última actualización:** 2026-01-11
