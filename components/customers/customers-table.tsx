"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react"
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
import { QuickWhatsAppButton } from "@/components/whatsapp/quick-whatsapp-button"
import { extractCustomerName, normalizePhone } from "@/lib/customers/utils"
import { toast } from "sonner"

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  document_type: string | null
  document_number: string | null
  trips: number
  totalSpent: number
  agency_id?: string
}

interface CustomersTableProps {
  initialFilters: { search: string }
}

export function CustomersTable({ initialFilters }: CustomersTableProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(initialFilters)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const onRequestDelete = useCallback((c: Customer) => setCustomerToDelete(c), [])

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append("search", filters.search)

      const url = `/api/customers?${params.toString()}`
      console.log("[CustomersTable] Fetching:", url)
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log("[CustomersTable] Response:", { 
          customersCount: data.customers?.length || 0,
          total: data.pagination?.total || 0 
        })
        setCustomers(data.customers || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[CustomersTable] Error:", response.status, errorData)
        setCustomers([])
      }
    } catch (error) {
      console.error("[CustomersTable] Exception:", error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  const handleConfirmDelete = useCallback(async () => {
    if (!customerToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar cliente")
      toast.success("Cliente eliminado")
      setCustomerToDelete(null)
      fetchCustomers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar cliente")
    } finally {
      setIsDeleting(false)
    }
  }, [customerToDelete, fetchCustomers])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      {
        accessorKey: "first_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nombre" />
        ),
        cell: ({ row }) => {
          // Extraer nombre inteligentemente del campo first_name
          const fullName = `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim()
          const extractedName = extractCustomerName(fullName || row.original.first_name || "")
          return (
            <div className="font-medium">
              {extractedName || fullName || "-"}
          </div>
          )
        },
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Teléfono" />
        ),
        cell: ({ row }) => {
          const normalizedPhone = normalizePhone(row.original.phone)
          const fullName = `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim()
          const customerName = extractCustomerName(fullName || row.original.first_name || "")
          
          if (!normalizedPhone) {
            return <div className="text-muted-foreground">-</div>
          }
          
          return (
          <div className="flex items-center gap-2">
              <span>{normalizedPhone}</span>
              <QuickWhatsAppButton
                phone={normalizedPhone}
                customerName={customerName || fullName}
                customerId={row.original.id}
                agencyId={row.original.agency_id || ""}
                variant="icon"
                size="icon"
              />
          </div>
          )
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => <div className="lowercase">{row.original.email}</div>,
      },
      {
        id: "document",
        header: "Documento",
        cell: ({ row }) => (
          <div>
            {row.original.document_type && row.original.document_number
              ? `${row.original.document_type} ${row.original.document_number}`
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "trips",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Viajes" />
        ),
        cell: ({ row }) => <div>{row.original.trips || 0}</div>,
      },
      {
        accessorKey: "totalSpent",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Total Gastado" />
        ),
        cell: ({ row }) => (
          <div>
            {row.original.totalSpent > 0
              ? `ARS ${row.original.totalSpent.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}`
              : "-"}
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const customer = row.original

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
                  <Link href={`/customers/${customer.id}`}>Ver detalles</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRequestDelete(customer)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [onRequestDelete]
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
      <DataTable
        columns={columns}
        data={customers}
        // No usar searchKey aquí porque ya hay un filtro de búsqueda arriba
      />
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a {customerToDelete ? `${customerToDelete.first_name} ${customerToDelete.last_name}` : ""} y sus documentos. Esta acción no se puede deshacer.
              {customerToDelete && (
                <span className="mt-2 block text-muted-foreground">
                  No se puede eliminar si tiene operaciones asociadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleConfirmDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

