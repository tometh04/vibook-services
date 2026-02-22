"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { USER_ROLE_LABELS } from "@/lib/design-tokens"
import type { AgencyMember } from "@/lib/messaging/types"

interface StartDMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDMCreated: (channelId: string) => void
}

export function StartDMDialog({ open, onOpenChange, onDMCreated }: StartDMDialogProps) {
  const [members, setMembers] = useState<AgencyMember[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (open) {
      fetchMembers()
      setSearch("")
    }
  }, [open])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/messaging/members")
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members || [])
      }
    } catch {
      toast.error("Error al cargar miembros")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = async (userId: string) => {
    setStarting(userId)
    try {
      const res = await fetch("/api/messaging/channels/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: userId }),
      })

      const data = await res.json()

      if (res.ok) {
        onOpenChange(false)
        onDMCreated(data.channel.id)
      } else {
        toast.error(data.error || "Error al iniciar conversación")
      }
    } catch {
      toast.error("Error al iniciar conversación")
    } finally {
      setStarting(null)
    }
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Mensaje Directo</DialogTitle>
          <DialogDescription>Selecciona un compañero de tu agencia</DialogDescription>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="pl-8 h-9 text-sm"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Sin resultados" : "No hay compañeros disponibles"}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((member) => {
                const initials = member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelectUser(member.id)}
                    disabled={starting !== null}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {USER_ROLE_LABELS[member.role] || member.role}
                    </Badge>
                    {starting === member.id && (
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
