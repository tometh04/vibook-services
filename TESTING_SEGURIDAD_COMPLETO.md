# 🧪 Testing Completo de Implementaciones de Seguridad

## 📋 Checklist de Testing Manual

### FASE 1: Verificaciones Básicas

#### ✅ 1. Verificación de Suscripción en APIs
- [ ] **Test:** Usuario sin suscripción intenta crear operación
  - **Acción:** POST `/api/operations` sin suscripción activa
  - **Esperado:** Error 403 con mensaje "No tiene una suscripción activa"
  - **Resultado:** ✅/❌

- [ ] **Test:** Usuario con TRIAL puede crear operación
  - **Acción:** POST `/api/operations` con suscripción TRIAL
  - **Esperado:** Operación creada exitosamente
  - **Resultado:** ✅/❌

- [ ] **Test:** Usuario con ACTIVE puede crear operación
  - **Acción:** POST `/api/operations` con suscripción ACTIVE
  - **Esperado:** Operación creada exitosamente
  - **Resultado:** ✅/❌

#### ✅ 2. Validaciones en BD
- [ ] **Test:** Intentar resetear has_used_trial de true a false
  - **Acción:** UPDATE `agencies` SET `has_used_trial = false` WHERE `has_used_trial = true`
  - **Esperado:** Error de trigger "No se puede resetear has_used_trial"
  - **Resultado:** ✅/❌

- [ ] **Test:** Intentar crear trial_end < trial_start
  - **Acción:** INSERT en `subscriptions` con `trial_end < trial_start`
  - **Esperado:** Error de trigger "trial_end debe ser posterior a trial_start"
  - **Resultado:** ✅/❌

- [ ] **Test:** Intentar cambiar status a ACTIVE sin mp_preapproval_id
  - **Acción:** UPDATE `subscriptions` SET `status = 'ACTIVE'` sin `mp_preapproval_id` (excepto TESTER)
  - **Esperado:** Error de trigger "Status ACTIVE requiere mp_preapproval_id válido"
  - **Resultado:** ✅/❌

#### ✅ 3. Rate Limiting
- [ ] **Test:** Hacer más de 5 requests/minuto a `/api/billing/checkout`
  - **Acción:** 6 requests POST `/api/billing/checkout` en menos de 1 minuto
  - **Esperado:** Request 6 retorna 429 con header `Retry-After`
  - **Resultado:** ✅/❌

#### ✅ 4. Verificación de Mercado Pago
- [ ] **Test:** Admin intenta cambiar status a ACTIVE sin preapproval válido
  - **Acción:** PATCH `/api/admin/subscriptions/[id]` con `status: 'ACTIVE'` sin `mp_preapproval_id`
  - **Esperado:** Error 400 "No se puede cambiar status a ACTIVE sin mp_preapproval_id válido"
  - **Resultado:** ✅/❌

### FASE 2: Transacciones Atómicas

#### ✅ 5. Límites de Operaciones
- [ ] **Test:** Múltiples requests simultáneos creando operaciones
  - **Acción:** 10 requests POST `/api/operations` simultáneos cuando el límite es 5
  - **Esperado:** Solo 5 operaciones creadas, las otras 5 retornan error 403
  - **Resultado:** ✅/❌

- [ ] **Test:** Rollback si falla creación después de incrementar
  - **Acción:** Simular fallo en creación de operación después de incrementar contador
  - **Esperado:** Contador se revierte correctamente
  - **Resultado:** ✅/❌

#### ✅ 6. Sistema de Alertas
- [ ] **Test:** Asignar plan TESTER crea alerta
  - **Acción:** Cambiar plan de suscripción a TESTER desde admin
  - **Esperado:** Alerta creada en `security_alerts` con tipo `TESTER_ASSIGNED` y severity `HIGH`
  - **Resultado:** ✅/❌

- [ ] **Test:** Extender trial crea alerta
  - **Acción:** Extender trial desde admin
  - **Esperado:** Alerta creada en `security_alerts` con tipo `TRIAL_EXTENDED` y severity `MEDIUM`
  - **Resultado:** ✅/❌

- [ ] **Test:** Cambiar status a ACTIVE sin preapproval crea alerta CRITICAL
  - **Acción:** Cambiar status a ACTIVE sin `mp_preapproval_id` (si se permite)
  - **Esperado:** Alerta creada con tipo `ACTIVE_WITHOUT_PREAPPROVAL` y severity `CRITICAL`
  - **Resultado:** ✅/❌

#### ✅ 7. Verificación de Integridad
- [ ] **Test:** Ejecutar run_all_integrity_checks()
  - **Acción:** Ejecutar función `run_all_integrity_checks()` desde SQL
  - **Esperado:** Retorna JSONB con resultados de todas las verificaciones
  - **Resultado:** ✅/❌

- [ ] **Test:** Verificar que detecta suscripciones ACTIVE sin preapproval
  - **Acción:** Crear suscripción ACTIVE sin preapproval (si es posible) y ejecutar verificación
  - **Esperado:** Verificación retorna status FAIL con detalles
  - **Resultado:** ✅/❌

#### ✅ 8. Políticas RLS
- [ ] **Test:** Usuario autenticado intenta modificar subscription
  - **Acción:** UPDATE `subscriptions` desde cliente normal (no admin)
  - **Esperado:** Error de RLS bloqueando la modificación
  - **Resultado:** ✅/❌

- [ ] **Test:** Usuario autenticado intenta modificar usage_metrics
  - **Acción:** UPDATE `usage_metrics` desde cliente normal
  - **Esperado:** Error de RLS bloqueando la modificación
  - **Resultado:** ✅/❌

### FASE 3: Dashboard de Seguridad

#### ✅ 9. Dashboard Admin
- [ ] **Test:** Acceder a `/admin/security`
  - **Acción:** Navegar a `/admin/security` como admin
  - **Esperado:** Dashboard muestra alertas, verificaciones y auditoría
  - **Resultado:** ✅/❌

- [ ] **Test:** Ejecutar verificación desde dashboard
  - **Acción:** Click en botón "Ejecutar Verificación de Integridad"
  - **Esperado:** Verificación se ejecuta y resultados se actualizan
  - **Resultado:** ✅/❌

## 🔧 Testing Automatizado

### Ejecutar script de testing:
```bash
cd maxeva-saas
npx tsx scripts/test-security-implementations.ts
```

### Verificar funciones RPC manualmente:
```sql
-- Verificar función atómica
SELECT check_and_increment_operation_limit('agency-id', 'operations');

-- Ejecutar verificaciones de integridad
SELECT run_all_integrity_checks();

-- Crear alerta de prueba
SELECT create_security_alert(
  'TEST',
  'LOW',
  'Test Alert',
  'This is a test alert'
);
```

## 📊 Métricas de Éxito

- **Objetivo:** 100% de tests pasando
- **Mínimo aceptable:** 90% de tests pasando
- **Tests críticos:** Todos deben pasar (Fase 1)

## 🐛 Issues Conocidos

- Ninguno hasta el momento

## 📝 Notas

- Algunos tests requieren datos de prueba en la BD
- Tests de rate limiting requieren múltiples requests simultáneos
- Tests de RLS requieren cliente normal (no admin)
