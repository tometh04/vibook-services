import { NextResponse } from "next/server"

export async function GET() {
  const envCheck = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : 'NOT SET',
  }

  const allSet = envCheck.hasSupabaseUrl && 
                 envCheck.hasSupabaseAnonKey && 
                 envCheck.hasServiceRoleKey && 
                 envCheck.hasAppUrl

  return NextResponse.json({
    status: allSet ? 'ok' : 'error',
    message: allSet ? 
      'All environment variables are set' : 
      'Some environment variables are missing',
    env: envCheck,
  }, { 
    status: allSet ? 200 : 500 
  })
}
