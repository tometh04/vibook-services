"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, ChevronRight, ChevronLeft, Check, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"

interface Operator {
  id: string
  name: string
}

interface PendingDebt {
  id: string
  operation_id: string
  operator_id: string
  amount: number
  paid_amount: number
  pending_amount: number
  currency: string
  due_date: string
  status: string
  operations?: {
    id: string
    file_code: string
    destination: string
  }
}

interface SelectedDebt extends PendingDebt {
  amountToPay: number
}

interface BulkPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operators: Operator[]
  onSuccess: () => void
}

export function BulkPaymentDialog({
  open,
  onOpenChange,
  operators,
  onSuccess,
}: BulkPaymentDialogProps) {
  // Estado del wizard (4 pasos)
  const [step, setStep] = useState(1)
  
  // Paso 1: Selecciรณn de operador
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("")
  
  // Paso 2: Selecciรณn de moneda
  const [selectedCurrency, setSelectedCurrency] = useState<"ARS" | "USD">("USD")
  
  // Paso 3: Deudas pendientes y selecciรณn
  const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([])
  const [selectedDebts, setSelectedDebts] = useState<SelectedDebt[]>([])
  const [loadingDebts, setLoadingDebts] = useState(false)
  
  // Paso 4: Informaciรณn del pago
  const [paymentCurrency, setPaymentCurrency] = useState<"ARS" | "USD">("USD")
  const [exchangeRate, setExchangeRate] = useState<string>("")
  const [receiptNumber, setReceiptNumber] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState<string>("")
  
  // Estado de carga
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Obtener nombre del operador seleccionado
  const selectedOperator = operators.find(op => op.id === selectedOperatorId)

  // Cargar deudas cuando cambia el operador o la moneda
  useEffect(() => {
    if (selectedOperatorId && selectedCurrency && step >= 3) {
      loadPendingDebts()
    }
  }, [selectedOperatorId, selectedCurrency, step])

  const loadPendingDebts = async () => {
    setLoadingDebts(true)
    try {
      const response = await fetch(
        `/api/accounting/operator-payments?operatorId=${selectedOperatorId}&status=PENDING`
      )
      if (!response.ok) throw new Error("Error al cargar deudas")
      
      const data = await response.json()
      const debts = (data.payments || [])
        .filter((p: any) => p.currency === selectedCurrency)
        .map((p: any) => ({
          ...p,
          amount: parseFloat(p.amount || 0),
          paid_amount: parseFloat(p.paid_amount || 0),
          pending_amount: parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0),
        }))
      
      setPendingDebts(debts)
    } catch (error) {
      console.error("Error loading pending debts:", error)
      setPendingDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setStep(1)
      setSelectedOperatorId("")
      setSelectedCurrency("USD")
      setPendingDebts([])
      setSelectedDebts([])
      setPaymentCurrency("USD")
      setExchangeRate("")
      setReceiptNumber("")
      setPaymentDate(new Date().toISOString().split("T")[0])
      setNotes("")
    }
  }, [open])

  // Toggle selecciรณn de deuda
  const toggleDebtSelection = (debt: PendingDebt) => {
    const isSelected = selectedDebts.some(d => d.id === debt.id)
    if (isSelected) {
      setSelectedDebts(selectedDebts.filter(d => d.id !== debt.id))
    } else {
      setSelectedDebts([...selectedDebts, { ...debt, amountToPay: debt.pending_amount }])
    }
  }

  // Actualizar monto a pagar de una deuda
  const updateAmountToPay = (debtId: string, amount: number) => {
    setSelectedDebts(selectedDebts.map(d => 
      d.id === debtId 
        ? { ...d, amountToPay: Math.min(Math.max(0, amount), d.pending_amount) }
        : d
    ))
  }

  // Seleccionar todas las deudas
  const selectAllDebts = () => {
    if (selectedDebts.length === pendingDebts.length) {
      setSelectedDebts([])
    } else {
      setSelectedDebts(pendingDebts.map(d => ({ ...d, amountToPay: d.pending_amount })))
    }
  }

  // Calcular totales
  const totalToPay = useMemo(() => {
    return selectedDebts.reduce((sum, d) => sum + d.amountToPay, 0)
  }, [selectedDebts])

  const totalToPayInPaymentCurrency = useMemo(() => {
    if (selectedCurrency === paymentCurrency) {
      return totalToPay
    }
    const rate = parseFloat(exchangeRate) || 0
    if (rate <= 0) return 0
    // Si deuda en USD y pago en ARS: multiplicar
    // Si deuda en ARS y pago en USD: dividir
    if (selectedCurrency === "USD" && paymentCurrency === "ARS") {
      return totalToPay * rate
    }
    return totalToPay / rate
  }, [totalToPay, selectedCurrency, paymentCurrency, exchangeRate])

  // Validaciรณn por paso
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!selectedOperatorId
      case 2:
        return !!selectedCurrency
      case 3:
        return selectedDebts.length > 0 && selectedDebts.every(d => d.amountToPay > 0)
      case 4:
        if (selectedCurrency !== paymentCurrency && (!exchangeRate || parseFloat(exchangeRate) <= 0)) {
          return false
        }
        return !!paymentDate
      default:
        return false
    }
  }

  // Enviar pago masivo
  const handleSubmit = async () => {
    if (!canProceed()) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/accounting/operator-payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: selectedOperatorId,
          debt_currency: selectedCurrency,
          payment_currency: paymentCurrency,
          exchange_rate: selectedCurrency !== paymentCurrency ? parseFloat(exchangeRate) : null,
          receipt_number: receiptNumber || null,
          payment_date: paymentDate,
          notes: notes || null,
          payments: selectedDebts.map(d => ({
            operator_payment_id: d.id,
            operation_id: d.operation_id,
            amount: d.amountToPay,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al procesar pago masivo")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting bulk payment:", error)
      alert(error instanceof Error ? error.message : "Error al procesar pago masivo")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render de cada paso
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Operador</Label>
              <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un operador" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOperator && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedOperator.name}</p>
                <p className="text-sm text-muted-foreground">Operador seleccionado</p>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Moneda de las Deudas</Label>
              <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as "ARS" | "USD")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD (Dรณlares)</SelectItem>
                  <SelectItem value="ARS">ARS (Pesos Argentinos)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Se mostrarรกn solo las deudas en la moneda seleccionada
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Deudas Pendientes en {selectedCurrency}</Label>
              {pendingDebts.length > 0 && (
                <Button variant="outline" size="sm" onClick={selectAllDebts}>
                  {selectedDebts.length === pendingDebts.length ? "Deseleccionar todas" : "Seleccionar todas"}
                </Button>
              )}
            </div>
            
            {loadingDebts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingDebts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay deudas pendientes en {selectedCurrency} para este operador
              </div>
            ) : (
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Operaciรณn</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-right">A Pagar</TableHead>
                      <TableHead>Venc.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDebts.map(debt => {
                      const isSelected = selectedDebts.some(d => d.id === debt.id)
                      const selectedDebt = selectedDebts.find(d => d.id === debt.id)
                      const isOverdue = new Date(debt.due_date) < new Date()
                      const isPartial = selectedDebt && selectedDebt.amountToPay < debt.pending_amount

                      return (
                        <TableRow key={debt.id} className={cn(isSelected && "bg-muted/50")}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleDebtSelection(debt)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {debt.operations?.file_code || debt.operation_id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {debt.operations?.destination || "-"}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">Vencido</Badge>
                              )}
                              {isPartial && (
                                <Badge variant="outline" className="text-xs">Parcial</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {selectedCurrency} {debt.pending_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSelected ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={debt.pending_amount}
                                value={selectedDebt?.amountToPay || 0}
                                onChange={(e) => updateAmountToPay(debt.id, parseFloat(e.target.value) || 0)}
                                className="w-28 text-right"
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(debt.due_date), "dd/MM/yy")}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedDebts.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a Pagar:</span>
                  <span className="font-bold text-lg">
                    {selectedCurrency} {totalToPay.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDebts.length} deuda(s) seleccionada(s)
                </p>
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Moneda del Pago</Label>
                <Select value={paymentCurrency} onValueChange={(v) => setPaymentCurrency(v as "ARS" | "USD")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedCurrency !== paymentCurrency && (
                <div className="space-y-2">
                  <Label>Tipo de Cambio *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 1050.00"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Pago *</Label>
                <DatePicker
                  value={paymentDate}
                  onChange={(value) => setPaymentDate(value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nยฐ Comprobante</Label>
                <Input
                  placeholder="Opcional"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                placeholder="Observaciones (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Resumen */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Resumen del Pago</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operador:</span>
                  <span className="font-medium">{selectedOperator?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deudas seleccionadas:</span>
                  <span>{selectedDebts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total en {selectedCurrency}:</span>
                  <span className="font-mono">
                    {selectedCurrency} {totalToPay.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedCurrency !== paymentCurrency && exchangeRate && parseFloat(exchangeRate) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Total a pagar en {paymentCurrency}:</span>
                    <span className="font-mono font-bold">
                      {paymentCurrency} {totalToPayInPaymentCurrency.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Desglose por operaciรณn */}
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Desglose por operaciรณn:</p>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {selectedDebts.map(debt => (
                    <div key={debt.id} className="flex justify-between text-xs">
                      <span>{debt.operations?.file_code || debt.operation_id.slice(0, 8)}</span>
                      <span className="font-mono">
                        {selectedCurrency} {debt.amountToPay.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago Masivo a Operador</DialogTitle>
          <DialogDescription>
            Paso {step} de 4: {
              step === 1 ? "Seleccionar Operador" :
              step === 2 ? "Seleccionar Moneda" :
              step === 3 ? "Seleccionar Deudas" :
              "Informaciรณn del Pago"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                s < step ? "bg-green-500 text-white" :
                s === step ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
          ))}
        </div>

        {/* Contenido del paso actual */}
        <div className="py-4">
          {renderStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar Pago"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
