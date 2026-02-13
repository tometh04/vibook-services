import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yisiinkkrmomfuduaegh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpc2lpbmtrcm1vbWZ1ZHVhZWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3NTY3OSwiZXhwIjoyMDgzNTUxNjc5fQ.8qr6DTJmmDutvNq0QNBlcputTsFJW3c8M4HNy3a1G-w'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createRPCFunctions() {
  console.log('Creating missing RPC functions...\n')

  // 1. increment_payment_attempt
  const incrementSQL = `
    CREATE OR REPLACE FUNCTION increment_payment_attempt(subscription_id_param UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_attempts INT;
      max_attempts INT := 3;
    BEGIN
      -- Increment payment_attempts
      UPDATE subscriptions
      SET
        payment_attempts = COALESCE(payment_attempts, 0) + 1,
        updated_at = NOW()
      WHERE id = subscription_id_param;

      -- Get current attempts after increment
      SELECT payment_attempts INTO current_attempts
      FROM subscriptions
      WHERE id = subscription_id_param;

      -- If exceeded max attempts, change status to PAST_DUE
      IF current_attempts >= max_attempts THEN
        UPDATE subscriptions
        SET
          status = 'PAST_DUE',
          updated_at = NOW()
        WHERE id = subscription_id_param
        AND status NOT IN ('CANCELED', 'SUSPENDED');
      END IF;
    END;
    $$;
  `

  // 2. reset_payment_attempts
  const resetSQL = `
    CREATE OR REPLACE FUNCTION reset_payment_attempts(subscription_id_param UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE subscriptions
      SET
        payment_attempts = 0,
        payment_attempts_reset_date = NOW(),
        updated_at = NOW()
      WHERE id = subscription_id_param;
    END;
    $$;
  `

  // Execute both
  console.log('1. Creating increment_payment_attempt...')
  const { error: err1 } = await supabase.rpc('exec_sql', { sql: incrementSQL }).maybeSingle()

  if (err1) {
    // Try direct SQL via REST API
    console.log('   Trying via REST API...')
    const res1 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql: incrementSQL })
    })

    if (!res1.ok) {
      // Last resort: use the management API SQL endpoint
      console.log('   Trying via SQL endpoint...')
      const projectRef = 'yisiinkkrmomfuduaegh'

      // Use pg directly via Supabase's SQL editor API
      const sqlRes = await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: incrementSQL })
      })

      if (!sqlRes.ok) {
        console.log('   Could not create via API. Please run SQL manually.')
        console.log('\n--- SQL for increment_payment_attempt ---')
        console.log(incrementSQL)
      } else {
        console.log('   ✅ increment_payment_attempt created!')
      }
    } else {
      console.log('   ✅ increment_payment_attempt created!')
    }
  } else {
    console.log('   ✅ increment_payment_attempt created!')
  }

  console.log('\n2. Creating reset_payment_attempts...')
  const { error: err2 } = await supabase.rpc('exec_sql', { sql: resetSQL }).maybeSingle()

  if (err2) {
    console.log('   Could not create via RPC.')
  } else {
    console.log('   ✅ reset_payment_attempts created!')
  }

  // Print the SQL for manual execution
  console.log('\n\n========================================')
  console.log('Si las funciones no se crearon automáticamente,')
  console.log('ejecutá este SQL en el SQL Editor de Supabase:')
  console.log('========================================\n')
  console.log(incrementSQL)
  console.log('\n---\n')
  console.log(resetSQL)
  console.log('\n========================================')
}

createRPCFunctions().catch(console.error)
