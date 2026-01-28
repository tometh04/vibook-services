#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAndFix() {
  console.log('🔍 Checking if migration 046 needs to be applied...\n')

  // Try to query with is_latest column
  const { data, error } = await supabase
    .from('integrity_check_results')
    .select('id, check_type, is_latest')
    .limit(1)

  if (error) {
    if (error.message.includes('column') && error.message.includes('is_latest')) {
      console.log('❌ Column is_latest does NOT exist')
      console.log('\n📋 Please apply migration 046 manually:')
      console.log('\n1. Go to Supabase Dashboard > SQL Editor')
      console.log('2. Copy the content of: supabase/migrations/046_fix_integrity_checks_duplicates.sql')
      console.log('3. Paste and run it in the SQL Editor')
      console.log('\nOr use Supabase CLI:')
      console.log('npx supabase db push --db-url <your-database-url>\n')
      return false
    } else {
      console.error('❌ Unexpected error:', error.message)
      return false
    }
  }

  console.log('✅ Column is_latest exists!')
  console.log('\n📊 Current integrity check results:')

  const { data: allChecks } = await supabase
    .from('integrity_check_results')
    .select('check_type, is_latest, checked_at')
    .order('checked_at', { ascending: false })
    .limit(20)

  if (allChecks) {
    const grouped = allChecks.reduce((acc, check) => {
      if (!acc[check.check_type]) {
        acc[check.check_type] = { latest: 0, old: 0 }
      }
      if (check.is_latest) {
        acc[check.check_type].latest++
      } else {
        acc[check.check_type].old++
      }
      return acc
    }, {})

    console.table(grouped)
  }

  // Check if there are duplicates
  const { data: latestChecks } = await supabase
    .from('integrity_check_results')
    .select('check_type')
    .eq('is_latest', true)

  const checkTypesCount = {}
  latestChecks?.forEach(c => {
    checkTypesCount[c.check_type] = (checkTypesCount[c.check_type] || 0) + 1
  })

  const duplicates = Object.entries(checkTypesCount).filter(([_, count]) => count > 1)

  if (duplicates.length > 0) {
    console.log('\n⚠️  Found duplicates with is_latest=true:')
    console.table(Object.fromEntries(duplicates))
    console.log('\n🔧 Fixing duplicates...')

    // Fix each duplicate
    for (const [checkType, _] of duplicates) {
      // Get all records of this type
      const { data: records } = await supabase
        .from('integrity_check_results')
        .select('id, checked_at')
        .eq('check_type', checkType)
        .order('checked_at', { ascending: false })

      if (records && records.length > 0) {
        // Keep only the most recent as is_latest=true
        const latestId = records[0].id
        const oldIds = records.slice(1).map(r => r.id)

        // Mark all as false first
        await supabase
          .from('integrity_check_results')
          .update({ is_latest: false })
          .eq('check_type', checkType)

        // Mark latest as true
        await supabase
          .from('integrity_check_results')
          .update({ is_latest: true })
          .eq('id', latestId)

        console.log(`  ✅ Fixed ${checkType}: kept 1 latest, marked ${oldIds.length} as old`)
      }
    }

    console.log('\n✅ All duplicates fixed!')
  } else {
    console.log('\n✅ No duplicates found. Everything looks good!')
  }

  return true
}

checkAndFix()
  .then(success => {
    if (success) {
      console.log('\n🎉 Migration 046 is properly applied and working!')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
