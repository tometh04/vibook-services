import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserAgencyIds } from "@/lib/permissions-api"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"
import { es } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user } = await getCurrentUser()
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Parámetros de filtro
    const agencyId = searchParams.get("agencyId")
    const months = parseInt(searchParams.get("months") || "12")

    // Obtener agencias del usuario
    const agencyIds = await getUserAgencyIds(supabase, user.id, user.role as any)

    // Query base de clientes - ORDEN CORRECTO: .select() ANTES de filtros
    // Verificar agencias antes de hacer la query
    if (user.role !== "SUPER_ADMIN") {
      if (agencyIds.length === 0) {
        return NextResponse.json({ 
          overview: { totalCustomers: 0, activeCustomers: 0, inactiveCustomers: 0, newThisMonth: 0, growthPercentage: 0, totalSpent: 0, avgSpentPerCustomer: 0, avgOperationsPerCustomer: 0 },
          trends: { newCustomersByMonth: [] },
          distributions: { spendingRanges: [], activeVsInactive: [] },
          rankings: { topBySpending: [], topByFrequency: [] }
        })
      }
    }
    
    // Ejecutar query con el orden correcto
    let customers: any[] | null = null
    let customersError: any = null
    
    if (user.role !== "SUPER_ADMIN") {
      if (agencyId && agencyId !== "ALL") {
        // Filtrar por agencia específica (y verificar que el usuario tenga acceso)
        if (!agencyIds.includes(agencyId)) {
          return NextResponse.json({ error: "No tiene acceso a esta agencia" }, { status: 403 })
        }
        const result = await supabase
          .from("customers")
          .select(`
            id, agency_id, first_name, last_name, email, phone, created_at,
            operation_customers (
              operation_id,
              operations (id, status, sale_amount_total, departure_date, agency_id)
            )
          `)
          .eq("agency_id", agencyId)
        customers = result.data
        customersError = result.error
      } else {
        // Filtrar por todas las agencias del usuario
        const result = await supabase
          .from("customers")
          .select(`
            id, agency_id, first_name, last_name, email, phone, created_at,
            operation_customers (
              operation_id,
              operations (id, status, sale_amount_total, departure_date, agency_id)
            )
          `)
          .in("agency_id", agencyIds)
        customers = result.data
        customersError = result.error
      }
    } else {
      // SUPER_ADMIN ve todo (o filtra por agencia específica)
      if (agencyId && agencyId !== "ALL") {
        const result = await supabase
          .from("customers")
          .select(`
            id, agency_id, first_name, last_name, email, phone, created_at,
            operation_customers (
              operation_id,
              operations (id, status, sale_amount_total, departure_date, agency_id)
            )
          `)
          .eq("agency_id", agencyId)
        customers = result.data
        customersError = result.error
      } else {
        const result = await supabase
          .from("customers")
          .select(`
            id, agency_id, first_name, last_name, email, phone, created_at,
            operation_customers (
              operation_id,
              operations (id, status, sale_amount_total, departure_date, agency_id)
            )
          `)
        customers = result.data
        customersError = result.error
      }
    }

    if (customersError) {
      console.error("Error fetching customers statistics:", customersError)
      return NextResponse.json({ error: "Error al obtener estadísticas de clientes" }, { status: 500 })
    }

    // Los datos ya están filtrados por la query
    const filteredCustomers = customers || []
    console.log(`[Statistics] Fetched ${filteredCustomers.length} customers for user ${user.id}`)
    
    // Debug: verificar estructura de datos
    if (filteredCustomers.length > 0) {
      const sampleCustomer = filteredCustomers[0]
      console.log(`[Statistics] Sample customer structure:`, {
        hasOperationCustomers: !!sampleCustomer.operation_customers,
        operationCustomersLength: sampleCustomer.operation_customers?.length || 0,
        firstOperationCustomer: sampleCustomer.operation_customers?.[0],
      })
    }

    // Estadísticas generales
    const totalCustomers = filteredCustomers.length
    
    // Clientes nuevos por mes
    const newCustomersByMonth: Record<string, number> = {}
    const now = new Date()
    
    for (let i = 0; i < months; i++) {
      const date = subMonths(now, months - 1 - i)
      const key = format(date, "yyyy-MM")
      newCustomersByMonth[key] = 0
    }

    filteredCustomers.forEach((customer: any) => {
      const createdAt = new Date(customer.created_at)
      const key = format(createdAt, "yyyy-MM")
      if (newCustomersByMonth[key] !== undefined) {
        newCustomersByMonth[key]++
      }
    })

    // Convertir a array para gráficos
    const newCustomersTrend = Object.entries(newCustomersByMonth).map(([key, count]) => {
      const [year, month] = key.split("-")
      return {
        month: key,
        monthName: format(new Date(parseInt(year), parseInt(month) - 1, 1), "MMM yy", { locale: es }),
        count,
      }
    })

    // Clientes activos vs inactivos (6 meses sin actividad = inactivo)
    const sixMonthsAgo = subMonths(now, 6)
    let activeCustomers = 0
    let inactiveCustomers = 0

    // Estadísticas por cliente
    const customerStats = filteredCustomers.map((customer: any) => {
      // Incluir TODAS las operaciones, no solo las confirmadas
      const allOperations = (customer.operation_customers || [])
        .map((oc: any) => oc.operations)
        .filter((op: any) => op !== null && op !== undefined)

      // Operaciones confirmadas/cerradas para cálculo de gasto
      const confirmedOperations = allOperations.filter((op: any) => 
        ["CONFIRMED", "TRAVELLED", "CLOSED"].includes(op.status)
      )

      const totalSpent = confirmedOperations.reduce((sum: number, op: any) => 
        sum + (parseFloat(op.sale_amount_total) || 0), 0
      )

      // Total de operaciones (todas, no solo confirmadas)
      const totalOperations = allOperations.length
      const avgTicket = totalOperations > 0 ? totalSpent / totalOperations : 0

      const lastOperationDate = allOperations.length > 0
        ? allOperations
            .map((op: any) => op.departure_date ? new Date(op.departure_date) : null)
            .filter((d: Date | null) => d !== null)
            .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
        : null

      const isActive = lastOperationDate && lastOperationDate > sixMonthsAgo
      if (isActive) activeCustomers++
      else inactiveCustomers++

      return {
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Sin nombre',
        email: customer.email,
        phone: customer.phone,
        totalOperations,
        totalSpent,
        avgTicket,
        lastOperationDate: lastOperationDate?.toISOString() || null,
        isActive,
      }
    })

    console.log(`[Statistics] Customer stats: ${customerStats.length} customers, ${customerStats.filter(c => c.totalSpent > 0).length} with spending, ${customerStats.filter(c => c.totalOperations > 0).length} with operations`)

    // Top 10 clientes por gasto (solo los que tienen gasto > 0)
    const topBySpending = [...customerStats]
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Top 10 clientes por frecuencia (solo los que tienen operaciones > 0)
    const topByFrequency = [...customerStats]
      .filter(c => c.totalOperations > 0)
      .sort((a, b) => b.totalOperations - a.totalOperations)
      .slice(0, 10)

    console.log(`[Statistics] Rankings: ${topBySpending.length} top by spending, ${topByFrequency.length} top by frequency`)

    // Clientes por rango de gasto
    const spendingRanges = [
      { range: "$0 - $500k", min: 0, max: 500000, count: 0 },
      { range: "$500k - $1M", min: 500000, max: 1000000, count: 0 },
      { range: "$1M - $2M", min: 1000000, max: 2000000, count: 0 },
      { range: "$2M - $5M", min: 2000000, max: 5000000, count: 0 },
      { range: "+$5M", min: 5000000, max: Infinity, count: 0 },
    ]

    customerStats.forEach((c: any) => {
      const range = spendingRanges.find(r => c.totalSpent >= r.min && c.totalSpent < r.max)
      if (range) range.count++
    })

    // Calcular totales
    const totalSpentAll = customerStats.reduce((sum: number, c: any) => sum + c.totalSpent, 0)
    const totalOperationsAll = customerStats.reduce((sum: number, c: any) => sum + c.totalOperations, 0)
    const avgSpentPerCustomer = totalCustomers > 0 ? totalSpentAll / totalCustomers : 0
    const avgOperationsPerCustomer = totalCustomers > 0 ? totalOperationsAll / totalCustomers : 0

    // Clientes nuevos este mes
    const thisMonth = format(now, "yyyy-MM")
    const newThisMonth = newCustomersByMonth[thisMonth] || 0

    // Clientes nuevos mes anterior
    const lastMonth = format(subMonths(now, 1), "yyyy-MM")
    const newLastMonth = newCustomersByMonth[lastMonth] || 0

    // Crecimiento porcentual
    const growthPercentage = newLastMonth > 0 
      ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 
      : newThisMonth > 0 ? 100 : 0

    return NextResponse.json({
      overview: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        newThisMonth,
        growthPercentage: Math.round(growthPercentage * 10) / 10,
        totalSpent: totalSpentAll,
        avgSpentPerCustomer: Math.round(avgSpentPerCustomer),
        avgOperationsPerCustomer: Math.round(avgOperationsPerCustomer * 10) / 10,
      },
      trends: {
        newCustomersByMonth: newCustomersTrend,
      },
      distributions: {
        spendingRanges,
        activeVsInactive: [
          { name: "Activos", value: activeCustomers },
          { name: "Inactivos", value: inactiveCustomers },
        ],
      },
      rankings: {
        topBySpending,
        topByFrequency,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /api/customers/statistics:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}
