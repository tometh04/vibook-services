"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { ServerPagination } from "@/components/ui/server-pagination"
import { MoreHorizontal, Pencil, Eye, Trash2, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditOperationDialog } from "./edit-operation-dialog"
import { toast } from "sonner"
import { OPERATION_STATUS_LABELS } from "@/lib/design-tokens"

interface Operation {
  id: string
  destination: string
  operation_date: string | null
  departure_date: string
  return_date: string | null
  sellers: { name: string } | null
  operators: { name: string } | null
  operation_operators?: Array<{
    id: string
    cost: number
    cost_currency: string
    notes?: string | null
    operators?: { id: string; name: string } | null
  }>
  leads: { contact_name: string | null; destination: string | null } | null
  currency: string
  sale_amount_total: number
  margin_amount: number
  margin_percentage: number
  status: string
  created_at: string
  customer_name?: string
  paid_amount?: number // Monto Cobrado (INCOME PAID)
  pending_amount?: number // A cobrar (INCOME no PAID)
  operator_paid_amount?: number // Pagado a operadores (EXPENSE PAID)
  operator_pending_amount?: number // A pagar a operadores (EXPENSE no PAID)
  operator_currency?: string // Moneda de pagos a operadores
  operator_cost_currency?: string // Moneda del costo de operador
  // Códigos de reserva
  reservation_code_air?: string | null
  reservation_code_hotel?: string | null
}

interface OperationsTableProps {
  initialFilters: {
    status: string
    sellerId: string
    agencyId: string
    dateFrom: string
    dateTo: string
    paymentDateFrom?: string
    paymentDateTo?: string
    paymentDateType?: string
  }
  userRole: string
  userId: string
  userAgencyIds: string[]
}

export function OperationsTable({
  initialFilters,
  userRole,
  userId,
  userAgencyIds,
}: OperationsTableProps) {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(initialFilters)
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  
  // Estados para eliminación
  const [deletingOperation, setDeletingOperation] = useState<Operation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Estado de paginación server-side
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  // Datos para el diálogo de edición (se cargarán cuando sea necesario)
  const [agencies, setAgencies] = useState<Array<{ id: string; name: string }>>([])
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([])
  const [allOperators, setAllOperators] = useState<Array<{ id: string; name: string }>>([])
  
  // Cargar datos auxiliares para el diálogo
  // El endpoint /api/users ya filtra por las agencias del usuario actual (AISLAMIENTO SaaS)
  const loadDialogData = useCallback(async () => {
    try {
      const [agenciesRes, sellersRes, adminsRes, operatorsRes] = await Promise.all([
        fetch("/api/agencies"),
        fetch("/api/users?role=SELLER"),
        fetch("/api/users"), // Obtener todos los usuarios de la agencia (incluye ADMIN)
        fetch("/api/operators"),
      ])
      
      const [agenciesData, sellersData, adminsData, operatorsData] = await Promise.all([
        agenciesRes.json(),
        sellersRes.json(),
        adminsRes.json(),
        operatorsRes.json(),
      ])
      
      // Combinar vendedores y admins (sin duplicados)
      const allSellersMap = new Map<string, { id: string; name: string }>()
      
      // Agregar vendedores
      for (const u of sellersData.users || []) {
        allSellersMap.set(u.id, { id: u.id, name: u.name })
      }
      
      // Agregar admins que pueden ser asignados como vendedores
      for (const u of adminsData.users || []) {
        if (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') {
          allSellersMap.set(u.id, { id: u.id, name: u.name })
        }
      }
      
      setAgencies(agenciesData.agencies || [])
      setSellers(Array.from(allSellersMap.values()))
      setAllOperators((operatorsData.operators || []).map((o: any) => ({ id: o.id, name: o.name })))
    } catch (error) {
      console.error("Error loading dialog data:", error)
    }
  }, [])
  
  const handleEditClick = useCallback(async (operation: Operation) => {
    if (agencies.length === 0) {
      await loadDialogData()
    }
    setEditingOperation(operation)
    setEditDialogOpen(true)
  }, [agencies.length, loadDialogData])

  // Funciones de eliminación
  const handleDeleteClick = useCallback((operation: Operation) => {
    setDeletingOperation(operation)
    setDeleteDialogOpen(true)
  }, [])

  // Definición de fetchOperations (movida hacia arriba para uso en handleDeleteConfirm)
  const fetchOperations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status !== "ALL") params.append("status", filters.status)
      if (filters.sellerId !== "ALL") params.append("sellerId", filters.sellerId)
      if (filters.agencyId !== "ALL") params.append("agencyId", filters.agencyId)
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.append("dateTo", filters.dateTo)
      if (filters.paymentDateFrom) params.append("paymentDateFrom", filters.paymentDateFrom)
      if (filters.paymentDateTo) params.append("paymentDateTo", filters.paymentDateTo)
      if (filters.paymentDateType) params.append("paymentDateType", filters.paymentDateType)
      
      // Agregar parámetros de paginación
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      const response = await fetch(`/api/operations?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setOperations(data.operations || [])
        setTotal(data.pagination?.total || data.total || 0)
        setTotalPages(data.pagination?.totalPages || data.totalPages || 0)
        setHasMore(data.pagination?.hasMore || data.hasMore || false)
      }
    } catch (error) {
      console.error("Error fetching operations:", error)
    } finally {
      setLoading(false)
    }
  }, [filters, page, limit])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingOperation) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/operations/${deletingOperation.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al eliminar la operación")
      }

      toast.success("Operación eliminada correctamente")
      setDeleteDialogOpen(false)
      setDeletingOperation(null)
      fetchOperations() // Recargar la tabla
    } catch (error: any) {
      console.error("Error deleting operation:", error)
      toast.error(error.message || "Error al eliminar la operación")
    } finally {
      setDeleting(false)
    }
  }, [deletingOperation, fetchOperations])

  useEffect(() => {
    fetchOperations()
  }, [fetchOperations])

  // Escuchar evento de refresh desde NewOperationDialog
  useEffect(() => {
    const handleRefresh = () => {
      fetchOperations()
    }
    
    window.addEventListener("refresh-operations", handleRefresh)
    return () => {
      window.removeEventListener("refresh-operations", handleRefresh)
    }
  }, [fetchOperations])

  useEffect(() => {
    setFilters(initialFilters)
    setPage(1) // Resetear a página 1 cuando cambian los filtros
  }, [initialFilters])

  const columns: ColumnDef<Operation>[] = useMemo(
    () => [
      {
        id: "searchText",
        accessorFn: (row) => {
          // Texto de búsqueda que incluye destino, cliente y otros campos
          const destination = row.destination || row.leads?.destination || ""
          const customerName = row.customer_name || row.leads?.contact_name || ""
          return `${destination} ${customerName}`.toLowerCase()
        },
        enableHiding: false,
        enableSorting: false,
      },
      // 1. Acciones
      {
        id: "actions",
        enableHiding: false,
        header: "Acciones",
        cell: ({ row }) => {
          const operation = row.original

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/operations/${operation.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalles
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEditClick(operation)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(operation)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
      // 2. Fecha
      {
        accessorKey: "operation_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fecha" />
        ),
        cell: ({ row }) => {
          const opDate = row.original.operation_date || row.original.created_at
          if (!opDate) return <div className="text-xs">-</div>
          try {
            const dateStr = typeof opDate === 'string' && opDate.includes('T') ? opDate : `${opDate}T12:00:00`
            return (
              <div className="text-xs font-medium">
                {format(new Date(dateStr), "dd/MM/yy", { locale: es })}
              </div>
            )
          } catch {
            return <div className="text-xs">-</div>
          }
        },
      },
      // 3. Cliente
      {
        accessorKey: "customer_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cliente" />
        ),
        cell: ({ row }) => {
          const customerName = row.original.customer_name || row.original.leads?.contact_name || "-"
          return (
            <div className="max-w-[140px] truncate text-xs" title={customerName}>
              {customerName}
            </div>
          )
        },
      },
      // 4. Destino
      {
        accessorKey: "destination",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Destino" />
        ),
        enableHiding: false,
        cell: ({ row }) => {
          const destination = row.original.destination || row.original.leads?.destination || "-"
          return (
            <div className="max-w-[120px] truncate text-xs font-medium" title={destination}>
              {destination}
            </div>
          )
        },
      },
      // 5. Viaje
      {
        accessorKey: "departure_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Viaje" />
        ),
        cell: ({ row }) => {
          if (!row.original.departure_date) return <div className="text-xs">-</div>
          try {
            const depDate = `${row.original.departure_date}T12:00:00`
            const retDate = row.original.return_date ? `${row.original.return_date}T12:00:00` : null
            return (
              <div className="text-xs">
                <div>{format(new Date(depDate), "dd/MM", { locale: es })}</div>
                {retDate && (
                  <div className="text-muted-foreground">
                    al {format(new Date(retDate), "dd/MM", { locale: es })}
                  </div>
                )}
              </div>
            )
          } catch {
            return <div className="text-xs">-</div>
          }
        },
      },
      // 6. Vend. (Vendedor)
      {
        accessorKey: "sellers.name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Vend." />
        ),
        cell: ({ row }) => (
          <div className="text-xs max-w-[60px] truncate" title={row.original.sellers?.name || "-"}>
            {row.original.sellers?.name || "-"}
          </div>
        ),
      },
      // 7. Operador(es)
      {
        accessorKey: "operators",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Operador(es)" />
        ),
        cell: ({ row }) => {
          const operation = row.original as any
          if (operation.operation_operators && operation.operation_operators.length > 0) {
            const operatorsList = operation.operation_operators
              .map((oo: any) => oo.operators?.name || "Sin nombre")
              .join(", ")
            return (
              <div className="text-xs max-w-[120px] truncate" title={operatorsList}>
                {operatorsList}
              </div>
            )
          } else if (operation.operators?.name) {
            return (
              <div className="text-xs max-w-[80px] truncate" title={operation.operators.name}>
                {operation.operators.name}
              </div>
            )
          }
          return <div className="text-xs">-</div>
        },
      },
      // 8. Cod. Rva Aéreo
      {
        accessorKey: "reservation_code_air",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cod. Rva Aéreo" />
        ),
        cell: ({ row }) => {
          const codeAir = row.original.reservation_code_air
          return codeAir ? (
            <div className="text-xs font-mono" title={`Aéreo: ${codeAir}`}>
              {codeAir}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">-</div>
          )
        },
      },
      // 9. Cod. Rva Hotel
      {
        accessorKey: "reservation_code_hotel",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cod. Rva Hotel" />
        ),
        cell: ({ row }) => {
          const codeHotel = row.original.reservation_code_hotel
          return codeHotel ? (
            <div className="text-xs font-mono" title={`Hotel: ${codeHotel}`}>
              {codeHotel}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">-</div>
          )
        },
      },
      // 10. Venta
      {
        accessorKey: "sale_amount_total",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Venta" />
        ),
        cell: ({ row }) => (
          <div className="text-xs font-medium">
            {row.original.currency} {Math.round(Number(row.original.sale_amount_total) || 0).toLocaleString("es-AR")}
          </div>
        ),
      },
      // 11. Monto Cobrado
      {
        accessorKey: "paid_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Monto Cobrado" />
        ),
        cell: ({ row }) => {
          const paid = Number(row.original.paid_amount) || 0
          return (
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              {row.original.currency} {Math.round(paid).toLocaleString("es-AR")}
            </div>
          )
        },
      },
      // 12. A cobrar
      {
        accessorKey: "pending_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="A cobrar" />
        ),
        cell: ({ row }) => {
          const pending = Number(row.original.pending_amount) || 0
          const total = Number(row.original.sale_amount_total) || 0
          const paid = Number(row.original.paid_amount) || 0
          const pendingCalc = pending > 0 ? pending : Math.max(0, total - paid)
          return (
            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              {row.original.currency} {Math.round(pendingCalc).toLocaleString("es-AR")}
            </div>
          )
        },
      },
      // 13. Pagado (a operadores)
      {
        accessorKey: "operator_paid_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pagado" />
        ),
        cell: ({ row }) => {
          const operatorPaid = Number(row.original.operator_paid_amount) || 0
          // Usar operator_currency si está disponible, sino buscar en operation_operators o operator_cost_currency
          const operation = row.original as any
          const operatorCurrency = row.original.operator_currency || 
                                   operation.operation_operators?.[0]?.cost_currency || 
                                   operation.operator_cost_currency || 
                                   row.original.currency || "ARS"
          return (
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {operatorCurrency} {Math.round(operatorPaid).toLocaleString("es-AR")}
            </div>
          )
        },
      },
      // 14. A pagar (a operadores)
      {
        accessorKey: "operator_pending_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="A pagar" />
        ),
        cell: ({ row }) => {
          const operatorPending = Number(row.original.operator_pending_amount) || 0
          // Usar operator_currency si está disponible, sino buscar en operation_operators o operator_cost_currency
          const operation = row.original as any
          const operatorCurrency = row.original.operator_currency || 
                                   operation.operation_operators?.[0]?.cost_currency || 
                                   operation.operator_cost_currency || 
                                   row.original.currency || "ARS"
          return (
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
              {operatorCurrency} {Math.round(operatorPending).toLocaleString("es-AR")}
            </div>
          )
        },
      },
      // 15. Margen
      {
        accessorKey: "margin_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Margen" />
        ),
        cell: ({ row }) => (
          <div className="text-xs">
            <span className="font-medium">
              {row.original.currency} {Math.round(Number(row.original.margin_amount) || 0).toLocaleString("es-AR")}
            </span>
            <span className="text-muted-foreground ml-1">
              {Math.round(Number(row.original.margin_percentage) || 0)}%
            </span>
          </div>
        ),
      },
      // 16. Estado
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {OPERATION_STATUS_LABELS[row.original.status] || row.original.status}
          </Badge>
        ),
      },
    ],
    [handleEditClick, handleDeleteClick, userRole]
  )

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <DataTable 
          columns={columns} 
          data={operations} 
          searchKey="searchText" 
          searchPlaceholder="Buscar por destino o card..."
          showPagination={false}
        />
        
        {/* Paginación server-side */}
        {total > 0 && (
          <ServerPagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            hasMore={hasMore}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit)
              setPage(1) // Resetear a página 1
            }}
            limitOptions={[25, 50, 100, 200]}
          />
        )}
      </div>
      
      {editingOperation && (
        <EditOperationDialog
          operation={editingOperation as any}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            setEditDialogOpen(false)
            setEditingOperation(null)
            fetchOperations()
          }}
          agencies={agencies}
          sellers={sellers}
          operators={allOperators}
        />
      )}
      
      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar operación?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Estás a punto de eliminar la operación <strong>{deletingOperation?.destination}</strong>.
                  Esta acción es <strong>irreversible</strong> y eliminará:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>✅ Todos los pagos y cobranzas asociados</li>
                  <li>✅ Movimientos contables (libro mayor, caja)</li>
                  <li>✅ Pagos a operadores pendientes</li>
                  <li>✅ Alertas y documentos</li>
                </ul>
                <p className="text-amber-600 text-sm font-medium">
                  ⚠️ El cliente asociado NO se elimina (se mantiene en la base de datos).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar operación"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
