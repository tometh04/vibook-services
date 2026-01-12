# ✅ Flujo de Suscripciones con Free Trial de 7 Días

## 🎯 Resumen

El sistema ahora usa la integración dinámica de Mercado Pago para crear suscripciones con un período de prueba gratuito de 7 días.

---

## 🔄 Flujo Completo

### 1. Usuario se Registra
- Se crea la agencia automáticamente
- Se crea una suscripción FREE con status `UNPAID` (bloquea acceso)
- Usuario es redirigido a `/paywall`

### 2. Usuario Elige Plan en Paywall
- Usuario hace clic en "Comenzar Prueba Gratis"
- Se llama a `/api/billing/checkout` con el `planId`

### 3. Backend Crea Preapproval Dinámicamente
- El endpoint `/api/billing/checkout`:
  - Crea un Preapproval en Mercado Pago usando la API
  - Configura `start_date` en 7 días desde ahora (free trial)
  - Configura `frequency: 30` (mensual)
  - Configura `transaction_amount` según el plan
  - Retorna la URL de checkout generada por Mercado Pago

### 4. Usuario Completa Pago en Mercado Pago
- Usuario es redirigido a la URL de checkout de Mercado Pago
- Completa los datos de tarjeta (sin error 403 porque es dinámico)
- Autoriza la suscripción
- Mercado Pago NO cobra inmediatamente (porque `start_date` es en 7 días)

### 5. Callback después del Pago
- Mercado Pago redirige a `/api/billing/preapproval-callback`
- El callback:
  - Obtiene información del preapproval de Mercado Pago
  - Determina el plan basado en el monto
  - Crea/actualiza la suscripción con status `TRIAL`
  - Configura `trial_start` y `trial_end` (7 días)
  - Redirige a `/settings/billing?status=success`

### 6. Usuario Tiene Acceso Completo (7 días)
- Status: `TRIAL`
- Plan: STARTER, PRO, etc. (no FREE)
- Acceso completo a todas las funcionalidades
- Mercado Pago NO ha cobrado todavía

### 7. Después de 7 Días
- Mercado Pago cobra automáticamente (porque `start_date` llegó)
- El webhook de Mercado Pago notifica el pago
- Status cambia a `ACTIVE`
- Continúa el acceso normal

---

## 🔒 Seguridad Implementada

### Bloqueo de Acceso sin Pago
1. **Nuevas agencias:** Se crean con status `UNPAID` (bloquea acceso)
2. **Layout del dashboard:** Verifica suscripción y redirige a `/paywall` si:
   - Tiene plan FREE sin `mp_preapproval_id`
   - Tiene plan FREE en TRIAL sin pago
   - No tiene suscripción
3. **Límites y features:** Bloquean si tiene plan FREE sin pago

### Estados de Suscripción
- `UNPAID`: Sin pago, bloquea acceso
- `TRIAL`: Período de prueba (7 días), acceso completo
- `ACTIVE`: Suscripción activa, acceso completo
- `CANCELED`: Cancelada, bloquea acceso
- `SUSPENDED`: Suspendida, bloquea acceso
- `PAST_DUE`: Pago vencido, bloquea acceso

---

## 📊 Panel de Admin

### Acceso
- URL: `/admin` (o `admin.vibook.ai` si configurás el subdominio)
- Solo usuarios con rol `SUPER_ADMIN` pueden acceder

### Páginas Disponibles

1. **`/admin/users`** - Lista de usuarios
   - Muestra todos los usuarios con sus agencias
   - Muestra el plan y estado de suscripción
   - Muestra período de prueba
   - Estadísticas generales

2. **`/admin/subscriptions`** - Lista de suscripciones
   - Todas las suscripciones con detalles
   - MP Preapproval ID
   - Estados y fechas
   - Usuario y agencia asociada

3. **`/admin/stats`** - Estadísticas
   - MRR (Monthly Recurring Revenue)
   - Usuarios totales y este mes
   - Suscripciones por plan
   - Suscripciones por estado

4. **`/admin/settings`** - Configuración
   - URLs del sistema
   - Estado de integraciones
   - Información del sistema

---

## ✅ Ventajas de la Integración Dinámica

1. **Sin error 403:** Los campos de tarjeta funcionan porque el Preapproval se crea dinámicamente
2. **Free trial real:** 7 días sin cobro, luego cobro automático
3. **Más seguro:** No se puede acceder sin completar el pago
4. **Mejor control:** Todo se maneja desde el backend
5. **Panel de admin:** Visibilidad completa de usuarios y suscripciones

---

## 🔧 Configuración Necesaria

### Variables de Entorno
- `MERCADOPAGO_ACCESS_TOKEN`: Token de acceso de Mercado Pago (producción)
- `NEXT_PUBLIC_APP_URL`: URL de la aplicación (https://app.vibook.ai)

### Migraciones
- Ejecutar `007_fix_free_subscription_creation.sql` en Supabase
- Esto cambia la creación automática de suscripciones a status `UNPAID`

---

## 📝 Notas Importantes

1. **Free Trial:** Mercado Pago no tiene un concepto nativo de "free trial". Lo implementamos configurando `start_date` en 7 días, así el primer cobro es después del trial.

2. **Panel de Admin:** Actualmente está en `/admin` dentro de la misma app. Para usar `admin.vibook.ai` como subdominio, necesitarías:
   - Configurar el subdominio en Vercel
   - O crear una app separada para el admin

3. **Seguridad:** El sistema ahora bloquea correctamente el acceso sin pago. Los usuarios deben completar el proceso de pago para acceder.

---

**Última actualización:** 2026-01-11
