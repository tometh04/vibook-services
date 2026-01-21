"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { format, addDays, isBefore } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, RefreshCw, AlertCircle, Filter, HelpCircle } from "lucide-react"
import { NewRecurringPaymentDialog } from "./new-recurring-payment-dialog"
import { EditRecurringPaymentDialog } from "./edit-recurring-payment-dialog"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

function formatCurrency(amount: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

const frequencyLabels: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
}

interface RecurringPaymentsPageClientProps {
  agencies: Array<{ id: string; name: string }>
}

export function RecurringPaymentsPageClient({ agencies }: RecurringPaymentsPageClientProps) {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [isActiveFilter, setIsActiveFilter] = useState<string>("ALL")
  const [providerFilter, setProviderFilter] = useState<string>("ALL")
  const [agencyFilter, setAgencyFilter] = useState<string>("ALL")
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any | null>(null)
  const [tableError, setTableError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string }>>([])

  // Cargar categorías
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/accounting/recurring-payments/categories")
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    fetchCategories()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setTableError(null)
    try {
      const params = new URLSearchParams()
      if (isActiveFilter !== "ALL") {
        params.append("isActive", isActiveFilter === "ACTIVE" ? "true" : "false")
      }
      if (agencyFilter !== "ALL") {
        params.append("agencyId", agencyFilter)
      }

      const response = await fetch(`/api/recurring-payments?${params.toString()}`)
      const data = await response.json()

      if (data.tableNotFound || data.message) {
        setTableError(data.message || "La tabla recurring_payments no existe. Ejecuta la migración SQL.")
        setPayments([])
      } else {
        setPayments(data.payments || [])
      }
    } catch (error) {
      console.error("Error fetching recurring payments:", error)
      setTableError("La tabla recurring_payments no existe. Ejecuta la migración SQL en Supabase.")
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [isActiveFilter, agencyFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleGeneratePayments() {
    try {
      const response = await fetch("/api/recurring-payments/generate", {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al generar pagos")
      }

      const result = await response.json()
      if (result.generated > 0) {
        toast.success(`Se procesaron ${result.generated} pagos recurrentes. ${result.alertsCreated || 0} alertas creadas.`)
      } else {
        toast.info("No hay pagos recurrentes vencidos para procesar")
      }
      fetchData()
    } catch (error: any) {
      console.error("Error generating payments:", error)
      toast.error(error.message || "Error al generar pagos recurrentes")
    }
  }

  // Extraer proveedores únicos de los pagos
  const uniqueProviders = useMemo(() => {
    const providers = new Set<string>()
    payments.forEach((p) => {
      const name = p.provider_name || p.operators?.name
      if (name) providers.add(name)
    })
    return Array.from(providers).sort()
  }, [payments])

  // Filtrar pagos por proveedor
  const filteredPayments = useMemo(() => {
    if (providerFilter === "ALL") return payments
    return payments.filter((p) => {
      const name = p.provider_name || p.operators?.name
      return name === providerFilter
    })
  }, [payments, providerFilter])

  const activeCount = payments.filter((p) => p.is_active).length
  const inactiveCount = payments.filter((p) => !p.is_active).length
  const totalMonthly = payments
    .filter((p) => p.is_active && p.frequency === "MONTHLY")
    .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0)
  const totalMonthlyUSD = payments
    .filter((p) => p.is_active && p.frequency === "MONTHLY" && p.currency === "USD")
    .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0)

  // Estadísticas adicionales
  const stats = useMemo(() => {
    const now = new Date()
    const nextWeek = addDays(now, 7)
    
    const dueThisWeek = filteredPayments.filter((p) => {
      if (!p.next_due_date || !p.is_active) return false
      const dueDate = new Date(p.next_due_date)
      return isBefore(dueDate, nextWeek)
    }).length

    const overdue = filteredPayments.filter((p) => {
      if (!p.next_due_date || !p.is_active) return false
      const dueDate = new Date(p.next_due_date)
      return isBefore(dueDate, now)
    }).length

    return { dueThisWeek, overdue }
  }, [filteredPayments])

  // Gráfico de barras: Gastos por categoría
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, { value: number; color: string }>()
    
    filteredPayments.forEach((p) => {
      if (!p.is_active) return
      const categoryId = p.category_id || "sin_categoria"
      const category = categories.find(c => c.id === categoryId)
      const categoryName = category?.name || "Sin categoría"
      const categoryColor = category?.color || "#6b7280"
      const amount = parseFloat(p.amount || "0")
      
      // Convertir todo a USD para comparación
      const amountUsd = p.currency === "USD" ? amount : amount / 1200
      
      const existing = categoryMap.get(categoryName) || { value: 0, color: categoryColor }
      categoryMap.set(categoryName, { 
        value: existing.value + amountUsd,
        color: categoryColor
      })
    })

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: Number(data.value.toFixed(2)), color: data.color }))
      .sort((a, b) => b.value - a.value)
  }, [filteredPayments, categories])

  // Gráfico de torta: Distribución porcentual
  const categoryDistribution = useMemo(() => {
    const total = expensesByCategory.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) return []
    
    return expensesByCategory.map((item) => ({
      name: item.name,
      value: item.value,
      color: item.color,
      percentage: ((item.value / total) * 100).toFixed(1),
    }))
  }, [expensesByCategory])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Gastos Recurrentes</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">¿Cómo funciona?</p>
                <p className="text-xs">
                  Gestiona pagos recurrentes como alquileres, servicios, sueldos, etc. 
                  El sistema genera alertas automáticas cuando se acercan los vencimientos.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button onClick={handleGeneratePayments} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Procesar Vencimientos
        </Button>
      </div>
      <p className="text-muted-foreground">
        Gestiona pagos recurrentes a proveedores (mensuales, semanales, etc.)
      </p>

      {/* Error de tabla */}
      {tableError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Migración Pendiente</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{tableError}</p>
            <p className="text-sm">
              Ve a <strong>Supabase → SQL Editor</strong> y ejecuta el archivo:{" "}
              <code className="bg-muted px-1 rounded">supabase/migrations/041_fix_recurring_payments.sql</code>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              {inactiveCount} inactivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mensual ARS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalMonthly - (totalMonthlyUSD * 1), "ARS")}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagos mensuales en pesos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mensual USD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalMonthlyUSD, "USD")}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagos mensuales en dólares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencen Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.dueThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdue > 0 && <span className="text-red-600">{stats.overdue} vencidos</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos por Categoría */}
      {categories.length > 0 && expensesByCategory.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráfico de barras: Gastos por categoría */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Gastos por Categoría (Mensual)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByCategory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value, "USD")} 
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="value" name="Total" radius={[2, 2, 0, 0]}>
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de torta: Distribución porcentual */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${percentage}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value, "USD"), name]}
                      contentStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Leyenda */}
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {categoryDistribution.map((cat, index) => (
                  <div key={index} className="flex items-center gap-1 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Pagos Recurrentes</CardTitle>
              <CardDescription>Gestión de pagos automáticos a proveedores</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Proveedor */}
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los proveedores</SelectItem>
                  {uniqueProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Agencia */}
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Agencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Estado */}
              <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Activos</SelectItem>
                  <SelectItem value="INACTIVE">Inactivos</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => setNewDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Pago
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {providerFilter !== "ALL" 
                ? `No hay pagos recurrentes para "${providerFilter}"`
                : "No se encontraron pagos recurrentes"
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Próximo Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const daysUntilDue = Math.ceil(
                    (new Date(payment.next_due_date).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="font-normal">
                          {payment.provider_name || payment.operators?.name || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.description}
                      </TableCell>
                      <TableCell className={payment.currency === "USD" ? "text-emerald-600 font-medium" : ""}>
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {frequencyLabels[payment.frequency] || payment.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>
                            {format(new Date(payment.next_due_date), "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </span>
                          {daysUntilDue <= 0 && (
                            <span className="text-xs text-red-500 font-medium">
                              {daysUntilDue === 0 ? "Vence hoy" : `Vencido hace ${Math.abs(daysUntilDue)} días`}
                            </span>
                          )}
                          {daysUntilDue > 0 && daysUntilDue <= 7 && (
                            <span className="text-xs text-amber-600">
                              {daysUntilDue === 1 ? "Mañana" : `En ${daysUntilDue} días`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.is_active ? "default" : "secondary"}>
                          {payment.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPayment(payment)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewRecurringPaymentDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSuccess={fetchData}
      />

      {editingPayment && (
        <EditRecurringPaymentDialog
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
          onSuccess={fetchData}
          payment={editingPayment}
        />
      )}
    </div>
  )
}
