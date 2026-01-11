# 🚀 ROADMAP: Conversión a SaaS Multi-Tenant - Vibook Gestión

## 📋 Estado Actual del Proyecto

**Vibook Gestión** es un sistema de gestión (ERP) para agencias de viajes que está siendo convertido en un **SaaS multi-tenant** completo con:
- ✅ Self-service signup
- ✅ Sistema de suscripciones y billing (Mercado Pago - básico implementado)
- ⏳ Paywall por funcionalidades (PENDIENTE - para el final)
- ✅ Branding personalizado por tenant
- ⏳ Integraciones opcionales (Trello, Manychat funcionan pero son hardcoded - conversión modular pendiente)

### 🎯 Objetivo Actual
**PRIORIDAD:** Hacer el sistema 100% funcional primero, luego implementar paywall y suscripciones completas de Mercado Pago con período de prueba.

---

## ✅ FASE 1: AUTENTICACIÓN Y SIGNUP - COMPLETADA

### ✅ **1.1 Sistema de Signup Público** ✅ COMPLETADO
- [x] Página `/signup` con formulario de registro
- [x] Validación con Zod + React Hook Form
- [x] Flujo: Signup → Verificar email → Crear agencia automáticamente
- [x] Auto-crear usuario como SUPER_ADMIN de su propia agencia
- [x] Auto-crear tenant_branding con defaults
- [x] Auto-crear settings iniciales (customer_settings, operation_settings, etc.)
- [x] Redirección a verificación de email después del signup

**Tecnologías:** shadcn/ui, Supabase Auth, Next.js App Router

### ✅ **1.2 Social Login (OAuth)** ✅ COMPLETADO
- [x] Botones de social login en `/signup` y `/login`
- [x] Manejar creación automática de agencia en OAuth callback
- [x] Configuración de Google OAuth en Supabase Dashboard
- [x] Flujo completo funcionando

**Tecnologías:** Supabase Auth OAuth providers

### ✅ **1.3 Onboarding Post-Signup** ✅ COMPLETADO
- [x] Página `/onboarding` con steps:
  - [x] Step 1: Información básica de la agencia (nombre, ciudad, timezone)
  - [x] Step 2: Configurar branding inicial (nombre de marca)
  - [x] Step 3: Resumen y confirmación
- [x] Redirección a dashboard después del onboarding

**Tecnologías:** shadcn/ui Stepper/Steps component

### ✅ **1.4 Verificación de Email** ✅ COMPLETADO
- [x] Página `/auth/verify-email` con mensaje claro
- [x] Email de verificación enviado automáticamente al signup
- [x] Resend email de verificación
- [x] Página `/auth/verified` con confirmación y redirección automática
- [x] Flujo completo funcionando

**Tecnologías:** Supabase Auth email templates

### ✅ **1.5 Password Reset** ✅ YA EXISTE
- [x] Página `/forgot-password` existente y funcional
- [x] UI mejorada con shadcn/ui
- [x] Confirmación de email enviado
- [x] Página de reset password funcional (`/auth/reset-password`)

---

## 💳 FASE 2: SISTEMA DE SUSCRIPCIONES Y BILLING - COMPLETADA (80%)

### ✅ **2.1 Tablas de Billing** ✅ COMPLETADO
- [x] Migración `004_billing_system.sql` creada
- [x] Tablas creadas:
  - `subscription_plans` (Free, Starter, Pro, Enterprise)
  - `subscriptions` (activas por agencia)
  - `payment_methods`
  - `usage_metrics` (para tracking de límites)
  - `billing_events` (auditoría)
- [x] RLS policies para multi-tenant
- [x] Triggers automáticos (crear suscripción FREE, actualizar métricas)

### ✅ **2.2 Integración con Mercado Pago** ✅ COMPLETADO
- [x] Paquete `mercadopago` instalado
- [x] Cliente Mercado Pago (`lib/mercadopago/client.ts`)
- [x] API Routes creados:
  - `/api/billing/checkout` - Crear preferencia de pago
  - `/api/billing/webhook` - Manejar IPN de Mercado Pago
  - `/api/billing/portal` - Gestionar suscripción (cancelar/pausar)
  - `/api/billing/plans` - Listar planes disponibles
- [x] Variables de entorno documentadas (`CONFIGURACION_MERCADOPAGO.md`)
- [x] Sincronización de eventos con BD

### ✅ **2.3 Paywall y Feature Flags** ✅ COMPLETADO (Backend) / ⏳ PENDIENTE PARA EL FINAL
- [x] Hook `useSubscription` creado y funcionando
- [x] Componente `<PaywallGate>` creado
- [x] Helpers de límites (`lib/billing/limits.ts`):
  - `checkSubscriptionLimit` - Verificar límites de plan
  - `checkFeatureAccess` - Verificar acceso a features
- [x] Checks de límites implementados en backend (temporalmente deshabilitados)
- [x] Flag `DISABLE_SUBSCRIPTION_LIMITS` agregado para desarrollo
- [ ] **PENDIENTE PARA EL FINAL:** Implementar paywall completo con:
  - Re-habilitar checks de límites
  - Agregar `<PaywallGate>` en features premium (Trello, Manychat, Emilia, WhatsApp, Reports)
  - Período de prueba automático (30 días)
  - Suscripciones recurrentes completas con Mercado Pago Preapproval
- [x] Límites por plan definidos:
  - Free: 1 usuario, 10 operaciones/mes, sin integraciones
  - Starter: 5 usuarios, 100 operaciones/mes, 1 integración
  - Pro: Ilimitado, todas las integraciones
  - Enterprise: Custom

### ✅ **2.4 Página de Pricing** ✅ COMPLETADO
- [x] Página `/pricing` con tabla comparativa de planes
- [x] Mostrar características por plan
- [x] Botones "Upgrade" que redirigen a Mercado Pago Checkout
- [ ] FAQ section sobre planes (OPCIONAL)

**Tecnologías:** shadcn/ui Card, Table, Badge

### ✅ **2.5 Billing Dashboard** ✅ COMPLETADO
- [x] Página `/settings/billing` con:
  - Plan actual
  - Uso actual (usuarios, operaciones, etc.)
  - Historial de facturas
  - Métodos de pago
  - Botón para cambiar plan
  - Cancelar/pausar suscripción

**Tecnologías:** shadcn/ui components

---

## 🧹 FASE 3: DESCUSTOMIZACIÓN - COMPLETADA (95%)

### ⏳ **3.1 Convertir Integraciones a Sistema Modular** ⏳ PENDIENTE (Para después)
- [ ] **Trello**: 
  - Convertir a sistema de integraciones modular (usando `integration_configs`)
  - Eliminar `settings_trello` (migrar a `integration_configs`)
  - Migrar datos existentes a `integration_configs`
- [ ] **Manychat**: 
  - Convertir a sistema modular
  - Eliminar referencias hardcoded
  - Hacer opcional por tenant
- [ ] **Emilia**: 
  - Hacer opcional (feature flag por plan)
  - Permitir configurar API keys por tenant

**Nota:** Las integraciones funcionan actualmente y son opcionales. La conversión a sistema modular puede hacerse después sin afectar funcionalidad.

### ✅ **3.2 Limpiar Referencias a "Maxi" / "MAXEVA"** ✅ COMPLETADO
- [x] Buscar y reemplazar todas las referencias hardcoded:
  - [x] Cambiar "MAXEVA" a "Vibook Gestión" en código activo (11 archivos)
  - [x] Cambiar "maxeva_gestion" a "vibook_gestion" en API routes
  - [x] Cambiar URLs hardcoded de maxevagestion.com a NEXT_PUBLIC_APP_URL
  - [x] Cambiar emails de ejemplo (maxeva.com → ejemplo.com)
- [x] Usar siempre branding dinámico (implementado via tenant_branding)

### ✅ **3.3 Eliminar Scripts de Migración/Setup Específicos** ✅ COMPLETADO
- [x] Revisar `scripts/` y crear lista de scripts a eliminar (`scripts/TO_DELETE.md`)
- [x] Eliminar 28 scripts específicos:
  - Scripts de setup de Trello específicos (16 scripts)
  - Scripts específicos de Madero/Rosario (8 scripts)
  - Scripts de seed con datos de Maxi (4 scripts)
- [x] Scripts reducidos de 94 a 66 archivos
- [x] Scripts genéricos útiles mantenidos

### ✅ **3.4 Limpiar Configuraciones Hardcoded** ✅ COMPLETADO
- [x] URLs de APIs cambiadas a variables de entorno (NEXT_PUBLIC_APP_URL)
- [x] Credenciales placeholder ya removidas (lib/supabase/server.ts)
- [x] Branding dinámico implementado (tenant_branding)
- [x] Configuraciones específicas de región/país (Argentina por defecto - OK para MVP)

---

## 🏢 FASE 4: MULTI-TENANCY COMPLETO - PENDIENTE

### ⏳ **4.1 Subdominios por Tenant** ⏳ OPCIONAL - FUTURO
- [ ] Configurar dominio wildcard en Vercel
- [ ] Middleware para detectar subdominio
- [ ] Auto-seleccionar tenant basado en subdominio
- [ ] DNS setup para subdominios

**Nota:** No crítico para MVP. Puede hacerse después.

### ⏳ **4.2 Aislamiento de Datos Mejorado** ⏳ PENDIENTE
- [ ] Auditar todas las queries para asegurar filtrado por `agency_id`
- [ ] Revisar todas las API routes para validar `agency_id`
- [ ] Agregar checks de multi-tenancy en middleware
- [ ] Tests para verificar aislamiento

**Nota:** El aislamiento básico ya existe. Esta fase mejora la seguridad y validación.

### ⏳ **4.3 Tenant Switching** ⏳ PENDIENTE
- [ ] Componente para cambiar entre agencias
- [ ] Persistir agencia seleccionada en localStorage/cookies
- [ ] Actualizar todas las queries cuando cambia la agencia

**Nota:** Solo necesario si un usuario puede tener múltiples agencias.

---

## 🔧 FASE 5: MEJORAS DE INFRAESTRUCTURA - PENDIENTE

### ⏳ **5.1 Rate Limiting Robusto** ⏳ PENDIENTE
- [ ] Reemplazar rate limiting in-memory por Upstash Redis
- [ ] Configurar límites por plan (Free: 100 req/min, Pro: 1000 req/min)
- [ ] Rate limiting en todas las API routes críticas
- [ ] Mensajes de error claros cuando se excede el límite

**Nota:** Actualmente hay rate limiting básico. Mejorar con Redis para producción.

### ⏳ **5.2 Monitoreo y Analytics** ⏳ PENDIENTE
- [ ] Integrar Vercel Analytics (opcional)
- [ ] Logs estructurados para debugging
- [ ] Dashboard de métricas por tenant
- [ ] Alertas para errores críticos

### ⏳ **5.3 Backups y Disaster Recovery** ⏳ PENDIENTE
- [ ] Configurar backups automáticos de Supabase
- [ ] Documentar proceso de restore
- [ ] Backup de datos críticos (export automático)

### ⏳ **5.4 Performance y Optimización** ⏳ PENDIENTE
- [ ] Implementar caché donde sea necesario
- [ ] Optimizar queries lentas
- [ ] Lazy loading de componentes pesados
- [ ] Code splitting optimizado

---

## 📱 FASE 6: FEATURES SAAS ESPECÍFICAS - PENDIENTE

### ⏳ **6.1 Dashboard de Admin (Super Admin)** ⏳ PENDIENTE
- [ ] Página `/admin` solo accesible para SUPER_ADMIN:
  - Lista de todas las agencias
  - Estadísticas globales
  - Suscripciones activas
  - Usuarios totales
  - Revenue metrics
- [ ] Acciones admin (activar/desactivar agencias, cambiar planes, etc.)

### ⏳ **6.2 Notificaciones In-App** ⏳ PENDIENTE
- [ ] Sistema de notificaciones por tenant
- [ ] Badge en navbar con contador
- [ ] Página `/notifications` mejorada
- [ ] Notificaciones sobre:
  - Límites de plan alcanzados
  - Pagos pendientes
  - Nuevas features disponibles

### ⏳ **6.3 Soporte al Cliente** ⏳ PENDIENTE
- [ ] Página `/support` con formulario de contacto
- [ ] Integración con Intercom o similar (opcional)
- [ ] Docs/Help center (opcional)
- [ ] Changelog de features

### ⏳ **6.4 Analytics y Reportes por Tenant** ⏳ PENDIENTE
- [ ] Dashboard de analytics mejorado
- [ ] Reportes exportables (PDF, Excel)
- [ ] Comparativas con períodos anteriores
- [ ] Métricas de uso para optimizar suscripción

---

## 🧪 FASE 7: TESTING Y CALIDAD - PENDIENTE

### ⏳ **7.1 Tests de Integración** ⏳ PENDIENTE
- [ ] Tests del flujo completo de signup
- [ ] Tests de billing y webhooks de Mercado Pago
- [ ] Tests de multi-tenancy (aislamiento de datos)
- [ ] Tests de feature flags y paywall

### ⏳ **7.2 E2E Tests** ⏳ PENDIENTE
- [ ] Playwright o Cypress setup
- [ ] Flujo crítico: Signup → Onboarding → Crear operación → Billing
- [ ] Tests de social login

### ⏳ **7.3 Security Audit** ⏳ PENDIENTE
- [ ] Revisar todas las API routes para vulnerabilidades
- [ ] Verificar RLS policies están bien configuradas
- [ ] Penetration testing básico
- [ ] Rate limiting en endpoints sensibles

---

## 📚 FASE 8: DOCUMENTACIÓN Y DEPLOY - PARCIALMENTE COMPLETADA

### ✅ **8.1 Documentación de Usuario** ✅ PARCIALMENTE COMPLETADA
- [x] Guías de configuración creadas:
  - `INSTRUCCIONES_SETUP_AUTH.md`
  - `GUIA_CONFIGURACION_GOOGLE_OAUTH.md`
  - `CONFIGURACION_MERCADOPAGO.md`
  - `REDIRECT_URLS_SUPABASE.md`
  - `CONFIGURACION_VERCEL.md`
- [ ] Guía de inicio rápido para usuarios finales
- [ ] Tutoriales de features principales
- [ ] FAQ
- [ ] Video walkthroughs (opcional)

### ⏳ **8.2 Documentación Técnica** ⏳ PENDIENTE
- [ ] README actualizado con instrucciones de setup
- [ ] Documentación de API
- [ ] Arquitectura del sistema
- [ ] Guía de contribución (si es open source)

### ✅ **8.3 Preparación para Producción** ✅ COMPLETADO
- [x] Variables de entorno documentadas
- [x] Checklist de deployment
- [x] Monitoreo básico configurado (Vercel logs)
- [ ] Alerts configurados (opcional)

---

## 🎨 FASE 9: UI/UX MEJORAS - PENDIENTE

### ✅ **9.1 Rediseño de Onboarding** ✅ COMPLETADO
- [x] Steps visuales con shadcn/ui
- [x] Progress indicators
- [x] Validación por step

### ⏳ **9.2 Mejoras de Dashboard** ⏳ PENDIENTE
- [ ] Cards más modernos
- [ ] Loading states mejorados
- [ ] Empty states informativos
- [ ] Skeleton loaders

### ⏳ **9.3 Responsive Design** ⏳ PENDIENTE
- [ ] Mobile-first approach
- [ ] Sidebar colapsable en mobile
- [ ] Tablas responsivas
- [ ] Formularios optimizados para mobile

---

## 🎯 ESTADO ACTUAL DEL PROYECTO

### ✅ **COMPLETADO:**
1. ✅ **FASE 1:** Autenticación y Signup (100%)
   - Signup público con email/password
   - Social login (Google)
   - Onboarding básico
   - Verificación de email
   - Password reset

2. ✅ **FASE 2:** Sistema de Suscripciones y Billing (Básico Completado - 80%)
   - ✅ Tablas de billing creadas
   - ✅ Integración con Mercado Pago (básica)
   - ✅ Página de pricing
   - ✅ Billing dashboard
   - ✅ Checks de límites en backend (temporalmente deshabilitados)
   - ✅ Hook `useSubscription` funcionando
   - ⏳ **PENDIENTE PARA EL FINAL:** Paywall completo con período de prueba y suscripciones recurrentes

3. ✅ **FASE 3:** Descustomización (95%)
   - Referencias hardcoded eliminadas
   - Scripts específicos eliminados (28 scripts)
   - Configuraciones hardcoded limpiadas
   - **FALTA:** Convertir integraciones a sistema modular (para después)

### ⏳ **PENDIENTE (Completar Funcionalidad 100%):**
1. ⏳ Verificar que todas las features funcionen correctamente
2. ⏳ Revisar que las integraciones (Trello, Manychat, Emilia) funcionen
3. ⏳ Asegurar que el flujo completo funcione: Signup → Onboarding → Dashboard → Operaciones
4. ⏳ Tests básicos del flujo completo
5. ⏳ Documentación de usuario final básica

### ⏳ **PENDIENTE (Para el final - Paywall y Suscripciones):**
1. ⏳ Implementar paywall completo con `<PaywallGate>` en features premium
2. ⏳ Implementar período de prueba automático para nuevas agencias
3. ⏳ Completar integración de suscripciones recurrentes con Mercado Pago Preapproval
4. ⏳ Habilitar checks de límites en producción

### ⏳ **PENDIENTE (Post-MVP):**
1. ⏳ FASE 4: Multi-tenancy completo (subdominios, tenant switching)
2. ⏳ FASE 5: Mejoras de infraestructura (Redis, monitoreo avanzado)
3. ⏳ FASE 6: Features SaaS específicas (admin dashboard, analytics)
4. ⏳ FASE 7: Testing completo
5. ⏳ FASE 8: Documentación técnica completa
6. ⏳ FASE 9: UI/UX mejoras avanzadas

---

## 📊 PROGRESO GENERAL

```
✅ FASE 1: Autenticación y Signup        [████████████████████] 100%
✅ FASE 2: Sistema de Suscripciones      [████████████████░░░░]  80% (básico completo, paywall para el final)
✅ FASE 3: Descustomización              [██████████████████░░]  95% (conversión modular opcional)
⏳ FASE 4: Multi-tenancy completo        [░░░░░░░░░░░░░░░░░░░░]   0%
⏳ FASE 5: Mejoras de Infraestructura    [░░░░░░░░░░░░░░░░░░░░]   0%
⏳ FASE 6: Features SaaS específicas     [░░░░░░░░░░░░░░░░░░░░]   0%
⏳ FASE 7: Testing y Calidad             [░░░░░░░░░░░░░░░░░░░░]   0%
✅ FASE 8: Documentación y Deploy        [████████░░░░░░░░░░░░]  50%
⏳ FASE 9: UI/UX Mejoras                 [████░░░░░░░░░░░░░░░░]  20%

PROGRESO TOTAL: [████████████░░░░░░░░░░] 61%
```

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### **Prioridad ALTA (Completar 100% Funcionalidad):**
1. ⏳ Verificar que todas las features funcionen correctamente
2. ⏳ Revisar integraciones (Trello, Manychat, Emilia)
3. ⏳ Tests básicos del flujo completo (signup → onboarding → dashboard)
4. ⏳ Documentación de usuario final básica

### **Prioridad FINAL (Paywall y Suscripciones):**
1. ⏳ Implementar período de prueba automático (30 días)
2. ⏳ Completar integración de suscripciones recurrentes con Mercado Pago Preapproval
3. ⏳ Agregar `<PaywallGate>` en features premium (Trello, Manychat, Emilia, WhatsApp, Reports)
4. ⏳ Habilitar checks de límites en producción

### **Prioridad MEDIA (Mejoras Post-MVP):**
1. ⏳ FASE 4: Multi-tenancy completo
2. ⏳ FASE 5: Rate limiting con Redis
3. ⏳ FASE 6: Admin dashboard

### **Prioridad BAJA (Nice to have):**
1. ⏳ FASE 9: UI/UX mejoras avanzadas
2. ⏳ Subdominios por tenant
3. ⏳ Tenant switching

---

## 📝 NOTAS IMPORTANTES

1. **Objetivo Actual:** Hacer el sistema 100% funcional primero. Los checks de límites están implementados pero **temporalmente deshabilitados** (via `DISABLE_SUBSCRIPTION_LIMITS=true`).

2. **Paywall y Suscripciones:** Se implementarán al final, incluyendo:
   - Período de prueba automático (30 días)
   - Suscripciones recurrentes completas con Mercado Pago Preapproval
   - PaywallGate en features premium
   - Habilitar checks de límites

3. **Integraciones:** Trello y Manychat funcionan pero están hardcoded. La conversión a sistema modular puede hacerse después sin afectar funcionalidad.

4. **Estado Actual:** Sistema funcional sin restricciones de pago. Todas las features están accesibles para desarrollo y testing.

---

**Última actualización:** 2026-01-10  
**Versión del documento:** 2.0
