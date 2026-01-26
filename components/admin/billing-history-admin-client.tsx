"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { Search, Calendar, DollarSign, CreditCard } from "lucide-react"

interface BillingEvent {
  id: string
  agency_id: string
  subscription_id: string | null
  event_type: string
  mp_notification_id: string | null
  mp_payment_id: string | null
  metadata: Record<string, any>
  created_at: string
  agency?: {
    id: string
    name: string
    city: string
  }
  subscription?: {
    id: string
    status: string
    plan?: {
      name: string
      display_name: string
    }
  }
}

interface BillingHistoryAdminClientProps {
  events: BillingEvent[]
}

export function BillingHistoryAdminClient({ events }: BillingHistoryAdminClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const filteredEvents = events.filter((event) => {
    const matchesSearch = 
      event.agency?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.subscription?.plan?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === "all" || event.event_type === filterType

    return matchesSearch && matchesFilter
  })

  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any }> = {
      SUBSCRIPTION_CREATED: { variant: "default", label: "Creada", icon: Calendar },
      SUBSCRIPTION_UPDATED: { variant: "secondary", label: "Actualizada", icon: Calendar },
      SUBSCRIPTION_CANCELED: { variant: "destructive", label: "Cancelada", icon: Calendar },
      SUBSCRIPTION_RENEWED: { variant: "default", label: "Renovada", icon: Calendar },
      PAYMENT_SUCCEEDED: { variant: "default", label: "Pago Exitoso", icon: DollarSign },
      PAYMENT_FAILED: { variant: "destructive", label: "Pago Fallido", icon: CreditCard },
      TRIAL_EXTENDED_BY_ADMIN: { variant: "secondary", label: "Trial Extendido", icon: Calendar },
      SUBSCRIPTION_PLAN_CHANGED: { variant: "secondary", label: "Plan Cambiado", icon: Calendar },
    }
    const config = variants[eventType] || { variant: "outline" as const, label: eventType, icon: Calendar }
    const Icon = config.icon
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const eventTypes = Array.from(new Set(events.map(e => e.event_type)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historial de Pagos</h1>
        <p className="text-muted-foreground">Eventos y transacciones de billing del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por agencia, tipo de evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Todos los eventos</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos de Billing</CardTitle>
          <CardDescription>
            {filteredEvents.length} eventos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Tipo de Evento</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No se encontraron eventos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.agency ? (
                          <div>
                            <div className="font-medium">{event.agency.name}</div>
                            <div className="text-sm text-muted-foreground">{event.agency.city}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                      <TableCell>
                        {event.subscription?.plan ? (
                          <div>
                            <div className="font-medium">{event.subscription.plan.display_name}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.subscription ? (
                          <Badge variant={event.subscription.status === 'ACTIVE' ? 'default' : 'outline'}>
                            {event.subscription.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(event.metadata || {}).substring(0, 50)}...
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
