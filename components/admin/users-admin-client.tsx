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
import { Users, UserCheck, UserX, CreditCard, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"

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

export function UsersAdminClient({ users, stats }: UsersAdminClientProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search)
    )
  })

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
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestión de usuarios y suscripciones</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} activos, {stats.inactive} inactivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Suscripción</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withSubscription}</div>
            <p className="text-xs text-muted-foreground">
              {stats.subscriptions.active} activas, {stats.subscriptions.trial} en prueba
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subscriptions.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.subscriptions.trial} en período de prueba
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Pago</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subscriptions.unpaid}</div>
            <p className="text-xs text-muted-foreground">
              {stats.subscriptions.canceled} canceladas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Lista completa de usuarios con sus suscripciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado Suscripción</TableHead>
                  <TableHead>Período de Prueba</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const agency = user.user_agencies?.[0]?.agencies
                    const subscription = agency?.subscriptions?.[0]
                    const plan = subscription?.plan

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-green-500">Activo</Badge>
                          ) : (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {agency ? (
                            <div>
                              <div className="font-medium">{agency.name}</div>
                              <div className="text-sm text-muted-foreground">{agency.city}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin agencia</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {plan ? (
                            <div>
                              <div className="font-medium">{plan.display_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatPrice(plan.price_monthly)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin plan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription ? (
                            getStatusBadge(subscription.status)
                          ) : (
                            <Badge variant="outline">Sin suscripción</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription?.trial_end ? (
                            <div className="text-sm">
                              {subscription.status === 'TRIAL' ? (
                                <span className="text-green-600">
                                  Hasta {format(new Date(subscription.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Finalizó {format(new Date(subscription.trial_end), "dd/MM/yyyy", { locale: es })}
                                </span>
                              )}
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
