"use client"

import { useState, useEffect, useCallback } from "react"
import * as React from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2, AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NewCustomerDialog } from "@/components/customers/new-customer-dialog"

// Configuración de operaciones
interface OperationSettings {
  require_destination: boolean
  require_departure_date: boolean
  require_operator: boolean
  require_customer: boolean
  default_status: string
  custom_statuses: Array<{ value: string; label: string; color: string }>
}

const operatorSchema = z.object({
  operator_id: z.string().min(1, "El operador es requerido"),
  cost: z.coerce.number().min(0, "El costo debe ser mayor o igual a 0"),
  cost_currency: z.enum(["ARS", "USD"]).default("ARS").optional(),
  notes: z.string().optional(),
})

// Esquema base - las validaciones dinámicas se hacen en el backend
const operationSchema = z.object({
  agency_id: z.string().min(1, "La agencia es requerida"),
  seller_id: z.string().min(1, "El vendedor es requerido"),
  seller_secondary_id: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(), // ← NUEVO
  operator_id: z.string().optional().nullable(),
  operators: z.array(operatorSchema).optional(),
  type: z.enum(["FLIGHT", "HOTEL", "PACKAGE", "CRUISE", "TRANSFER", "MIXED"]),
  product_type: z.enum(["AEREO", "HOTEL", "PAQUETE", "CRUCERO", "OTRO"]).optional().nullable(),
  origin: z.string().optional(),
  destination: z.string().optional(), // Validación dinámica en backend
  departure_date: z.date().optional(), // Validación dinámica en backend
  return_date: z.date().optional().nullable(),
  adults: z.coerce.number().min(1, "Debe haber al menos 1 adulto"),
  children: z.coerce.number().min(0).default(0).optional(),
  infants: z.coerce.number().min(0).default(0).optional(),
  status: z.string(), // Puede incluir estados personalizados
  sale_amount_total: z.coerce.number().min(0, "El monto debe ser mayor a 0"),
  operator_cost: z.coerce.number().min(0, "El costo debe ser mayor a 0").optional(),
  currency: z.enum(["ARS", "USD"]).default("ARS").optional(),
  sale_currency: z.enum(["ARS", "USD"]).default("ARS").optional(),
  operator_cost_currency: z.enum(["ARS", "USD"]).default("ARS").optional(),
  notes: z.string().optional().nullable(),
  // Códigos de reserva (opcionales)
  reservation_code_air: z.string().optional().nullable(),
  reservation_code_hotel: z.string().optional().nullable(),
})

type OperationFormValues = z.infer<typeof operationSchema>

const operationTypeOptions = [
  { value: "FLIGHT", label: "Vuelo" },
  { value: "HOTEL", label: "Hotel" },
  { value: "PACKAGE", label: "Paquete" },
  { value: "CRUISE", label: "Crucero" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "MIXED", label: "Mixto" },
]

interface LeadData {
  id: string
  contact_name: string
  contact_email?: string | null
  contact_phone?: string | null
  destination: string
  agency_id?: string
  assigned_seller_id?: string | null
  notes?: string | null
}

interface NewOperationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  agencies: Array<{ id: string; name: string }>
  sellers: Array<{ id: string; name: string }>
  operators: Array<{ id: string; name: string }>
  defaultAgencyId?: string
  defaultSellerId?: string
  lead?: LeadData // Lead opcional para precargar datos
}

export function NewOperationDialog({
  open,
  onOpenChange,
  onSuccess,
  agencies,
  sellers,
  operators,
  defaultAgencyId,
  defaultSellerId,
  lead,
}: NewOperationDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [useMultipleOperators, setUseMultipleOperators] = useState(false)
  const [operatorList, setOperatorList] = useState<Array<{operator_id: string, cost: number, cost_currency: "ARS" | "USD", notes?: string}>>([])
  const [settings, setSettings] = useState<OperationSettings | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  
  // Estado para crear nuevo operador
  const [showNewOperatorDialog, setShowNewOperatorDialog] = useState(false)
  const [newOperatorName, setNewOperatorName] = useState("")
  const [newOperatorEmail, setNewOperatorEmail] = useState("")
  const [creatingOperator, setCreatingOperator] = useState(false)
  const [localOperators, setLocalOperators] = useState(operators)

  // Estado para clientes
  const [customers, setCustomers] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")

  // Estados para prevenir cierre accidental
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Sincronizar operadores cuando cambian
  useEffect(() => {
    setLocalOperators(operators)
  }, [operators])

  // Función para limpiar destino (copiada de convert-lead-dialog)
  const cleanDestination = useCallback((destination: string): string => {
    if (!destination) return ""
    const destLower = destination.toLowerCase().trim()
    const leadStatusKeywords = [
      "presupuesto", "enviado", "nuevo", "contactado", "calificado",
      "negociacion", "negociación", "ganado", "perdido", "pendiente",
      "seguimiento", "cerrado", "cancelado", "won", "lost", "new",
      "contacted", "qualified", "negotiation", "closed"
    ]
    for (const status of leadStatusKeywords) {
      if (destLower.includes(status)) return ""
    }
    const invalidPatterns = [/^@/, /@.*\.com$/, /^[a-z0-9_]+$/, /^\d+$/]
    for (const pattern of invalidPatterns) {
      if (pattern.test(destLower)) return ""
    }
    if (destination.length < 3 || destination.length > 50) return ""
    if (/\d/.test(destination) || /[^a-záéíóúüñ\s]/i.test(destination)) return ""
    return destination
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/operations/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading operation settings:', error)
    }
  }

  // Función para cargar clientes
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      const response = await fetch('/api/customers?limit=200', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('Error loading customers:', response.status, errorData)
        toast({
          title: "Error al cargar clientes",
          description: errorData.error || `Error ${response.status}: ${response.statusText}`,
          variant: "destructive",
        })
        setCustomers([])
        return
      }
      
      const data = await response.json()
      const customersList = (data.customers || []).map((c: any) => ({
        id: c.id,
        first_name: c.first_name || '',
        last_name: c.last_name || '',
      }))
      
      setCustomers(customersList)
      console.log(`[NewOperationDialog] Loaded ${customersList.length} customers`)
    } catch (error) {
      console.error('Error loading customers:', error)
      toast({
        title: "Error al cargar clientes",
        description: error instanceof Error ? error.message : "Error desconocido al cargar clientes",
        variant: "destructive",
      })
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }, [toast])

  // Estados disponibles (estándar + personalizados)
  const availableStatuses = React.useMemo(() => {
    const standard = [
      { value: "PRE_RESERVATION", label: "Pre-reserva" },
      { value: "RESERVED", label: "Reservado" },
      { value: "CONFIRMED", label: "Confirmado" },
      { value: "CANCELLED", label: "Cancelado" },
      { value: "TRAVELLED", label: "Viajado" },
      { value: "CLOSED", label: "Cerrado" },
    ]
    if (settings?.custom_statuses && settings.custom_statuses.length > 0) {
      return [...standard, ...settings.custom_statuses.map(s => ({ value: s.value, label: s.label }))]
    }
    return standard
  }, [settings])

  const form = useForm<OperationFormValues>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      agency_id: defaultAgencyId || "",
      seller_id: defaultSellerId || "",
      operator_id: null,
      seller_secondary_id: null,
      customer_id: null, // ← NUEVO
      type: "PACKAGE",
      product_type: null,
      origin: "",
      destination: "",
      departure_date: undefined,
      return_date: undefined,
      adults: 2,
      children: 0,
      infants: 0,
      status: settings?.default_status || "PRE_RESERVATION",
      sale_amount_total: 0,
      operator_cost: 0,
      currency: "ARS",
      sale_currency: "ARS",
      operator_cost_currency: "ARS",
      operators: [],
      notes: null,
      // Códigos de reserva
      reservation_code_air: null,
      reservation_code_hotel: null,
    },
  })

  // Función para precargar datos del lead
  const handleLeadPreload = useCallback(async () => {
    if (!lead) return
    
    try {
      // Buscar cliente existente por email o teléfono
      let customerId: string | null = null
      
      if (lead.contact_email || lead.contact_phone) {
        const searchParams = new URLSearchParams()
        if (lead.contact_email) searchParams.append('email', lead.contact_email)
        if (lead.contact_phone) searchParams.append('phone', lead.contact_phone)
        
        const response = await fetch(`/api/customers?${searchParams.toString()}&limit=1`)
        if (response.ok) {
          const data = await response.json()
          if (data.customers && data.customers.length > 0) {
            customerId = data.customers[0].id
          }
        }
      }
      
      // Si no existe, crear cliente con datos del lead
      if (!customerId) {
        const nameParts = (lead.contact_name || "").trim().split(" ")
        const firstName = nameParts[0] || "Sin nombre"
        const lastName = nameParts.slice(1).join(" ") || "-"
        
        const createResponse = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            phone: lead.contact_phone || "",
            email: lead.contact_email || "",
          }),
        })
        
        if (createResponse.ok) {
          const newCustomer = await createResponse.json()
          customerId = newCustomer.customer?.id || newCustomer.id
          // Agregar a la lista local
          if (customerId) {
            setCustomers(prev => [...prev, {
              id: customerId!,
              first_name: firstName,
              last_name: lastName,
            }])
          }
        }
      }
      
      // Precargar campos del formulario
      if (lead.agency_id) form.setValue("agency_id", lead.agency_id)
      if (lead.assigned_seller_id) form.setValue("seller_id", lead.assigned_seller_id)
      if (customerId) form.setValue("customer_id", customerId)
      if (lead.destination) {
        // Limpiar destino si no es válido
        const cleanedDest = cleanDestination(lead.destination)
        if (cleanedDest) form.setValue("destination", cleanedDest)
      }
      if (lead.notes) form.setValue("notes", lead.notes)
      
    } catch (error) {
      console.error("Error precargando datos del lead:", error)
    }
  }, [lead, form, cleanDestination])

  // Actualizar estado por defecto cuando se carga la configuración
  useEffect(() => {
    if (settings?.default_status) {
      form.setValue('status', settings.default_status)
    }
  }, [settings, form])

  // Cargar configuración de operaciones
  useEffect(() => {
    if (open) {
      loadSettings()
      loadCustomers()
      
      // Si hay un lead, buscar o crear cliente y precargar datos
      if (lead) {
        handleLeadPreload()
      }
    }
  }, [open, lead, handleLeadPreload, loadCustomers])

  // Calcular costo total de operadores
  const totalOperatorCost = operatorList.reduce((sum, op) => sum + (op.cost || 0), 0)
  const saleAmount = form.watch("sale_amount_total")
  const calculatedMargin = saleAmount - totalOperatorCost
  const calculatedMarginPercent = saleAmount > 0 ? (calculatedMargin / saleAmount) * 100 : 0

  // Actualizar operator_cost cuando cambia la lista de operadores
  React.useEffect(() => {
    if (useMultipleOperators && operatorList.length > 0) {
      form.setValue("operator_cost", totalOperatorCost)
      // Asegurar que cost_currency tenga un valor por defecto
      const operatorsWithDefaults = operatorList.map(op => ({
        ...op,
        cost_currency: (op.cost_currency || "ARS") as "ARS" | "USD"
      }))
      form.setValue("operators", operatorsWithDefaults)
    } else if (!useMultipleOperators) {
      form.setValue("operators", undefined)
    }
  }, [operatorList, useMultipleOperators, totalOperatorCost, form])

  const addOperator = () => {
    setOperatorList([...operatorList, { operator_id: "", cost: 0, cost_currency: "ARS" }])
  }

  const removeOperator = (index: number) => {
    setOperatorList(operatorList.filter((_, i) => i !== index))
  }

  const updateOperator = (index: number, field: string, value: any) => {
    const updated = [...operatorList]
    updated[index] = { ...updated[index], [field]: value }
    setOperatorList(updated)
  }

  // Función para crear nuevo operador
  const handleCreateOperator = async () => {
    if (!newOperatorName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del operador es requerido",
        variant: "destructive",
      })
      return
    }

    setCreatingOperator(true)
    try {
      const response = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOperatorName.trim(),
          contact_email: newOperatorEmail.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al crear operador")
      }

      const data = await response.json()
      const newOperator = data.operator || data

      // Agregar a la lista local y seleccionarlo
      setLocalOperators(prev => [...prev, newOperator])
      form.setValue("operator_id", newOperator.id)
      
      toast({
        title: "Operador creado",
        description: `${newOperator.name} ha sido creado exitosamente`,
      })

      // Limpiar y cerrar
      setNewOperatorName("")
      setNewOperatorEmail("")
      setShowNewOperatorDialog(false)
    } catch (error) {
      console.error("Error creating operator:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear operador",
        variant: "destructive",
      })
    } finally {
      setCreatingOperator(false)
    }
  }

  const onSubmit = async (values: OperationFormValues) => {
    setIsLoading(true)
    setApiError(null)
    try {
      // Si se usan múltiples operadores, enviar el array; si no, usar formato antiguo
      const requestBody: any = {
        ...values,
        lead_id: lead?.id || null, // Incluir lead_id si viene de un lead
        operator_id: useMultipleOperators ? null : (values.operator_id || null),
        operators: useMultipleOperators && operatorList.length > 0 ? operatorList : undefined,
        seller_secondary_id: values.seller_secondary_id || null,
        customer_id: values.customer_id || null,
        origin: values.origin || null,
        product_type: values.product_type || null,
        return_date: values.return_date ? values.return_date.toISOString().split("T")[0] : null,
        departure_date: values.departure_date ? values.departure_date.toISOString().split("T")[0] : null,
        sale_currency: values.sale_currency || values.currency || "ARS",
        operator_cost_currency: values.operator_cost_currency || values.currency || "ARS",
        // Si hay múltiples operadores, el costo total ya está calculado en operator_cost
        operator_cost: useMultipleOperators ? totalOperatorCost : (values.operator_cost || 0),
        notes: values.notes || null,
        // Códigos de reserva
        reservation_code_air: values.reservation_code_air || null,
        reservation_code_hotel: values.reservation_code_hotel || null,
      }

      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorMessage = "Error al crear operación"
        let detail: string | undefined
        try {
          const err = await response.json()
          errorMessage = err?.error || errorMessage
          detail = err?.detail || err?.hint
        } catch {
          errorMessage = response.status === 400 ? "Datos inválidos. Revisá agencia, vendedor, fechas y cliente (si es obligatorio)." : errorMessage
        }
        const fullMessage = detail ? `${errorMessage}. ${detail}` : errorMessage
        setApiError(fullMessage)
        toast({
          title: response.status === 500 ? "Error del servidor" : "Error de validación",
          description: fullMessage,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Operación creada",
        description: "La operación se ha creado correctamente",
      })
      onSuccess()
      onOpenChange(false)
      form.reset()
      setOperatorList([])
      setUseMultipleOperators(false)
      setApiError(null)
    } catch (error) {
      console.error("Error creating operation:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al crear operación"
      setApiError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para cierre con confirmación
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      setShowCloseConfirm(true)
    } else {
      if (!newOpen) {
        setApiError(null)
        form.reset()
        setOperatorList([])
        setUseMultipleOperators(false)
      }
      onOpenChange(newOpen)
    }
  }

  // Confirmar cierre
  const confirmClose = () => {
    setShowCloseConfirm(false)
    setApiError(null)
    form.reset()
    setOperatorList([])
    setUseMultipleOperators(false)
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (form.formState.isDirty) {
            e.preventDefault()
            setShowCloseConfirm(true)
          }
        }}
        onPointerDownOutside={(e) => {
          if (form.formState.isDirty) {
            e.preventDefault()
            setShowCloseConfirm(true)
          }
        }}
        onInteractOutside={(e) => {
          e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{lead ? "Convertir Lead a Operación" : "Nueva Operación"}</DialogTitle>
          <DialogDescription>
            {lead 
              ? `Crear una nueva operación desde el lead de ${lead.contact_name}`
              : "Crear una nueva operación manualmente"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Mostrar error del API */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {/* Indicadores de campos requeridos según configuración */}
        {settings && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            <span className="font-medium">Campos requeridos:</span>{" "}
            {settings.require_destination && <span className="mr-2">• Destino</span>}
            {settings.require_departure_date && <span className="mr-2">• Fecha de salida</span>}
            {settings.require_operator && <span className="mr-2">• Operador</span>}
            {settings.require_customer && <span className="mr-2">• Cliente</span>}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="agency_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agencia *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar agencia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agency.name}
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
                name="seller_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor Principal *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vendedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => {
                  const selectedCustomer = customers.find(c => c.id === field.value)
                  const filteredCustomers = customerSearchQuery
                    ? customers.filter(c => 
                        `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearchQuery.toLowerCase())
                      )
                    : customers
                  const displayCustomers = filteredCustomers.slice(0, 5)
                  
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente</FormLabel>
                      <div className="flex gap-2">
                        <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between flex-1",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {selectedCustomer
                                  ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                                  : "Seleccionar cliente"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Buscar cliente..." 
                                value={customerSearchQuery}
                                onValueChange={setCustomerSearchQuery}
                              />
                              <CommandList className="max-h-[200px]">
                                {loadingCustomers ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                                    Cargando clientes...
                                  </div>
                                ) : customers.length === 0 ? (
                                  <CommandEmpty>
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                      {customerSearchQuery ? "No se encontraron clientes con ese criterio" : "No hay clientes disponibles. Usa el botón + para crear uno nuevo."}
                                    </div>
                                  </CommandEmpty>
                                ) : displayCustomers.length === 0 ? (
                                  <CommandEmpty>
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                      No se encontraron clientes que coincidan con &quot;{customerSearchQuery}&quot;
                                    </div>
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {displayCustomers.map((customer) => (
                                      <CommandItem
                                        key={customer.id}
                                        value={`${customer.first_name} ${customer.last_name}`}
                                        onSelect={() => {
                                          field.onChange(customer.id)
                                          setCustomerSearchOpen(false)
                                          setCustomerSearchQuery("")
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === customer.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {customer.first_name} {customer.last_name}
                                      </CommandItem>
                                    ))}
                                    {filteredCustomers.length > 5 && (
                                      <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                                        Mostrando 5 de {filteredCustomers.length} clientes. Usa la búsqueda para filtrar.
                                      </div>
                                    )}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowNewCustomerDialog(true)}
                          title="Crear nuevo cliente"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <FormField
                control={form.control}
                name="seller_secondary_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor Secundario</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin vendedor secundario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin vendedor secundario</SelectItem>
                        {sellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Toggle entre operador único y múltiples operadores */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="useMultipleOperators"
                checked={useMultipleOperators}
                onChange={(e) => {
                  setUseMultipleOperators(e.target.checked)
                  if (!e.target.checked) {
                    setOperatorList([])
                    form.setValue("operators", undefined)
                  }
                }}
                className="rounded"
              />
              <label htmlFor="useMultipleOperators" className="text-sm font-medium cursor-pointer">
                Usar múltiples operadores
              </label>
            </div>

            {useMultipleOperators ? (
              <div className="space-y-4 border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Operadores</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOperator}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Operador
                  </Button>
                </div>

                {operatorList.map((op, index) => (
                  <div key={index} className="grid gap-4 md:grid-cols-4 items-end border-b pb-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Operador</label>
                      <div className="flex gap-1">
                        <Select
                          value={op.operator_id}
                          onValueChange={(value) => updateOperator(index, "operator_id", value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar operador" />
                          </SelectTrigger>
                          <SelectContent>
                            {localOperators.map((operator) => (
                              <SelectItem key={operator.id} value={operator.id}>
                                {operator.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setShowNewOperatorDialog(true)}
                          title="Crear nuevo operador"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Costo</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={op.cost || 0}
                        onChange={(e) => updateOperator(index, "cost", Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Moneda</label>
                      <Select
                        value={op.cost_currency}
                        onValueChange={(value) => updateOperator(index, "cost_currency", value as "ARS" | "USD")}
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

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOperator(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {operatorList.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Costo Total de Operadores:</span>
                      <span className="font-bold">{form.watch("currency") || "ARS"} {totalOperatorCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="font-medium">Margen Calculado:</span>
                      <span className={`font-bold ${calculatedMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {form.watch("sale_currency") || form.watch("currency") || "ARS"} {calculatedMargin.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ({calculatedMarginPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}

                {operatorList.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Agrega al menos un operador para continuar
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="operator_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operador {settings?.require_operator && <span className="text-red-500">*</span>}</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Sin operador" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sin operador</SelectItem>
                            {localOperators.map((operator) => (
                              <SelectItem key={operator.id} value={operator.id}>
                                {operator.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowNewOperatorDialog(true)}
                          title="Crear nuevo operador"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {operationTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origen</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad de origen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad de destino" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="departure_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Salida *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="return_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Regreso</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => {
                            const dep = form.watch("departure_date")
                            if (!dep) return false
                            return startOfDay(date) < startOfDay(dep)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="adults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adultos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="children"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niños</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="infants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bebés</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRE_RESERVATION">Pre-reserva</SelectItem>
                        <SelectItem value="RESERVED">Reservado</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        <SelectItem value="TRAVELLED">Viajado</SelectItem>
                        <SelectItem value="CLOSED">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda (Compatibilidad)</FormLabel>
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

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-4">Monedas Separadas</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sale_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda de Venta</FormLabel>
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

                <FormField
                  control={form.control}
                  name="operator_cost_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda de Costo de Operador</FormLabel>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sale_amount_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto de Venta Total *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!useMultipleOperators && (
                <FormField
                  control={form.control}
                  name="operator_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Operador *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {useMultipleOperators && (
                <div className="flex items-end">
                  <div className="w-full">
                    <label className="text-sm font-medium mb-1 block">Costo Total (Calculado)</label>
                    <Input
                      type="text"
                      value={totalOperatorCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Suma automática de todos los operadores
                    </p>
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Observaciones adicionales..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Códigos de Reserva */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-4">Códigos de Reserva (opcional)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reservation_code_air"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Reserva Aéreo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: ABC123" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reservation_code_hotel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Reserva Hotel</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: HOTEL-456" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Operación"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Diálogo para crear nuevo operador */}
      <Dialog open={showNewOperatorDialog} onOpenChange={setShowNewOperatorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Operador</DialogTitle>
            <DialogDescription>
              Crea un nuevo operador/proveedor para asignarlo a esta operación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-operator-name">Nombre del operador *</Label>
              <Input
                id="new-operator-name"
                placeholder="Ej: Despegar, Booking, etc."
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-operator-email">Email (opcional)</Label>
              <Input
                id="new-operator-email"
                type="email"
                placeholder="contacto@operador.com"
                value={newOperatorEmail}
                onChange={(e) => setNewOperatorEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewOperatorDialog(false)
                setNewOperatorName("")
                setNewOperatorEmail("")
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateOperator}
              disabled={creatingOperator || !newOperatorName.trim()}
            >
              {creatingOperator ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Operador"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear nuevo cliente */}
      <NewCustomerDialog
        open={showNewCustomerDialog}
        onOpenChange={setShowNewCustomerDialog}
        onSuccess={(customer) => {
          if (customer) {
            // Agregar el nuevo cliente a la lista y seleccionarlo
            setCustomers((prev) => [...prev, { id: customer.id, first_name: customer.first_name, last_name: customer.last_name }])
            form.setValue("customer_id", customer.id)
          }
        }}
      />
    </Dialog>

    {/* Confirmación de cierre */}
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro que quieres cerrar?</AlertDialogTitle>
          <AlertDialogDescription>
            Perderás todos los cambios no guardados. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Cerrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

