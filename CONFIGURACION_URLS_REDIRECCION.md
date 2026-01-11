# ✅ Configuración de URLs de Redirección en Mercado Pago

## 📋 URLs que Necesitas Configurar

En la sección **"URLs de redireccionamiento"** de las **Configuraciones avanzadas**, agrega estas URLs:

### URLs Requeridas:

1. **URL de éxito después del pago:**
   ```
   https://vibookservicessaas.vercel.app/settings/billing?status=success
   ```

2. **URL de fallo después del pago:**
   ```
   https://vibookservicessaas.vercel.app/pricing?status=failure
   ```

3. **URL de pendiente después del pago:**
   ```
   https://vibookservicessaas.vercel.app/settings/billing?status=pending
   ```

4. **URL base (para callbacks generales):**
   ```
   https://vibookservicessaas.vercel.app
   ```

---

## ✅ Paso a Paso

1. En **"URLs de redireccionamiento"**, haz clic en **"+ Agregar nueva URL"**

2. Agrega cada URL una por una:
   - Copia y pega cada URL de la lista de arriba
   - Haz clic en **"+ Agregar nueva URL"** para agregar la siguiente

3. Al final deberías tener **4 URLs** configuradas:
   - ✅ `https://vibookservicessaas.vercel.app/settings/billing?status=success`
   - ✅ `https://vibookservicessaas.vercel.app/pricing?status=failure`
   - ✅ `https://vibookservicessaas.vercel.app/settings/billing?status=pending`
   - ✅ `https://vibookservicessaas.vercel.app`

4. Haz clic en **"Guardar cambios"**

---

## 🔍 ¿Por Qué Estas URLs?

- **`/settings/billing?status=success`**: Usuario es redirigido aquí cuando el pago es exitoso
- **`/pricing?status=failure`**: Usuario es redirigido aquí cuando el pago falla
- **`/settings/billing?status=pending`**: Usuario es redirigido aquí cuando el pago está pendiente
- **URL base**: Para callbacks y verificaciones generales de Mercado Pago

---

## ✅ Verificación de la Configuración General

Tu configuración debería verse así:

### Detalles de la Aplicación:
- ✅ **Nombre de la aplicación:** Vibook Services
- ✅ **Nombre corto:** Vibook Services
- ✅ **Descripción:** Mi aplicación Vibook Services
- ✅ **Industria:** Transporte/Turismo
- ✅ **URL del sitio en producción:** `https://vibookservicessaas.vercel.app`
- ✅ **Tipo de solución:** Pagos online
- ✅ **Plataforma e-commerce:** No
- ✅ **Producto:** Suscripciones

### Configuraciones Avanzadas:
- ✅ **URLs de redireccionamiento:** Las 4 URLs de arriba
- ✅ **PKCE:** No (no necesario para nuestra implementación)
- ✅ **Permisos:** read, offline access, write

---

## ⚠️ Importante

- **NO uses dominios de Mercado Libre** (como `mercadolibre.com.ar`)
- Todas las URLs deben ser HTTPS (no HTTP)
- Todas las URLs deben apuntar a tu dominio: `vibookservicessaas.vercel.app`

---

**Última actualización:** 2026-01-11
