# ⚠️ Solución: DeprecationWarning en Mercado Pago

## 🔍 Problema Identificado

El warning que ves en los logs:

```
(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized...
```

Es un **warning de deprecación** del SDK de Mercado Pago (no es un error crítico). Viene de una dependencia interna del SDK.

---

## ✅ Buenas Noticias

El status **200** indica que el endpoint `/api/billing/checkout` está funcionando correctamente. El warning **NO impide** que funcione.

---

## 🔍 Qué Verificar Ahora

Aunque el endpoint responde con 200, necesitamos verificar que **la respuesta tenga la URL de checkout**.

### Paso 1: Verificar la Respuesta del Endpoint

1. En Vercel Logs, busca el log completo de `/api/billing/checkout`
2. Busca la respuesta que devuelve (debe tener `initPoint` o `sandboxInitPoint`)
3. O prueba directamente en la consola del navegador:

```javascript
// En /pricing, abre la consola (F12)
// Primero obtén el ID de un plan:
fetch('/api/billing/plans')
  .then(r => r.json())
  .then(data => {
    console.log('Planes:', data.plans);
    // Toma el ID del plan STARTER o PRO
    const planId = data.plans.find(p => p.name === 'STARTER')?.id;
    
    // Ahora prueba el checkout:
    return fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId })
    });
  })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Respuesta completa:', data);
    if (data.initPoint || data.sandboxInitPoint) {
      console.log('✅ URL de checkout:', data.initPoint || data.sandboxInitPoint);
    } else if (data.error) {
      console.error('❌ Error:', data.error);
    } else {
      console.error('❌ No se recibió URL de checkout:', data);
    }
  });
```

### Paso 2: Revisar el Log Completo en Vercel

En Vercel Logs:

1. Haz clic en el log de `/api/billing/checkout` (el que tiene status 200)
2. Expande **"Vercel Function"**
3. Busca el **console.log** o **return** que muestre la respuesta
4. Verifica si hay algún error en la creación de la preferencia

---

## 🛠️ Posibles Problemas

Si el endpoint responde 200 pero no funciona:

### Problema 1: La preferencia no se crea correctamente

**Síntoma:** El endpoint responde 200 pero `initPoint` es `null` o `undefined`

**Causa:** Error en la creación de la preferencia en Mercado Pago

**Solución:**
1. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado correctamente
2. Verifica que el token sea de TEST (debe empezar con `TEST-`)
3. Revisa los logs de Vercel para ver el error específico

### Problema 2: Error en el SDK de Mercado Pago

**Síntoma:** El deprecation warning puede estar ocultando un error real

**Solución:**
1. Actualizar el SDK de Mercado Pago (si hay una versión más nueva)
2. O ignorar el warning (no es crítico)

---

## 📋 Información Necesaria

Para diagnosticar mejor, necesito que me compartas:

1. **¿Qué devuelve el endpoint?** (ejecuta el código de arriba en la consola)
2. **¿Hay algún error en los logs?** (además del deprecation warning)
3. **¿Qué pasa cuando haces clic en "Upgrade"?** (¿te redirige? ¿qué URL te muestra?)

---

## 🔧 Solución Temporal

El deprecation warning NO afecta la funcionalidad. Si el checkout no funciona, el problema es otro:

1. Verifica que la respuesta tenga `initPoint` o `sandboxInitPoint`
2. Verifica que la URL de checkout sea válida (debe ser de Mercado Pago)
3. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado correctamente

---

**Nota:** El warning de deprecación es solo informativo y no impide que funcione. Si el checkout no funciona, el problema está en otro lado (probablemente en la respuesta del endpoint o en la configuración).
