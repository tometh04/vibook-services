"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Palette, Image as ImageIcon, Mail, Phone, Globe, Instagram, Facebook, UploadCloud, Building2, MapPin } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const brandingSchema = z.object({
  app_name: z.string().min(1, "El nombre es requerido").max(50),
  logo_url: z.string().url("URL inválida").optional().or(z.literal("")),
  logo_dark_url: z.string().url("URL inválida").optional().or(z.literal("")),
  favicon_url: z.string().url("URL inválida").optional().or(z.literal("")),
  palette_id: z.string().min(1, "Selecciona una paleta"),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color HEX inválido"),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color HEX inválido"),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color HEX inválido"),
  email_from_name: z.string().min(1, "El nombre es requerido").max(100),
  email_from_address: z.string().email("Email inválido").optional().or(z.literal("")),
  support_email: z.string().email("Email inválido").optional().or(z.literal("")),
  support_phone: z.string().optional().or(z.literal("")),
  support_whatsapp: z.string().optional().or(z.literal("")),
  website_url: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram_url: z.string().url("URL inválida").optional().or(z.literal("")),
  facebook_url: z.string().url("URL inválida").optional().or(z.literal("")),
  company_name: z.string().optional().or(z.literal("")),
  company_tax_id: z.string().optional().or(z.literal("")),
  company_address_line1: z.string().optional().or(z.literal("")),
  company_address_line2: z.string().optional().or(z.literal("")),
  company_city: z.string().optional().or(z.literal("")),
  company_state: z.string().optional().or(z.literal("")),
  company_postal_code: z.string().optional().or(z.literal("")),
  company_country: z.string().optional().or(z.literal("")),
  company_phone: z.string().optional().or(z.literal("")),
  company_email: z.string().email("Email inválido").optional().or(z.literal("")),
})

type BrandingFormData = z.infer<typeof brandingSchema>

interface Agency {
  id: string
  name: string
}

interface BrandingSettingsProps {
  agencies: Agency[]
  defaultAgencyId: string | null
}

const PALETTES = [
  {
    id: "vibook",
    name: "Slack",
    description: "Comunicacion moderna y colaborativa",
    primary: "#4A154B",
    secondary: "#36C5F0",
    accent: "#2EB67D",
  },
  {
    id: "trello",
    name: "Trello",
    description: "Enfoque, claridad y orden visual",
    primary: "#0079BF",
    secondary: "#026AA7",
    accent: "#5AAC44",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Producto premium y moderno",
    primary: "#5E6AD2",
    secondary: "#7B61FF",
    accent: "#00C4CC",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Solidez y confiabilidad profesional",
    primary: "#24292F",
    secondary: "#0969DA",
    accent: "#2DA44E",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Energia clara para equipos en movimiento",
    primary: "#F06A6A",
    secondary: "#FF9A7B",
    accent: "#FFC857",
  },
] as const

export function BrandingSettings({ agencies, defaultAgencyId }: BrandingSettingsProps) {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(defaultAgencyId || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      app_name: "Vibook Gestión",
      logo_url: "",
      logo_dark_url: "",
      favicon_url: "",
      palette_id: "vibook",
      primary_color: "#6366f1",
      secondary_color: "#8b5cf6",
      accent_color: "#f59e0b",
      email_from_name: "Vibook Gestión",
      email_from_address: "",
      support_email: "",
      support_phone: "",
      support_whatsapp: "",
      website_url: "",
      instagram_url: "",
      facebook_url: "",
      company_name: "",
      company_tax_id: "",
      company_address_line1: "",
      company_address_line2: "",
      company_city: "",
      company_state: "",
      company_postal_code: "",
      company_country: "",
      company_phone: "",
      company_email: "",
    },
  })

  // Cargar branding cuando cambia la agencia
  useEffect(() => {
    if (!selectedAgencyId) return

    async function loadBranding() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/settings/branding?agencyId=${selectedAgencyId}`)
        if (!response.ok) throw new Error("Error al cargar branding")
        
        const { branding } = await response.json()
        
        form.reset({
          app_name: branding.app_name || "Vibook Gestión",
          logo_url: branding.logo_url || "",
          logo_dark_url: branding.logo_dark_url || "",
          favicon_url: branding.favicon_url || "",
          palette_id: branding.palette_id || "vibook",
          primary_color: branding.primary_color || "#6366f1",
          secondary_color: branding.secondary_color || "#8b5cf6",
          accent_color: branding.accent_color || "#f59e0b",
          email_from_name: branding.email_from_name || "Vibook Gestión",
          email_from_address: branding.email_from_address || "",
          support_email: branding.support_email || "",
          support_phone: branding.support_phone || "",
          support_whatsapp: branding.support_whatsapp || "",
          website_url: branding.website_url || "",
          instagram_url: branding.instagram_url || "",
          facebook_url: branding.facebook_url || "",
          company_name: branding.company_name || "",
          company_tax_id: branding.company_tax_id || "",
          company_address_line1: branding.company_address_line1 || "",
          company_address_line2: branding.company_address_line2 || "",
          company_city: branding.company_city || "",
          company_state: branding.company_state || "",
          company_postal_code: branding.company_postal_code || "",
          company_country: branding.company_country || "",
          company_phone: branding.company_phone || "",
          company_email: branding.company_email || "",
        })
      } catch (error) {
        console.error("Error loading branding:", error)
        toast.error("Error al cargar configuración de branding")
      } finally {
        setIsLoading(false)
      }
    }

    loadBranding()
  }, [selectedAgencyId, form])

  async function onSubmit(data: BrandingFormData) {
    if (!selectedAgencyId) {
      toast.error("Selecciona una agencia")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_id: selectedAgencyId,
          ...data,
          // Convertir strings vacíos a null
          logo_url: data.logo_url || null,
          logo_dark_url: data.logo_dark_url || null,
          favicon_url: data.favicon_url || null,
          email_from_address: data.email_from_address || null,
          support_email: data.support_email || null,
          support_phone: data.support_phone || null,
          support_whatsapp: data.support_whatsapp || null,
          website_url: data.website_url || null,
          instagram_url: data.instagram_url || null,
          facebook_url: data.facebook_url || null,
          company_name: data.company_name || null,
          company_tax_id: data.company_tax_id || null,
          company_address_line1: data.company_address_line1 || null,
          company_address_line2: data.company_address_line2 || null,
          company_city: data.company_city || null,
          company_state: data.company_state || null,
          company_postal_code: data.company_postal_code || null,
          company_country: data.company_country || null,
          company_phone: data.company_phone || null,
          company_email: data.company_email || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar")
      }

      toast.success("Branding guardado correctamente")

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("branding:updated", { detail: { agencyId: selectedAgencyId } }))
      }
    } catch (error: any) {
      console.error("Error saving branding:", error)
      toast.error(error.message || "Error al guardar branding")
    } finally {
      setIsSaving(false)
    }
  }

  const watchedColors = form.watch(["primary_color", "secondary_color", "accent_color"])
  const watchedPalette = form.watch("palette_id")

  const handlePaletteSelect = (paletteId: string) => {
    const palette = PALETTES.find((p) => p.id === paletteId)
    if (!palette) return
    form.setValue("palette_id", palette.id, { shouldDirty: true })
    form.setValue("primary_color", palette.primary, { shouldDirty: true })
    form.setValue("secondary_color", palette.secondary, { shouldDirty: true })
    form.setValue("accent_color", palette.accent, { shouldDirty: true })
  }

  const handleColorChange = (field: "primary_color" | "secondary_color" | "accent_color", value: string) => {
    form.setValue(field, value, { shouldDirty: true })
    if (form.getValues("palette_id") !== "custom") {
      form.setValue("palette_id", "custom", { shouldDirty: true })
    }
  }

  const [uploading, setUploading] = useState<{ logo: boolean; logo_dark: boolean; favicon: boolean }>({
    logo: false,
    logo_dark: false,
    favicon: false,
  })

  const uploadBrandingAsset = async (file: File, type: "logo" | "logo_dark" | "favicon") => {
    if (!selectedAgencyId) return
    setUploading((prev) => ({ ...prev, [type]: true }))
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      formData.append("agency_id", selectedAgencyId)

      const response = await fetch("/api/settings/branding/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al subir archivo")
      }

      const { url } = await response.json()
      if (type === "logo") form.setValue("logo_url", url, { shouldDirty: true })
      if (type === "logo_dark") form.setValue("logo_dark_url", url, { shouldDirty: true })
      if (type === "favicon") form.setValue("favicon_url", url, { shouldDirty: true })

      toast.success("Archivo subido correctamente")
    } catch (error: any) {
      toast.error(error.message || "Error al subir archivo")
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuración de Branding
          </CardTitle>
          <CardDescription>
            Personaliza la apariencia de tu plataforma para cada agencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label>Seleccionar Agencia</Label>
            <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
              <SelectTrigger className="w-full max-w-xs">
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

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedAgencyId ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="palette">Paletas</TabsTrigger>
                    <TabsTrigger value="contact">Contacto</TabsTrigger>
                    <TabsTrigger value="receipts">Recibos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="app_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Aplicación</FormLabel>
                          <FormControl>
                            <Input placeholder="Mi Agencia de Viajes" {...field} />
                          </FormControl>
                          <FormDescription>
                            Este nombre aparecerá en el sidebar y otros lugares
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="logo_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Logo (Claro)
                            </FormLabel>
                            <div className="space-y-2">
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <div className="flex items-center gap-3">
                                {field.value ? (
                                  <img
                                    src={field.value}
                                    alt="Logo claro"
                                    className="h-10 w-10 rounded bg-muted object-contain"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded border bg-muted/40" />
                                )}
                                <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted cursor-pointer">
                                  <UploadCloud className="h-4 w-4" />
                                  Subir archivo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) uploadBrandingAsset(file, "logo")
                                    }}
                                  />
                                </label>
                                {uploading.logo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              </div>
                            </div>
                            <FormDescription>
                              Logo para modo claro (recomendado: 40x40px)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="logo_dark_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Logo (Oscuro)
                            </FormLabel>
                            <div className="space-y-2">
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <div className="flex items-center gap-3">
                                {field.value ? (
                                  <img
                                    src={field.value}
                                    alt="Logo oscuro"
                                    className="h-10 w-10 rounded bg-muted object-contain"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded border bg-muted/40" />
                                )}
                                <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted cursor-pointer">
                                  <UploadCloud className="h-4 w-4" />
                                  Subir archivo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) uploadBrandingAsset(file, "logo_dark")
                                    }}
                                  />
                                </label>
                                {uploading.logo_dark && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              </div>
                            </div>
                            <FormDescription>
                              Logo para modo oscuro (opcional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="favicon_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Favicon</FormLabel>
                          <div className="space-y-2">
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <div className="flex items-center gap-3">
                              {field.value ? (
                                <img
                                  src={field.value}
                                  alt="Favicon"
                                  className="h-8 w-8 rounded bg-muted object-contain"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded border bg-muted/40" />
                              )}
                              <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted cursor-pointer">
                                <UploadCloud className="h-4 w-4" />
                                Subir archivo
                                <input
                                  type="file"
                                  accept="image/png,image/x-icon,image/svg+xml"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) uploadBrandingAsset(file, "favicon")
                                  }}
                                />
                              </label>
                              {uploading.favicon && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                          </div>
                          <FormDescription>
                            Icono que aparece en la pestaña del navegador (recomendado: 32x32px)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="palette" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {PALETTES.map((palette) => (
                        <button
                          type="button"
                          key={palette.id}
                          onClick={() => handlePaletteSelect(palette.id)}
                          className={`rounded-xl border p-4 text-left transition ${
                            watchedPalette === palette.id ? "border-primary shadow-sm" : "hover:border-muted-foreground/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">{palette.name}</p>
                              <p className="text-xs text-muted-foreground">{palette.description}</p>
                            </div>
                            {watchedPalette === palette.id && (
                              <span className="text-xs font-medium text-primary">Seleccionada</span>
                            )}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <span className="h-6 w-6 rounded-full" style={{ backgroundColor: palette.primary }} />
                            <span className="h-6 w-6 rounded-full" style={{ backgroundColor: palette.secondary }} />
                            <span className="h-6 w-6 rounded-full" style={{ backgroundColor: palette.accent }} />
                          </div>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => form.setValue("palette_id", "custom", { shouldDirty: true })}
                        className={`rounded-xl border p-4 text-left transition ${
                          watchedPalette === "custom" ? "border-primary shadow-sm" : "hover:border-muted-foreground/40"
                        }`}
                      >
                        <p className="text-sm font-semibold">Personalizado</p>
                        <p className="text-xs text-muted-foreground">Ajustá los colores manualmente</p>
                      </button>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Primario</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => handleColorChange("primary_color", e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </FormControl>
                              <Input
                                value={field.value}
                                onChange={(e) => handleColorChange("primary_color", e.target.value)}
                                placeholder="#2563EB"
                                className="flex-1"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Secundario</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </FormControl>
                              <Input
                                value={field.value}
                                onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                                placeholder="#0EA5E9"
                                className="flex-1"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accent_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color de Acento</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => handleColorChange("accent_color", e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </FormControl>
                              <Input
                                value={field.value}
                                onChange={(e) => handleColorChange("accent_color", e.target.value)}
                                placeholder="#22D3EE"
                                className="flex-1"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/50">
                      <Label className="mb-2 block">Vista Previa</Label>
                      <div className="flex gap-4 items-center">
                        <div
                          className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: watchedColors[0] }}
                        >
                          Primario
                        </div>
                        <div
                          className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: watchedColors[1] }}
                        >
                          Secundario
                        </div>
                        <div
                          className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: watchedColors[2] }}
                        >
                          Acento
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email_from_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Nombre del Remitente
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Mi Agencia" {...field} />
                            </FormControl>
                            <FormDescription>
                              Nombre que aparece en los emails enviados
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email_from_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email del Remitente</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="info@miagencia.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Dirección de email para respuestas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="support_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email de Soporte
                            </FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="soporte@miagencia.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="support_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Teléfono de Soporte
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="+54 11 1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="support_whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp de Soporte</FormLabel>
                            <FormControl>
                              <Input placeholder="+5411XXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="website_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Sitio Web
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.miagencia.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="instagram_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Instagram className="h-4 w-4" />
                              Instagram
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://instagram.com/miagencia" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="facebook_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Facebook className="h-4 w-4" />
                              Facebook
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://facebook.com/miagencia" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="receipts" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Razón Social
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Agencia de Viajes SRL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company_tax_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CUIT / Tax ID</FormLabel>
                            <FormControl>
                              <Input placeholder="30-12345678-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="company_address_line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Dirección
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Libertador 1234" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_address_line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Piso, oficina, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="company_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input placeholder="Buenos Aires" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincia / Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="Buenos Aires" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="company_postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código Postal</FormLabel>
                            <FormControl>
                              <Input placeholder="C1428" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company_country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>País</FormLabel>
                            <FormControl>
                              <Input placeholder="Argentina" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="company_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono Comercial</FormLabel>
                            <FormControl>
                              <Input placeholder="+54 11 1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Comercial</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@miagencia.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Selecciona una agencia para configurar su branding
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
