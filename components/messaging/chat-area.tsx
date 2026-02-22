"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Loader2, Hash, User, ChevronUp } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { toast } from "sonner"
import type { TeamMessage } from "@/lib/messaging/types"

interface ChatAreaProps {
  channelId: string
  channelName: string
  channelType: "channel" | "dm"
  currentUserId: string
  currentUserName: string
  messages: TeamMessage[]
  setMessages: React.Dispatch<React.SetStateAction<TeamMessage[]>>
}

export function ChatArea({
  channelId,
  channelName,
  channelType,
  currentUserId,
  currentUserName,
  messages,
  setMessages,
}: ChatAreaProps) {
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? "instant" : "smooth" })
  }, [])

  // Cargar mensajes cuando cambia el canal
  useEffect(() => {
    isInitialLoad.current = true
    fetchMessages()
  }, [channelId])

  // Scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
      isInitialLoad.current = false
    }
  }, [messages.length, scrollToBottom])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/messaging/channels/${channelId}/messages?limit=50`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
        setHasMore(data.has_more || false)
        setNextCursor(data.next_cursor || null)
      }
    } catch {
      toast.error("Error al cargar mensajes")
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(
        `/api/messaging/channels/${channelId}/messages?limit=50&cursor=${nextCursor}`
      )
      const data = await res.json()
      if (res.ok) {
        setMessages((prev) => [...(data.messages || []), ...prev])
        setHasMore(data.has_more || false)
        setNextCursor(data.next_cursor || null)
      }
    } catch {
      toast.error("Error al cargar más mensajes")
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSend = async (content: string) => {
    // Optimistic update
    const optimisticMsg: TeamMessage = {
      id: `temp-${Date.now()}`,
      channel_id: channelId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender_name: currentUserName,
    }
    setMessages((prev) => [...prev, optimisticMsg])

    const res = await fetch(`/api/messaging/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      // Revertir optimistic update
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      toast.error("Error al enviar mensaje")
      throw new Error("Failed to send")
    }

    const data = await res.json()
    // Reemplazar mensaje optimista con el real
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
    )
  }

  // Determinar cuándo mostrar el nombre del sender (cuando cambia el sender o hay diferencia de tiempo)
  const shouldShowSender = (index: number) => {
    if (index === 0) return true
    const prev = messages[index - 1]
    const curr = messages[index]
    if (prev.sender_id !== curr.sender_id) return true
    // Mostrar si pasaron más de 5 minutos
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
    return diff > 5 * 60 * 1000
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-background shrink-0">
        {channelType === "channel" ? (
          <Hash className="h-4 w-4 text-muted-foreground" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
        <h2 className="font-semibold text-sm">{channelName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="px-4 py-3 space-y-1">
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs text-muted-foreground"
              >
                {loadingMore ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <ChevronUp className="h-3 w-3 mr-1" />
                )}
                Cargar anteriores
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No hay mensajes aún</p>
              <p className="text-xs mt-1">Sé el primero en escribir</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                senderName={msg.sender_name || "Usuario"}
                senderId={msg.sender_id}
                currentUserId={currentUserId}
                createdAt={msg.created_at}
                showSender={shouldShowSender(i)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  )
}
