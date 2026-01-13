import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { canAccessModule } from "@/lib/permissions"
import { applyCustomersFilters, getUserAgencyIds } from "@/lib/permissions-api"
import { checkDuplicateCustomer, sendCustomerNotifications } from "@/lib/customers/customer-service"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    console.log(`[Customers API] GET request - User: ${user.id} (${user.email}), Role: ${user.role}`)
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Verificar permiso de acceso
    const hasAccess = canAccessModule(user.role as any, "customers")
    console.log(`[Customers API] canAccessModule(${user.role}, "customers"):`, hasAccess)
    if (!hasAccess) {
      console.log(`[Customers API] Access denied for user ${user.id} (${user.email}) with role ${user.role}`)
      return NextResponse.json({ error: "No tiene permiso para ver clientes" }, { status: 403 })
    }

    // Get user agencies (ya tiene caché interno)
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    console.log(`[Customers API] User ${user.id} (${user.email}, role: ${user.role}) - Agency IDs:`, agencyIds)

    // Build base query - CRÍTICO: Aplicar filtros ANTES de select cuando hay relaciones anidadas
    // Usar EXACTAMENTE el mismo patrón que statistics/route.ts que funciona
    const search = searchParams.get("search")
    
    // Verificar agencias antes de crear query
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        console.log(`[Customers API] User ${user.id} has no agencies - returning empty`)
        return NextResponse.json({ customers: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0, hasMore: false } })
      }
      console.log(`[Customers API] Filtering by ${agencyIds.length} agency(ies):`, agencyIds)
    } else {
      console.log(`[Customers API] SUPER_ADMIN - no filters applied`)
    }

    // Crear query builder EXACTAMENTE como en statistics/route.ts
    let query: any = supabase.from("customers")
    
    // Aplicar filtros EXACTAMENTE como en statistics/route.ts
    if (user.role !== "SUPER_ADMIN") {
      query = query.in("agency_id", agencyIds)
    }

    // AHORA sí llamar .select() después de los filtros (como en statistics route)
    query = query.select(`
        *,
        operation_customers(
          operation_id,
          operations:operation_id(
            id,
            sale_amount_total,
            currency,
            status
          )
        )
      `)

    // Add pagination with reasonable limits
    const requestedLimit = parseInt(searchParams.get("limit") || "100")
    const limit = Math.min(requestedLimit, 200) // Máximo 200 para mejor rendimiento
    const offset = parseInt(searchParams.get("offset") || "0")
    
    // Apply search filter AFTER select (or() is only available after select)
    let selectQuery = query

    // Apply search filter AFTER select (or() is only available after select)
    if (search) {
      selectQuery = selectQuery.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    // Now add order and range
    const { data: customers, error } = await selectQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching customers:", error)
      return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 })
    }

    console.log(`[GET /api/customers] Found ${customers?.length || 0} customers for user ${user.id} (${user.email})`)
    if (customers && customers.length > 0) {
      console.log(`[GET /api/customers] Sample customer agency_ids:`, customers.slice(0, 3).map((c: any) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, agency_id: c.agency_id })))
    }

    // Calculate trips and total spent for each customer
    const customersWithStats = (customers || []).map((customer: any) => {
      const operations = customer.operation_customers || []
      const trips = operations.length
      
      // Calculate total spent (only from CONFIRMED, TRAVELLED, or CLOSED operations)
      const totalSpent = operations
        .filter((oc: any) => {
          const status = oc.operations?.status
          return status === "CONFIRMED" || status === "TRAVELLED" || status === "CLOSED"
        })
        .reduce((sum: number, oc: any) => {
          return sum + (parseFloat(oc.operations?.sale_amount_total || 0))
        }, 0)

      return {
        ...customer,
        trips,
        totalSpent,
      }
    })

    // Get total count for pagination - aplicar filtros directamente (igual que query principal)
    let countQuery: any = supabase.from("customers")

    // Aplicar filtro de agencia ANTES de select (igual que query principal)
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        // No hay agencias, retornar count 0
        return NextResponse.json({ 
          customers: customersWithStats,
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          }
        })
      }
      if (agencyIds.length === 1) {
        countQuery = countQuery.eq("agency_id", agencyIds[0])
      } else {
        countQuery = countQuery.in("agency_id", agencyIds)
      }
    }

    // AHORA sí llamar .select() para count
    let countSelectQuery = countQuery.select("*", { count: "exact", head: true })
    
    if (search) {
      countSelectQuery = countSelectQuery.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }
    
    const { count } = await countSelectQuery

    return NextResponse.json({ 
      customers: customersWithStats,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    console.error("Error in GET /api/customers:", error)
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getCurrentUser()
    
    // Verificar permiso de escritura
    if (!canAccessModule(user.role as any, "customers")) {
      return NextResponse.json({ error: "No tiene permiso para crear clientes" }, { status: 403 })
    }

    const supabase = await createServerClient()
    const body = await request.json()

    const {
      first_name,
      last_name,
      phone,
      email,
      instagram_handle,
      document_type,
      document_number,
      date_of_birth,
      nationality,
    } = body

    // Validations básicas
    if (!first_name || !last_name || !phone || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Obtener configuración de clientes
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)
    
    console.log(`[POST /api/customers] User ${user.id} (${user.email}, role: ${user.role}) - Agency IDs:`, agencyIds)
    console.log(`[POST /api/customers] Body received:`, JSON.stringify(body, null, 2))
    
    if (agencyIds.length === 0) {
      console.error(`[POST /api/customers] User ${user.id} has no agencies assigned`)
      return NextResponse.json({ error: "No tiene agencias asignadas" }, { status: 403 })
    }

    // VALIDACIÓN CRÍTICA: agency_id debe venir del body y pertenecer al usuario
    // Si no viene, usar la primera agencia del usuario
    // IMPORTANTE: Para SUPER_ADMIN, si no viene agency_id en el body, NO usar agencyIds[0]
    // porque agencyIds contiene TODAS las agencias para SUPER_ADMIN
    let requestedAgencyId = body.agency_id
    
    if (!requestedAgencyId) {
      if (user.role === "SUPER_ADMIN") {
        // SUPER_ADMIN debe especificar agency_id explícitamente
        return NextResponse.json(
          { error: "Para crear un cliente, debes especificar la agencia (agency_id)" },
          { status: 400 }
        )
      } else {
        // ADMIN y otros roles usan su primera agencia
        if (agencyIds.length > 0) {
          requestedAgencyId = agencyIds[0]
          console.log(`[POST /api/customers] No agency_id in body, using first agency from user's agencies: ${requestedAgencyId} (from ${agencyIds.length} total agencies)`)
        } else {
          console.error(`[POST /api/customers] CRITICAL: agencyIds array is empty but passed length check!`)
          return NextResponse.json({ error: "No tiene agencias asignadas" }, { status: 403 })
        }
      }
    }
    
    console.log(`[POST /api/customers] Final requested agency_id: ${requestedAgencyId}`)
    console.log(`[POST /api/customers] User's agency IDs for validation:`, agencyIds)
    console.log(`[POST /api/customers] Is requestedAgencyId in user's agencies?`, agencyIds.includes(requestedAgencyId))
    
    // Validar que la agencia pertenezca al usuario (excepto SUPER_ADMIN)
    if (user.role !== "SUPER_ADMIN" && !agencyIds.includes(requestedAgencyId)) {
      console.error(`[POST /api/customers] User ${user.id} tried to create customer in agency ${requestedAgencyId} but only has access to:`, agencyIds)
      return NextResponse.json(
        { error: "No tiene permiso para crear clientes en esta agencia" },
        { status: 403 }
      )
    }

    const { data: settings } = await supabase
      .from("customer_settings")
      .select("*")
      .eq("agency_id", requestedAgencyId)
      .maybeSingle()

    const settingsData = settings as any

    // Aplicar validaciones de configuración
    if (settingsData?.validations) {
      const validations = settingsData.validations
      
      if (validations.email?.required && !email) {
        return NextResponse.json({ error: "Email es requerido" }, { status: 400 })
      }
      
      if (validations.email?.format === 'email' && email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return NextResponse.json({ error: "Email inválido" }, { status: 400 })
        }
      }
      
      if (validations.phone?.required && !phone) {
        return NextResponse.json({ error: "Teléfono es requerido" }, { status: 400 })
      }
    }

    // Verificar documento requerido
    if (settingsData?.require_document && (!document_type || !document_number)) {
      return NextResponse.json({ 
        error: "Tipo y número de documento son requeridos" 
      }, { status: 400 })
    }

    // Verificar duplicados si está habilitado
    if (settingsData?.duplicate_check_enabled) {
      const checkFields = settingsData.duplicate_check_fields || ['email', 'phone']
      const duplicateCheck = await checkDuplicateCustomer(
        supabase,
        { email, phone, document_number },
        checkFields,
        requestedAgencyId
      )

      if (duplicateCheck.isDuplicate) {
        return NextResponse.json({ 
          error: "Ya existe un cliente con estos datos",
          duplicate: duplicateCheck.duplicateCustomer 
        }, { status: 409 })
      }
    }

    // Create customer (CRÍTICO: incluir agency_id para aislamiento SaaS)
    console.log(`[POST /api/customers] Creating customer with agency_id: ${requestedAgencyId}`)
    
    const { data: customer, error: createError } = await (supabase.from("customers") as any)
      .insert({
        agency_id: requestedAgencyId, // CRÍTICO: Aislar por agencia
        first_name,
        last_name,
        phone,
        email,
        instagram_handle: instagram_handle || null,
        document_type: document_type || null,
        document_number: document_number || null,
        date_of_birth: date_of_birth || null,
        nationality: nationality || null,
      })
      .select()
      .single()

    if (createError || !customer) {
      console.error("[POST /api/customers] Error creating customer:", createError)
      return NextResponse.json({ error: "Error al crear cliente" }, { status: 400 })
    }
    
    console.log(`[POST /api/customers] Customer created successfully:`, {
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`,
      agency_id: customer.agency_id
    })

    // Enviar notificaciones si están configuradas
    if (settingsData?.notifications) {
      await sendCustomerNotifications(
        supabase,
        'new_customer',
        {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone,
        },
        requestedAgencyId,
        settingsData.notifications
      )
    }

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error("Error in POST /api/customers:", error)
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 })
  }
}

