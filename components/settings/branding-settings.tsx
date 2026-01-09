"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Palette, Image as ImageIcon, Mail, Phone, Globe, Instagram, Facebook } from "lucide-react"
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
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar")
      }

      toast.success("Branding guardado correctamente")
    } catch (error: any) {
      console.error("Error saving branding:", error)
      toast.error(error.message || "Error al guardar branding")
    } finally {
      setIsSaving(false)
    }
  }

  const watchedColors = form.watch(["primary_color", "secondary_color", "accent_color"])

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
                    <TabsTrigger value="colors">Colores</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="social">Redes Sociales</TabsTrigger>
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
                              URL del Logo (Claro)
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
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
                              URL del Logo (Oscuro)
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
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
                          <FormLabel>URL del Favicon</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormDescription>
                            Icono que aparece en la pestaña del navegador (recomendado: 32x32px)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="colors" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Primario</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} className="w-12 h-10 p-1 cursor-pointer" />
                              </FormControl>
                              <Input 
                                value={field.value} 
                                onChange={field.onChange}
                                placeholder="#6366f1"
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
                                <Input type="color" {...field} className="w-12 h-10 p-1 cursor-pointer" />
                              </FormControl>
                              <Input 
                                value={field.value} 
                                onChange={field.onChange}
                                placeholder="#8b5cf6"
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
                                <Input type="color" {...field} className="w-12 h-10 p-1 cursor-pointer" />
                              </FormControl>
                              <Input 
                                value={field.value} 
                                onChange={field.onChange}
                                placeholder="#f59e0b"
                                className="flex-1"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Preview de colores */}
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

                  <TabsContent value="email" className="space-y-4 mt-4">
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
                  </TabsContent>

                  <TabsContent value="social" className="space-y-4 mt-4">
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
