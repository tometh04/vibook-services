"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { ChannelSidebar } from "./channel-sidebar"
import { ChatArea } from "./chat-area"
import { CreateChannelDialog } from "./create-channel-dialog"
import { StartDMDialog } from "./start-dm-dialog"
import { Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import type { TeamChannelWithMeta, TeamMessage } from "@/lib/messaging/types"

interface MessagingCenterProps {
  currentUserId: string
  currentUserName: string
  agencyId: string
  userRole: string
}

export function MessagingCenter({
  currentUserId,
  currentUserName,
  agencyId,
  userRole,
}: MessagingCenterProps) {
  const [channels, setChannels] = useState<TeamChannelWithMeta[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [startDMOpen, setStartDMOpen] = useState(false)

  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null)
  const selectedChannelIdRef = useRef<string | null>(null)
  const processedMsgIds = useRef<Set<string>>(new Set())

  // Mantener ref sincronizado
  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId
  }, [selectedChannelId])

  // Inicializar Supabase client
  useEffect(() => {
    supabaseRef.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }, [])

  // Cargar canales al montar
  useEffect(() => {
    fetchChannels()
  }, [])

  // Suscripción Realtime a team_messages
  useEffect(() => {
    const supabase = supabaseRef.current
    if (!supabase || channels.length === 0) return

    const channelIds = channels.map((ch) => ch.id)
    const filterStr = channelIds.map((id) => `channel_id=eq.${id}`).join(",")

    const channel = supabase
      .channel("team-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
        },
        (payload: any) => {
          const newMsg = payload.new as any

          // Verificar que el mensaje es de un canal del usuario
          if (!channelIds.includes(newMsg.channel_id)) return

          // Deduplicar (evitar doble procesamiento)
          if (processedMsgIds.current.has(newMsg.id)) return
          processedMsgIds.current.add(newMsg.id)
          // Limpiar después de 10s
          setTimeout(() => processedMsgIds.current.delete(newMsg.id), 10000)

          // Ignorar mensajes propios (ya se manejan con optimistic update)
          if (newMsg.sender_id === currentUserId) return

          if (newMsg.channel_id === selectedChannelIdRef.current) {
            // Mensaje del canal activo: agregar al chat
            // Necesitamos el sender_name, hacemos fetch rápido
            fetch(`/api/messaging/channels/${newMsg.channel_id}/messages?limit=1`)
              .then((r) => r.json())
              .then((data) => {
                const msg = data.messages?.[data.messages.length - 1]
                if (msg) {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev
                    return [...prev, msg]
                  })
                }
              })
              .catch(() => {})

            // Auto mark as read
            fetch(`/api/messaging/channels/${newMsg.channel_id}/read`, {
              method: "POST",
            }).catch(() => {})
          } else {
            // Mensaje de otro canal: incrementar unread
            setChannels((prev) =>
              prev.map((ch) =>
                ch.id === newMsg.channel_id
                  ? { ...ch, unread_count: (ch.unread_count || 0) + 1 }
                  : ch
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channels.length, currentUserId])

  // Polling fallback: cada 5s refrescar mensajes del canal activo + unread counts
  useEffect(() => {
    if (!selectedChannelId) return

    const interval = setInterval(async () => {
      try {
        // Refrescar mensajes del canal activo
        const res = await fetch(`/api/messaging/channels/${selectedChannelId}/messages?limit=50`)
        const data = await res.json()
        if (res.ok && data.messages) {
          setMessages((prev) => {
            // Solo actualizar si hay mensajes nuevos
            const lastPrev = prev[prev.length - 1]
            const lastNew = data.messages[data.messages.length - 1]
            if (lastPrev?.id === lastNew?.id) return prev
            return data.messages
          })
        }

        // Refrescar unread counts de los canales
        const chRes = await fetch("/api/messaging/channels")
        const chData = await chRes.json()
        if (chRes.ok && chData.channels) {
          setChannels((prev) =>
            prev.map((ch) => {
              const updated = chData.channels.find((c: any) => c.id === ch.id)
              if (updated) {
                return { ...ch, unread_count: updated.unread_count, last_message: updated.last_message }
              }
              return ch
            })
          )
        }
      } catch {
        // Silenciar errores de polling
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedChannelId])

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/messaging/channels")
      const data = await res.json()
      if (res.ok) {
        const channelList = data.channels || []
        setChannels(channelList)

        // Auto-seleccionar primer canal si no hay uno seleccionado
        if (!selectedChannelId && channelList.length > 0) {
          const general = channelList.find(
            (ch: TeamChannelWithMeta) => ch.type === "channel" && ch.name === "general"
          )
          setSelectedChannelId(general?.id || channelList[0].id)
        }
      }
    } catch {
      toast.error("Error al cargar canales")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChannel = useCallback(
    (channelId: string) => {
      setSelectedChannelId(channelId)
      setMessages([]) // Reset mensajes, chat-area los recargará

      // Mark as read
      fetch(`/api/messaging/channels/${channelId}/read`, { method: "POST" }).catch(() => {})

      // Resetear unread count local
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, unread_count: 0 } : ch))
      )
    },
    []
  )

  const handleDMCreated = (channelId: string) => {
    fetchChannels().then(() => {
      setSelectedChannelId(channelId)
    })
  }

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId)

  const getChannelDisplayName = (ch: TeamChannelWithMeta) => {
    if (ch.type === "dm") return ch.dm_partner?.name || "Usuario"
    return ch.name || "Canal"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full rounded-lg border overflow-hidden bg-background">
      {/* Sidebar - channels list */}
      <div className="w-64 shrink-0">
        <ChannelSidebar
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={() => setCreateChannelOpen(true)}
          onStartDM={() => setStartDMOpen(true)}
          userRole={userRole}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        {selectedChannel ? (
          <ChatArea
            channelId={selectedChannel.id}
            channelName={getChannelDisplayName(selectedChannel)}
            channelType={selectedChannel.type}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            messages={messages}
            setMessages={setMessages}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3" />
            <p className="text-sm">Selecciona un canal para empezar</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        onCreated={fetchChannels}
      />
      <StartDMDialog
        open={startDMOpen}
        onOpenChange={setStartDMOpen}
        onDMCreated={handleDMCreated}
      />
    </div>
  )
}
