import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { applyLeadsFilters, applyOperationsFilters } from "@/lib/permissions-api"

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    console.log("[Search API] Received query:", query)

    if (!query || query.length < 2) {
      console.log("[Search API] Query too short, returning empty results")
      return NextResponse.json({ results: [] })
    }

    const searchTerm = `%${query}%`
    console.log("[Search API] Search term:", searchTerm)
    const results: Array<{
      id: string
      type: string
      title: string
      subtitle?: string
    }> = []

    // Obtener agencias del usuario para filtrar
    const { data: userAgencies } = await supabase
      .from("user_agencies")
      .select("agency_id")
      .eq("user_id", user.id)

    const agencyIds = (userAgencies || []).map((ua: any) => ua.agency_id)

    // Paralelizar todas las búsquedas
    const searchPromises = []

    // Buscar clientes (por nombre, email, teléfono y documento)
    // Si el query tiene múltiples palabras (ej: "Thomas Sanchez"), buscar cada palabra
    // en first_name o last_name para soportar búsquedas de nombre completo
    const queryWords = query.trim().split(/\s+/).filter(w => w.length >= 2)
    const hasMultipleWords = queryWords.length > 1

    let customerPromise: Promise<any>

    if (hasMultipleWords) {
      // Búsqueda de nombre completo: buscar por cada palabra en first_name y last_name
      // Supabase no soporta bien and() anidado en .or(), así que hacemos queries separadas
      // y las intersectamos manualmente
      const wordFilters = queryWords.map(w => `%${w}%`)

      // Buscar clientes que matcheen TODAS las palabras en first_name o last_name combinados
      // Usamos la primera palabra para filtrar y luego filtramos en JS
      const firstWordTerm = wordFilters[0]
      let customerQuery = (supabase.from("customers") as any)
        .select("id, first_name, last_name, email, phone")
        .or(`first_name.ilike.${firstWordTerm},last_name.ilike.${firstWordTerm},email.ilike.${searchTerm}`)

      // FILTRO DE MULTI-TENANCY: solo clientes de las agencias del usuario
      if (user.role !== "SUPER_ADMIN") {
        if (agencyIds.length === 0) {
          customerPromise = Promise.resolve({ type: 'customers', data: [], error: null })
        } else {
          customerQuery = customerQuery.in("agency_id", agencyIds)
          customerQuery = customerQuery.limit(20)

          customerPromise = customerQuery
            .then((r: any) => {
              if (r.error || !r.data) return { type: 'customers', data: r.data, error: r.error }
              const filtered = r.data.filter((c: any) => {
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
                return queryWords.every(w => fullName.includes(w.toLowerCase()))
              })
              return { type: 'customers', data: filtered.slice(0, 5), error: null }
            })
            .catch((err: any) => ({ type: 'customers', data: null, error: err }))
        }
      } else {
        customerQuery = customerQuery.limit(20)
        customerPromise = customerQuery
          .then((r: any) => {
            if (r.error || !r.data) return { type: 'customers', data: r.data, error: r.error }
            const filtered = r.data.filter((c: any) => {
              const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
              return queryWords.every(w => fullName.includes(w.toLowerCase()))
            })
            return { type: 'customers', data: filtered.slice(0, 5), error: null }
          })
          .catch((err: any) => ({ type: 'customers', data: null, error: err }))
      }
    } else {
      // Búsqueda simple: una palabra, buscar en todos los campos incluyendo document_number
      let customerQuery = (supabase.from("customers") as any)
        .select("id, first_name, last_name, email, phone")
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},document_number.ilike.${searchTerm}`)

      // FILTRO DE MULTI-TENANCY: solo clientes de las agencias del usuario
      if (user.role !== "SUPER_ADMIN") {
        if (agencyIds.length === 0) {
          customerPromise = Promise.resolve({ type: 'customers', data: [], error: null })
        } else {
          customerQuery = customerQuery.in("agency_id", agencyIds)
          customerQuery = customerQuery.limit(5)
          customerPromise = customerQuery
            .then((r: any) => ({ type: 'customers', data: r.data, error: r.error }))
            .catch((err: any) => ({ type: 'customers', data: null, error: err }))
        }
      } else {
        customerQuery = customerQuery.limit(5)
        customerPromise = customerQuery
          .then((r: any) => ({ type: 'customers', data: r.data, error: r.error }))
          .catch((err: any) => ({ type: 'customers', data: null, error: err }))
      }
    }

    searchPromises.push(customerPromise)

    // Buscar operaciones (por código, destino, códigos de reserva)
    let operationQuery = (supabase.from("operations") as any)
      .select("id, file_code, destination, status, agency_id, reservation_code_air, reservation_code_hotel")
      .or(`file_code.ilike.${searchTerm},destination.ilike.${searchTerm},reservation_code_air.ilike.${searchTerm},reservation_code_hotel.ilike.${searchTerm}`)
      .limit(5)

    // FILTRO DE MULTI-TENANCY: usar la función centralizada de permisos
    operationQuery = applyOperationsFilters(operationQuery, user, agencyIds)

    searchPromises.push(
      operationQuery
        .then((r: any) => ({ type: 'operations', data: r.data, error: r.error }))
        .catch((err: any) => ({ type: 'operations', data: null, error: err }))
    )

    // Buscar operadores
    let operatorQuery = (supabase.from("operators") as any)
      .select("id, name, contact_email")
      .or(`name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`)
      .limit(5)

    // FILTRO DE MULTI-TENANCY: solo operadores de las agencias del usuario
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length > 0) {
        operatorQuery = operatorQuery.in("agency_id", agencyIds)
      } else {
        // Sin agencias asignadas, no devolver resultados
        searchPromises.push(Promise.resolve({ type: 'operators', data: [], error: null }))
      }
    }

    // Solo agregar la promesa si no fue ya agregada como vacía
    if (user.role === "SUPER_ADMIN" || agencyIds.length > 0) {
      searchPromises.push(
        operatorQuery
          .then((r: any) => ({ type: 'operators', data: r.data, error: r.error }))
          .catch((err: any) => ({ type: 'operators', data: null, error: err }))
      )
    }

    // Buscar leads (con filtros de permisos)
    let leadQuery = (supabase.from("leads") as any)
      .select("id, contact_name, destination, status, agency_id, assigned_seller_id")
      .or(`contact_name.ilike.${searchTerm},destination.ilike.${searchTerm}`)
      .limit(5)
    
    // Aplicar filtros de permisos para leads
    try {
      leadQuery = applyLeadsFilters(leadQuery, user, agencyIds)
    } catch {
      // Si falla el filtro, solo buscar leads del usuario
      if (user.role === "SELLER") {
        leadQuery = leadQuery.eq("assigned_seller_id", user.id)
      } else if (user.role !== "SUPER_ADMIN" && agencyIds.length > 0) {
        leadQuery = leadQuery.in("agency_id", agencyIds)
      }
    }
    
    searchPromises.push(
      leadQuery
        .then((r: any) => ({ type: 'leads', data: r.data, error: r.error }))
        .catch((err: any) => ({ type: 'leads', data: null, error: err }))
    )

    // Ejecutar todas las búsquedas en paralelo
    const searchResults = await Promise.all(searchPromises)
    console.log("[Search API] All searches completed:", searchResults.length, "results")

    // Procesar resultados
    searchResults.forEach((result: any) => {
      if (result.error) {
        console.error(`Error in ${result.type} search:`, result.error)
        return
      }

      if (result.type === 'customers' && result.data) {
        result.data.forEach((c: any) => {
          results.push({
            id: c.id,
            type: "customer",
            title: `${c.first_name} ${c.last_name}`,
            subtitle: c.email || c.phone || "Sin contacto",
          })
        })
      } else if (result.type === 'operations' && result.data) {
        const statusLabels: Record<string, string> = {
          PRE_RESERVATION: "Pre-reserva",
          RESERVED: "Reservado",
          CONFIRMED: "Confirmado",
          CANCELLED: "Cancelado",
          TRAVELLED: "Viajado",
          CLOSED: "Cerrado",
        }
        result.data.forEach((o: any) => {
          // Determinar qué mostramos en el título según qué coincidió
          const queryLower = query.toLowerCase()
          let title = o.file_code || o.destination || "Sin código"
          
          // Si el código de búsqueda coincide con un código de reserva, mostrarlo primero
          if (o.reservation_code_air && o.reservation_code_air.toLowerCase().includes(queryLower)) {
            title = `Cod. Aéreo: ${o.reservation_code_air}`
          } else if (o.reservation_code_hotel && o.reservation_code_hotel.toLowerCase().includes(queryLower)) {
            title = `Cod. Hotel: ${o.reservation_code_hotel}`
          }
          
          const subtitleParts = []
          if (o.destination) subtitleParts.push(o.destination)
          if (o.reservation_code_air) subtitleParts.push(`Rva Aéreo: ${o.reservation_code_air}`)
          if (o.reservation_code_hotel) subtitleParts.push(`Rva Hotel: ${o.reservation_code_hotel}`)
          subtitleParts.push(statusLabels[o.status] || o.status)
          
          results.push({
            id: o.id,
            type: "operation",
            title: title,
            subtitle: subtitleParts.join(" - "),
          })
        })
      } else if (result.type === 'operators' && result.data) {
        result.data.forEach((op: any) => {
          results.push({
            id: op.id,
            type: "operator",
            title: op.name,
            subtitle: op.contact_email || "Sin email",
          })
        })
      } else if (result.type === 'leads' && result.data) {
        const statusLabels: Record<string, string> = {
          NEW: "Nuevo",
          IN_PROGRESS: "En Progreso",
          QUOTED: "Cotizado",
          WON: "Ganado",
          LOST: "Perdido",
        }
        result.data.forEach((l: any) => {
          results.push({
            id: l.id,
            type: "lead",
            title: l.contact_name || "Sin nombre",
            subtitle: `${l.destination || "Sin destino"} - ${statusLabels[l.status] || l.status}`,
          })
        })
      }
    })

    console.log("[Search API] Returning", results.length, "total results")
    return NextResponse.json({ results })
  } catch (error) {
    console.error("[Search API] Error in search:", error)
    return NextResponse.json({ results: [] })
  }
}
