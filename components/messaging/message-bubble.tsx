"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface MessageBubbleProps {
  content: string
  senderName: string
  senderId: string
  currentUserId: string
  createdAt: string
  showSender?: boolean
}

export function MessageBubble({
  content,
  senderName,
  senderId,
  currentUserId,
  createdAt,
  showSender = true,
}: MessageBubbleProps) {
  const isOwn = senderId === currentUserId
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} group`}>
      {showSender && !isOwn ? (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="text-xs bg-muted">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {showSender && !isOwn && (
          <span className="text-xs font-medium text-muted-foreground mb-1 px-1">
            {senderName}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm break-words ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          }`}
        >
          {content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
  )
}
