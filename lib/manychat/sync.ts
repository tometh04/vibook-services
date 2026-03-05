import { createServerClient } from "@/lib/supabase/server"

export interface ManychatLeadData {
  ig?: string
  name?: string
  bucket?: string
  region?: string
  whatsapp?: string
  destino?: string
  fechas?: string
  personas?: string
  menores?: string
  presupuesto?: string
  servicio?: string
  evento?: string
  phase?: string
  agency?: string // "rosario" | "madero"
  manychat_user_id?: string
  flow_id?: string
  page_id?: string
  timestamp?: string
}

/**
 * Construir descripción estructurada igual que Zapier
 * Formato: campos con emojis, uno por línea
 */
export function buildStructuredDescription(data: ManychatLeadData): string {
  let desc = ""

  if (data.bucket) desc += `🏷 Bucket: ${data.bucket}\n`
  if (data.destino) desc += `📍 Destino: ${data.destino}\n`
  if (data.fechas) desc += `📅 Fechas: ${data.fechas}\n`
  if (data.personas) desc += `👥 Personas: ${data.personas}\n`
  if (data.menores) desc += `👶 Menores: ${data.menores}\n`
  if (data.presupuesto) desc += `💰 Presupuesto: ${data.presupuesto}\n`
  if (data.servicio) desc += `✈️ Servicio: ${data.servicio}\n`
  if (data.evento) desc += `🎟 Evento: ${data.evento}\n`
  if (data.whatsapp) desc += `📱 WhatsApp: ${data.whatsapp}\n`
  if (data.region) desc += `🧭 Región: ${data.region}\n`

  const instagram = (data.ig || "").replace(/^@/, "").trim().toLowerCase()
  if (instagram) desc += `Instagram: ${instagram}\n`

  const phase = (data.phase || "").toLowerCase()
  if (phase) desc += `Fase: ${phase}`

  return desc.trim()
}

/**
 * Normalizar Instagram username (remover @, lowercase)
 */
export function normalizeInstagram(ig: string | undefined): string | null {
  if (!ig) return null
  return ig.replace(/^@/, "").trim().toLowerCase() || null
}

/**
 * Determinar agency_id por tag de Manychat
 */
export async function determineAgencyId(
  agencyTag: string | undefined,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<string> {
  if (!agencyTag) {
    const { data: rosario } = await supabase
      .from("agencies")
      .select("id")
      .ilike("name", "%rosario%")
      .maybeSingle()

    return (rosario as { id: string } | null)?.id || ""
  }

  const normalizedTag = agencyTag.toLowerCase().trim()

  const tagMap: Record<string, string> = {
    "rosario": "rosario",
    "madero": "madero",
  }

  const searchTerm = tagMap[normalizedTag] || normalizedTag

  const { data: agency } = await supabase
    .from("agencies")
    .select("id")
    .ilike("name", `%${searchTerm}%`)
    .maybeSingle()

  if (agency) {
    return (agency as { id: string }).id
  }

  const { data: rosario } = await supabase
    .from("agencies")
    .select("id")
    .ilike("name", "%rosario%")
    .maybeSingle()

  return (rosario as { id: string } | null)?.id || ""
}

/**
 * Validar y normalizar región
 */
export function normalizeRegion(region: string | undefined): "ARGENTINA" | "CARIBE" | "BRASIL" | "EUROPA" | "EEUU" | "OTROS" | "CRUCEROS" {
  const validRegions = ["ARGENTINA", "CARIBE", "BRASIL", "EUROPA", "EEUU", "OTROS", "CRUCEROS"]

  if (!region) return "OTROS"

  const normalized = region.toUpperCase().trim()

  if (validRegions.includes(normalized as any)) {
    return normalized as any
  }

  return "OTROS"
}

/**
 * Mapear phase a status
 */
export function mapPhaseToStatus(phase: string | undefined): "NEW" | "IN_PROGRESS" | "QUOTED" | "WON" | "LOST" {
  const normalizedPhase = (phase || "").toLowerCase().trim()

  if (normalizedPhase === "initial") {
    return "NEW"
  }

  return "IN_PROGRESS"
}

/**
 * Detectar lista por región
 */
function detectRegionList(region: string | undefined): string {
  if (!region) return "Leads - Otros"

  const normalized = region
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (normalized.includes("caribe")) return "Leads - Caribe"
  if (normalized.includes("brasil")) return "Leads - Brasil"
  if (normalized.includes("argentina")) return "Leads - Argentina"
  if (normalized.includes("europa")) return "Leads - Europa"
  if (normalized.includes("eeuu") || normalized.includes("usa")) return "Leads - EEUU"

  return "Leads - Otros"
}

/**
 * Determinar nombre de lista según lógica de Zapier
 */
export function determineListName(manychatData: ManychatLeadData): string {
  const { bucket, region, whatsapp } = manychatData

  const bucketValue = bucket?.trim() || ""
  const normalizedBucket = bucketValue.toLowerCase()
  const normalizedWhatsapp = (whatsapp || "").trim()

  if (normalizedBucket.includes("cupo")) {
    return `Cupos - ${bucketValue}`
  }

  if (normalizedBucket && normalizedWhatsapp) {
    return `Campaña - ${bucketValue}`
  }

  if (normalizedBucket && !normalizedWhatsapp) {
    return "Leads - Instagram"
  }

  if (!normalizedBucket && normalizedWhatsapp) {
    return detectRegionList(region)
  }

  return "Leads - Instagram"
}

/**
 * Armar el contact_name con formato:
 * DESTINO - NOMBRE - TELEFONO
 * o si no tiene teléfono:
 * DESTINO - NOMBRE - @ig_username
 */
export function buildContactName(data: ManychatLeadData): string {
  const dest = (data.destino || "Sin destino").trim()
  const rawName = (data.name || "Sin nombre").trim()
  const contactId = data.whatsapp?.trim() || data.ig?.trim() || ""

  return `${dest} - ${rawName}${contactId ? ` - ${contactId}` : ""}`
}

/**
 * Sync Manychat lead data to a lead in the database
 */
export async function syncManychatLeadToLead(
  manychatData: ManychatLeadData,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<{ created: boolean; leadId: string }> {

  // 1. Determinar agency_id
  const agency_id = await determineAgencyId(manychatData.agency, supabase)

  if (!agency_id) {
    throw new Error("No se pudo determinar la agencia. Verifica que existan agencias en la base de datos.")
  }

  // 2. Mapear campos
  const instagram = normalizeInstagram(manychatData.ig)
  const contact_phone = (manychatData.whatsapp || "").trim()
  const contact_instagram = instagram
  const destination = (manychatData.destino || "Sin destino").trim()
  const region = normalizeRegion(manychatData.region)
  const status = mapPhaseToStatus(manychatData.phase)

  // 3. Armar contact_name: DESTINO - NOMBRE - TELEFONO_O_IG
  const contact_name = buildContactName(manychatData)

  // 4. Construir descripción estructurada
  const notes = buildStructuredDescription(manychatData)

  // 5. Preparar datos completos para JSONB
  const manychatFullData = {
    ig: manychatData.ig,
    name: manychatData.name,
    bucket: manychatData.bucket,
    region: manychatData.region,
    whatsapp: manychatData.whatsapp,
    destino: manychatData.destino,
    fechas: manychatData.fechas,
    personas: manychatData.personas,
    menores: manychatData.menores,
    presupuesto: manychatData.presupuesto,
    servicio: manychatData.servicio,
    evento: manychatData.evento,
    phase: manychatData.phase,
    agency: manychatData.agency,
    manychat_user_id: manychatData.manychat_user_id,
    flow_id: manychatData.flow_id,
    page_id: manychatData.page_id,
    timestamp: manychatData.timestamp,
    syncedAt: new Date().toISOString(),
  }

  // 6. Buscar lead existente por teléfono o Instagram (deduplicación)
  let existingLead: { id: string } | null = null

  if (contact_phone) {
    const { data: leadByPhone } = await supabase
      .from("leads")
      .select("id")
      .eq("contact_phone", contact_phone)
      .eq("source", "Manychat")
      .maybeSingle()

    if (leadByPhone) {
      existingLead = leadByPhone as { id: string }
    }
  }

  if (!existingLead && contact_instagram) {
    const { data: leadByInstagram } = await supabase
      .from("leads")
      .select("id")
      .eq("contact_instagram", contact_instagram)
      .eq("source", "Manychat")
      .maybeSingle()

    if (leadByInstagram) {
      existingLead = leadByInstagram as { id: string }
    }
  }

  // 7. Determinar nombre de lista
  const listName = determineListName(manychatData)
  console.log(`✅ Lead de Manychat asignado a lista: "${listName}"`)

  // 8. Preparar datos del lead
  const leadData: any = {
    agency_id,
    source: "Manychat" as const,
    status,
    region,
    destination,
    contact_name,
    contact_phone: contact_phone || "",
    contact_email: null,
    contact_instagram,
    assigned_seller_id: null,
    notes: notes || null,
    manychat_full_data: manychatFullData,
    list_name: listName,
    updated_at: new Date().toISOString(),
  }

  // 9. Crear o actualizar lead
  if (existingLead) {
    const leadsTable = supabase.from("leads") as any
    const { error: updateError } = await leadsTable
      .update(leadData)
      .eq("id", existingLead.id)

    if (updateError) {
      console.error("❌ Error updating lead from Manychat:", updateError)
      throw new Error(`Error updating lead: ${updateError.message}`)
    }

    console.log("✅ Lead updated from Manychat:", existingLead.id)
    return { created: false, leadId: existingLead.id }
  } else {
    const leadsTable = supabase.from("leads") as any
    const { data: newLead, error } = await leadsTable
      .insert(leadData)
      .select("id")
      .single()

    if (error) {
      console.error("❌ Error creating lead from Manychat:", error)
      throw new Error(`Error creating lead: ${error.message}`)
    }

    console.log("✅ Lead created from Manychat:", (newLead as any).id)
    return { created: true, leadId: (newLead as any).id }
  }
}
