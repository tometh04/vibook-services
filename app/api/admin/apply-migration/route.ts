import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentUser } from "@/lib/auth"
import { requireAdminTools } from "@/lib/admin-tools"

export async function POST(req: Request) {
  try {
    const { user } = await getCurrentUser()
    const guard = requireAdminTools(user, req)
    if (guard) return guard

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "")

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Migration SQL for execute_readonly_query v2
    // Uses word boundary regex instead of LIKE to avoid false positives
    // (e.g., created_at was matching %CREATE%, updated_at matching %UPDATE%)
    const migrationSQL = `
CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB AS $$
DECLARE
  result_data JSONB;
  normalized_query TEXT;
BEGIN
  normalized_query := UPPER(TRIM(query_text));
  IF NOT normalized_query LIKE 'SELECT %' THEN
    RAISE EXCEPTION 'Solo se permiten queries SELECT';
  END IF;
  IF normalized_query ~ '\\mINSERT\\M'
     OR normalized_query ~ '\\mUPDATE\\M'
     OR normalized_query ~ '\\mDELETE\\M'
     OR normalized_query ~ '\\mDROP\\M'
     OR normalized_query ~ '\\mCREATE\\M'
     OR normalized_query ~ '\\mALTER\\M'
     OR normalized_query ~ '\\mTRUNCATE\\M'
     OR normalized_query ~ '\\mGRANT\\M'
     OR normalized_query ~ '\\mREVOKE\\M'
     OR normalized_query ~ '\\mEXEC\\M'
     OR normalized_query ~ '\\mEXECUTE\\M' THEN
    RAISE EXCEPTION 'Query contiene comandos no permitidos';
  END IF;
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text)
  INTO result_data;
  IF result_data IS NULL THEN
    result_data := '[]'::jsonb;
  END IF;
  RETURN result_data;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error ejecutando query: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_readonly_query(TEXT) TO service_role;
`

    // Try applying via Supabase Management API
    const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    })

    if (mgmtResp.ok) {
      // Verify it works
      const { data, error } = await supabase.rpc('execute_readonly_query', {
        query_text: "SELECT COUNT(*) as test FROM operations WHERE created_at >= date_trunc('month', CURRENT_DATE)"
      })
      return NextResponse.json({
        success: true,
        method: "management_api",
        verification: error ? { error: error.message } : { data, works: true }
      })
    }

    const mgmtError = await mgmtResp.text()

    return NextResponse.json({
      success: false,
      message: "No se pudo aplicar automáticamente",
      mgmtStatus: mgmtResp.status,
      mgmtError,
      manualInstructions: {
        message: "Aplicá este SQL en el Supabase Dashboard SQL Editor",
        url: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
        sql: migrationSQL,
      }
    })

  } catch (error: any) {
    console.error('Error aplicando migración:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    const guard = requireAdminTools(user, new Request("http://local"))
    if (guard) return guard

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Test 1: basic function existence
    const { data: basic, error: basicError } = await supabase.rpc('execute_readonly_query', {
      query_text: 'SELECT 1 as test'
    })

    // Test 2: query with created_at (tests if word boundary regex is applied)
    const { data: createdAt, error: createdAtError } = await supabase.rpc('execute_readonly_query', {
      query_text: "SELECT COUNT(*) as total FROM operations WHERE created_at >= date_trunc('month', CURRENT_DATE)"
    })

    return NextResponse.json({
      exists: !basicError,
      basicTest: basicError ? { error: basicError.message } : { data: basic, works: true },
      createdAtTest: createdAtError
        ? { error: createdAtError.message, needsMigration048: true }
        : { data: createdAt, works: true, migrated: true },
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
