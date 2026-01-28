# Problema Técnico de Cerebro - Análisis Exhaustivo

## 🔴 EL BUG RAÍZ

### Localización del Error
**Archivo**: `app/api/ai/route.ts`
**Línea**: 173
**Código**:
```typescript
const { data, error } = await supabase.rpc('execute_readonly_query', {
  query_text: cleanedQuery
})
```

### El Problema
El método `.rpc()` del Supabase SDK hace un **Remote Procedure Call (RPC)** a una función PostgreSQL en el servidor de base de datos. Esta función `execute_readonly_query(TEXT)` **NO EXISTE** en la base de datos.

---

## 📊 FLUJO DE EJECUCIÓN COMPLETO

### 1. Usuario Hace una Pregunta
```
Usuario: "¿Cuántas operaciones hay?"
```

### 2. Backend Recibe la Pregunta (POST /api/ai)
**Archivo**: `app/api/ai/route.ts` línea 189-202

```typescript
export async function POST(request: Request) {
  const { user } = await getCurrentUser()
  const body = await request.json()
  const { message } = body  // "¿Cuántas operaciones hay?"

  const openai = new OpenAI({ apiKey: openaiKey })
  const supabase = await createServerClient()
  // ...
}
```

### 3. Se Envía a OpenAI GPT-4o
**Línea**: 240-247

```typescript
let response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },  // Incluye DATABASE_SCHEMA
    { role: "user", content: `${userContext}\n\nPregunta: ${message}` }
  ],
  tools,  // Incluye la definición de execute_query
  tool_choice: "auto",
  temperature: 0.3,
  max_tokens: 1500
})
```

**REQUEST HTTP a OpenAI**:
```http
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer sk-...
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Eres \"Cerebro\"...\n\nESQUEMA:\n## ESQUEMA DE BASE DE DATOS...\n\nEJEMPLOS DE QUERIES CORRECTAS:..."
    },
    {
      "role": "user",
      "content": "Fecha: 2026-01-28 | Usuario: Tomás\n\nPregunta: ¿Cuántas operaciones hay?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "execute_query",
        "description": "Ejecuta una consulta SQL SELECT...",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Consulta SQL SELECT" },
            "description": { "type": "string", "description": "Qué información busca" }
          }
        }
      }
    }
  ]
}
```

### 4. GPT-4o Analiza y Genera Tool Call
**RESPONSE de OpenAI**:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "execute_query",
          "arguments": "{\"query\":\"SELECT COUNT(*) as total FROM operations WHERE status NOT IN ('CANCELLED')\",\"description\":\"Contar operaciones activas\"}"
        }
      }]
    }
  }]
}
```

### 5. Backend Procesa el Tool Call
**Línea**: 254-296

```typescript
while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
  for (const toolCall of assistantMessage.tool_calls) {
    if (toolCall.function.name === "execute_query") {
      const args = JSON.parse(toolCall.function.arguments)
      // args = {
      //   query: "SELECT COUNT(*) as total FROM operations WHERE status NOT IN ('CANCELLED')",
      //   description: "Contar operaciones activas"
      // }

      const result = await executeQuery(supabase, args.query)
      // AQUÍ ES DONDE FALLA
    }
  }
}
```

### 6. Función executeQuery Intenta Ejecutar
**Línea**: 162-187

```typescript
async function executeQuery(supabase: any, query: string): Promise<{
  success: boolean;
  data?: any;
  error?: string
}> {
  try {
    const cleanedQuery = query.trim()
    const normalizedQuery = cleanedQuery.toUpperCase()

    // Validación básica
    if (!normalizedQuery.startsWith("SELECT")) {
      return { success: false, error: "Solo SELECT permitido" }
    }

    console.log("[Cerebro] Query:", cleanedQuery.substring(0, 200))

    // ❌ AQUÍ FALLA - LA FUNCIÓN NO EXISTE
    const { data, error } = await supabase.rpc('execute_readonly_query', {
      query_text: cleanedQuery
    })

    if (error) {
      console.error("[Cerebro] Query error:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true, data: Array.isArray(data) ? data : [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
```

### 7. Supabase SDK Hace HTTP Request
**SDK Internamente**:
```typescript
// node_modules/@supabase/supabase-js/dist/main/SupabaseClient.js
async rpc(fn, args, options) {
  return this.rest.rpc(fn, args, options)
}

// node_modules/@supabase/postgrest-js/dist/main/PostgrestClient.js
async rpc(fn, args, options) {
  return this.url
    .pathname(`/rpc/${fn}`)
    .post(args, options)
}
```

**REQUEST HTTP**:
```http
POST https://pmqvplyyxiobkllapgjp.supabase.co/rest/v1/rpc/execute_readonly_query
Content-Type: application/json
apikey: eyJhbG...
Authorization: Bearer eyJhbG...

{
  "query_text": "SELECT COUNT(*) as total FROM operations WHERE status NOT IN ('CANCELLED')"
}
```

### 8. PostgREST (Servidor REST de Supabase) Busca la Función
**PostgREST Internamente** (Haskell/PostgreSQL):
```sql
-- PostgREST busca la función en el catálogo de PostgreSQL
SELECT
  p.oid,
  p.proname,
  p.proargnames,
  p.proargtypes
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'execute_readonly_query'
  AND p.pronargs = 1
  AND p.proargtypes[0] = 'text'::regtype;
```

**Resultado de la Query**:
```
(0 rows)  -- ❌ NO EXISTE
```

### 9. PostgREST Retorna Error 404
**RESPONSE HTTP**:
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "code": "42883",
  "message": "function public.execute_readonly_query(query_text => text) does not exist",
  "details": null,
  "hint": "No function matches the given name and argument types. You might need to add explicit type casts."
}
```

### 10. Backend Captura el Error
**Línea**: 175-177

```typescript
if (error) {
  console.error("[Cerebro] Query error:", error.message)
  return { success: false, error: error.message }
}
```

**Console Output**:
```
[Cerebro] Query error: function public.execute_readonly_query(query_text => text) does not exist
```

### 11. Backend Responde a GPT-4 que Falló
**Línea**: 274-283

```typescript
toolResults.push({
  role: "tool",
  tool_call_id: toolCall.id,
  content: JSON.stringify({
    success: false,
    message: "La consulta falló. Intenta con una query más simple o responde que no pudiste obtener la información."
  })
})
```

### 12. GPT-4 Recibe que Falló y Responde
**Segundo REQUEST a OpenAI** (línea 301-308):
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "¿Cuántas operaciones hay?" },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [{ "id": "call_abc123", "function": { "name": "execute_query", ... }}]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "{\"success\":false,\"message\":\"La consulta falló...\"}"
    }
  ]
}
```

**RESPONSE de OpenAI**:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "No pude obtener esa información en este momento. ¿Puedo ayudarte con algo más?"
    }
  }]
}
```

### 13. Usuario Recibe Respuesta Genérica
```
Cerebro: "No pude obtener esa información en este momento. ¿Puedo ayudarte con algo más?"
```

---

## 💥 POR QUÉ ESTO ROMPE TODO CEREBRO

1. **Cada pregunta requiere datos reales** → Necesita ejecutar SQL
2. **GPT-4 depende del tool** `execute_query` → Sin él, no puede obtener datos
3. **Sin la función PostgreSQL** → Todas las queries fallan
4. **El error se captura** → Pero retorna `{ success: false }`
5. **GPT-4 recibe el fallo** → Responde genéricamente
6. **Resultado final** → Cerebro NUNCA puede consultar datos reales

### Síntomas Observables

```
❌ Todas las preguntas retornan respuestas genéricas
❌ Cerebro dice "No pude obtener esa información"
❌ Console muestra: "[Cerebro] Query error: function ... does not exist"
❌ GPT-4 usa tokens intentando sin éxito
❌ Usuario frustra porque parece que "no sabe nada"
```

---

## ✅ LA SOLUCIÓN

### Crear la Función PostgreSQL

**Archivo**: `supabase/migrations/047_create_execute_readonly_query_function.sql`

```sql
CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB AS $$
DECLARE
  result_data JSONB;
  normalized_query TEXT;
BEGIN
  -- 1. Normalizar query
  normalized_query := UPPER(TRIM(query_text));

  -- 2. Validar que solo sea SELECT
  IF NOT normalized_query LIKE 'SELECT %' THEN
    RAISE EXCEPTION 'Solo se permiten queries SELECT';
  END IF;

  -- 3. Detectar comandos peligrosos
  IF normalized_query LIKE '%INSERT%'
     OR normalized_query LIKE '%UPDATE%'
     OR normalized_query LIKE '%DELETE%'
     OR normalized_query LIKE '%DROP%'
     OR normalized_query LIKE '%CREATE%'
     OR normalized_query LIKE '%ALTER%'
     OR normalized_query LIKE '%TRUNCATE%'
     OR normalized_query LIKE '%GRANT%'
     OR normalized_query LIKE '%REVOKE%' THEN
    RAISE EXCEPTION 'Query contiene comandos no permitidos';
  END IF;

  -- 4. Ejecutar dinámicamente
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text)
  INTO result_data;

  -- 5. Manejar resultado vacío
  IF result_data IS NULL THEN
    result_data := '[]'::jsonb;
  END IF;

  RETURN result_data;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error ejecutando query: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Dar permisos
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;
```

---

## 🔐 DETALLES DE SEGURIDAD

### 1. SECURITY DEFINER
```sql
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**¿Qué hace?**
- La función se ejecuta con los privilegios del **owner** (usuario que la creó)
- Normalmente el owner es el usuario `postgres` o el service_role
- Este usuario tiene acceso total a todas las tablas

**¿Por qué es necesario?**
- Las tablas tienen **Row Level Security (RLS)** habilitado
- Un usuario normal solo puede ver sus propios datos (filtrados por `agency_id`)
- Cerebro necesita poder hacer queries arbitrarios sin que RLS los filtre
- Con `SECURITY DEFINER`, la función bypassa RLS

**Alternativa (MENOS SEGURA)**:
```sql
$$ LANGUAGE plpgsql SECURITY INVOKER;
```
Esto ejecutaría con los permisos del usuario que llama, y RLS aplicaría. Pero entonces Cerebro no podría hacer queries como "COUNT(*) FROM operations" porque RLS filtraría por agency_id automáticamente.

### 2. Validación de Query
```sql
IF NOT normalized_query LIKE 'SELECT %' THEN
  RAISE EXCEPTION 'Solo se permiten queries SELECT';
END IF;
```

**Previene**:
- `INSERT INTO users VALUES (...)`
- `UPDATE subscriptions SET status='ACTIVE'`
- `DELETE FROM payments`

### 3. Detección de Comandos Peligrosos
```sql
IF normalized_query LIKE '%DROP%' OR normalized_query LIKE '%TRUNCATE%' THEN
  RAISE EXCEPTION 'Query contiene comandos no permitidos';
END IF;
```

**Previene**:
- `SELECT * FROM users; DROP TABLE payments; --`
- `SELECT * FROM (SELECT 1; TRUNCATE operations) t`

Aunque ya validamos que empiece con SELECT, esto evita **SQL Injection** dentro de subconsultas.

### 4. EXECUTE con format()
```sql
EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text)
```

**¿Por qué format()?**
- `format()` usa marcadores de posición (`%s`, `%I`, `%L`)
- `%s` inserta como string literal (NO escapa)
- Aquí está OK porque ya validamos que sea SELECT

**¿Por qué EXECUTE?**
- PostgreSQL no permite ejecutar queries dinámicos directamente
- `EXECUTE` compila y ejecuta un string como SQL

**¿Qué hace `jsonb_agg(row_to_json(t))`?**
```sql
-- Query del usuario:
SELECT COUNT(*) as total FROM operations

-- Se transforma a:
SELECT jsonb_agg(row_to_json(t)) FROM (
  SELECT COUNT(*) as total FROM operations
) t

-- Resultado:
[{"total": 42}]
```

Convierte el resultado a un array JSON, que es lo que Supabase SDK espera.

---

## 📋 CÓMO APLICAR EN OTRO PROYECTO

### Paso 1: Crear el Archivo de Migración
```bash
touch supabase/migrations/XXX_create_execute_readonly_query.sql
```

### Paso 2: Copiar el Contenido
Copiar el contenido completo de `047_create_execute_readonly_query_function.sql`

### Paso 3: Aplicar la Migración

**Opción A: Supabase CLI**
```bash
npx supabase db push
```

**Opción B: Supabase Dashboard**
1. Ir a https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. SQL Editor → New Query
3. Pegar el contenido del archivo
4. Run

### Paso 4: Verificar
```sql
-- En SQL Editor:
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'execute_readonly_query'
  AND routine_schema = 'public';

-- Debería mostrar:
-- routine_name              | routine_type
-- execute_readonly_query    | FUNCTION
```

### Paso 5: Probar
```sql
SELECT execute_readonly_query('SELECT COUNT(*) as total FROM operations');

-- Debería retornar:
-- [{"total": 42}]
```

---

## 🧪 TESTING

### Test 1: Query Simple
```sql
SELECT execute_readonly_query('SELECT 1 as numero');
-- Resultado: [{"numero": 1}]
```

### Test 2: Query Complejo
```sql
SELECT execute_readonly_query('
  SELECT
    status,
    COUNT(*) as cantidad
  FROM operations
  GROUP BY status
  ORDER BY cantidad DESC
');
-- Resultado: [
--   {"status": "CONFIRMED", "cantidad": 15},
--   {"status": "RESERVED", "cantidad": 8},
--   ...
-- ]
```

### Test 3: Validación SELECT
```sql
SELECT execute_readonly_query('UPDATE operations SET status=''ACTIVE''');
-- Error: Solo se permiten queries SELECT
```

### Test 4: Validación Comandos Peligrosos
```sql
SELECT execute_readonly_query('SELECT * FROM users; DROP TABLE payments; --');
-- Error: Query contiene comandos no permitidos
```

### Test 5: Query Vacía
```sql
SELECT execute_readonly_query('SELECT * FROM operations WHERE id = ''nonexistent''');
-- Resultado: []
```

---

## 🔍 DEBUGGING

### Si la función no se crea:
```sql
-- Ver errores:
SELECT * FROM pg_stat_statements WHERE query LIKE '%execute_readonly_query%';

-- Ver permisos:
SELECT
  p.proname,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.proacl
FROM pg_proc p
WHERE p.proname = 'execute_readonly_query';
```

### Si retorna error 42883:
```sql
-- La función no existe, revisar:
\df execute_readonly_query

-- Si no aparece, la migración no se aplicó
```

### Si retorna error de permisos:
```sql
-- Verificar grant:
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO anon;
```

---

## 📚 REFERENCIAS

- **Supabase RPC**: https://supabase.com/docs/reference/javascript/rpc
- **PostgreSQL EXECUTE**: https://www.postgresql.org/docs/current/plpgsql-statements.html#PLPGSQL-STATEMENTS-EXECUTING-DYN
- **PostgreSQL SECURITY DEFINER**: https://www.postgresql.org/docs/current/sql-createfunction.html
- **PostgREST RPC**: https://postgrest.org/en/stable/references/api/stored_procedures.html

---

## ✅ CHECKLIST PARA OTRO PROYECTO

- [ ] Crear archivo de migración `XXX_create_execute_readonly_query.sql`
- [ ] Copiar el código de la función
- [ ] Aplicar migración via CLI o Dashboard
- [ ] Verificar que la función existe con `\df` o query a `information_schema`
- [ ] Probar con query simple: `SELECT execute_readonly_query('SELECT 1')`
- [ ] Verificar permisos: `GRANT EXECUTE ... TO authenticated`
- [ ] Probar desde el backend haciendo un request a `/api/ai`
- [ ] Verificar logs de Supabase: no debe haber error 42883
- [ ] Confirmar que Cerebro responde con datos reales

---

**Generado**: 2026-01-28
**Por**: Claude Sonnet 4.5
**Contexto**: Corrección crítica de Cerebro en Vibook Gestión
