# ✅ Integración de Preapproval Plan de Mercado Pago

## 🎯 Cambios Realizados

Se ha integrado el botón de suscripción de Mercado Pago usando **Preapproval Plans** en lugar de Preferences para el plan STARTER.

---

## 📋 Configuración

### Preapproval Plan ID

**Plan STARTER ($15,000 ARS/mes):**
- **Preapproval Plan ID:** `5e365ad7ca4540a5a0fd28511fa5ac46`
- **Monto:** $15,000 ARS
- **Frecuencia:** Mensual

---

## 🔄 Flujo de Suscripción

### 1. Usuario hace clic en "Suscribirme" (Plan STARTER)

- El botón redirige directamente a Mercado Pago usando el Preapproval Plan
- URL: `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=5e365ad7ca4540a5a0fd28511fa5ac46`

### 2. Usuario completa el pago en Mercado Pago

- Mercado Pago procesa el pago
- Los campos de tarjeta funcionan correctamente (sin error 403) porque usamos Preapproval Plans

### 3. Callback después del pago

- Mercado Pago redirige de vuelta a la aplicación
- El script de Mercado Pago envía un mensaje con `preapproval_id`
- La aplicación captura el mensaje y redirige a `/api/billing/preapproval-callback`

### 4. Procesamiento del callback

- El endpoint `/api/billing/preapproval-callback`:
  - Obtiene información del preapproval de Mercado Pago
  - Determina el plan basado en el monto ($15,000 = STARTER)
  - Crea o actualiza la suscripción en la base de datos
  - Registra el evento en `billing_events`
  - Redirige a `/settings/billing?status=success`

---

## 📝 Archivos Modificados

### 1. `app/(dashboard)/pricing/page.tsx`

**Cambios:**
- Agregado botón de Mercado Pago para el plan STARTER
- Agregado script de Mercado Pago para renderizar el botón
- Agregado listener para el callback del preapproval

**Código del botón:**
```tsx
<a 
  href="https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=5e365ad7ca4540a5a0fd28511fa5ac46" 
  name="MP-payButton" 
  className="mp-pay-button w-full ..."
>
  Suscribirme
</a>
```

### 2. `app/api/billing/preapproval-callback/route.ts` (NUEVO)

**Funcionalidad:**
- Maneja el callback cuando el usuario completa una suscripción
- Obtiene información del preapproval de Mercado Pago
- Crea o actualiza la suscripción en la base de datos
- Redirige a la página de billing

**Endpoints:**
- `GET /api/billing/preapproval-callback?preapproval_id=XXX&status=success`

---

## 🔧 Para Agregar Más Planes

Si necesitas agregar más Preapproval Plans (PRO, ENTERPRISE, etc.):

### 1. Crear Preapproval Plan en Mercado Pago

1. Ve a Mercado Pago → Suscripciones → Crear plan
2. Configura el plan con el monto y frecuencia
3. Copia el `preapproval_plan_id`

### 2. Actualizar `pricing/page.tsx`

Agrega una condición similar para cada plan:

```tsx
) : plan.name === 'PRO' ? (
  <div className="w-full">
    <a 
      href={`https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU-PRO-PLAN-ID`} 
      name="MP-payButton" 
      className="mp-pay-button w-full ..."
    >
      Suscribirme
    </a>
  </div>
) : (
```

### 3. Actualizar `preapproval-callback/route.ts`

Agrega la lógica para determinar el plan basado en el monto:

```typescript
// Determinar el plan basado en el monto del preapproval
if (preapproval.auto_recurring?.transaction_amount === 15000) {
  planName = 'STARTER'
} else if (preapproval.auto_recurring?.transaction_amount === 50000) {
  planName = 'PRO'
} else if (preapproval.auto_recurring?.transaction_amount === 100000) {
  planName = 'ENTERPRISE'
}
```

---

## ✅ Ventajas de Usar Preapproval Plans

1. **Sin error 403:** Los campos de tarjeta funcionan correctamente
2. **Más simple:** No necesitas crear preferences manualmente
3. **Mejor UX:** El flujo es más directo para el usuario
4. **Gestión automática:** Mercado Pago maneja los cobros recurrentes automáticamente

---

## 🐛 Troubleshooting

### El botón no se renderiza

**Solución:**
- Verifica que el script de Mercado Pago se carga correctamente
- Revisa la consola del navegador para errores
- Asegúrate de que el `preapproval_plan_id` es correcto

### El callback no funciona

**Solución:**
- Verifica que el script tiene el listener `$MPC_message`
- Verifica que la URL de callback es correcta
- Revisa los logs de Vercel para errores

### La suscripción no se crea

**Solución:**
- Verifica que el usuario está autenticado
- Verifica que el usuario tiene una agencia asociada
- Revisa los logs del endpoint `/api/billing/preapproval-callback`

---

## 📊 Pruebas

### Prueba Manual

1. Ir a `/pricing`
2. Hacer clic en "Suscribirme" para el plan STARTER
3. Completar el pago en Mercado Pago (usar tarjeta de prueba)
4. Verificar que se redirige a `/settings/billing?status=success`
5. Verificar que la suscripción se creó en la base de datos
6. Verificar que el estado es `TRIAL` o `ACTIVE`

---

**Última actualización:** 2026-01-11
