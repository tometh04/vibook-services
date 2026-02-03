#!/usr/bin/env node
/**
 * Verificar el esquema real de la base de datos
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySchema() {
  console.log('🔍 VERIFICANDO ESQUEMA DE BASE DE DATOS\n')

  const tables = [
    'financial_accounts',
    'operations',
    'leads'
  ]

  for (const table of tables) {
    console.log(`\n📋 Tabla: ${table}`)
    console.log('─'.repeat(60))

    try {
      const { data, error } = await supabase.rpc('execute_readonly_query', {
        query_text: `SELECT column_name, data_type, is_nullable
                     FROM information_schema.columns
                     WHERE table_name = '${table}'
                     AND table_schema = 'public'
                     ORDER BY ordinal_position`
      })

      if (error) {
        console.log(`❌ Error: ${error.message}`)
        continue
      }

      if (data && data.length > 0) {
        data.forEach(col => {
          console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
        })
      } else {
        console.log(`   ⚠️  No se encontraron columnas`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }

  // Verificar datos de ejemplo
  console.log('\n\n📊 DATOS DE EJEMPLO')
  console.log('═'.repeat(60))

  const queries = [
    { name: 'Financial Accounts', query: 'SELECT * FROM financial_accounts LIMIT 3' },
    { name: 'Operations', query: 'SELECT * FROM operations LIMIT 3' },
    { name: 'Leads (WON)', query: "SELECT * FROM leads WHERE status = 'WON' LIMIT 3" }
  ]

  for (const q of queries) {
    console.log(`\n📌 ${q.name}:`)
    try {
      const { data, error } = await supabase.rpc('execute_readonly_query', {
        query_text: q.query
      })

      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
      } else if (data && data.length > 0) {
        console.log(`   ✅ ${data.length} rows encontradas`)
        console.log(`   Ejemplo:`, JSON.stringify(data[0], null, 2).substring(0, 200))
      } else {
        console.log(`   ⚠️  Sin datos`)
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
}

verifySchema().catch(console.error)
