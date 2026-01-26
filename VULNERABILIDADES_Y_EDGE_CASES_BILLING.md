# 🔒 Análisis de Vulnerabilidades y Edge Cases - Sistema de Billing

## 📊 Resumen Ejecutivo
**Estado Actual:** 5/10  
**Objetivo:** 10/10  
**Fecha:** 2026-01-26

---

## 🚨 VULNERABILIDADES CRÍTICAS (Prioridad ALTA)

### 1. **Race Condition en Verificación de Suscripción**
**Problema:** Entre el momento que se verifica la suscripción en el layout y cuando se ejecuta la acción, el usuario puede cancelar/eliminar su suscripción.

**Escenario:**
1. Usuario tiene TRIAL activo
2. Abre múltiples tabs del dashboard
3. En un tab cancela la suscripción
4. En otro tab sigue usando el sistema porque la verificación ya pasó

**Impacto:** Acceso gratuito después de cancelar

**Solución:** Verificar suscripción en cada request crítico (POST/PUT/DELETE), no solo en layout

---

### 2. **Bypass del Paywall mediante API Directa**
**Problema:** El layout verifica suscripción, pero las APIs pueden ser llamadas directamente sin pasar por el layout.

**Escenario:**
1. Usuario sin suscripción válida
2. Hace request directo a `/api/operations` (POST)
3. La API solo verifica límites, no bloquea si no hay suscripción

**Impacto:** Crear operaciones sin pagar

**Solución:** Todas las APIs deben verificar `checkFeatureAccess` o `checkSubscriptionLimit` ANTES de procesar

---

### 3. **Manipulación de `has_used_trial` desde Admin**
**Problema:** Admin puede cambiar `has_used_trial = false` y permitir múltiples trials.

**Escenario:**
1. Usuario ya usó trial
2. Admin cambia `has_used_trial = false` en la BD
3. Usuario puede hacer otro trial

**Impacto:** Múltiples trials gratuitos

**Solución:** 
- `has_used_trial` debe ser inmutable después de ser `true`
- Solo resetear con proceso especial documentado
- Auditoría de cambios

---

### 4. **Extender Trial Infinitamente**
**Problema:** Admin puede extender trial múltiples veces sin límite.

**Escenario:**
1. Trial termina en 7 días
2. Admin extiende +7 días
3. Repetir infinitamente

**Impacto:** Trial permanente

**Solución:**
- Límite máximo de extensiones (ej: 2 veces)
- Límite máximo de días totales de trial (ej: 21 días)
- Tracking de extensiones en `billing_events`

---

### 5. **Cambio de Plan a TESTER desde Admin sin Validación**
**Problema:** Admin puede cambiar cualquier plan a TESTER sin restricciones.

**Escenario:**
1. Usuario tiene plan STARTER
2. Admin cambia a TESTER
3. Usuario tiene acceso completo gratis

**Impacto:** Acceso premium sin pago

**Solución:**
- Solo SUPER_ADMIN puede asignar TESTER
- Requiere justificación/nota en `billing_events`
- Alertas cuando se asigna TESTER

---

### 6. **Bypass mediante Múltiples Agencias**
**Problema:** Usuario puede crear múltiples agencias y cada una tiene su propio trial.

**Escenario:**
1. Usuario crea agencia 1 → trial 7 días
2. Crea agencia 2 → otro trial 7 días
3. Repetir con más emails

**Impacto:** Trials ilimitados

**Solución:**
- Verificar `has_used_trial` a nivel de usuario (no solo agencia)
- Limitar agencias por usuario (ej: 1 agencia por email verificado)
- Detectar emails similares (ej: user@gmail.com, user+1@gmail.com)

---

### 7. **Manipulación de `trial_end` desde Admin**
**Problema:** Admin puede cambiar `trial_end` a una fecha futura lejana.

**Escenario:**
1. Trial termina hoy
2. Admin cambia `trial_end` a 1 año en el futuro
3. Usuario tiene trial por 1 año

**Impacto:** Trial extendido artificialmente

**Solución:**
- Validar que `trial_end` no puede ser más de X días desde `trial_start`
- Solo permitir extensiones mediante endpoint dedicado
- Auditoría de cambios a fechas de trial

---

### 8. **Bypass mediante Cambio de Status Manual**
**Problema:** Admin puede cambiar status a ACTIVE sin verificar pago.

**Escenario:**
1. Usuario tiene status UNPAID
2. Admin cambia a ACTIVE manualmente
3. Usuario tiene acceso sin pagar

**Impacto:** Acceso sin pago

**Solución:**
- Status ACTIVE solo puede venir de webhook de Mercado Pago
- Admin solo puede cambiar a ACTIVE si hay `mp_preapproval_id` válido
- Requiere verificación de pago en Mercado Pago antes de activar

---

### 9. **Race Condition en Límites de Operaciones**
**Problema:** Múltiples requests simultáneos pueden exceder límites.

**Escenario:**
1. Usuario tiene límite de 10 operaciones/mes
2. Ya tiene 9 operaciones
3. Hace 5 requests simultáneos
4. Todos pasan la verificación antes de que se actualice el contador

**Impacto:** Exceder límites

**Solución:**
- Usar transacciones atómicas con locks
- Verificar límite dentro de la transacción
- Incrementar contador dentro de la misma transacción

---

### 10. **Bypass mediante Frontend Manipulation**
**Problema:** Validaciones solo en frontend pueden ser bypassed.

**Escenario:**
1. Frontend bloquea crear operación si límite alcanzado
2. Usuario modifica JavaScript para remover validación
3. Hace request directo a API

**Impacto:** Bypass de validaciones frontend

**Solución:**
- TODAS las validaciones deben estar en backend
- Frontend solo para UX, no para seguridad
- Verificar en cada API call

---

## ⚠️ VULNERABILIDADES MEDIAS (Prioridad MEDIA)

### 11. **Falta de Validación de `trial_start` vs `trial_end`**
**Problema:** No se valida que `trial_end` sea después de `trial_start`.

**Escenario:**
1. Admin crea suscripción con `trial_end` antes de `trial_start`
2. Sistema puede comportarse inesperadamente

**Solución:** Validar fechas en triggers de BD

---

### 12. **Múltiples Suscripciones Activas para Misma Agencia**
**Problema:** Aunque hay UNIQUE(agency_id), puede haber race conditions.

**Escenario:**
1. Dos requests simultáneos crean suscripción
2. Ambos pasan la verificación de existencia
3. Se crean 2 suscripciones

**Solución:** Usar constraint UNIQUE con handling de conflictos

---

### 13. **Bypass mediante Cambio de `current_period_end`**
**Problema:** Admin puede extender período de facturación.

**Escenario:**
1. Período termina hoy
2. Admin cambia `current_period_end` a 1 año en el futuro
3. Usuario no se cobra por 1 año

**Solución:**
- `current_period_end` solo puede ser modificado por webhook
- Admin solo puede extender con proceso especial
- Validar que no puede ser más de 30 días desde `current_period_start`

---

### 14. **Falta de Verificación de `mp_preapproval_id` Válido**
**Problema:** Status ACTIVE puede existir sin `mp_preapproval_id` válido.

**Escenario:**
1. Admin cambia status a ACTIVE
2. No hay `mp_preapproval_id` o es inválido
3. Usuario tiene acceso sin pago real

**Solución:**
- Verificar `mp_preapproval_id` en Mercado Pago antes de permitir ACTIVE
- Status ACTIVE requiere `mp_preapproval_id` válido

---

### 15. **Bypass mediante Cambio de Plan a FREE**
**Problema:** Admin puede cambiar plan a FREE y usuario tiene acceso limitado pero gratis.

**Escenario:**
1. Usuario tiene plan PRO
2. Admin cambia a FREE
3. Usuario tiene acceso básico gratis

**Solución:**
- FREE solo para nuevas agencias
- No permitir downgrade a FREE desde planes pagos
- Requiere proceso especial de cancelación

---

### 16. **Falta de Validación de `payment_attempts`**
**Problema:** `payment_attempts` puede ser manipulado manualmente.

**Escenario:**
1. Usuario tiene 2 intentos fallidos
2. Admin resetea `payment_attempts = 0`
3. Usuario puede fallar 3 veces más

**Solución:**
- `payment_attempts` solo modificable por funciones RPC
- Auditoría de cambios
- No permitir reset manual

---

### 17. **Bypass mediante Uso de API de Supabase Directa**
**Problema:** Si RLS no está bien configurado, usuario puede modificar suscripciones directamente.

**Escenario:**
1. Usuario tiene acceso a Supabase client
2. Modifica su suscripción directamente
3. Cambia status a ACTIVE

**Solución:**
- RLS debe bloquear todas las modificaciones a `subscriptions`
- Solo admin client puede modificar
- Verificar RLS en todas las tablas críticas

---

### 18. **Falta de Rate Limiting en Endpoints Críticos**
**Problema:** Usuario puede hacer muchos requests para encontrar vulnerabilidades.

**Escenario:**
1. Usuario hace 1000 requests/segundo a `/api/billing/checkout`
2. Puede encontrar race conditions o bugs

**Solución:**
- Rate limiting en todos los endpoints de billing
- IP-based throttling
- User-based throttling

---

### 19. **Bypass mediante Manipulación de `usage_metrics`**
**Problema:** Si `usage_metrics` puede ser modificado, límites pueden ser bypassed.

**Escenario:**
1. Usuario tiene 9/10 operaciones
2. Modifica `usage_metrics.operations_count = 0`
3. Puede crear más operaciones

**Solución:**
- `usage_metrics` solo modificable por triggers
- RLS debe bloquear modificaciones manuales
- Verificar integridad de métricas

---

### 20. **Falta de Validación de `system_config`**
**Problema:** Admin puede cambiar `trial_days` a 365 días.

**Escenario:**
1. Admin cambia `trial_days = 365`
2. Nuevos usuarios tienen trial de 1 año

**Solución:**
- Límites en `system_config` (ej: `trial_days` máximo 30)
- Validación de rangos permitidos
- Requiere aprobación para cambios críticos

---

## 🔍 EDGE CASES Y COMPORTAMIENTOS INESPERADOS

### 21. **Usuario con Múltiples Agencias y Diferentes Estados**
**Problema:** Usuario puede tener agencia 1 con ACTIVE y agencia 2 con UNPAID.

**Escenario:**
1. Usuario tiene 2 agencias
2. Agencia 1: ACTIVE
3. Agencia 2: UNPAID
4. ¿Cuál se usa para verificar acceso?

**Solución:**
- Verificar TODAS las agencias del usuario
- Si alguna tiene ACTIVE/TRIAL, permitir acceso
- Pero limitar features según plan de la agencia activa

---

### 22. **Trial que Termina Durante Uso Activo**
**Problema:** Usuario puede estar usando el sistema cuando trial termina.

**Escenario:**
1. Usuario está en dashboard
2. Trial termina a las 23:59
3. Usuario sigue usando hasta las 00:30

**Solución:**
- Verificar suscripción en cada request
- No solo en layout inicial
- Invalidar sesión si trial termina

---

### 23. **Cambio de Plan Durante Trial**
**Problema:** Usuario puede cambiar de plan durante trial y perder días.

**Escenario:**
1. Usuario tiene trial STARTER (día 3 de 7)
2. Cambia a PRO
3. ¿Pierde los 4 días restantes?

**Solución:**
- Ya implementado, pero verificar que funciona correctamente
- Mostrar advertencia clara
- Confirmar antes de cambiar

---

### 24. **Webhook de Mercado Pago Retrasado**
**Problema:** Webhook puede llegar tarde o no llegar.

**Escenario:**
1. Usuario paga en Mercado Pago
2. Webhook tarda 5 minutos
3. Usuario no tiene acceso inmediato

**Solución:**
- Polling de estado de preapproval como fallback
- Botón "Verificar Pago" para usuario
- Notificación cuando pago se confirma

---

### 25. **Suscripción ACTIVE sin `mp_preapproval_id`**
**Problema:** Suscripción puede estar ACTIVE pero sin preapproval válido.

**Escenario:**
1. Admin cambia status a ACTIVE
2. No hay `mp_preapproval_id`
3. Usuario tiene acceso pero no se cobra

**Solución:**
- Validar que ACTIVE requiere `mp_preapproval_id`
- Verificar preapproval en Mercado Pago periódicamente
- Alertar si preapproval no existe

---

### 26. **Bypass mediante Modificación de Cookies/Session**
**Problema:** Usuario puede modificar cookies para simular otra sesión.

**Escenario:**
1. Usuario A tiene ACTIVE
2. Usuario B modifica cookies para usar sesión de A
3. Usuario B tiene acceso

**Solución:**
- Verificar que usuario en sesión coincide con usuario en BD
- No confiar solo en cookies
- Verificar en cada request crítico

---

### 27. **Falta de Validación de `agency_id` en APIs**
**Problema:** Usuario puede intentar acceder a datos de otra agencia.

**Escenario:**
1. Usuario A tiene agencia 1
2. Usuario B intenta acceder a datos de agencia 1
3. Si no se valida `agency_id`, puede tener acceso

**Solución:**
- Verificar `agency_id` en todas las APIs
- Usar `getUserAgencyIds` para validar
- No permitir acceso a agencias no asignadas

---

### 28. **Bypass mediante Uso de GraphQL/API Alternativa**
**Problema:** Si hay otras formas de acceder a datos, pueden ser explotadas.

**Escenario:**
1. Supabase tiene GraphQL API habilitada
2. Usuario accede directamente sin pasar por Next.js
3. Bypass de todas las validaciones

**Solución:**
- Deshabilitar GraphQL si no se usa
- RLS debe proteger todos los datos
- Verificar que no hay APIs alternativas expuestas

---

### 29. **Falta de Validación de `trial_start` en Suscripciones Existentes**
**Problema:** Suscripción puede tener `trial_end` pero no `trial_start`.

**Escenario:**
1. Admin crea suscripción con `trial_end` pero sin `trial_start`
2. Sistema puede comportarse inesperadamente

**Solución:**
- Validar que si hay `trial_end`, debe haber `trial_start`
- Constraints en BD
- Validación en aplicación

---

### 30. **Bypass mediante Manipulación de `billing_events`**
**Problema:** Si `billing_events` puede ser modificado, auditoría es inútil.

**Escenario:**
1. Admin hace cambio no autorizado
2. Elimina evento de `billing_events`
3. No hay rastro del cambio

**Solución:**
- `billing_events` debe ser append-only
- RLS debe bloquear DELETE/UPDATE
- Solo INSERT permitido

---

## 🛡️ RECOMENDACIONES DE SEGURIDAD

### Implementaciones Inmediatas (Prioridad ALTA)

1. **Verificación de Suscripción en Cada API Call**
   - Agregar middleware que verifica suscripción antes de procesar
   - No confiar solo en layout

2. **Auditoría Completa de Cambios Admin**
   - Log de TODOS los cambios a suscripciones
   - Quién, cuándo, qué cambió, por qué
   - Alertas para cambios críticos

3. **Validaciones en Base de Datos**
   - Triggers que validan reglas de negocio
   - Constraints que previenen estados inválidos
   - Funciones que verifican integridad

4. **Rate Limiting**
   - Implementar en todos los endpoints de billing
   - IP-based y user-based

5. **Verificación de Mercado Pago**
   - Validar `mp_preapproval_id` antes de permitir ACTIVE
   - Polling periódico de estado
   - Sincronización automática

### Implementaciones a Mediano Plazo (Prioridad MEDIA)

6. **Sistema de Alertas**
   - Alertar cuando se asigna TESTER
   - Alertar cuando se extiende trial más de X veces
   - Alertar cuando se cambia status a ACTIVE sin pago

7. **Límites en Admin**
   - Máximo de extensiones de trial por agencia
   - Máximo de días totales de trial
   - Requiere justificación para cambios críticos

8. **Verificación de Integridad**
   - Job que verifica consistencia de datos
   - Detecta suscripciones ACTIVE sin preapproval
   - Detecta trials extendidos más de lo permitido

9. **Mejoras en RLS**
   - Revisar todas las políticas
   - Asegurar que usuarios no pueden modificar suscripciones
   - Bloquear acceso directo a tablas críticas

10. **Testing de Seguridad**
    - Tests automatizados para cada vulnerabilidad
    - Penetration testing periódico
    - Code review de cambios en billing

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Protección Crítica (Semana 1)
- [ ] Verificación de suscripción en cada API call
- [ ] Validaciones en BD (triggers, constraints)
- [ ] Auditoría completa de cambios admin
- [ ] Rate limiting en endpoints críticos
- [ ] Verificación de Mercado Pago antes de ACTIVE

### Fase 2: Fortalecimiento (Semana 2)
- [ ] Límites en extensiones de trial
- [ ] Validación de `has_used_trial` inmutable
- [ ] Sistema de alertas
- [ ] Verificación de integridad periódica
- [ ] Mejoras en RLS

### Fase 3: Monitoreo (Semana 3)
- [ ] Dashboard de seguridad
- [ ] Alertas en tiempo real
- [ ] Reportes de anomalías
- [ ] Testing automatizado
- [ ] Documentación de procesos

---

## 🎯 MÉTRICAS DE ÉXITO

- **0** bypasses exitosos de paywall
- **0** trials extendidos más de lo permitido
- **0** cambios a ACTIVE sin verificación de pago
- **100%** de cambios admin auditados
- **<1 min** tiempo de detección de anomalías

---

**Última actualización:** 2026-01-26  
**Próxima revisión:** Después de implementar Fase 1
