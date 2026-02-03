import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Leer el archivo de migración
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '047_create_execute_readonly_query_function.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Primero verificar si la función ya existe
    const { data: existingFunction, error: checkError } = await supabase.rpc('execute_readonly_query', {
      query_text: 'SELECT 1 as test'
    })

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'La función execute_readonly_query ya existe y funciona correctamente',
        alreadyExists: true,
        testResult: existingFunction
      })
    }

    // Si no existe, aplicar la migración
    // Separar las declaraciones SQL
    const createFunctionSQL = migrationSQL.split('-- 2. Dar permisos')[0].trim()
    const grantPermissionsSQL = migrationSQL.split('-- 2. Dar permisos')[1].split('-- 3. Comentarios')[0].trim()
    const commentSQL = migrationSQL.split('-- 3. Comentarios')[1].trim()

    console.log('Aplicando migración 047...')

    // Usar la conexión directa de PostgreSQL a través de Supabase
    // Como no podemos ejecutar SQL directo fácilmente, vamos a usar fetch a la API REST
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: createFunctionSQL
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error aplicando migración: ${errorText}`)
    }

    // Verificar que se aplicó correctamente
    const { data: verifyData, error: verifyError } = await supabase.rpc('execute_readonly_query', {
      query_text: 'SELECT 1 as test'
    })

    if (verifyError) {
      return NextResponse.json({
        success: false,
        message: 'La migración se ejecutó pero hay un error al verificar',
        error: verifyError.message,
        instructions: {
          step1: 'Ve a: https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp',
          step2: 'Click en "SQL Editor"',
          step3: 'Click en "+ New query"',
          step4: 'Copia el contenido de: supabase/migrations/047_create_execute_readonly_query_function.sql',
          step5: 'Click en "Run"'
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Migración 047 aplicada exitosamente',
      testResult: verifyData
    })

  } catch (error: any) {
    console.error('Error aplicando migración:', error)
    return NextResponse.json({
      success: false,
      message: 'Error aplicando migración',
      error: error.message,
      instructions: {
        message: 'Por favor, aplica la migración manualmente en el dashboard de Supabase',
        step1: 'Ve a: https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp',
        step2: 'Click en "SQL Editor"',
        step3: 'Click en "+ New query"',
        step4: 'Copia el contenido de: supabase/migrations/047_create_execute_readonly_query_function.sql',
        step5: 'Click en "Run"'
      }
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar si la función existe
    const { data, error } = await supabase.rpc('execute_readonly_query', {
      query_text: 'SELECT 1 as test'
    })

    if (error) {
      return NextResponse.json({
        exists: false,
        message: 'La función execute_readonly_query NO existe',
        error: error.message,
        instructions: {
          message: 'Necesitas aplicar la migración 047',
          method1: 'POST a /api/admin/apply-migration',
          method2: 'Manual en Supabase Dashboard',
          url: 'https://supabase.com/dashboard/project/pmqvplyyxiobkllapgjp'
        }
      })
    }

    return NextResponse.json({
      exists: true,
      message: 'La función execute_readonly_query existe y funciona correctamente',
      testResult: data
    })

  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      error: error.message
    }, { status: 500 })
  }
}
