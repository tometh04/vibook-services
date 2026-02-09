"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Plus, Loader2, Trash2, FileText, Download, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const paymentSchema = z.object({
  payer_type: z.enum(["CUSTOMER", "OPERATOR"]),
  direction: z.enum(["INCOME", "EXPENSE"]),
  method: z.string().min(1, "Método es requerido"),
  amount: z.coerce.number().min(0.01, "Monto debe ser mayor a 0"),
  currency: z.enum(["ARS", "USD"]),
  exchange_rate: z.coerce.number().optional(), // Obligatorio solo para ARS, validado en refinement
  date_paid: z.date({
    required_error: "Fecha de pago es requerida",
  }),
  notes: z.string().optional(),
  account_id: z.string().min(1, "La cuenta financiera es requerida"),
}).refine(
  (data) => {
    // Si la moneda es ARS, el tipo de cambio es obligatorio
    if (data.currency === "ARS") {
      return data.exchange_rate && data.exchange_rate > 0
    }
    return true // Para USD no se requiere tipo de cambio
  },
  {
    message: "Tipo de cambio es obligatorio para pagos en ARS",
    path: ["exchange_rate"],
  }
)

type PaymentFormValues = z.infer<typeof paymentSchema>

const paymentMethods = [
  { value: "Transferencia", label: "Transferencia Bancaria" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta Crédito", label: "Tarjeta de Crédito" },
  { value: "Tarjeta Débito", label: "Tarjeta de Débito" },
  { value: "MercadoPago", label: "MercadoPago" },
  { value: "PayPal", label: "PayPal" },
  { value: "Otro", label: "Otro" },
]

interface OperationPaymentsSectionProps {
  operationId: string
  payments: any[]
  currency: string
  saleAmount: number
  operatorCost: number
}

export function OperationPaymentsSection({
  operationId,
  payments,
  currency,
  saleAmount,
  operatorCost,
}: OperationPaymentsSectionProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null)
  const [financialAccounts, setFinancialAccounts] = useState<Array<{ id: string; name: string; currency: string; current_balance?: number; initial_balance?: number }>>([])
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountType, setNewAccountType] = useState("")

  // Pagos pendientes (los auto-generados que nunca se pagaron)
  const pendingPayments = payments.filter(p => p.status === "PENDING")
  const hasPendingToClean = pendingPayments.length > 0

  const handleDeletePendingPayments = async () => {
    if (!confirm("¿Eliminar todos los pagos pendientes auto-generados? Solo quedarán los pagos realmente registrados.")) {
      return
    }
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/payments/cleanup?operationId=${operationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar pagos")
      }

      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al eliminar pagos pendientes")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("¿Eliminar este pago? También se eliminarán los movimientos contables asociados (libro mayor y caja).")) {
      return
    }
    
    setDeletingPaymentId(paymentId)
    try {
      const response = await fetch(`/api/payments?paymentId=${paymentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar pago")
      }

      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      alert(error instanceof Error ? error.message : "Error al eliminar pago")
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const handleSendReceiptWhatsApp = async (paymentId: string) => {
    setSendingReceiptId(paymentId)
    try {
      const response = await fetch("/api/whatsapp/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al enviar recibo por WhatsApp")
      }

      const data = await response.json()
      
      // Abrir WhatsApp en nueva pestaña
      if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank")
      }
      
      alert("Mensaje WhatsApp creado exitosamente. Se abrirá WhatsApp para enviarlo.")
      router.refresh()
    } catch (error) {
      console.error("Error sending receipt via WhatsApp:", error)
      alert(error instanceof Error ? error.message : "Error al enviar recibo por WhatsApp")
    } finally {
      setSendingReceiptId(null)
    }
  }

  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloadingReceiptId(paymentId)
    try {
      // Obtener datos del recibo desde la API
      const response = await fetch(`/api/receipt-data?paymentId=${paymentId}`)
      
      if (!response.ok) {
        throw new Error("Error al obtener datos del recibo")
      }

      const data = await response.json()

      // Importar jsPDF dinámicamente (solo en cliente)
      const { default: jsPDF } = await import("jspdf")
      
      // Crear PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let y = 0

      const branding = data.branding || {}
      const company = data.company || {}

      const hexToRgb = (hex: string) => {
        const normalized = hex?.replace("#", "")
        if (!normalized || normalized.length !== 6) return null
        const r = parseInt(normalized.slice(0, 2), 16)
        const g = parseInt(normalized.slice(2, 4), 16)
        const b = parseInt(normalized.slice(4, 6), 16)
        return { r, g, b }
      }

      const loadImageAsDataUrl = async (url: string) => {
        try {
          const res = await fetch(url)
          if (!res.ok) return null
          const blob = await res.blob()
          return await new Promise<string | null>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
          })
        } catch {
          return null
        }
      }

      const primaryColor = branding.primaryColor || "#2563EB"
      const accentColor = branding.accentColor || "#22D3EE"
      const primaryRgb = hexToRgb(primaryColor) || { r: 37, g: 99, b: 235 }
      const accentRgb = hexToRgb(accentColor) || { r: 34, g: 211, b: 238 }

      const headerHeight = 28
      doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
      doc.rect(0, 0, pageWidth, headerHeight, "F")
      doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
      doc.rect(0, headerHeight - 3, pageWidth, 3, "F")

      let logoDataUrl: string | null = null
      if (branding.logoUrl) {
        logoDataUrl = await loadImageAsDataUrl(branding.logoUrl)
      }

      doc.setTextColor(255, 255, 255)
      if (logoDataUrl) {
        const format = logoDataUrl.startsWith("data:image/jpeg") || logoDataUrl.startsWith("data:image/jpg")
          ? "JPEG"
          : "PNG"
        doc.addImage(logoDataUrl, format, margin, 5, 18, 18)
      } else {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text(branding.appName || data.agencyName || "Vibook", margin, 17)
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("RECIBO", pageWidth - margin, 12, { align: "right" })
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text(`No ${data.receiptNumber}`, pageWidth - margin, 18, { align: "right" })

      y = headerHeight + 10

      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(company.name || branding.appName || data.agencyName || "Agencia", margin, y)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      let infoY = y + 5
      if (company.taxId) {
        doc.text(`CUIT: ${company.taxId}`, margin, infoY)
        infoY += 4
      }
      const addressLine = [company.addressLine1, company.addressLine2].filter(Boolean).join(" ")
      if (addressLine) {
        doc.text(addressLine, margin, infoY)
        infoY += 4
      }
      const cityLine = [company.city, company.state].filter(Boolean).join(", ")
      const postalLine = company.postalCode ? `CP ${company.postalCode}` : ""
      const locationLine = [cityLine, postalLine, company.country].filter(Boolean).join(" - ")
      if (locationLine) {
        doc.text(locationLine, margin, infoY)
        infoY += 4
      }
      const contactLine = [company.phone, company.email].filter(Boolean).join(" | ")
      if (contactLine) {
        doc.text(contactLine, margin, infoY)
        infoY += 4
      }

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(`${data.agencyCity} ${data.fechaFormateada}`, pageWidth - margin, y, { align: "right" })

      y = Math.max(infoY + 4, y + 14)

      // ========== FECHA Y NUMERO RECIBO ==========
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`${data.agencyCity} ${data.fechaFormateada}`, margin, y)

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(`RECIBO X: No ${data.receiptNumber}`, pageWidth - margin, y, { align: "right" })

      y += 15

      // Línea separadora
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      
      y += 12

      // ========== DATOS DEL CLIENTE ==========
      doc.setFontSize(10)
      
      doc.setFont("helvetica", "bold")
      doc.text("Senor:", margin, y)
      doc.setFont("helvetica", "normal")
      doc.text(data.customerName, margin + 22, y)
      
      y += 8
      
      doc.setFont("helvetica", "bold")
      doc.text("Domicilio:", margin, y)
      doc.setFont("helvetica", "normal")
      doc.text(data.customerAddress || "-", margin + 28, y)
      
      y += 8
      
      doc.setFont("helvetica", "bold")
      doc.text("Localidad:", margin, y)
      doc.setFont("helvetica", "normal")
      doc.text(data.customerCity || "-", margin + 28, y)

      y += 15

      // ========== MONTO RECIBIDO ==========
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(`Recibimos el equivalente a ${data.currencyName}: ${data.amount.toLocaleString("es-AR")}`, margin, y)

      y += 12

      // CONCEPTO
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(data.concepto, margin, y)

      y += 10

      // Moneda recibida
      doc.setFont("helvetica", "bold")
      doc.text("Moneda recibida:", margin, y)
      doc.setFont("helvetica", "normal")
      doc.text(data.currencyName, margin + 42, y)

      y += 20

      // ========== TOTAL ==========
      doc.setLineWidth(0.3)
      doc.line(pageWidth - 85, y, pageWidth - margin, y)
      
      y += 8
      
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("TOTAL", pageWidth - 85, y)
      
      const totalFormatted = `${data.currency} ${data.amount.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
      doc.text(totalFormatted, pageWidth - margin, y, { align: "right" })

      y += 4
      doc.line(pageWidth - 85, y, pageWidth - margin, y)

      // ========== SALDO RESTANTE ==========
      if (data.saldoRestante > 0) {
        y += 15
        doc.setFillColor(255, 243, 205) // Fondo amarillo claro
        doc.rect(margin, y - 5, pageWidth - margin * 2, 18, "F")
        
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(133, 100, 4) // Color dorado oscuro
        doc.text("SALDO PENDIENTE DE PAGO:", margin + 5, y + 3)
        
        doc.setFontSize(12)
        const saldoFormatted = `${data.currency} ${data.saldoRestante.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
        doc.text(saldoFormatted, pageWidth - margin - 5, y + 3, { align: "right" })
        
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text(`(Total operacion: ${data.currency} ${data.totalOperacion.toLocaleString("es-AR")} - Pagado: ${data.currency} ${data.totalPagado.toLocaleString("es-AR")})`, margin + 5, y + 10)
        
        doc.setTextColor(0, 0, 0)
        y += 20
      } else if (data.totalOperacion > 0) {
        y += 15
        doc.setFillColor(209, 250, 229) // Fondo verde claro
        doc.rect(margin, y - 5, pageWidth - margin * 2, 12, "F")
        
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(22, 101, 52) // Verde oscuro
        doc.text("PAGADO EN SU TOTALIDAD", pageWidth / 2, y + 3, { align: "center" })
        
        doc.setTextColor(0, 0, 0)
        y += 15
      }

      y += 15

      // ========== FIRMAS ==========
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      
      doc.line(margin, y, margin + 65, y)
      doc.text("Firma Cliente", margin + 18, y + 6)

      doc.line(pageWidth - margin - 65, y, pageWidth - margin, y)
      doc.text("Firma Agencia", pageWidth - margin - 48, y + 6)

      // ========== FOOTER ==========
      const footerY = pageHeight - 15
      doc.setFontSize(7)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(128, 128, 128)

      const footerMain = [
        company.name || branding.appName || data.agencyName || "Vibook",
        company.addressLine1,
        company.addressLine2,
        company.city,
        company.state,
      ]
        .filter(Boolean)
        .join(" - ")

      const footerContact = [company.phone, company.email].filter(Boolean).join(" | ")

      if (footerMain) {
        doc.text(footerMain, pageWidth / 2, footerY - 5, { align: "center" })
      }
      if (footerContact) {
        doc.text(footerContact, pageWidth / 2, footerY - 1, { align: "center" })
      }
      doc.text(
        "Este recibo es valido como comprobante de pago. No valido como factura.",
        pageWidth / 2,
        footerY + 3,
        { align: "center" }
      )

      // Descargar el PDF
      doc.save(`recibo-${data.receiptNumber}.pdf`)
    } catch (error) {
      console.error("Error:", error)
      alert("Error al descargar el recibo")
    } finally {
      setDownloadingReceiptId(null)
    }
  }

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payer_type: "CUSTOMER",
      direction: "INCOME",
      method: "Transferencia",
      amount: 0,
      currency: currency as "ARS" | "USD",
      exchange_rate: undefined,
      date_paid: new Date(),
      notes: "",
      account_id: "",
    },
  })

  // Cargar cuentas financieras cuando se abre el diálogo (excluyendo cuentas contables)
  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounting/financial-accounts?excludeAccountingOnly=true")
        if (response.ok) {
          const data = await response.json()
          setFinancialAccounts((data.accounts || []).filter((acc: any) => acc.is_active))
        }
      } catch (error) {
        console.error("Error loading financial accounts:", error)
      }
    }
    if (dialogOpen) {
      loadAccounts()
    }
    
    // Escuchar evento para refrescar cuentas después de crear pagos
    const handleRefresh = () => {
      if (dialogOpen) {
        loadAccounts()
      }
    }
    window.addEventListener("refresh-financial-accounts", handleRefresh)
    return () => {
      window.removeEventListener("refresh-financial-accounts", handleRefresh)
    }
  }, [dialogOpen])

  const watchPayerType = form.watch("payer_type")
  const watchCurrency = form.watch("currency")
  const watchAmount = form.watch("amount")
  const watchExchangeRate = form.watch("exchange_rate")
  const availableAccounts = financialAccounts.filter(acc => acc.currency === watchCurrency)
  const hasAvailableAccounts = availableAccounts.length > 0

  const accountTypeOptions = useMemo(() => {
    if (watchCurrency === "USD") {
      return [
        { value: "CASH_USD", label: "Caja efectivo USD" },
        { value: "CHECKING_USD", label: "Cuenta corriente USD" },
        { value: "SAVINGS_USD", label: "Caja de ahorro USD" },
      ]
    }
    return [
      { value: "CASH_ARS", label: "Caja efectivo ARS" },
      { value: "CHECKING_ARS", label: "Cuenta corriente ARS" },
      { value: "SAVINGS_ARS", label: "Caja de ahorro ARS" },
    ]
  }, [watchCurrency])

  const accountTypeLabels = useMemo(() => {
    return accountTypeOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label
      return acc
    }, {})
  }, [accountTypeOptions])

  useEffect(() => {
    if (!accountDialogOpen) return
    const defaultType = accountTypeOptions[0]?.value ?? ""
    setNewAccountType(defaultType)
    setNewAccountName(accountTypeLabels[defaultType] || "")
  }, [accountDialogOpen, accountTypeOptions, accountTypeLabels])

  const handleCreateAccount = async () => {
    if (!newAccountType) {
      toast.error("Seleccioná el tipo de cuenta")
      return
    }

    const name = newAccountName.trim()
    if (!name) {
      toast.error("El nombre de la cuenta es requerido")
      return
    }

    setCreatingAccount(true)
    try {
      const response = await fetch("/api/accounting/financial-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: newAccountType,
          currency: watchCurrency,
          initial_balance: 0,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al crear cuenta financiera")
      }

      const data = await response.json()
      if (data?.account?.id) {
        setFinancialAccounts((prev) => {
          if (prev.some((acc) => acc.id === data.account.id)) {
            return prev
          }
          return [...prev, data.account]
        })
        form.setValue("account_id", data.account.id, { shouldValidate: true })
      }

      window.dispatchEvent(new CustomEvent("refresh-financial-accounts"))
      toast.success("Cuenta financiera creada")
      setAccountDialogOpen(false)
    } catch (error: any) {
      console.error("Error creating financial account:", error)
      toast.error(error?.message || "Error al crear cuenta financiera")
    } finally {
      setCreatingAccount(false)
    }
  }

  // Calcular equivalente en USD
  const calculatedUSD = watchCurrency === "ARS" && watchAmount > 0 && watchExchangeRate && watchExchangeRate > 0
    ? (Number(watchAmount) / Number(watchExchangeRate)).toFixed(2)
    : watchCurrency === "USD" && watchAmount 
      ? Number(watchAmount).toFixed(2) 
      : null

  // Calcular totales
  const customerPayments = payments.filter(p => p.payer_type === "CUSTOMER" && p.status === "PAID")
  const operatorPayments = payments.filter(p => p.payer_type === "OPERATOR" && p.status === "PAID")

  // IMPORTANTE: Usar amount_usd si está disponible para manejar correctamente pagos en ARS
  const totalPaidByCustomer = customerPayments.reduce((sum, p) => {
    if (p.amount_usd != null) {
      return sum + Number(p.amount_usd)
    }
    if (p.currency === "USD") {
      return sum + Number(p.amount)
    }
    if (p.currency === "ARS" && p.exchange_rate) {
      return sum + (Number(p.amount) / Number(p.exchange_rate))
    }
    return sum + Number(p.amount) // Fallback
  }, 0)

  const totalPaidToOperator = operatorPayments.reduce((sum, p) => {
    if (p.amount_usd != null) {
      return sum + Number(p.amount_usd)
    }
    if (p.currency === "USD") {
      return sum + Number(p.amount)
    }
    if (p.currency === "ARS" && p.exchange_rate) {
      return sum + (Number(p.amount) / Number(p.exchange_rate))
    }
    return sum + Number(p.amount) // Fallback
  }, 0)

  const customerDebt = saleAmount - totalPaidByCustomer
  const operatorDebt = operatorCost - totalPaidToOperator

  const onSubmit = async (values: PaymentFormValues) => {
    setIsLoading(true)
    try {
      // Calcular amount_usd
      let amountUsd: number
      if (values.currency === "USD") {
        // Para USD, el amount_usd es igual al amount (el sistema trabaja en USD)
        amountUsd = values.amount
      } else {
        // ARS: convertir usando exchange_rate
        amountUsd = values.exchange_rate && values.exchange_rate > 0 
          ? values.amount / values.exchange_rate 
          : 0
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          operation_id: operationId,
          ...values,
          exchange_rate: values.currency === "ARS" ? values.exchange_rate : null, // Solo enviar exchange_rate para ARS
          amount_usd: amountUsd,
          date_paid: values.date_paid.toISOString().split("T")[0],
          date_due: values.date_paid.toISOString().split("T")[0], // Pago ya realizado
          status: "PAID", // PAID para crear también movimientos en RESULTADO
          account_id: values.account_id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al registrar pago")
      }

      const result = await response.json()
      
      // Si hay un warning, mostrarlo pero no fallar
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success("Pago registrado exitosamente")
      }

      setDialogOpen(false)
      form.reset()
      // Refrescar cuentas financieras para actualizar saldos
      window.dispatchEvent(new CustomEvent("refresh-financial-accounts"))
      router.refresh()
    } catch (error) {
      console.error("Error registering payment:", error)
      alert(error instanceof Error ? error.message : "Error al registrar pago")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        {/* Deuda del cliente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currency} {customerDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagado: {currency} {totalPaidByCustomer.toLocaleString("es-AR", { minimumFractionDigits: 2 })} 
              {" / "} Total: {currency} {saleAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            {customerDebt <= 0 && (
              <Badge className="mt-2 bg-green-600">Pagado completo</Badge>
            )}
          </CardContent>
        </Card>

        {/* Deuda a operador */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendiente a Operador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currency} {operatorDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagado: {currency} {totalPaidToOperator.toLocaleString("es-AR", { minimumFractionDigits: 2 })} 
              {" / "} Total: {currency} {operatorCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            {operatorDebt <= 0 && (
              <Badge className="mt-2 bg-green-600">Pagado completo</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historial de Pagos</CardTitle>
          <div className="flex gap-2">
            {hasPendingToClean && (
              <Button 
                onClick={handleDeletePendingPayments} 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:text-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Limpiar auto-generados
              </Button>
            )}
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay pagos registrados. Usa el botón &quot;Registrar Pago&quot; cuando recibas un pago del cliente o pagues al operador.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {(() => {
                        try {
                          const d = payment.date_paid || payment.date_due
                          if (!d) return "-"
                          return format(new Date(d), "dd/MM/yyyy", { locale: es })
                        } catch { return "-" }
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.direction === "INCOME" ? "default" : "destructive"}>
                          {payment.direction === "INCOME" ? "Ingreso" : "Egreso"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {payment.payer_type === "CUSTOMER" ? "Cliente" : "Operador"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.method || "Transferencia"}
                      {payment.financial_accounts?.name && ` - ${payment.financial_accounts.name}`}
                    </TableCell>
                    <TableCell>
                      <div>
                        {payment.currency} {Number(payment.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        {payment.currency === "ARS" && payment.amount_usd && (
                          <div className="text-xs text-muted-foreground">
                            ≈ USD {Number(payment.amount_usd).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.status === "PAID" ? "default" : "secondary"}>
                        {payment.status === "PAID" ? "Pagado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botón de recibo - solo para pagos pagados */}
                        {payment.status === "PAID" && payment.direction === "INCOME" && payment.payer_type === "CUSTOMER" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                              onClick={() => handleDownloadReceipt(payment.id)}
                              disabled={downloadingReceiptId === payment.id}
                              title="Descargar recibo PDF"
                            >
                              {downloadingReceiptId === payment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleSendReceiptWhatsApp(payment.id)}
                              disabled={sendingReceiptId === payment.id}
                              title="Enviar recibo por WhatsApp"
                            >
                              {sendingReceiptId === payment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                        {/* Botón de eliminar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={deletingPaymentId === payment.id}
                          title="Eliminar pago"
                        >
                          {deletingPaymentId === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar pago */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registra un pago recibido del cliente o realizado al operador.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="payer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Pago</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue("direction", value === "CUSTOMER" ? "INCOME" : "EXPENSE")
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Pago del Cliente (Ingreso)</SelectItem>
                        <SelectItem value="OPERATOR">Pago a Operador (Egreso)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* Campo de tipo de cambio - Solo para ARS */}
              {watchCurrency === "ARS" && (
                <FormField
                  control={form.control}
                  name="exchange_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cambio (ARS/USD) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="Ej: 1050.00"
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                      {calculatedUSD && (
                        <p className="text-sm text-muted-foreground">
                          Equivalente: <span className="font-semibold text-green-600">USD {calculatedUSD}</span>
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}

              {/* Mostrar equivalente USD para pagos en USD */}
              {watchCurrency === "USD" && watchAmount > 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  Monto en USD: <span className="font-semibold">USD {Number(watchAmount).toFixed(2)}</span>
                </div>
              )}

              <FormField
                control={form.control}
                name="date_paid"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha del Pago</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <div className="flex gap-2">
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
                          {availableAccounts.map((account) => {
                              const balance = account.current_balance || account.initial_balance || 0
                              return (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} ({account.currency}) - {account.currency} {Number(balance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </SelectItem>
                              )
                            })}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Crear cuenta financiera"
                        onClick={() => setAccountDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {!hasAvailableAccounts && (
                      <div className="mt-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-3">
                        <p className="text-sm text-destructive">
                          No tenés cuentas financieras en {watchCurrency}. Podés crear una ahora mismo desde acá.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setAccountDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Crear cuenta en {watchCurrency}
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear cuenta financiera</DialogTitle>
                    <DialogDescription>
                      Necesitás una cuenta en {watchCurrency} para registrar el pago.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>Tipo de cuenta</FormLabel>
                      <Select
                        value={newAccountType}
                        onValueChange={(value) => {
                          setNewAccountType(value)
                          if (!newAccountName.trim()) {
                            setNewAccountName(accountTypeLabels[value] || "")
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Nombre</FormLabel>
                      <Input
                        value={newAccountName}
                        onChange={(event) => setNewAccountName(event.target.value)}
                        placeholder="Ej: Caja principal"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleCreateAccount} disabled={creatingAccount}>
                      {creatingAccount ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear cuenta"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Referencia, comprobante, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !hasAvailableAccounts}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar Pago"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
