"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Hash, User, Plus, Search, MessageCircle } from "lucide-react"
import { useState } from "react"
import type { TeamChannelWithMeta } from "@/lib/messaging/types"

interface ChannelSidebarProps {
  channels: TeamChannelWithMeta[]
  selectedChannelId: string | null
  onSelectChannel: (id: string) => void
  onCreateChannel: () => void
  onStartDM: () => void
  userRole: string
}

export function ChannelSidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  onStartDM,
  userRole,
}: ChannelSidebarProps) {
  const [search, setSearch] = useState("")
  const canCreateChannel = userRole === "SUPER_ADMIN" || userRole === "ADMIN"

  const publicChannels = channels.filter((ch) => ch.type === "channel")
  const dmChannels = channels.filter((ch) => ch.type === "dm")

  const filteredPublic = publicChannels.filter((ch) =>
    (ch.name || "").toLowerCase().includes(search.toLowerCase())
  )
  const filteredDMs = dmChannels.filter((ch) =>
    (ch.dm_partner?.name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Mensajería</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="h-8 text-xs pl-7"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Canales */}
          <div className="mb-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Canales
              </span>
              {canCreateChannel && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={onCreateChannel}
                  title="Crear canal"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {filteredPublic.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  selectedChannelId === ch.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">{ch.name}</span>
                {ch.unread_count > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-[16px] px-1 text-[10px] font-medium"
                  >
                    {ch.unread_count > 99 ? "99+" : ch.unread_count}
                  </Badge>
                )}
              </button>
            ))}

            {filteredPublic.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">Sin canales</p>
            )}
          </div>

          {/* Mensajes Directos */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Mensajes Directos
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onStartDM}
                title="Nuevo mensaje directo"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {filteredDMs.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  selectedChannelId === ch.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-left">
                  {ch.dm_partner?.name || "Usuario"}
                </span>
                {ch.unread_count > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-[16px] px-1 text-[10px] font-medium"
                  >
                    {ch.unread_count > 99 ? "99+" : ch.unread_count}
                  </Badge>
                )}
              </button>
            ))}

            {filteredDMs.length === 0 && !search && (
              <p className="text-xs text-muted-foreground px-2 py-1">
                Sin conversaciones
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
