#!/usr/bin/env node
/**
 * Script para aplicar la migración 047 directamente
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '.env.local') })

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

console.log('================================================')
console.log('🧠 APLICACIÓN DE MIGRACIÓN 047 PARA CEREBRO')
console.log('================================================\n')

// Paso 1: Verificar si ya existe
console.log('🔍 Verificando si la función ya existe...')

try {
  const { data: testData, error: testError } = await supabase.rpc('execute_readonly_query', {
    query_text: 'SELECT 1 as test'
  })

  if (!testError) {
    console.log('✅ La función execute_readonly_query YA EXISTE y funciona correctamente')
    console.log('📊 Resultado de prueba:', testData)
    console.log('\n🎉 Cerebro está listo para usar en: http://localhost:3044/tools/cerebro')
    console.log('\n================================================')
    process.exit(0)
  }

  console.log('⚠️  La función no existe. Intentando aplicar migración...\n')

} catch (error) {
  console.log('⚠️  Error verificando función:', error.message)
}

// Paso 2: Leer el archivo SQL
console.log('📄 Leyendo archivo de migración...')
const migrationPath = join(__dirname, 'supabase', 'migrations', '047_create_execute_readonly_query_function.sql')
const migrationSQL = readFileSync(migrationPath, 'utf8')

// Paso 3: Aplicar usando SQL directo
console.log('🚀 Aplicando migración a través de PostgreSQL...\n')

// La mejor forma es usando el endpoint de PostgreSQL directamente
const migrationStatements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log('⚠️  NOTA IMPORTANTE:')
console.log('Este script no puede aplicar la migración automáticamente debido a limitaciones de la API.')
console.log('\n📋 NECESITAS APLICAR LA MIGRACIÓN MANUALMENTE:')
console.log('\n1. Ve a: https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp/sql/new')
console.log('2. Copia y pega el siguiente SQL:\n')
console.log('─'.repeat(80))
console.log(migrationSQL)
console.log('─'.repeat(80))
console.log('\n3. Click en "RUN" (o presiona Cmd/Ctrl + Enter)')
console.log('\n4. Verifica que veas el mensaje: "Success. No rows returned"')
console.log('\n5. Vuelve a ejecutar este script para verificar que todo funciona')
console.log('\n================================================')
