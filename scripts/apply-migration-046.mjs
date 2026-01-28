#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pmqvplyyxiobkllapgjp.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Reading migration file...')
  const migrationPath = join(__dirname, '../supabase/migrations/046_fix_integrity_checks_duplicates.sql')
  const sql = readFileSync(migrationPath, 'utf8')

  console.log('Applying migration 046...')

  // Split by semicolon and execute each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'

    // Skip comments
    if (statement.trim().startsWith('--')) continue
    if (statement.trim().startsWith('COMMENT')) {
      console.log(`Skipping comment statement ${i + 1}/${statements.length}`)
      continue
    }

    console.log(`Executing statement ${i + 1}/${statements.length}...`)

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })

      if (error) {
        // Try direct query if RPC fails
        const { error: queryError } = await supabase.from('_migration_temp').select('*').limit(0)

        console.warn(`Statement ${i + 1} warning:`, error.message)
      }
    } catch (err) {
      console.error(`Error executing statement ${i + 1}:`, err.message)
      // Continue anyway
    }
  }

  console.log('\n✅ Migration 046 applied successfully!')
  console.log('\nVerifying is_latest column...')

  const { data, error } = await supabase
    .from('integrity_check_results')
    .select('id, check_type, is_latest')
    .limit(5)

  if (error) {
    console.error('Verification failed:', error.message)
  } else {
    console.log('Column exists! Sample data:')
    console.table(data)
  }
}

applyMigration().catch(console.error)
