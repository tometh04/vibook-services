"use client"

import { useEffect, useState, useRef } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Bell, ChevronRight, Check, Calendar, DollarSign, FileText, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { toast } from "sonner"

interface Alert {
  id: string
  operation_id: string | null
  type: string
  description: string
  date_due: string
  status: string
  created_at: string
}

const alertTypeConfig: Record<string, { icon: any; color: string }> = {
  PAYMENT_DUE: { icon: DollarSign, color: "text-gray-400" },
  UPCOMING_TRIP: { icon: Calendar, color: "text-gray-400" },
  MISSING_DOCUMENT: { icon: FileText, color: "text-gray-400" },
  LOW_MARGIN: { icon: AlertTriangle, color: "text-gray-400" },
  QUOTATION_EXPIRING: { icon: Bell, color: "text-gray-400" },
  PAYMENT_REMINDER_7D: { icon: DollarSign, color: "text-gray-400" },
  PAYMENT_REMINDER_3D: { icon: DollarSign, color: "text-gray-400" },
  PAYMENT_REMINDER_TODAY: { icon: DollarSign, color: "text-gray-400" },
  PAYMENT_OVERDUE: { icon: AlertTriangle, color: "text-gray-400" },
  PASSPORT_EXPIRY: { icon: FileText, color: "text-gray-400" },
  GENERIC: { icon: Bell, color: "text-gray-400" },
  BIRTHDAY: { icon: Calendar, color: "text-gray-400" },
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null)

  useEffect(() => {
    // Initialize Supabase client
    supabaseRef.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    fetchAlerts()
  }, [])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current
    if (!supabase) return

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload: any) => {
          const newAlert = payload.new as Alert
          if (newAlert.status === 'PENDING') {
            setAlerts((prev) => [newAlert, ...prev.slice(0, 9)])
            setUnreadCount((prev) => prev + 1)
            toast.info(`🔔 Nueva alerta: ${newAlert.description.slice(0, 50)}...`, {
              duration: 4000,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload: any) => {
          const updatedAlert = payload.new as Alert
          if (updatedAlert.status === 'DONE') {
            setAlerts((prev) => prev.filter(a => a.id !== updatedAlert.id))
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/alerts?status=PENDING&limit=10")
      const data = await response.json()
      setAlerts(data.alerts || [])
      setUnreadCount(data.alerts?.length || 0)
    } catch (error) {
      console.error("Error fetching alerts:", error)
    }
  }

  const markAsDone = async (alertId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      await fetch("/api/alerts/mark-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      })
      
      setAlerts((prev) => prev.filter(a => a.id !== alertId))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking alert as done:", error)
    }
  }

  const getAlertConfig = (type: string) => {
    return alertTypeConfig[type] || { icon: Bell, color: "text-gray-500" }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px] font-medium"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">Alertas</h4>
          <Link href="/alerts" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="text-xs text-gray-600 h-7 px-2">
              Ver todas
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Sin alertas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => {
                const config = getAlertConfig(alert.type)
                const Icon = config.icon
                
                return (
                  <div
                    key={alert.id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 ${config.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {alert.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(alert.created_at), { 
                            addSuffix: true,
                            locale: es 
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-gray-400 hover:text-gray-600"
                        onClick={(e) => markAsDone(alert.id, e)}
                        title="Marcar como completada"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                    {alert.operation_id && (
                      <Link 
                        href={`/operations/${alert.operation_id}`}
                        onClick={() => setOpen(false)}
                        className="text-xs text-primary hover:underline ml-7 mt-1 block"
                      >
                        Ver operación →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

