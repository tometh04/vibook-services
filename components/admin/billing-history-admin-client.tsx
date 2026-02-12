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
import { Search, Calendar, DollarSign, CreditCard, Sparkles } from "lucide-react"
import { BILLING_EVENT_STYLES } from "@/lib/design-tokens"

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
    const iconMap: Record<string, any> = {
      PAYMENT_SUCCEEDED: DollarSign,
      PAYMENT_FAILED: CreditCard,
    }
    const styleConfig = BILLING_EVENT_STYLES[eventType] || { label: eventType, className: "border border-border text-muted-foreground" }
    const Icon = iconMap[eventType] || Calendar
    return (
      <Badge variant="outline" className={styleConfig.className}>
        <Icon className="h-3 w-3 mr-1" />
        {styleConfig.label}
      </Badge>
    )
  }

  const eventTypes = Array.from(new Set(events.map(e => e.event_type)))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Facturación
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Historial de pagos</h1>
          <p className="mt-1 text-muted-foreground">
            Eventos, renovaciones y notificaciones de facturación del sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {filteredEvents.length} eventos listados
        </div>
      </div>

      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por agencia, tipo de evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:w-56"
            >
              <option value="all">Todos los eventos</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Eventos de facturación</CardTitle>
          <CardDescription>
            {filteredEvents.length} eventos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/60 bg-background/60">
            <Table>
              <TableHeader className="bg-muted/40">
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
                    <TableRow key={event.id} className="odd:bg-muted/20">
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
                          <Badge variant="outline" className="border-border/70 text-muted-foreground">
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
