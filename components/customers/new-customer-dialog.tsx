"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Upload, CheckCircle2 } from "lucide-react"
import { useCustomerSettings } from "@/hooks/use-customer-settings"
import { CustomFieldsForm } from "./custom-fields-form"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"

interface NewCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (customer?: any) => void
}

const documentTypes = [
  { value: "DNI", label: "DNI" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "CUIT", label: "CUIT" },
  { value: "OTHER", label: "Otro" },
]

const nationalities = [
  { value: "Argentina", label: "Argentina" },
  { value: "Brasil", label: "Brasil" },
  { value: "Chile", label: "Chile" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Paraguay", label: "Paraguay" },
  { value: "Colombia", label: "Colombia" },
  { value: "México", label: "México" },
  { value: "España", label: "España" },
  { value: "Estados Unidos", label: "Estados Unidos" },
  { value: "Otro", label: "Otro" },
]

export function NewCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewCustomerDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { settings, loading: settingsLoading } = useCustomerSettings()
  
  // Estados para OCR
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [ocrSuccess, setOcrSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados para prevenir cierre accidental
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Generar schema dinámicamente según configuración
  const customerSchema = useMemo(() => {
    // Schema base - email ahora es opcional por defecto
    // document_type y document_number son obligatorios
    const baseFields: Record<string, z.ZodTypeAny> = {
      first_name: z.string().min(1, "Nombre es requerido"),
      last_name: z.string().min(1, "Apellido es requerido"),
      phone: z.string().min(1, "Teléfono es requerido"),
      email: z.string().email("Email inválido").optional().or(z.literal("")),
      instagram_handle: z.string().optional(),
      document_type: z.string().min(1, "Tipo de documento es requerido"),
      document_number: z.string().min(1, "Número de documento es requerido"),
      procedure_number: z.string().optional(),
      date_of_birth: z.string().optional(),
      nationality: z.string().optional(),
    }

    // Aplicar validaciones de configuración
    if (settings?.validations) {
      const validations = settings.validations
      
      if (validations.email?.required) {
        baseFields.email = z.string().min(1, "Email es requerido").email("Email inválido")
      }
      
      if (validations.phone?.required) {
        baseFields.phone = z.string().min(1, "Teléfono es requerido")
      }
    }

    // Agregar campos personalizados al schema
    if (settings?.custom_fields) {
      settings.custom_fields.forEach((field) => {
        let fieldSchema: z.ZodTypeAny
        
        switch (field.type) {
          case 'number':
            fieldSchema = field.required 
              ? z.number({ required_error: `${field.label} es requerido` })
              : z.number().optional()
            break
          case 'email':
            fieldSchema = field.required
              ? z.string().min(1, `${field.label} es requerido`).email(`${field.label} inválido`)
              : z.string().email(`${field.label} inválido`).optional()
            break
          default:
            fieldSchema = field.required
              ? z.string().min(1, `${field.label} es requerido`)
              : z.string().optional()
        }
        
        baseFields[field.name] = fieldSchema
      })
    }

    return z.object(baseFields)
  }, [settings])

  type CustomerFormValues = z.infer<typeof customerSchema>

  // Generar valores por defecto incluyendo campos personalizados
  const defaultValues = useMemo(() => {
    const baseDefaults: any = {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      instagram_handle: "",
      document_type: "",
      document_number: "",
      procedure_number: "",
      date_of_birth: "",
      nationality: "",
    }

    // Agregar valores por defecto de campos personalizados
    if (settings?.custom_fields) {
      settings.custom_fields.forEach((field) => {
        baseDefaults[field.name] = field.default_value || (field.type === 'number' ? undefined : '')
      })
    }

    return baseDefaults
  }, [settings])

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })

  // Actualizar valores por defecto cuando cambia la configuración
  useEffect(() => {
    if (settings && !settingsLoading) {
      form.reset(defaultValues)
    }
  }, [settings, settingsLoading, defaultValues, form])

  // Reset OCR states when dialog opens
  useEffect(() => {
    if (open) {
      setUploadedFile(null)
      setOcrSuccess(false)
    }
  }, [open])

  // Función para procesar documento con OCR
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingOCR(true)
    setUploadedFile(file)
    setOcrSuccess(false)

    try {
      const formData = new FormData()
      formData.append("file", file)
      
      // Detectar tipo de documento por nombre de archivo
      const docType = file.name.toLowerCase().includes("passport") ? "PASSPORT" : "DNI"
      formData.append("type", docType)

      const response = await fetch("/api/documents/ocr-only", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.extractedData) {
        const extracted = data.extractedData
        const opts = { shouldDirty: true }
        
        // Autocompletar campos del formulario (shouldDirty para que el cierre outside pida confirmación)
        if (extracted.first_name) {
          form.setValue("first_name", extracted.first_name, opts)
        }
        if (extracted.last_name) {
          form.setValue("last_name", extracted.last_name, opts)
        }
        if (extracted.document_type) {
          form.setValue("document_type", extracted.document_type, opts)
        }
        if (extracted.document_number) {
          form.setValue("document_number", extracted.document_number, opts)
        }
        if (extracted.procedure_number) {
          form.setValue("procedure_number", extracted.procedure_number, opts)
        }
        if (extracted.date_of_birth) {
          form.setValue("date_of_birth", extracted.date_of_birth, opts)
        }
        if (extracted.nationality) {
          // Normalizar nacionalidad
          let nationality = extracted.nationality
          if (nationality === "ARG" || nationality === "ARGENTINA") {
            nationality = "Argentina"
          }
          form.setValue("nationality", nationality, opts)
        }
        
        setOcrSuccess(true)
        toast.success("Datos extraídos del documento correctamente")
      } else {
        toast.error(data.error || "No se pudieron extraer datos del documento")
      }
    } catch (error) {
      console.error("Error en OCR:", error)
      toast.error("Error al procesar el documento")
    } finally {
      setIsProcessingOCR(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const onSubmit = async (values: CustomerFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || null,
          instagram_handle: values.instagram_handle || null,
          document_type: values.document_type || null,
          document_number: values.document_number || null,
          procedure_number: values.procedure_number || null,
          date_of_birth: values.date_of_birth || null,
          nationality: values.nationality || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        // Manejar error de duplicado
        if (response.status === 409) {
          throw new Error(error.error || "Ya existe un cliente con estos datos")
        }
        throw new Error(error.error || "Error al crear cliente")
      }

      const data = await response.json()
      toast.success("Cliente creado correctamente")
      form.reset()
      setUploadedFile(null)
      setOcrSuccess(false)
      onSuccess(data.customer)
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating customer:", error)
      toast.error(error instanceof Error ? error.message : "Error al crear cliente")
    } finally {
      setIsLoading(false)
    }
  }

  // Detectar si hay datos que se perderían (isDirty o campos con valor, p. ej. tras OCR)
  const hasUnsavedChanges = () => {
    if (form.formState.isDirty) return true
    const v = form.getValues()
    return !!(v.first_name || v.last_name || v.phone || v.document_number || v.procedure_number)
  }

  // Handler para cierre con confirmación si hay cambios
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges()) {
      setShowCloseConfirm(true)
    } else {
      if (!newOpen) {
        form.reset()
        setUploadedFile(null)
        setOcrSuccess(false)
      }
      onOpenChange(newOpen)
    }
  }

  // Confirmar cierre
  const confirmClose = () => {
    setShowCloseConfirm(false)
    form.reset()
    setUploadedFile(null)
    setOcrSuccess(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={(e) => {
            if (hasUnsavedChanges()) {
              e.preventDefault()
              setShowCloseConfirm(true)
            }
          }}
          onPointerDownOutside={(e) => {
            if (hasUnsavedChanges()) {
              e.preventDefault()
              setShowCloseConfirm(true)
            }
          }}
          onInteractOutside={(e) => {
            if (hasUnsavedChanges()) {
              e.preventDefault()
              setShowCloseConfirm(true)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Completa los datos para registrar un nuevo cliente
            </DialogDescription>
          </DialogHeader>

          {/* Sección de OCR */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Escanear documento</h4>
                <p className="text-xs text-muted-foreground">
                  Sube una foto o PDF de DNI/Pasaporte para autocompletar los datos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="ocr-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingOCR}
                >
                  {isProcessingOCR ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir documento
                    </>
                  )}
                </Button>
                {ocrSuccess && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Datos extraídos
                  </Badge>
                )}
              </div>
            </div>
            {uploadedFile && !ocrSuccess && !isProcessingOCR && (
              <p className="text-xs text-muted-foreground mt-2">
                Archivo: {uploadedFile.name}
              </p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido *</FormLabel>
                      <FormControl>
                        <Input placeholder="Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono *</FormLabel>
                      <FormControl>
                        <Input placeholder="+54 11 1234-5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="juan@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagram_handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="@usuario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="document_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Documento *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="procedure_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Trámite</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value)}
                          placeholder="Seleccionar fecha"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nacionalidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar nacionalidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nationalities.map((nat) => (
                            <SelectItem key={nat.value} value={nat.value}>
                              {nat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Campos personalizados */}
              {settings?.custom_fields && settings.custom_fields.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">Información Adicional</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomFieldsForm 
                      control={form.control} 
                      customFields={settings.custom_fields} 
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Cliente"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de cierre */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si cierras el formulario, perderás todos los datos ingresados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>
              Seguir editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
