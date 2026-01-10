import { NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET',
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
      timestamp: new Date().toISOString(),
    }, { 
      status: 200 // Siempre retornar 200 para poder ver el mensaje
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { 
      status: 200 // Siempre 200 para poder ver el error
    })
  }
}
