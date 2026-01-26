"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

const manualPaymentSchema = z.object({
  customer_name: z.string().min(1, "El nombre es requerido"),
  amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  currency: z.enum(["ARS", "USD"]),
  exchange_rate: z.coerce.number().optional(),
  method: z.string().min(1, "El método de pago es requerido"),
  date_due: z.string().min(1, "La fecha de vencimiento es requerida"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  account_id: z.string().min(1, "La cuenta financiera es requerida"),
})

type ManualPaymentFormValues = z.infer<typeof manualPaymentSchema>

const paymentMethods = [
  { value: "Transferencia", label: "Transferencia Bancaria" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta Crédito", label: "Tarjeta de Crédito" },
  { value: "Tarjeta Débito", label: "Tarjeta de Débito" },
  { value: "Cheque", label: "Cheque" },
  { value: "MercadoPago", label: "MercadoPago" },
]

interface ManualPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  direction?: "INCOME" | "EXPENSE"
  defaultCurrency?: string
}

export function ManualPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  direction = "INCOME",
  defaultCurrency = "USD",
}: ManualPaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [needsExchangeRate, setNeedsExchangeRate] = useState(false)
  const [financialAccounts, setFinancialAccounts] = useState<Array<{ id: string; name: string; currency: string; current_balance?: number; initial_balance?: number }>>([])

  const form = useForm<ManualPaymentFormValues>({
    resolver: zodResolver(manualPaymentSchema) as any,
    defaultValues: {
      customer_name: "",
      amount: 0,
      currency: defaultCurrency as "ARS" | "USD",
      exchange_rate: undefined,
      method: "Transferencia",
      date_due: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notes: "",
      account_id: "",
    },
  })

  // Obtener moneda actual del formulario
  const formCurrency = form.watch("currency")

  // Cargar cuentas financieras
  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounting/financial-accounts")
        if (response.ok) {
          const data = await response.json()
          setFinancialAccounts((data.accounts || []).filter((acc: any) => acc.is_active))
        }
      } catch (error) {
        console.error("Error loading financial accounts:", error)
      }
    }
    if (open) {
      loadAccounts()
    }
    
    // Escuchar evento para refrescar cuentas después de crear pagos
    const handleRefresh = () => {
      if (open) {
        loadAccounts()
      }
    }
    window.addEventListener("refresh-financial-accounts", handleRefresh)
    return () => {
      window.removeEventListener("refresh-financial-accounts", handleRefresh)
    }
  }, [open])

  useEffect(() => {
    // Si es ARS, siempre requerir tipo de cambio
    setNeedsExchangeRate(formCurrency === "ARS")
    
    if (formCurrency === "ARS" && !form.getValues("exchange_rate")) {
      // Intentar obtener el TC más reciente
      fetch("/api/exchange-rates/latest?fromCurrency=USD&toCurrency=ARS")
        .then(res => res.json())
        .then(data => {
          if (data.rate) {
            form.setValue("exchange_rate", data.rate)
          }
        })
        .catch(() => {})
    }
  }, [formCurrency, form])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        customer_name: "",
        amount: 0,
        currency: defaultCurrency as "ARS" | "USD",
        exchange_rate: undefined,
        method: "Transferencia",
        date_due: format(new Date(), "yyyy-MM-dd"),
        reference: "",
        notes: "",
        account_id: "",
      })
    }
  }, [open, form, defaultCurrency])

  const handleSubmit = async (values: ManualPaymentFormValues) => {
    setLoading(true)
    try {
      // Validar tipo de cambio si es necesario
      if (needsExchangeRate && !values.exchange_rate) {
        toast.error("El tipo de cambio es requerido para pagos en ARS")
        setLoading(false)
        return
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation_id: null, // Pago manual sin operación
          payer_type: direction === "INCOME" ? "CUSTOMER" : "OPERATOR",
          direction,
          method: values.method,
          amount: values.amount,
          currency: values.currency,
          exchange_rate: values.exchange_rate || null,
          date_due: values.date_due,
          status: "PENDING",
          reference: values.reference || null,
          notes: values.notes ? `${values.customer_name}: ${values.notes}` : `Pago manual - ${values.customer_name}`,
          account_id: values.account_id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al crear pago")
      }

      toast.success(direction === "INCOME" ? "Cuenta por cobrar creada exitosamente" : "Deuda a operador creada exitosamente")
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Error creating payment:", error)
      toast.error(error.message || "Error al crear pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {direction === "INCOME" ? "Nueva Cuenta por Cobrar" : "Nueva Deuda a Operador"}
          </DialogTitle>
          <DialogDescription>
            {direction === "INCOME" 
              ? "Agregar una cuenta por cobrar pendiente sin operación asociada."
              : "Agregar una deuda pendiente a operador sin operación asociada."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {direction === "INCOME" ? "Cliente" : "Operador"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={direction === "INCOME" ? "Nombre del cliente" : "Nombre del operador"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {needsExchangeRate && (
              <FormField
                control={form.control}
                name="exchange_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cambio (USD/ARS)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        placeholder="1500.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value && form.getValues("amount") && Number(field.value) > 0
                        ? `Equivale a USD ${(Number(form.getValues("amount")) / Number(field.value)).toFixed(2)}`
                        : "Ingrese el tipo de cambio"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_due"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta Financiera *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {financialAccounts
                        .filter(acc => acc.currency === form.watch("currency"))
                        .map((account) => {
                          const balance = account.current_balance || account.initial_balance || 0
                          return (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.currency}) - {account.currency} {Number(balance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Número de comprobante, factura, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Notas adicionales..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Pago"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
