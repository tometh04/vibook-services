"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, AlertTriangle, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

function formatCurrency(amount: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

const accountTypeLabels: Record<string, string> = {
  SAVINGS_ARS: "Caja de ahorro ARS",
  SAVINGS_USD: "Caja de ahorro USD",
  CHECKING_ARS: "Cuenta corriente ARS",
  CHECKING_USD: "Cuenta corriente USD",
  CASH_ARS: "Caja efectivo ARS",
  CASH_USD: "Caja efectivo USD",
  CREDIT_CARD: "Tarjeta de crédito",
  ASSETS: "Activos",
}

const accountTypes = [
  { value: "SAVINGS_ARS", label: "Caja de ahorro ARS" },
  { value: "SAVINGS_USD", label: "Caja de ahorro USD" },
  { value: "CHECKING_ARS", label: "Cuenta corriente ARS" },
  { value: "CHECKING_USD", label: "Cuenta corriente USD" },
  { value: "CASH_ARS", label: "Caja efectivo ARS" },
  { value: "CASH_USD", label: "Caja efectivo USD" },
  { value: "CREDIT_CARD", label: "Tarjeta de crédito" },
  { value: "ASSETS", label: "Activos" },
]

const assetTypes = [
  { value: "VOUCHER", label: "Vouchers en stock" },
  { value: "QUOTA", label: "Cupos comprados" },
  { value: "HOTEL", label: "Hoteles en stock" },
  { value: "OTHER", label: "Otros activos" },
]

interface FinancialAccountsPageClientProps {
  agencies: Array<{ id: string; name: string }>
}

export function FinancialAccountsPageClient({ agencies: initialAgencies }: FinancialAccountsPageClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  const [agencies, setAgencies] = useState<any[]>(initialAgencies)
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("ALL")
  const [openDialog, setOpenDialog] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const creatingAccountRef = useRef(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<any>(null)
  const [transferToAccountId, setTransferToAccountId] = useState<string>("")
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<any>({
    name: "",
    type: "",
    currency: "ARS",
    agency_id: "",
    initial_balance: 0,
    account_number: "",
    bank_name: "",
    // Tarjeta de crédito
    card_number: "",
    card_holder: "",
    card_expiry_date: "",
    // Activos
    asset_type: "",
    asset_description: "",
    asset_quantity: 0,
    notes: "",
  })

  const fetchData = useCallback(async () => {
      setLoading(true)
      try {
      const accountsRes = await fetch("/api/accounting/financial-accounts")

      if (!accountsRes.ok) throw new Error("Error al obtener cuentas")

      const accountsData = await accountsRes.json()

      setAccounts(accountsData.accounts || [])
      // Las agencias ya vienen como props, no necesitamos cargarlas de nuevo
      setAgencies(initialAgencies)
    } catch (error: any) {
      toast.error(error.message || "Error al cargar datos")
      } finally {
        setLoading(false)
      }
  }, [initialAgencies])

  useEffect(() => {
    fetchData()
    
    // Escuchar evento para refrescar cuentas después de crear pagos
    const handleRefresh = () => {
      fetchData()
    }
    window.addEventListener("refresh-financial-accounts", handleRefresh)
    return () => {
      window.removeEventListener("refresh-financial-accounts", handleRefresh)
    }
  }, [fetchData])

  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/accounting/financial-accounts/clear", {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar cuentas")
      }

      toast.success("Todas las cuentas han sido eliminadas")
      setDeleteConfirmOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar cuentas")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (creatingAccountRef.current) return
    if (!formData.type || !formData.agency_id) {
      toast.error("Tipo de cuenta y agencia son requeridos")
      return
    }

    // Determinar moneda automáticamente según tipo
    let currency = formData.currency
    if (formData.type.includes("_USD")) {
      currency = "USD"
    } else if (formData.type.includes("_ARS")) {
      currency = "ARS"
    } else if (formData.type === "CREDIT_CARD") {
      // Para tarjetas, la moneda puede ser ARS o USD
      currency = formData.currency || "ARS"
    } else if (formData.type === "ASSETS") {
      // Para activos, la moneda puede ser ARS o USD
      currency = formData.currency || "ARS"
    }

    // Preparar datos según tipo
    const accountData: any = {
      name: formData.name,
      type: formData.type,
      currency,
      agency_id: formData.agency_id,
      initial_balance: Number(formData.initial_balance) || 0,
      notes: formData.notes || null,
      is_active: true,
    }

    // Datos para cuentas bancarias
    if (formData.type.includes("CHECKING") || formData.type.includes("SAVINGS")) {
      accountData.account_number = formData.account_number || null
      accountData.bank_name = formData.bank_name || null
    }

    // Datos para tarjetas de crédito
    if (formData.type === "CREDIT_CARD") {
      if (!formData.card_holder || !formData.card_number) {
        toast.error("Titular y número de tarjeta son requeridos para tarjetas de crédito")
        return
      }
      accountData.card_holder = formData.card_holder
      accountData.card_number = formData.card_number.slice(-4) // Solo últimos 4 dígitos
      accountData.bank_name = formData.bank_name || null
      accountData.card_expiry_date = formData.card_expiry_date || null
    }

    // Datos para activos
    if (formData.type === "ASSETS") {
      if (!formData.asset_type) {
        toast.error("Tipo de activo es requerido")
        return
      }
      accountData.asset_type = formData.asset_type
      accountData.asset_description = formData.asset_description || null
      accountData.asset_quantity = Number(formData.asset_quantity) || 0
    }

    creatingAccountRef.current = true
    setCreatingAccount(true)
    try {
      const res = await fetch("/api/accounting/financial-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al crear cuenta")
      }

      toast.success("Cuenta creada exitosamente")
      setOpenDialog(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Error al crear cuenta")
    } finally {
      creatingAccountRef.current = false
      setCreatingAccount(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      currency: "ARS",
      agency_id: "",
      initial_balance: 0,
      account_number: "",
      bank_name: "",
      card_number: "",
      card_holder: "",
      card_expiry_date: "",
      asset_type: "",
      asset_description: "",
      asset_quantity: 0,
      notes: "",
    })
  }

  const getDisplayName = (account: any) => {
    if (account.type === "CREDIT_CARD" && account.card_holder && account.card_number) {
      return `${account.card_holder} •••• ${account.card_number}`
    }
    return account.name
  }

  const handleDeleteAccount = (account: any) => {
    setAccountToDelete(account)
    setTransferToAccountId("")
    setDeleteAccountDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return

    // Si la cuenta tiene saldo y no se seleccionó una cuenta de destino, no permitir eliminar
    const balance = accountToDelete.current_balance || 0
    if (Math.abs(balance) > 0.01 && !transferToAccountId) {
      toast.error("Debes seleccionar una cuenta de destino para transferir el saldo")
      return
    }

    setDeleting(true)
    try {
      const url = transferToAccountId
        ? `/api/accounting/financial-accounts/${accountToDelete.id}?transferTo=${transferToAccountId}`
        : `/api/accounting/financial-accounts/${accountToDelete.id}`

      const res = await fetch(url, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar cuenta")
      }

      toast.success(data.message || "Cuenta eliminada exitosamente")
      setDeleteAccountDialogOpen(false)
      setAccountToDelete(null)
      setTransferToAccountId("")
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar cuenta")
    } finally {
      setDeleting(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Filtrar cuentas por agencia seleccionada
  const filteredAccounts = selectedAgencyId === "ALL" 
    ? accounts 
    : accounts.filter((account) => {
        const agencyId = account.agency_id || (account.agencies as any)?.id
        return agencyId === selectedAgencyId
      })

  // Agrupar por agencia
  const accountsByAgency = filteredAccounts.reduce((acc, account) => {
    // Asegurar que agency_id esté disponible (puede venir directamente o desde agencies)
    const agencyId = account.agency_id || (account.agencies as any)?.id || "sin-agencia"
    if (!acc[agencyId]) {
      acc[agencyId] = {
        agency: agencies.find((a) => a.id === agencyId) || (account.agencies as any),
        accounts: [],
      }
    }
    acc[agencyId].accounts.push(account)
    return acc
  }, {} as Record<string, any>)

  return (
    <div className="space-y-6">
      {/* Header con botones */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cuentas Financieras</h1>
          <p className="text-muted-foreground">Gestiona todas las cuentas y cajas de las agencias</p>
        </div>
        <div className="flex gap-2">
          {/* Filtro de agencia */}
          <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas las agencias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las agencias</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {accounts.length > 0 && (
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar Todas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    ¿Eliminar todas las cuentas?
                  </DialogTitle>
                  <DialogDescription>
                    Esta acción eliminará todas las cuentas financieras del sistema. Esta acción no se puede deshacer.
                    Asegúrate de haber respaldado la información necesaria.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleClearAll}>
                    Sí, eliminar todas
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cuenta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Cuenta Financiera</DialogTitle>
                <DialogDescription>
                  Completa los datos según el tipo de cuenta que deseas crear
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de cuenta */}
                <div>
                  <Label>Tipo de Cuenta *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Agencia */}
                <div>
                  <Label>Agencia *</Label>
                  <Select
                    value={formData.agency_id}
                    onValueChange={(value) => setFormData({ ...formData, agency_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una agencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nombre */}
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={
                      formData.type === "CREDIT_CARD"
                        ? "Ej: Tarjeta Principal"
                        : formData.type === "ASSETS"
                        ? "Ej: Vouchers Brasil 2025"
                        : "Ej: Caja Principal"
                    }
                    required
                  />
                </div>

                {/* Campos específicos para cuentas bancarias */}
                {(formData.type.includes("CHECKING") || formData.type.includes("SAVINGS")) && (
                  <>
                    <div>
                      <Label>Banco</Label>
                      <Input
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="Ej: Banco Galicia"
                      />
                    </div>
                    <div>
                      <Label>Número de Cuenta</Label>
                      <Input
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="Número de cuenta bancaria"
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos para tarjetas de crédito */}
                {formData.type === "CREDIT_CARD" && (
                  <>
                    <div>
                      <Label>Moneda *</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Titular *</Label>
                      <Input
                        value={formData.card_holder}
                        onChange={(e) => setFormData({ ...formData, card_holder: e.target.value })}
                        placeholder="Nombre del titular"
                        required
                      />
                    </div>
                    <div>
                      <Label>Número de Tarjeta *</Label>
                      <Input
                        value={formData.card_number}
                        onChange={(e) => setFormData({ ...formData, card_number: e.target.value.replace(/\D/g, "") })}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Solo se guardarán los últimos 4 dígitos por seguridad
                      </p>
                    </div>
                    <div>
                      <Label>Banco</Label>
                      <Input
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="Ej: Visa, Mastercard, Banco Galicia"
                      />
                    </div>
                    <div>
                      <Label>Fecha de Vencimiento</Label>
                      <Input
                        type="month"
                        value={formData.card_expiry_date}
                        onChange={(e) => setFormData({ ...formData, card_expiry_date: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos para activos */}
                {formData.type === "ASSETS" && (
                  <>
                    <div>
                      <Label>Moneda *</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Activo *</Label>
                      <Select
                        value={formData.asset_type}
                        onValueChange={(value) => setFormData({ ...formData, asset_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Textarea
                        value={formData.asset_description}
                        onChange={(e) => setFormData({ ...formData, asset_description: e.target.value })}
                        placeholder="Ej: Vouchers para Brasil enero 2025"
                      />
                    </div>
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        value={formData.asset_quantity}
                        onChange={(e) => setFormData({ ...formData, asset_quantity: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                {/* Saldo inicial */}
                {formData.type !== "ASSETS" && (
                  <div>
                    <Label>Saldo Inicial</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.initial_balance}
                      onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Notas */}
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales (opcional)"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingAccount}>
                    {creatingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Cuenta"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabla de cuentas por agencia */}
      {Object.keys(accountsByAgency).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay cuentas financieras</h3>
            <p className="text-muted-foreground mb-4">
              Comienza creando tu primera cuenta financiera
            </p>
            <Button onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Cuenta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(accountsByAgency).map(([agencyId, data]: [string, any]) => (
            <Card key={agencyId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {data.agency?.name || "Sin agencia"}
                </CardTitle>
                <CardDescription>
                  {data.accounts.length} cuenta{data.accounts.length !== 1 ? "s" : ""}
                </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Moneda</TableHead>
                      <TableHead className="text-right">Saldo Inicial</TableHead>
                      <TableHead className="text-right">Balance Actual</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                    {data.accounts.map((account: any) => (
                <TableRow key={account.id}>
                        <TableCell className="font-medium">{getDisplayName(account)}</TableCell>
                  <TableCell>
                          <Badge variant="outline">
                            {accountTypeLabels[account.type] || account.type}
                          </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{account.currency}</Badge>
                  </TableCell>
                        <TableCell className="text-right">
                    {formatCurrency(account.initial_balance || 0, account.currency)}
                  </TableCell>
                        <TableCell className="text-right">
                    <span
                      className={`font-bold ${
                              (account.current_balance || 0) >= 0 ? "text-amber-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(account.current_balance || 0, account.currency)}
                    </span>
                  </TableCell>
                        <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccount(account)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
          ))}
        </div>
      )}

      {/* Diálogo de confirmación de eliminación con transferencia */}
      <Dialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Cuenta Financiera
            </DialogTitle>
            <DialogDescription>
              {accountToDelete && (
                <>
                  Estás a punto de eliminar la cuenta <strong>{getDisplayName(accountToDelete)}</strong>.
                  {Math.abs(accountToDelete.current_balance || 0) > 0.01 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        ⚠️ Esta cuenta tiene un saldo de{" "}
                        <strong>
                          {formatCurrency(
                            Math.abs(accountToDelete.current_balance || 0),
                            accountToDelete.currency
                          )}
                        </strong>
                      </p>
                      <p className="text-sm text-amber-700 mb-3">
                        ¿Deseas transferir este saldo a otra cuenta antes de eliminar?
                      </p>
                      <Select
                        value={transferToAccountId}
                        onValueChange={setTransferToAccountId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una cuenta de destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter(
                              (acc: any) =>
                                acc.id !== accountToDelete.id &&
                                acc.is_active &&
                                acc.currency === accountToDelete.currency
                            )
                            .map((acc: any) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {getDisplayName(acc)} ({acc.currency}) - Balance:{" "}
                                {formatCurrency(acc.current_balance || 0, acc.currency)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {accounts.filter(
                        (acc: any) =>
                          acc.id !== accountToDelete.id &&
                          acc.is_active &&
                          acc.currency === accountToDelete.currency
                      ).length === 0 && (
                        <p className="text-xs text-red-600 mt-2">
                          No hay otras cuentas en {accountToDelete.currency} disponibles para transferir
                        </p>
                      )}
                    </div>
                  )}
                  {Math.abs(accountToDelete.current_balance || 0) <= 0.01 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Esta cuenta no tiene saldo, se eliminará directamente.
                    </p>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAccountDialogOpen(false)
                setAccountToDelete(null)
                setTransferToAccountId("")
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                deleting ||
                (accountToDelete &&
                  Math.abs(accountToDelete.current_balance || 0) > 0.01 &&
                  !transferToAccountId)
              }
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar Cuenta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
