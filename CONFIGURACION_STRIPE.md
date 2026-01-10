# 🔧 CONFIGURACIÓN DE STRIPE - PASO A PASO

## Variables de Entorno Requeridas

Agrega estas variables en **Vercel Dashboard** → **Settings** → **Environment Variables**:

```bash
# Stripe (obligatorias)
STRIPE_SECRET_KEY=sk_test_... # o sk_live_... para producción
STRIPE_PUBLISHABLE_KEY=pk_test_... # o pk_live_... para producción
STRIPE_WEBHOOK_SECRET=whsec_... # Secret del webhook

# Ya deberías tener estas:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://vibookservicessaas.vercel.app
```

## Pasos de Configuración

### 1. Crear Productos en Stripe

1. Ve a https://dashboard.stripe.com/test/products (o /products para producción)
2. Click en **"Add product"**
3. Crea estos productos:

**Starter Plan:**
- Name: "Starter Plan"
- Description: "Perfecto para pequeñas agencias"
- Pricing: 
  - Recurring: $29 USD / month
  - Recurring: $290 USD / year
- Copia los Price IDs (empiezan con `price_`)

**Pro Plan:**
- Name: "Pro Plan"
- Description: "Para agencias en crecimiento"
- Pricing:
  - Recurring: $99 USD / month
  - Recurring: $990 USD / year
- Copia los Price IDs

### 2. Actualizar Price IDs en Supabase

Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Actualizar Starter Plan
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_XXXXX', -- Reemplaza con tu Price ID mensual
  stripe_price_id_yearly = 'price_YYYYY'   -- Reemplaza con tu Price ID anual
WHERE name = 'STARTER';

-- Actualizar Pro Plan
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_AAAAA', -- Reemplaza con tu Price ID mensual
  stripe_price_id_yearly = 'price_BBBBB'   -- Reemplaza con tu Price ID anual
WHERE name = 'PRO';
```

### 3. Configurar Webhook

1. Ve a https://dashboard.stripe.com/test/webhooks (o /webhooks para producción)
2. Click en **"Add endpoint"**
3. **Endpoint URL**: `https://vibookservicessaas.vercel.app/api/billing/webhook`
4. **Events to send**:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click en **"Add endpoint"**
6. Copia el **Signing secret** (empieza con `whsec_`)
7. Agrégalo como `STRIPE_WEBHOOK_SECRET` en Vercel

### 4. Configurar Customer Portal

1. Ve a https://dashboard.stripe.com/test/settings/billing/portal (o /settings/billing/portal para producción)
2. Habilita el portal
3. Configura qué puede hacer el cliente:
   - ✅ Update payment method
   - ✅ Update subscription
   - ✅ Cancel subscription
   - ✅ View invoice history
4. **Business information**: Completa con tu información
5. Click en **"Save changes"**

### 5. Probar en Modo Test

1. Usa las API keys de **test mode** (empiezan con `sk_test_` y `pk_test_`)
2. Ve a `/pricing` en tu app
3. Click en "Elegir Plan"
4. Usa la tarjeta de prueba: `4242 4242 4242 4242`
5. Cualquier fecha futura para expiración
6. Cualquier CVC de 3 dígitos
7. Completa el checkout
8. Verifica que la suscripción se creó en `/settings/billing`

### 6. Activar Modo Producción

Cuando estés listo para producción:

1. Cambia a **Live mode** en Stripe Dashboard
2. Crea los productos y precios nuevamente en modo live
3. Actualiza los Price IDs en Supabase
4. Crea el webhook en modo live
5. Actualiza las variables de entorno en Vercel con las keys de producción
6. Hace redeploy

---

## ✅ Verificación

Después de configurar todo:

1. ✅ `/pricing` muestra los planes correctamente
2. ✅ Click en "Elegir Plan" redirige a Stripe Checkout
3. ✅ Después del checkout, `/settings/billing` muestra la suscripción
4. ✅ El webhook sincroniza los eventos correctamente
5. ✅ El Customer Portal funciona para gestionar suscripción

---

**Nota**: El plan FREE no necesita configuración en Stripe ya que es gratuito.
