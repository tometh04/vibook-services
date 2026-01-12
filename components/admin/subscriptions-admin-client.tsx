"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

interface Subscription {
  id: string
  status: string
  mp_preapproval_id: string | null
  mp_status: string | null
  mp_payer_id: string | null
  current_period_start: string
  current_period_end: string
  trial_start: string | null
  trial_end: string | null
  created_at: string
  updated_at: string
  agency?: {
    id: string
    name: string
    city: string
    users?: Array<{
      user?: {
        id: string
        name: string
        email: string
      }
    }>
  }
  plan?: {
    name: string
    display_name: string
    price_monthly: number
  }
}

interface SubscriptionsAdminClientProps {
  subscriptions: Subscription[]
}

export function SubscriptionsAdminClient({ subscriptions }: SubscriptionsAdminClientProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      ACTIVE: { variant: "default", label: "Activa" },
      TRIAL: { variant: "secondary", label: "Prueba" },
      CANCELED: { variant: "destructive", label: "Cancelada" },
      UNPAID: { variant: "outline", label: "Sin pago" },
      SUSPENDED: { variant: "outline", label: "Suspendida" },
      PAST_DUE: { variant: "destructive", label: "Vencida" },
    }
    const config = variants[status] || { variant: "outline" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Gratis'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suscripciones</h1>
        <p className="text-muted-foreground">Gestión y monitoreo de todas las suscripciones</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Suscripciones</CardTitle>
          <CardDescription>
            {subscriptions.length} suscripciones en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>MP Status</TableHead>
                  <TableHead>Período Actual</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>MP Preapproval ID</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No hay suscripciones
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => {
                    const user = sub.agency?.users?.[0]?.user

                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          {sub.agency ? (
                            <div>
                              <div className="font-medium">{sub.agency.name}</div>
                              <div className="text-sm text-muted-foreground">{sub.agency.city}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user ? (
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.plan ? (
                            <div>
                              <div className="font-medium">{sub.plan.display_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatPrice(sub.plan.price_monthly)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin plan</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          {sub.mp_status ? (
                            <Badge variant="outline">{sub.mp_status}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(sub.current_period_start), "dd/MM/yyyy", { locale: es })}</div>
                            <div className="text-muted-foreground">
                              hasta {format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: es })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.trial_end ? (
                            <div className="text-sm">
                              {sub.status === 'TRIAL' ? (
                                <span className="text-green-600">
                                  Hasta {format(new Date(sub.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Finalizó {format(new Date(sub.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.mp_preapproval_id ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {sub.mp_preapproval_id.substring(0, 20)}...
                            </code>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(sub.created_at), "dd/MM/yyyy", { locale: es })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
