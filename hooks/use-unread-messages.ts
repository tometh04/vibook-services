"use client"

import { useState, useEffect } from "react"

export function useUnreadMessages(enabled: boolean = true) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messaging/unread-total")
        const data = await res.json()
        if (res.ok) {
          setUnreadCount(data.total_unread || 0)
        }
      } catch {
        // Silenciar errores
      }
    }

    // Fetch inicial
    fetchUnread()

    // Polling cada 30 segundos
    const interval = setInterval(fetchUnread, 30000)

    return () => clearInterval(interval)
  }, [enabled])

  return unreadCount
}
