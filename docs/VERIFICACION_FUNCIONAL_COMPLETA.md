# ✅ Verificación Funcional Completa - Vibook Gestión

**Fecha:** 2026-01-10  
**Objetivo:** Verificar que todo el sistema funcione correctamente de punta a punta

---

## 🔄 FLUJO 1: SIGNUP → ONBOARDING → DASHBOARD

### 1.1 Signup
- [ ] Acceder a `/signup`
- [ ] Completar formulario (nombre, email, password)
- [ ] Validación de password (mayúscula, minúscula, número)
- [ ] Envío exitoso
- [ ] Redirección a `/auth/verify-email`
- [ ] Email de verificación recibido

### 1.2 Verificación de Email
- [ ] Click en link del email
- [ ] Redirección a `/auth/verified`
- [ ] Redirección automática a `/onboarding`

### 1.3 Onboarding
- [ ] Step 1: Información básica (nombre agencia, ciudad, timezone)
- [ ] Step 2: Branding (nombre de marca)
- [ ] Step 3: Resumen y confirmación
- [ ] Redirección a `/dashboard` después de completar

### 1.4 Dashboard
- [ ] Dashboard carga correctamente
- [ ] Sidebar visible con todas las secciones
- [ ] KPIs y métricas se muestran
- [ ] No hay errores en consola

---

## 🔄 FLUJO 2: CRM (LEADS)

### 2.1 Acceso al CRM
- [ ] Navegar a `/sales/leads`
- [ ] PaywallGate funciona (si no tiene plan)
- [ ] Página carga correctamente

### 2.2 Gestión de Leads
- [ ] Ver listado de leads (Kanban y Tabla)
- [ ] Crear nuevo lead
- [ ] Editar lead existente
- [ ] Cambiar estado de lead (NEW → IN_PROGRESS → QUOTED → WON/LOST)
- [ ] Asignar lead a vendedor
- [ ] Filtrar por agencia
- [ ] Realtime funciona (actualización automática)

### 2.3 Conversión de Lead a Operación
- [ ] Click en "Convertir a Operación"
- [ ] Dialog de conversión se abre
- [ ] Crear cliente nuevo desde el dialog
- [ ] Seleccionar operador existente
- [ ] Crear operador nuevo desde el dialog
- [ ] Operación se crea correctamente
- [ ] Lead se marca como convertido (status = WON)
- [ ] Cliente se crea y asocia a la operación

---

## 🔄 FLUJO 3: OPERACIONES

### 3.1 Acceso a Operaciones
- [ ] Navegar a `/operations`
- [ ] Listado de operaciones carga
- [ ] Filtros funcionan (agencia, vendedor, estado, fechas)

### 3.2 Crear Operación
- [ ] Click en "Nueva Operación"
- [ ] Formulario se abre
- [ ] Completar campos requeridos (destino, fecha salida, etc.)
- [ ] Seleccionar cliente
- [ ] Seleccionar operador
- [ ] Guardar operación
- [ ] Operación aparece en el listado
- [ ] File code se genera automáticamente

### 3.3 Ver Detalle de Operación
- [ ] Click en una operación
- [ ] Detalle se muestra correctamente
- [ ] Información de cliente visible
- [ ] Información de operador visible
- [ ] Pagos asociados se muestran
- [ ] Documentos asociados se muestran

---

## 🔄 FLUJO 4: CLIENTES

### 4.1 Acceso a Clientes
- [ ] Navegar a `/customers`
- [ ] Listado de clientes carga
- [ ] Filtros y búsqueda funcionan

### 4.2 Crear Cliente
- [ ] Click en "Nuevo Cliente"
- [ ] Formulario se abre
- [ ] Completar campos requeridos
- [ ] Guardar cliente
- [ ] Cliente aparece en el listado

### 4.3 Ver Detalle de Cliente
- [ ] Click en un cliente
- [ ] Detalle se muestra
- [ ] Operaciones asociadas se muestran
- [ ] Historial de interacciones se muestra
- [ ] Notas asociadas se muestran

---

## 🔄 FLUJO 5: FEATURES PREMIUM

### 5.1 Emilia IA
- [ ] Navegar a `/emilia`
- [ ] PaywallGate funciona (requiere plan Pro)
- [ ] Si tiene plan, puede usar Emilia
- [ ] Búsqueda de viajes funciona

### 5.2 WhatsApp
- [ ] Navegar a `/messages`
- [ ] Listado de mensajes carga
- [ ] Templates se muestran
- [ ] Enviar mensaje funciona

### 5.3 Reports
- [ ] Navegar a `/reports`
- [ ] PaywallGate funciona (requiere plan Starter+)
- [ ] Si tiene plan, puede ver reportes
- [ ] Generar reporte funciona

---

## 🔄 FLUJO 6: ADMIN PANEL

### 6.1 Acceso al Admin
- [ ] Navegar a `https://admin.vibook.ai/admin-login`
- [ ] Login con credenciales (admin@vibook.ai / _Vibook042308)
- [ ] Redirección a `/admin`

### 6.2 Gestión de Usuarios
- [ ] Ver listado de usuarios
- [ ] Ver suscripciones de usuarios
- [ ] Cambiar plan de usuario
- [ ] Cambiar estado de suscripción
- [ ] Cambios se reflejan inmediatamente

### 6.3 Gestión de Suscripciones
- [ ] Ver listado de suscripciones
- [ ] Cambiar plan manualmente
- [ ] Cambiar estado manualmente (ACTIVE, TRIAL, CANCELED)
- [ ] Asignar plan TESTER
- [ ] Cambios se reflejan en acceso del usuario

---

## 🔄 FLUJO 7: BILLING Y SUSCRIPCIONES

### 7.1 Ver Plan Actual
- [ ] Navegar a `/settings/billing`
- [ ] Plan actual se muestra
- [ ] Uso actual se muestra
- [ ] Historial de facturas se muestra

### 7.2 Cambiar Plan
- [ ] Click en "Cambiar Plan"
- [ ] Redirección a `/pricing`
- [ ] Seleccionar nuevo plan
- [ ] Redirección a Mercado Pago
- [ ] Completar pago
- [ ] Callback funciona
- [ ] Suscripción se actualiza

---

## ⚠️ PUNTOS CRÍTICOS A VERIFICAR

### Autenticación
- [ ] Usuario sin sesión → redirige a `/login`
- [ ] Usuario con sesión → puede acceder al dashboard
- [ ] Logout funciona correctamente

### Permisos
- [ ] SUPER_ADMIN puede ver todo
- [ ] ADMIN puede gestionar su agencia
- [ ] SELLER solo ve sus leads/operaciones
- [ ] VIEWER solo puede ver (no editar)

### Multi-Tenancy
- [ ] Usuario solo ve datos de su agencia
- [ ] RLS funciona correctamente
- [ ] No hay fuga de datos entre agencias

### Paywall
- [ ] Usuario sin suscripción → redirige a `/paywall`
- [ ] Usuario con TRIAL → puede acceder a todo
- [ ] Usuario con ACTIVE → puede acceder a todo
- [ ] Usuario con CANCELED → redirige a `/paywall`
- [ ] Plan TESTER → acceso completo sin pago

---

## 📝 NOTAS

- Ejecutar migración `009_remove_trello_integration.sql` antes de verificar
- Verificar en producción (app.vibook.ai y admin.vibook.ai)
- Probar con diferentes roles de usuario
- Verificar en diferentes navegadores

---

## ✅ RESULTADO FINAL

- [ ] Todos los flujos funcionan correctamente
- [ ] No hay errores críticos
- [ ] Sistema está listo para producción
