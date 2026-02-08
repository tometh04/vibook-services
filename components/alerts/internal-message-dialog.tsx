"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AgencyOption {
  id: string
  name: string
}

interface AgencyUser {
  id: string
  name: string
  email: string
  role: string
  agency_id: string
  agency_name?: string | null
}

interface InternalMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agencies: AgencyOption[]
  users: AgencyUser[]
  onCreated: () => void
}

export function InternalMessageDialog({
  open,
  onOpenChange,
  agencies,
  users,
  onCreated,
}: InternalMessageDialogProps) {
  const [agencyId, setAgencyId] = useState(agencies[0]?.id || "")
  const [recipientId, setRecipientId] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const recipients = useMemo(() => {
    if (!agencyId) return []
    return users.filter((user) => user.agency_id === agencyId)
  }, [agencyId, users])

  const resetForm = () => {
    setAgencyId(agencies[0]?.id || "")
    setRecipientId("")
    setMessage("")
  }

  const handleSubmit = async () => {
    if (!agencyId || !recipientId || !message.trim()) {
      toast.error("Completá agencia, destinatario y mensaje")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          recipientId,
          message: message.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "No se pudo crear el mensaje")
      }

      toast.success("Mensaje interno creado")
      onCreated()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || "Error al crear el mensaje")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAgency = agencies.find((agency) => agency.id === agencyId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo mensaje interno</DialogTitle>
          <DialogDescription>
            Enviá una nota directa a un miembro del equipo dentro de la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agencia</Label>
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar agencia" />
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

          <div className="space-y-2">
            <Label>Destinatario</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {recipients.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    No hay usuarios para {selectedAgency?.name || "esta agencia"}
                  </SelectItem>
                ) : (
                  recipients.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email} · {user.role}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ej: Santi, hay que cerrar el grupo grande a Aruba."
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar mensaje"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
