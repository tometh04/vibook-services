"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, DollarSign, UserPlus, Loader2, ArrowRight, GripVertical } from "lucide-react"
import Link from "next/link"
import { LeadDetailDialog } from "@/components/sales/lead-detail-dialog"
import { toast } from "sonner"

const statusColumns = [
  { id: "NEW", label: "Nuevo", color: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-300 dark:border-blue-700" },
  { id: "IN_PROGRESS", label: "En Progreso", color: "bg-orange-50 dark:bg-orange-950/30", borderColor: "border-orange-300 dark:border-orange-700" },
  { id: "QUOTED", label: "Cotizado", color: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-amber-300 dark:border-amber-700" },
  { id: "WON", label: "Ganado", color: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-300 dark:border-green-700" },
  { id: "LOST", label: "Perdido", color: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-300 dark:border-red-700" },
]

const regionColors: Record<string, string> = {
  ARGENTINA: "bg-blue-500",
  CARIBE: "bg-cyan-500",
  BRASIL: "bg-green-500",
  EUROPA: "bg-purple-500",
  EEUU: "bg-red-500",
  OTROS: "bg-gray-500",
  CRUCEROS: "bg-orange-500",
}

interface Lead {
  id: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  contact_instagram: string | null
  destination: string
  region: string
  status: string
  source: string
  created_at?: string
  notes?: string | null
  assigned_seller_id: string | null
  has_deposit?: boolean
  deposit_amount?: number | null
  deposit_currency?: string | null
  users?: { name: string; email: string } | null
  agencies?: { name: string } | null
}

interface LeadsKanbanProps {
  leads: Lead[]
  agencies?: Array<{ id: string; name: string }>
  sellers?: Array<{ id: string; name: string }>
  operators?: Array<{ id: string; name: string }>
  onRefresh?: () => void
  currentUserId?: string
  currentUserRole?: string
}

export function LeadsKanban({ leads: initialLeads, agencies = [], sellers = [], operators = [], onRefresh, currentUserId, currentUserRole }: LeadsKanbanProps) {
  // Estado local para los leads (permite actualizaciones optimistas sin reload)
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [claimingLeadId, setClaimingLeadId] = useState<string | null>(null)
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)

  // Sincronizar con props cuando cambien
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // Función para "agarrar" un lead
  const handleClaimLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Evitar abrir el dialog
    
    setClaimingLeadId(leadId)
    try {
      const response = await fetch("/api/leads/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Error al agarrar el lead")
        return
      }

      toast.success(data.message || "¡Lead asignado!")
      
      if (data.warning) {
        toast.warning(data.warning, { duration: 5000 })
      }

      // Refrescar la lista
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error("Error claiming lead:", error)
      toast.error("Error al agarrar el lead")
    } finally {
      setClaimingLeadId(null)
    }
  }

  // Determinar si el usuario puede "agarrar" leads
  // Vendedores pueden agarrar, Admins también pueden (para asignarse o reasignar)
  const canClaimLeads = currentUserRole === "SELLER" || currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN"
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const leadsByStatus = statusColumns.reduce((acc, col) => {
    acc[col.id] = leads.filter((lead) => lead.status === col.id)
    return acc
  }, {} as Record<string, Lead[]>)

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId)
    e.dataTransfer.effectAllowed = 'move'
    // Añadir clase visual al elemento arrastrado
    const target = e.target as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    setDraggedLead(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (!draggedLead) return

    const lead = leads.find(l => l.id === draggedLead)
    if (!lead || lead.status === newStatus) {
      setDraggedLead(null)
      return
    }

    // Actualización optimista - mover el lead inmediatamente en el UI
    const previousLeads = [...leads]
    setLeads(leads.map(l => l.id === draggedLead ? { ...l, status: newStatus } : l))
    setUpdatingLeadId(draggedLead)
    
    try {
      const response = await fetch("/api/leads/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: draggedLead, status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar estado")
      }

      toast.success(`Lead movido a "${statusColumns.find(c => c.id === newStatus)?.label}"`)
      
      // Refrescar para obtener datos actualizados del servidor
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error("Error updating status:", error)
      // Revertir cambio optimista en caso de error
      setLeads(previousLeads)
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
    } finally {
      setDraggedLead(null)
      setUpdatingLeadId(null)
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statusColumns.map((column) => (
        <div key={column.id} className="flex min-w-[300px] flex-col">
          <div className={`rounded-t-lg p-3 ${column.color} border-b-2 ${column.borderColor}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{column.label}</h3>
              <Badge variant="secondary" className="font-mono">
                {leadsByStatus[column.id]?.length || 0}
              </Badge>
            </div>
          </div>
          <ScrollArea className={`h-[calc(100vh-250px)] rounded-b-lg border transition-colors duration-200 ${
            dragOverColumn === column.id 
              ? 'bg-primary/10 border-primary border-2 border-dashed' 
              : 'bg-muted/20'
          }`}>
            <div
              className="p-2 min-h-full"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {leadsByStatus[column.id]?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
                  <p className="text-sm">Arrastra leads aquí</p>
                </div>
              )}
              {leadsByStatus[column.id]?.map((lead) => (
                <Card
                  key={lead.id}
                  className={`mb-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                    updatingLeadId === lead.id ? 'opacity-50 scale-95' : ''
                  } ${
                    draggedLead === lead.id ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent 
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (!draggedLead) {
                        setSelectedLead(lead)
                        setDialogOpen(true)
                      }
                    }}
                  >
                    <div className="space-y-2">
                      {/* Header con grip y nombre */}
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm line-clamp-1">
                            {lead.contact_name}
                          </span>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {lead.destination || "Sin destino"}
                          </p>
                        </div>
                        {updatingLeadId === lead.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${regionColors[lead.region] ? `${regionColors[lead.region]} text-white border-0` : ""}`}
                        >
                          {lead.region}
                        </Badge>
                        {lead.has_deposit && lead.deposit_amount && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50">
                            <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                            {lead.deposit_amount.toLocaleString()}
                          </Badge>
                        )}
                      </div>

                      {/* Vendedor asignado o botón para agarrar */}
                      <div className="flex items-center justify-between pt-1 border-t border-muted/50">
                        {lead.users ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {(lead.users.name || "")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              {lead.users.name || "Sin nombre"}
                            </span>
                          </div>
                        ) : canClaimLeads ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-orange-600 hover:bg-orange-100 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                            onClick={(e) => handleClaimLead(lead.id, e)}
                            disabled={claimingLeadId === lead.id}
                          >
                            {claimingLeadId === lead.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3 mr-1" />
                                Agarrar
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Sin asignar
                          </Badge>
                        )}

                        {/* Botón para convertir a operación (solo si el lead está ganado o cotizado) */}
                        {(lead.status === "QUOTED" || lead.status === "WON") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLead(lead)
                              setDialogOpen(true)
                            }}
                            title="Convertir a operación"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}

      {selectedLead && (
        <LeadDetailDialog
          lead={selectedLead as any}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              // Refrescar al cerrar el dialog para obtener datos actualizados
              if (onRefresh) {
                onRefresh()
              }
            }
          }}
          agencies={agencies}
          sellers={sellers}
          operators={operators}
          onDelete={onRefresh}
          onConvert={onRefresh}
          canClaimLeads={canClaimLeads}
          onClaim={onRefresh}
        />
      )}
    </div>
  )
}

