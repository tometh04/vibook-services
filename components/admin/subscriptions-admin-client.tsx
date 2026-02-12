"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { Loader2, Shield, CreditCard, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { SUBSCRIPTION_STATUS_STYLES } from "@/lib/design-tokens"

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
  plan_id?: string
  plan?: {
    id: string
    name: string
    display_name: string
    price_monthly: number
  }
}

interface SubscriptionsAdminClientProps {
  subscriptions: Subscription[]
}

export function SubscriptionsAdminClient({ subscriptions }: SubscriptionsAdminClientProps) {
  const [plans, setPlans] = useState<Array<{ id: string; name: string; display_name: string }>>([])
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch('/api/admin/plans')
        const data = await response.json()
        if (data.plans) {
          setPlans(data.plans)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      }
    }
    fetchPlans()
  }, [])

  const handlePlanChange = async (subscriptionId: string, newPlanId: string) => {
    setUpdating(subscriptionId)
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: newPlanId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar suscripción')
      }

      toast.success('Suscripción actualizada correctamente')
      // Recargar la página para ver los cambios
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar suscripción')
    } finally {
      setUpdating(null)
    }
  }

  const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
    setUpdating(subscriptionId)
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar suscripción')
      }

      toast.success('Estado de suscripción actualizado correctamente')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado')
    } finally {
      setUpdating(null)
    }
  }

  const handleExtendTrial = async (subscriptionId: string) => {
    setUpdating(subscriptionId)
    try {
      const additionalDays = 7 // Por defecto 7 días, puede hacerse configurable
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/extend-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ additionalDays }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al extender trial')
      }

      toast.success(`Trial extendido ${additionalDays} días correctamente`)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Error al extender trial')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = SUBSCRIPTION_STATUS_STYLES[status] || { label: status, className: "border border-border text-muted-foreground" }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Suscripciones
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Gestion de suscripciones</h1>
          <p className="mt-1 text-muted-foreground">
            Controla estados, planes y ciclos de facturacion del sistema.
          </p>
        </div>
        <Badge className="border border-border bg-muted/60 text-muted-foreground">
          {subscriptions.length} registros activos
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suscripciones totales</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">Incluye pruebas y activas</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado Mercado Pago</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
              <Shield className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {subscriptions.filter((sub) => sub.mp_status).length}
            </div>
            <p className="text-xs text-muted-foreground">Con estado MP registrado</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ultima actividad</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100/80 text-purple-600 dark:bg-purple-500/20 dark:text-purple-200">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground">
              {subscriptions[0]?.created_at ? format(new Date(subscriptions[0].created_at), "dd/MM/yyyy", { locale: es }) : "Sin datos"}
            </div>
            <p className="text-xs text-muted-foreground">Fecha de ultima suscripcion</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader>
          <CardTitle>Listado de suscripciones</CardTitle>
          <CardDescription>
            {subscriptions.length} suscripciones en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/60 bg-background/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cambiar Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cambiar Estado</TableHead>
                  <TableHead>MP Status</TableHead>
                  <TableHead>Periodo Actual</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Extender Trial</TableHead>
                  <TableHead>MP Preapproval ID</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      No hay suscripciones
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => {
                    const user = sub.agency?.users?.[0]?.user

                    return (
                      <TableRow key={sub.id} className="odd:bg-muted/20">
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
                        <TableCell>
                          <Select
                            value={sub.plan?.id || ''}
                            onValueChange={(value) => handlePlanChange(sub.id, value)}
                            disabled={updating === sub.id}
                          >
                            <SelectTrigger className="w-[180px] bg-background">
                              <SelectValue placeholder="Seleccionar plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          <Select
                            value={sub.status}
                            onValueChange={(value) => handleStatusChange(sub.id, value)}
                            disabled={updating === sub.id}
                          >
                            <SelectTrigger className="w-[150px] bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Activa</SelectItem>
                              <SelectItem value="TRIAL">Prueba</SelectItem>
                              <SelectItem value="CANCELED">Cancelada</SelectItem>
                              <SelectItem value="SUSPENDED">Suspendida</SelectItem>
                              <SelectItem value="UNPAID">Sin pago</SelectItem>
                              <SelectItem value="PAST_DUE">Vencida</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {sub.mp_status ? (
                            <Badge variant="outline" className="border-border/70 text-muted-foreground">
                              {sub.mp_status}
                            </Badge>
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
                                <span className="text-emerald-600 dark:text-emerald-300">
                                  Hasta {format(new Date(sub.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Finalizo {format(new Date(sub.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.status === 'TRIAL' && sub.trial_end && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExtendTrial(sub.id)}
                              disabled={updating === sub.id}
                            >
                              {updating === sub.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                '+7 dias'
                              )}
                            </Button>
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
