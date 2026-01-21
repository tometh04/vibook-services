"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { LeadsKanban } from "@/components/sales/leads-kanban"
import { LeadsTable } from "@/components/sales/leads-table"
import { NewLeadDialog } from "@/components/sales/new-lead-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, HelpCircle } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"

interface Lead {
  id: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  destination: string
  region: string
  status: string
  source: string
  agency_id?: string
  created_at: string
  assigned_seller_id: string | null
  users?: { name: string; email: string } | null
  agencies?: { name: string } | null
}

interface LeadsPageClientProps {
  initialLeads: Lead[]
  agencies: Array<{ id: string; name: string }>
  sellers: Array<{ id: string; name: string }>
  operators: Array<{ id: string; name: string }>
  defaultAgencyId?: string
  defaultSellerId?: string
  currentUserId?: string
  currentUserRole?: string
}

export function LeadsPageClient({
  initialLeads,
  agencies,
  sellers,
  operators,
  defaultAgencyId,
  defaultSellerId,
  currentUserId,
  currentUserRole,
}: LeadsPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false)
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(defaultAgencyId || agencies[0]?.id || "ALL")
  
  // Obtener leadId de query params para abrir dialog automáticamente
  const initialLeadId = searchParams.get("leadId")
  
  // Limpiar query params después de obtener el leadId
  useEffect(() => {
    if (initialLeadId) {
      // Limpiar la URL sin recargar la página
      router.replace("/sales/leads", { scroll: false })
    }
  }, [initialLeadId, router])

  // Función para recargar leads
  const handleRefresh = useCallback(async () => {
    try {
      const limit = 2000
      const url = selectedAgencyId === "ALL" 
        ? `/api/leads?page=1&limit=${limit}`
        : `/api/leads?agencyId=${selectedAgencyId}&page=1&limit=${limit}`
      const response = await fetch(url, { cache: 'no-store' })
      const data = await response.json()
      
      if (data.leads && data.leads.length > 0) {
        setLeads(data.leads)
      } else {
        setLeads([])
      }
    } catch (error) {
      console.error("Error loading leads:", error)
    }
  }, [selectedAgencyId])

  // Actualizar leads cuando cambia la agencia seleccionada
  useEffect(() => {
    if (selectedAgencyId === "ALL") {
      setLeads(initialLeads)
    } else {
      handleRefresh()
    }
  }, [selectedAgencyId, initialLeads, handleRefresh])

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Leads</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Leads</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">¿Cómo funciona?</p>
                  <p className="text-xs">
                    Los leads son oportunidades de venta. Arrastra las tarjetas entre columnas 
                    para cambiar su estado. Cuando un lead está listo, conviértelo en operación 
                    para comenzar la gestión del viaje.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">
            Gestiona tus leads y oportunidades
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {agencies.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="agency-select" className="whitespace-nowrap">Agencia:</Label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger id="agency-select" className="w-[180px]">
                  <SelectValue placeholder="Seleccionar agencia" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.length > 1 && (
                    <SelectItem value="ALL">Todas las agencias</SelectItem>
                  )}
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => setNewLeadDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Tabla</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <LeadsKanban 
            leads={leads as any}
            agencies={agencies}
            sellers={sellers}
            operators={operators}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            initialLeadId={initialLeadId || undefined}
          />
        </TabsContent>
        <TabsContent value="table" className="space-y-4">
          <LeadsTable
            agencies={agencies}
            sellers={sellers}
            operators={operators}
            agencyId={selectedAgencyId}
            sellerId={defaultSellerId}
          />
        </TabsContent>
      </Tabs>

      <NewLeadDialog
        open={newLeadDialogOpen}
        onOpenChange={setNewLeadDialogOpen}
        onSuccess={handleRefresh}
        agencies={agencies}
        sellers={sellers}
        defaultAgencyId={selectedAgencyId !== "ALL" ? selectedAgencyId : defaultAgencyId}
        defaultSellerId={defaultSellerId}
      />
    </div>
  )
}
