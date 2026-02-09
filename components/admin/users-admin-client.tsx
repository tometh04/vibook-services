"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Users, UserCheck, UserX, CreditCard, Loader2, Search } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  user_agencies?: Array<{
    agency_id: string
    agencies?: {
      id: string
      name: string
      city: string
      created_at: string
      subscriptions?: Array<{
        id: string
        status: string
        mp_preapproval_id: string | null
        mp_status: string | null
        current_period_start: string
        current_period_end: string
        trial_start: string | null
        trial_end: string | null
        created_at: string
        plan?: {
          name: string
          display_name: string
          price_monthly: number
        }
      }>
    }
  }>
}

interface Stats {
  total: number
  active: number
  inactive: number
  withSubscription: number
  subscriptions: {
    active: number
    trial: number
    canceled: number
    unpaid: number
  }
}

interface UsersAdminClientProps {
  users: User[]
  stats: Stats
}

interface OnboardingStatusInfo {
  status: "COMPLETED" | "SKIPPED" | "IN_PROGRESS" | "NOT_AVAILABLE"
  mode: "AUTO" | "FORCE_ON" | "FORCE_OFF"
  currentStepTitle: string | null
  currentStepId: string | null
  completedCount: number
  totalCount: number
}

export function UsersAdminClient({ users, stats }: UsersAdminClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [plans, setPlans] = useState<Array<{ id: string; name: string; display_name: string }>>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [onboardingStatuses, setOnboardingStatuses] = useState<Record<string, OnboardingStatusInfo>>({})
  const [loadingOnboarding, setLoadingOnboarding] = useState(false)
  const [updatingOnboarding, setUpdatingOnboarding] = useState<string | null>(null)

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

  const buildOnboardingKey = (userId?: string, agencyId?: string) => {
    if (!userId || !agencyId) return null
    return `${userId}:${agencyId}`
  }

  const handleOnboardingModeChange = async (userId: string, agencyId: string, mode: OnboardingStatusInfo["mode"]) => {
    const key = buildOnboardingKey(userId, agencyId)
    if (!key) return

    setUpdatingOnboarding(key)
    try {
      const response = await fetch("/api/admin/onboarding/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, agency_id: agencyId, mode }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar onboarding")
      }

      setOnboardingStatuses((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {
            status: "IN_PROGRESS",
            currentStepTitle: null,
            currentStepId: null,
            completedCount: 0,
            totalCount: 0,
            mode: "AUTO",
          }),
          mode,
        },
      }))
      toast.success("Onboarding actualizado")
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar onboarding")
    } finally {
      setUpdatingOnboarding(null)
    }
  }

  const handlePlanChange = async (subscriptionId: string | null, agencyId: string, newPlanId: string) => {
    if (!subscriptionId) {
      // Crear nueva suscripción
      setUpdating(agencyId)
      try {
        const response = await fetch('/api/admin/subscriptions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agency_id: agencyId, plan_id: newPlanId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al crear suscripción')
        }

        toast.success('Suscripción creada correctamente')
        window.location.reload()
      } catch (error: any) {
        toast.error(error.message || 'Error al crear suscripción')
      } finally {
        setUpdating(null)
      }
    } else {
      // Actualizar suscripción existente
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

        toast.success('Plan actualizado correctamente')
        window.location.reload()
      } catch (error: any) {
        toast.error(error.message || 'Error al actualizar plan')
      } finally {
        setUpdating(null)
      }
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
        throw new Error(data.error || 'Error al actualizar estado')
      }

      toast.success('Estado actualizado correctamente')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado')
    } finally {
      setUpdating(null)
    }
  }

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search)
    )
  })

  useEffect(() => {
    const pairs = filteredUsers
      .map((user) => {
        const agencyId = user.user_agencies?.[0]?.agency_id
        if (!agencyId) return null
        return { user_id: user.id, agency_id: agencyId }
      })
      .filter(Boolean) as Array<{ user_id: string; agency_id: string }>

    if (pairs.length === 0) return

    let ignore = false
    setLoadingOnboarding(true)

    fetch("/api/admin/onboarding/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return
        setOnboardingStatuses(data.statuses || {})
      })
      .catch((error) => {
        console.error("Error fetching onboarding status:", error)
      })
      .finally(() => {
        if (!ignore) setLoadingOnboarding(false)
      })

    return () => {
      ignore = true
    }
  }, [filteredUsers])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: "Activa", className: "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
      TRIAL: { label: "Prueba", className: "border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-300" },
      CANCELED: { label: "Cancelada", className: "border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300" },
      UNPAID: { label: "Sin pago", className: "border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300" },
      SUSPENDED: { label: "Suspendida", className: "border border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300" },
      PAST_DUE: { label: "Vencida", className: "border border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300" },
    }
    const config = variants[status] || { label: status, className: "border border-border text-muted-foreground" }
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

  const statCards = [
    {
      label: "Total usuarios",
      value: stats.total,
      description: `${stats.active} activos · ${stats.inactive} inactivos`,
      icon: Users,
      tone: "bg-blue-100/80 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200",
    },
    {
      label: "Con suscripcion",
      value: stats.withSubscription,
      description: `${stats.subscriptions.active} activas · ${stats.subscriptions.trial} en prueba`,
      icon: CreditCard,
      tone: "bg-indigo-100/80 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200",
    },
    {
      label: "Suscripciones activas",
      value: stats.subscriptions.active,
      description: `${stats.subscriptions.trial} en prueba`,
      icon: UserCheck,
      tone: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
    },
    {
      label: "Sin pago",
      value: stats.subscriptions.unpaid,
      description: `${stats.subscriptions.canceled} canceladas`,
      icon: UserX,
      tone: "bg-rose-100/80 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Administracion
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Usuarios y suscripciones</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona usuarios, roles y planes activos desde un solo lugar.
          </p>
        </div>
        <Badge className="border border-border bg-muted/60 text-muted-foreground">
          {stats.total} usuarios registrados
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.label}
              className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/60 bg-card/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Usuarios</CardTitle>
          <CardDescription>
            Lista completa de usuarios con sus suscripciones. Puedes asignar planes manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredUsers.length} resultados visibles
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Asignar Plan</TableHead>
                  <TableHead>Estado Suscripcion</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Cambiar Estado</TableHead>
                  <TableHead>Periodo de Prueba</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const agency = user.user_agencies?.[0]?.agencies
                    const subscriptions = agency?.subscriptions || []
                    const subscription = subscriptions.find((s: any) => s.status === 'TRIAL') 
                      || subscriptions.find((s: any) => s.status === 'ACTIVE')
                      || subscriptions.find((s: any) => s.status !== 'CANCELED' && s.status !== 'UNPAID')
                      || subscriptions[0]
                    const plan = subscription?.plan

                    return (
                      <TableRow key={user.id} className="odd:bg-muted/20">
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border/70 text-xs text-muted-foreground">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {agency ? (
                            <div>
                              <div className="font-medium text-foreground">{agency.name}</div>
                              <div className="text-sm text-muted-foreground">{agency.city}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin agencia</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {plan ? (
                            <div>
                              <div className="font-medium text-foreground">{plan.display_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatPrice(plan.price_monthly)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin plan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {agency ? (
                            <Select
                              value={plan?.name || ''}
                              onValueChange={(value) => {
                                const selectedPlan = plans.find(p => p.name === value)
                                if (selectedPlan) {
                                  handlePlanChange(subscription?.id || null, agency.id, selectedPlan.id)
                                }
                              }}
                              disabled={updating === (subscription?.id || agency.id)}
                            >
                              <SelectTrigger className="w-[150px] bg-background">
                                <SelectValue placeholder="Asignar plan" />
                              </SelectTrigger>
                              <SelectContent>
                                {plans.map((p) => (
                                  <SelectItem key={p.id} value={p.name}>
                                    {p.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription ? (
                            getStatusBadge(subscription.status)
                          ) : (
                            <Badge variant="outline" className="border-border/70 text-muted-foreground">
                              Sin suscripcion
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const key = buildOnboardingKey(user.id, agency?.id)
                            const info = key ? onboardingStatuses[key] : undefined
                            const mode = info?.mode || "AUTO"
                            const status = info?.status
                            const isLoading = loadingOnboarding && !info
                            const statusLabel = (() => {
                              if (mode === "FORCE_OFF") return "Oculto (admin)"
                              if (status === "COMPLETED") return "Completado"
                              if (status === "SKIPPED") return "Skipeado"
                              if (status === "NOT_AVAILABLE") return "Sin pasos"
                              return "En progreso"
                            })()

                            const statusTone = (() => {
                              if (mode === "FORCE_OFF") return "border border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300"
                              if (status === "COMPLETED") return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                              if (status === "SKIPPED") return "border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              if (status === "NOT_AVAILABLE") return "border border-border text-muted-foreground"
                              return "border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-300"
                            })()

                            return agency ? (
                              <div className="space-y-2 min-w-[180px]">
                                {isLoading ? (
                                  <span className="text-xs text-muted-foreground">Cargando...</span>
                                ) : (
                                  <>
                                    <Badge variant="outline" className={statusTone}>
                                      {statusLabel}
                                    </Badge>
                                    {info?.currentStepTitle && mode !== "FORCE_OFF" && status !== "COMPLETED" && (
                                      <div className="text-xs text-muted-foreground">
                                        Paso: {info.currentStepTitle}
                                      </div>
                                    )}
                                    {mode === "FORCE_OFF" && info?.currentStepTitle && (
                                      <div className="text-xs text-muted-foreground">
                                        Paso actual: {info.currentStepTitle}
                                      </div>
                                    )}
                                  </>
                                )}
                                <Select
                                  value={mode}
                                  onValueChange={(value) => handleOnboardingModeChange(user.id, agency.id, value as OnboardingStatusInfo["mode"])}
                                  disabled={updatingOnboarding === key}
                                >
                                  <SelectTrigger className="w-[160px] bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AUTO">Automático</SelectItem>
                                    <SelectItem value="FORCE_ON">Forzar mostrar</SelectItem>
                                    <SelectItem value="FORCE_OFF">Ocultar</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          {subscription ? (
                            <Select
                              value={subscription.status}
                              onValueChange={(value) => handleStatusChange(subscription.id, value)}
                              disabled={updating === subscription.id}
                            >
                              <SelectTrigger className="w-[130px] bg-background">
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
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription?.trial_end ? (
                            <div className="text-sm">
                              {subscription.status === 'TRIAL' ? (
                                <span className="text-emerald-600 dark:text-emerald-300">
                                  Hasta {format(new Date(subscription.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Finalizo {format(new Date(subscription.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              )}
                            </div>
                          ) : subscription?.trial_start ? (
                            <div className="text-sm">
                              <span className="text-emerald-600 dark:text-emerald-300">
                                Desde {format(new Date(subscription.trial_start), "dd/MM/yyyy", { locale: es })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(user.created_at), "dd/MM/yyyy", { locale: es })}
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
