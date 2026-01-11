# 🚀 ROADMAP COMPLETO: Conversión a SaaS Multi-Tenant

## 📋 Visión General

Convertir **Vibook Gestión** de un ERP custom para Maxi a un **SaaS multi-tenant** completo con:
- Self-service signup
- Sistema de suscripciones y billing
- Paywall por funcionalidades
- Branding personalizado por tenant
- Integraciones opcionales (Trello, Manychat, etc.)
- Eliminación de código custom de Maxi

---

## 🎯 FASE 1: AUTENTICACIÓN Y SIGNUP (PRIORITARIO)

### ✅ **1.1 Sistema de Signup Público** ✅ COMPLETADO
- [x] Crear página `/signup` con formulario de registro
- [x] Implementar validación con Zod + React Hook Form
- [x] Flujo: Signup → Verificar email → Crear agencia automáticamente
- [x] Auto-crear usuario como SUPER_ADMIN de su propia agencia
- [x] Auto-crear tenant_branding con defaults
- [x] Auto-crear settings iniciales (customer_settings, operation_settings, etc.)
- [x] Redirección a verificación de email después del signup

**Tecnologías:** shadcn/ui, Supabase Auth, Next.js App Router

### ✅ **1.2 Social Login (OAuth)** ✅ COMPLETADO (pendiente configuración en Supabase)
- [x] Agregar botones de social login en `/signup` y `/login`
- [x] Manejar creación automática de agencia en OAuth callback
- [ ] **PENDIENTE:** Configurar Google OAuth en Supabase Dashboard (requiere credenciales de Google Cloud)
- [ ] **PENDIENTE:** Configurar GitHub OAuth en Supabase Dashboard (opcional)
- [ ] **PENDIENTE:** Testear flujo completo una vez configurado

**Tecnologías:** Supabase Auth OAuth providers

### ✅ **1.3 Onboarding Post-Signup** ✅ COMPLETADO (básico)
- [x] Página `/onboarding` con steps:
  - [x] Step 1: Información básica de la agencia (nombre, ciudad, timezone)
  - [x] Step 2: Configurar branding inicial (nombre de marca)
  - [x] Step 3: Resumen y confirmación
  - [ ] Step 4: Invitar primer usuario (opcional - FUTURO)
  - [ ] Step 5: Configurar integraciones básicas (opcional - FUTURO)
- [x] Redirección a dashboard después del onboarding

**Tecnologías:** shadcn/ui Stepper/Steps component

### ✅ **1.4 Verificación de Email** ✅ COMPLETADO
- [x] Página `/auth/verify-email` 
- [x] Enviar email de verificación al signup (manejado por Supabase)
- [x] Resend email de verificación
- [x] Mensaje claro mientras espera verificación

**Tecnologías:** Supabase Auth email templates

### ✅ **1.5 Password Reset Mejorado** ✅ YA EXISTE
- [x] Página `/forgot-password` existente y funcional
- [x] UI mejorada con shadcn/ui
- [x] Confirmación de email enviado
- [x] Página de reset password funcional (`/auth/reset-password`)

---

## 💳 FASE 2: SISTEMA DE SUSCRIPCIONES Y BILLING

### ✅ **2.1 Tablas de Billing**
- [ ] Crear migración `004_billing_system.sql`:
  - `subscription_plans` (Free, Starter, Pro, Enterprise)
  - `subscriptions` (activas por agencia)
  - `invoices` (ya existe, revisar y adaptar)
  - `payment_methods`
  - `usage_metrics` (para tracking de límites)
- [ ] RLS policies para multi-tenant

### ✅ **2.2 Integración con Stripe**
- [ ] Instalar `@stripe/stripe-js` y `stripe`
- [ ] Crear API routes para Stripe:
  - `/api/billing/checkout` - Crear sesión de checkout
  - `/api/billing/webhook` - Manejar webhooks de Stripe
  - `/api/billing/portal` - Customer portal
  - `/api/billing/plans` - Listar planes disponibles
- [ ] Configurar variables de entorno de Stripe
- [ ] Sincronizar eventos de Stripe con nuestra BD

### ✅ **2.3 Paywall y Feature Flags**
- [ ] Crear hook `useSubscription` para obtener estado de suscripción
- [ ] Crear componente `<PaywallGate>` para proteger features
- [ ] Implementar límites por plan:
  - Free: 1 usuario, 10 operaciones/mes, sin integraciones
  - Starter: 5 usuarios, 100 operaciones/mes, 1 integración
  - Pro: Ilimitado, todas las integraciones
  - Enterprise: Custom
- [ ] Agregar checks de límites en todas las operaciones críticas

### ✅ **2.4 Página de Pricing**
- [ ] Crear `/pricing` con tabla comparativa de planes
- [ ] Mostrar características por plan
- [ ] Botones "Upgrade" que redirigen a Stripe Checkout
- [ ] FAQ section sobre planes

**Tecnologías:** shadcn/ui Card, Table, Badge

### ✅ **2.5 Billing Dashboard**
- [ ] Página `/settings/billing` con:
  - Plan actual
  - Uso actual (usuarios, operaciones, etc.)
  - Historial de facturas
  - Métodos de pago
  - Botón para cambiar plan
  - Cancelar suscripción

**Tecnologías:** shadcn/ui components

---

## 🧹 FASE 3: DESCUSTOMIZACIÓN (ELIMINAR CÓDIGO DE MAXI)

### ✅ **3.1 Eliminar Integraciones Hardcoded**
- [ ] **Trello**: 
  - Convertir a sistema de integraciones modular
  - Eliminar `settings_trello` (ya tenemos `integration_configs`)
  - Migrar datos existentes a `integration_configs`
  - Eliminar scripts específicos de Trello (`scripts/setup-trello-*.ts`)
- [ ] **Manychat**: 
  - Convertir a sistema modular
  - Eliminar referencias hardcoded
  - Hacer opcional por tenant
- [ ] **Emilia**: 
  - Hacer opcional (feature flag por plan)
  - Permitir configurar API keys por tenant

### ✅ **3.2 Limpiar Referencias a "Maxi" / "MAXEVA"** ✅ COMPLETADO
- [x] Buscar y reemplazar todas las referencias hardcoded:
  - [x] Cambiar "MAXEVA" a "Vibook Gestión" en código activo
  - [x] Cambiar "maxeva_gestion" a "vibook_gestion" en API routes
  - [x] Cambiar URLs hardcoded de maxevagestion.com a NEXT_PUBLIC_APP_URL
  - [x] Cambiar emails de ejemplo (maxeva.com → ejemplo.com)
- [x] Usar siempre branding dinámico (ya implementado via tenant_branding)
- [ ] Eliminar seed data específica de Maxi (en proceso - scripts)

### ✅ **3.3 Eliminar Scripts de Migración/Setup Específicos**
- [ ] Revisar `scripts/` y eliminar:
  - Scripts de setup de Trello específicos
  - Scripts de seed con datos de Maxi
  - Scripts de migración de datos de Maxi
- [ ] Mantener solo scripts genéricos útiles

### ✅ **3.4 Limpiar Configuraciones Hardcoded**
- [ ] Buscar valores hardcoded en:
  - URLs de APIs
  - Credenciales placeholder
  - Configuraciones específicas de región/país
- [ ] Mover todo a configuración por tenant o variables de entorno

---

## 🏢 FASE 4: MULTI-TENANCY COMPLETO

### ✅ **4.1 Subdominios por Tenant (Opcional - Futuro)**
- [ ] Configurar dominio wildcard en Vercel
- [ ] Middleware para detectar subdominio
- [ ] Auto-seleccionar tenant basado en subdominio
- [ ] DNS setup para subdominios

### ✅ **4.2 Aislamiento de Datos Mejorado**
- [ ] Auditar todas las queries para asegurar filtrado por `agency_id`
- [ ] Revisar todas las API routes para validar `agency_id`
- [ ] Agregar checks de multi-tenancy en middleware
- [ ] Tests para verificar aislamiento

### ✅ **4.3 Tenant Switching (si usuario tiene múltiples agencias)**
- [ ] Componente para cambiar entre agencias
- [ ] Persistir agencia seleccionada en localStorage/cookies
- [ ] Actualizar todas las queries cuando cambia la agencia

---

## 🔧 FASE 5: MEJORAS DE INFRAESTRUCTURA

### ✅ **5.1 Rate Limiting Robusto**
- [ ] Reemplazar rate limiting in-memory por Upstash Redis
- [ ] Configurar límites por plan (Free: 100 req/min, Pro: 1000 req/min)
- [ ] Rate limiting en todas las API routes críticas
- [ ] Mensajes de error claros cuando se excede el límite

### ✅ **5.2 Monitoreo y Analytics**
- [ ] Integrar Vercel Analytics (opcional)
- [ ] Logs estructurados para debugging
- [ ] Dashboard de métricas por tenant
- [ ] Alertas para errores críticos

### ✅ **5.3 Backups y Disaster Recovery**
- [ ] Configurar backups automáticos de Supabase
- [ ] Documentar proceso de restore
- [ ] Backup de datos críticos (export automático)

### ✅ **5.4 Performance y Optimización**
- [ ] Implementar caché donde sea necesario
- [ ] Optimizar queries lentas
- [ ] Lazy loading de componentes pesados
- [ ] Code splitting optimizado

---

## 📱 FASE 6: FEATURES SAAS ESPECÍFICAS

### ✅ **6.1 Dashboard de Admin (Super Admin)**
- [ ] Página `/admin` solo accesible para SUPER_ADMIN:
  - Lista de todas las agencias
  - Estadísticas globales
  - Suscripciones activas
  - Usuarios totales
  - Revenue metrics
- [ ] Acciones admin (activar/desactivar agencias, cambiar planes, etc.)

### ✅ **6.2 Notificaciones In-App**
- [ ] Sistema de notificaciones por tenant
- [ ] Badge en navbar con contador
- [ ] Página `/notifications` (ya existe, mejorar)
- [ ] Notificaciones sobre:
  - Límites de plan alcanzados
  - Pagos pendientes
  - Nuevas features disponibles

### ✅ **6.3 Soporte al Cliente**
- [ ] Página `/support` con formulario de contacto
- [ ] Integración con Intercom o similar (opcional)
- [ ] Docs/Help center (opcional)
- [ ] Changelog de features

### ✅ **6.4 Analytics y Reportes por Tenant**
- [ ] Dashboard de analytics mejorado
- [ ] Reportes exportables (PDF, Excel)
- [ ] Comparativas con períodos anteriores
- [ ] Métricas de uso para optimizar suscripción

---

## 🧪 FASE 7: TESTING Y CALIDAD

### ✅ **7.1 Tests de Integración**
- [ ] Tests del flujo completo de signup
- [ ] Tests de billing y webhooks de Stripe
- [ ] Tests de multi-tenancy (aislamiento de datos)
- [ ] Tests de feature flags y paywall

### ✅ **7.2 E2E Tests**
- [ ] Playwright o Cypress setup
- [ ] Flujo crítico: Signup → Onboarding → Crear operación → Billing
- [ ] Tests de social login

### ✅ **7.3 Security Audit**
- [ ] Revisar todas las API routes para vulnerabilidades
- [ ] Verificar RLS policies están bien configuradas
- [ ] Penetration testing básico
- [ ] Rate limiting en endpoints sensibles

---

## 📚 FASE 8: DOCUMENTACIÓN Y DEPLOY

### ✅ **8.1 Documentación de Usuario**
- [ ] Guía de inicio rápido
- [ ] Tutoriales de features principales
- [ ] FAQ
- [ ] Video walkthroughs (opcional)

### ✅ **8.2 Documentación Técnica**
- [ ] README actualizado con instrucciones de setup
- [ ] Documentación de API
- [ ] Arquitectura del sistema
- [ ] Guía de contribución (si es open source)

### ✅ **8.3 Preparación para Producción**
- [ ] Variables de entorno documentadas
- [ ] Checklist de deployment
- [ ] Monitoreo configurado
- [ ] Alerts configurados

---

## 🎨 FASE 9: UI/UX MEJORAS (Usando shadcn/ui)

### ✅ **9.1 Rediseño de Onboarding**
- [ ] Steps visuales con shadcn/ui
- [ ] Animaciones suaves
- [ ] Progress indicators

### ✅ **9.2 Mejoras de Dashboard**
- [ ] Cards más modernos
- [ ] Loading states mejorados
- [ ] Empty states informativos
- [ ] Skeleton loaders

### ✅ **9.3 Responsive Design**
- [ ] Mobile-first approach
- [ ] Sidebar colapsable en mobile
- [ ] Tablas responsivas
- [ ] Formularios optimizados para mobile

---

## 🚀 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### **Sprint 1: Fundación (Semana 1-2)**
1. ✅ Signup público con email/password
2. ✅ Social login (Google)
3. ✅ Onboarding básico
4. ✅ Verificación de email

### **Sprint 2: Billing Core (Semana 3-4)**
5. ✅ Tablas de billing
6. ✅ Integración Stripe básica
7. ✅ Página de pricing
8. ✅ Paywall básico

### **Sprint 3: Descustomización (Semana 5-6)**
9. ✅ Eliminar código de Maxi
10. ✅ Convertir Trello a sistema modular
11. ✅ Limpiar scripts y configuraciones

### **Sprint 4: Features SaaS (Semana 7-8)**
12. ✅ Admin dashboard
13. ✅ Notificaciones mejoradas
14. ✅ Analytics por tenant
15. ✅ Rate limiting robusto

### **Sprint 5: Polish y Launch (Semana 9-10)**
16. ✅ Testing completo
17. ✅ Documentación
18. ✅ UI/UX improvements
19. ✅ Deploy a producción

---

## 📊 MÉTRICAS DE ÉXITO

- ✅ Signup self-service funcionando
- ✅ Social login operativo
- ✅ Billing con Stripe integrado
- ✅ Paywall funcionando en features premium
- ✅ 0 referencias hardcoded a Maxi
- ✅ Multi-tenancy 100% funcional
- ✅ Performance optimizado
- ✅ Tests pasando
- ✅ Deploy exitoso en producción

---

## 🎯 EMPEZAMOS CON: FASE 1 - SIGNUP Y AUTH

¡Vamos a implementar el signup completo con shadcn/ui!
