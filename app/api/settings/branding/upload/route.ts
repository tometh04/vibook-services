import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/auth"
import { canPerformAction } from "@/lib/permissions-api"

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    if (!canPerformAction(user, "settings", "write")) {
      return NextResponse.json({ error: "No tiene permiso para modificar branding" }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Faltan credenciales de Supabase" }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const agencyId = formData.get("agency_id") as string | null
    const type = formData.get("type") as string | null

    if (!file || !agencyId || !type) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const allowedTypes = ["logo", "logo_dark", "favicon"]
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de archivo inválido" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const bucketName = "branding"
    const { error: bucketError } = await adminClient.storage.getBucket(bucketName)
    if (bucketError) {
      await adminClient.storage.createBucket(bucketName, { public: true })
    }

    const ext = file.name.split(".").pop() || "png"
    const filePath = `${agencyId}/${type}-${Date.now()}.${ext}`
    const buffer = await file.arrayBuffer()

    const { error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = adminClient.storage.from(bucketName).getPublicUrl(filePath)

    return NextResponse.json({ url: publicData.publicUrl })
  } catch (error: any) {
    console.error("Error in POST /api/settings/branding/upload:", error)
    return NextResponse.json({ error: error.message || "Error al subir archivo" }, { status: 500 })
  }
}
