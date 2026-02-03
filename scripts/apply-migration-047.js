/**
 * Script temporal para aplicar la migración 047
 * Este script ejecuta la función SQL directamente en Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Leer las variables de entorno
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Aplicando migración 047...')

  // Leer el archivo SQL
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '047_create_execute_readonly_query_function.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  try {
    // Ejecutar el SQL usando rpc
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    }).single()

    if (error) {
      console.error('❌ Error aplicando migración:', error.message)

      // Intentar método alternativo: ejecutar directamente
      console.log('\n🔄 Intentando método alternativo...')

      // Separar las sentencias SQL
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          // Para funciones, usamos el método POST directo
          console.log('📝 Ejecutando creación de función...')

          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_readonly_query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({})
          })

          if (!response.ok) {
            console.log('⚠️  La función aún no existe, esto es esperado en la primera ejecución')
          }
        }
      }

      console.log('\n⚠️  No se pudo aplicar automáticamente.')
      console.log('\n📋 NECESITAS APLICAR LA MIGRACIÓN MANUALMENTE:')
      console.log('1. Ve a: https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp')
      console.log('2. Click en "SQL Editor"')
      console.log('3. Click en "+ New query"')
      console.log('4. Copia y pega el contenido de:')
      console.log('   supabase/migrations/047_create_execute_readonly_query_function.sql')
      console.log('5. Click en "Run"')
      return false
    }

    console.log('✅ Migración aplicada exitosamente')
    return true

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 APLICA LA MIGRACIÓN MANUALMENTE en el dashboard de Supabase')
    return false
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verificando que la función existe...')

  try {
    // Intentar ejecutar la función con una query simple
    const { data, error } = await supabase.rpc('execute_readonly_query', {
      query_text: 'SELECT 1 as test'
    })

    if (error) {
      console.error('❌ La función no existe o tiene errores:', error.message)
      return false
    }

    console.log('✅ Función execute_readonly_query verificada correctamente')
    console.log('📊 Resultado de prueba:', data)
    return true

  } catch (error) {
    console.error('❌ Error verificando función:', error.message)
    return false
  }
}

async function main() {
  console.log('================================================')
  console.log('🧠 APLICACIÓN DE MIGRACIÓN 047 PARA CEREBRO')
  console.log('================================================\n')

  // Primero verificar si ya existe
  const alreadyExists = await verifyMigration()

  if (alreadyExists) {
    console.log('\n✅ La migración ya está aplicada. No es necesario hacer nada.')
    console.log('\n🎉 Cerebro está listo para usar en: http://localhost:3000/tools/cerebro')
    return
  }

  // Si no existe, intentar aplicarla
  const applied = await applyMigration()

  if (applied) {
    // Verificar nuevamente
    await verifyMigration()
  }

  console.log('\n================================================')
}

main().catch(console.error)
