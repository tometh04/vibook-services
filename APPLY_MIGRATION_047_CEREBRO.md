# Cómo Aplicar la Migración 047 - CRÍTICO para Cerebro

**IMPORTANTE**: Cerebro NO FUNCIONA sin esta migración. Esta función es absolutamente necesaria.

## ¿Qué hace esta migración?

Crea la función `execute_readonly_query()` que permite a Cerebro ejecutar queries SQL de forma segura:
- ✅ Solo permite queries SELECT
- ✅ Valida que no haya comandos peligrosos (INSERT, UPDATE, DELETE, etc.)
- ✅ Retorna resultados en formato JSONB
- ✅ Maneja errores de forma segura

## Opción 1: Supabase Dashboard (RECOMENDADO)

1. Ve a https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp
2. Click en "SQL Editor" en el menú lateral
3. Click en "+ New query"
4. Copia y pega el contenido del archivo: `supabase/migrations/047_create_execute_readonly_query_function.sql`
5. Click en "Run" (o presiona Cmd/Ctrl + Enter)

## Opción 2: Supabase CLI

```bash
cd "/Users/tomiisanchezz/Desktop/Vibook Services/maxeva-saas"
npx supabase db push
```

**Nota**: Esto aplicará TODAS las migraciones pendientes (046 y 047).

## Verificar que se aplicó correctamente

Después de aplicar la migración, ejecuta esta query en el SQL Editor:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'execute_readonly_query'
  AND routine_schema = 'public';
```

Debería mostrar:
```
routine_name              | routine_type
execute_readonly_query    | FUNCTION
```

## Probar la función

Ejecuta esta query de prueba:

```sql
SELECT execute_readonly_query('SELECT COUNT(*) as total FROM operations');
```

Debería retornar algo como:
```json
[{"total": 5}]
```

## Si hay errores

Si ves algún error sobre permisos o "function already exists":
1. Es normal si ya existía una versión
2. La función se reemplazará (CREATE OR REPLACE)
3. Si persiste el error, contacta al equipo de desarrollo

## Después de aplicar

1. Recarga la página de Cerebro en `/tools/cerebro`
2. Prueba hacer una pregunta como "¿Cuántas operaciones hay?"
3. Cerebro debería responder con datos reales

## Estado de Migraciones

- ✅ Migración 046: Fix integrity checks duplicates
- 🔴 **Migración 047: Create execute_readonly_query (PENDIENTE - CRÍTICO)**
