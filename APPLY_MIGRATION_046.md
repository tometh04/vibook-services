# Cómo Aplicar la Migración 046

El dashboard de seguridad está tirando error 500 porque falta aplicar la migración que agrega la columna `is_latest`.

## Opción 1: Supabase Dashboard (MÁS FÁCIL)

1. Ve a https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp
2. Click en "SQL Editor" en el menú lateral
3. Click en "+ New query"
4. Copia y pega el contenido del archivo: `supabase/migrations/046_fix_integrity_checks_duplicates.sql`
5. Click en "Run" (o presiona Cmd/Ctrl + Enter)

## Opción 2: Supabase CLI

```bash
cd "/Users/tomiisanchezz/Desktop/Vibook Services/maxeva-saas"
npx supabase db push
```

**Nota**: Esto aplicará TODAS las migraciones pendientes.

## Opción 3: SQL Directo

Si tienes acceso directo a PostgreSQL:

```bash
psql <connection-string> < supabase/migrations/046_fix_integrity_checks_duplicates.sql
```

## Verificar que se aplicó correctamente

Después de aplicar la migración, ejecuta esta query en el SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'integrity_check_results'
  AND column_name = 'is_latest';
```

Debería mostrar:
```
column_name | data_type
is_latest   | boolean
```

## ¿Qué hace esta migración?

1. Agrega columna `is_latest` (boolean) a la tabla `integrity_check_results`
2. Marca los registros existentes: solo el más reciente de cada tipo tiene `is_latest = true`
3. Modifica las 4 funciones SQL para que marquen automáticamente los registros viejos como `is_latest = false` antes de insertar uno nuevo

Esto evita que se dupliquen los resultados de las verificaciones de integridad.

## Después de aplicar

1. Recarga el dashboard de seguridad
2. Click en "Ejecutar Verificación de Integridad"
3. Ya no deberías ver duplicados

