import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

function isMissingTableError(error: any) {
  const message = String(error?.message || "")
  return error?.code === "PGRST205" || message.toLowerCase().includes("schema cache")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = (searchParams.get("key") || searchParams.get("type") || "").trim() || null

    const supabase = await createServerClient()

    if (key) {
      // Obtener un valor específico
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", key)
        .single()

      if (error) {
        const isMissingRow = error?.code === "PGRST116"
        if (key === "trial_days" && (isMissingRow || isMissingTableError(error))) {
          return NextResponse.json({ key, value: "7", default: true })
        }
        return NextResponse.json(
          { error: "Configuración no encontrada" },
          { status: 404 }
        )
      }

      return NextResponse.json({ key, value: data.value })
    } else {
      // Obtener todas las configuraciones (solo para admin)
      const { user } = await getCurrentUser()
      
      if (user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 403 }
        )
      }

      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .order("key")

      if (error) {
        return NextResponse.json(
          { error: "Error al obtener configuración" },
          { status: 500 }
        )
      }

      return NextResponse.json({ configs: data || [] })
    }
  } catch (error: any) {
    console.error("Error in GET /api/system-config:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener configuración" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await getCurrentUser()
    
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Solo el administrador puede modificar la configuración" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { key, value, description } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "key y value son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from("system_config")
      .upsert({
        key,
        value: String(value),
        description: description || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "key"
      })
      .select()
      .single()

    if (error) {
      console.error("Error updating system config:", error)
      return NextResponse.json(
        { error: "Error al actualizar configuración" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, config: data })
  } catch (error: any) {
    console.error("Error in PUT /api/system-config:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar configuración" },
      { status: 500 }
    )
  }
}
