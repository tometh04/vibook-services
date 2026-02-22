"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Hash } from "lucide-react"
import { toast } from "sonner"

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateChannelDialog({ open, onOpenChange, onCreated }: CreateChannelDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("El nombre del canal es requerido")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/messaging/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Canal #${data.channel?.name || name} creado`)
        setName("")
        setDescription("")
        onOpenChange(false)
        onCreated()
      } else {
        toast.error(data.error || "Error al crear canal")
      }
    } catch {
      toast.error("Error al crear canal")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Crear Canal
          </DialogTitle>
          <DialogDescription>
            El canal será visible para todos los miembros de la agencia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Nombre *</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="ej: ventas, soporte, general"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Solo letras minúsculas, números y guiones
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-desc">Descripción (opcional)</Label>
            <Textarea
              id="channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué se trata este canal?"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Canal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
