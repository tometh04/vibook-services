import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { canAccessModule } from "@/lib/permissions"
import { z } from "zod"

export const dynamic = 'force-dynamic'

// Schema de validación para configuración de operaciones
const operationSettingsSchema = z.object({
  custom_statuses: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string(),
    order: z.number().optional(),
  })).optional(),
  workflows: z.record(z.any()).optional(),
  auto_alerts: z.array(z.object({
    type: z.string(),
    enabled: z.boolean(),
    days_before: z.number().optional(),
    channels: z.array(z.string()).optional(),
  })).optional(),
  document_templates: z.array(z.any()).optional(),
  default_status: z.string().optional(),
  require_destination: z.boolean().optional(),
  require_departure_date: z.boolean().optional(),
  require_operator: z.boolean().optional(),
  require_customer: z.boolean().optional(),
  alert_payment_due_days: z.number().optional(),
  alert_operator_payment_days: z.number().optional(),
  alert_upcoming_trip_days: z.number().optional(),
  auto_generate_quotation: z.boolean().optional(),
  auto_generate_invoice: z.boolean().optional(),
  require_documents_before_confirmation: z.boolean().optional(),
  auto_create_ledger_entry: z.boolean().optional(),
  auto_create_iva_entry: z.boolean().optional(),
  auto_create_operator_payment: z.boolean().optional(),
})

// GET - Obtener configuración de operaciones
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Autenticación directa
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usuario de DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    // Verificar permiso de acceso
    if (!canAccessModule(user.role as any, "operations")) {
      return NextResponse.json(
        { error: "No tiene permiso para ver la configuración de operaciones" },
        { status: 403 }
      )
    }

    // Obtener agencias del usuario directamente
    let agencyIds: string[] = []
    
    if (user.role === "SUPER_ADMIN") {
      const { data: agencies } = await supabase.from("agencies").select("id")
      agencyIds = (agencies || []).map((a: any) => a.id)
    } else {
      const { data: userAgencies } = await supabase
        .from("user_agencies")
        .select("agency_id")
        .eq("user_id", user.id)
      agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id).filter(Boolean)
    }
    
    if (agencyIds.length === 0) {
      return NextResponse.json(
        { error: "No tiene agencias asignadas" },
        { status: 403 }
      )
    }

    // Obtener configuración existente
    const { data: existing, error } = await supabase
      .from("operation_settings")
      .select("*")
      .eq("agency_id", agencyIds[0])
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching operation settings:", error)
      return NextResponse.json(
        { error: "Error al obtener configuración" },
        { status: 500 }
      )
    }

    // Si no existe, crear configuración por defecto
    if (!existing) {
      const defaultSettings = {
        agency_id: agencyIds[0],
        custom_statuses: [],
        workflows: {},
        auto_alerts: [
          {
            type: "payment_due",
            enabled: true,
            days_before: 30,
            channels: ["email", "whatsapp"],
          },
          {
            type: "operator_payment",
            enabled: true,
            days_before: 30,
            channels: ["email"],
          },
          {
            type: "upcoming_trip",
            enabled: true,
            days_before: 7,
            channels: ["email", "whatsapp"],
          },
        ],
        document_templates: [],
        default_status: "PRE_RESERVATION",
        require_destination: true,
        require_departure_date: true,
        require_operator: false,
        require_customer: false,
        alert_payment_due_days: 30,
        alert_operator_payment_days: 30,
        alert_upcoming_trip_days: 7,
        auto_generate_quotation: false,
        auto_generate_invoice: false,
        require_documents_before_confirmation: false,
        auto_create_ledger_entry: true,
        auto_create_iva_entry: true,
        auto_create_operator_payment: true,
        created_by: user.id,
      }

      const { data: newData, error: insertError } = await (supabase.from("operation_settings") as any)
        .insert(defaultSettings)
        .select()
        .single()

      if (insertError) {
        console.error("Error creating default operation settings:", insertError)
        return NextResponse.json(
          { error: "Error al crear configuración por defecto", detail: insertError.message, code: insertError.code },
          { status: 500 }
        )
      }

      return NextResponse.json(newData)
    }

    return NextResponse.json(existing)
  } catch (error: any) {
    console.error("Error in GET /api/operations/settings:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener configuración" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar configuración de operaciones
export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Autenticación directa
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usuario de DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
    }

    // Verificar permiso de acceso (solo ADMIN y SUPER_ADMIN)
    if (!canAccessModule(user.role as any, "operations") || 
        (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "No tiene permiso para editar la configuración de operaciones" },
        { status: 403 }
      )
    }

    // Obtener agencias del usuario directamente
    let agencyIds: string[] = []
    
    if (user.role === "SUPER_ADMIN") {
      const { data: agencies } = await supabase.from("agencies").select("id")
      agencyIds = (agencies || []).map((a: any) => a.id)
    } else {
      const { data: userAgencies } = await supabase
        .from("user_agencies")
        .select("agency_id")
        .eq("user_id", user.id)
      agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id).filter(Boolean)
    }
    
    if (agencyIds.length === 0) {
      return NextResponse.json(
        { error: "No tiene agencias asignadas" },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log(`[Operations Settings PUT] User ${user.id} (${user.role}) - Updating settings for agency ${agencyIds[0]}`)
    console.log(`[Operations Settings PUT] Request body:`, JSON.stringify(body, null, 2))
    
    // Validar datos
    let validatedData
    try {
      validatedData = operationSettingsSchema.parse(body)
    } catch (validationError: any) {
      console.error("[Operations Settings PUT] Validation error:", validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Datos inválidos", details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Verificar si existe configuración
    const { data: existing, error: existingError } = await supabase
      .from("operation_settings")
      .select("id")
      .eq("agency_id", agencyIds[0])
      .maybeSingle()
    
    if (existingError && existingError.code !== 'PGRST116') {
      console.error("[Operations Settings PUT] Error checking existing:", existingError)
      return NextResponse.json(
        { error: "Error al verificar configuración existente" },
        { status: 500 }
      )
    }

    const updateData = {
      ...validatedData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    let result

    if (existing) {
      // Actualizar existente
      const existingData = existing as any
      console.log(`[Operations Settings PUT] Updating existing settings with id: ${existingData.id}`)
      const { data, error } = await (supabase.from("operation_settings") as any)
        .update(updateData)
        .eq("id", existingData.id)
        .select()
        .single()

      if (error) {
        console.error("[Operations Settings PUT] Error updating:", error)
        console.error("[Operations Settings PUT] Error details:", JSON.stringify(error, null, 2))
        return NextResponse.json(
          { error: "Error al actualizar configuración: " + (error.message || JSON.stringify(error)) },
          { status: 500 }
        )
      }

      result = data
      console.log(`[Operations Settings PUT] Successfully updated settings`)
    } else {
      // Crear nueva
      console.log(`[Operations Settings PUT] Creating new settings for agency ${agencyIds[0]}`)
      const insertData = {
        agency_id: agencyIds[0],
        ...updateData,
        created_by: user.id,
      }
      console.log(`[Operations Settings PUT] Insert data:`, JSON.stringify(insertData, null, 2))
      
      const { data, error } = await (supabase.from("operation_settings") as any)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("[Operations Settings PUT] Error creating:", error)
        console.error("[Operations Settings PUT] Error details:", JSON.stringify(error, null, 2))
        return NextResponse.json(
          { error: "Error al crear configuración: " + (error.message || JSON.stringify(error)) },
          { status: 500 }
        )
      }

      result = data
      console.log(`[Operations Settings PUT] Successfully created settings`)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error in PUT /api/operations/settings:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Error al actualizar configuración" },
      { status: 500 }
    )
  }
}
