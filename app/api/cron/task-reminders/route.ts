import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push"

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()
    const now = new Date()

    let remindersCreated = 0
    let dueAlerts = 0

    // ========================================
    // 1. Recordatorios previos al vencimiento
    // ========================================
    const { data: tasks, error } = await (supabase as any)
      .from("tasks")
      .select("id, title, due_date, reminder_minutes, assigned_to, operation_id, customer_id, agency_id")
      .eq("reminder_sent", false)
      .neq("status", "DONE")
      .not("due_date", "is", null)
      .not("reminder_minutes", "is", null)

    if (error) {
      console.error("Error fetching tasks for reminders:", error)
      return NextResponse.json({ error: "Error", detail: error.message }, { status: 500 })
    }

    for (const task of tasks || []) {
      const dueDate = new Date(task.due_date)
      const reminderTime = new Date(dueDate.getTime() - task.reminder_minutes * 60 * 1000)

      if (reminderTime <= now) {
        const reminderAlertData = {
          user_id: task.assigned_to,
          agency_id: task.agency_id,
          operation_id: task.operation_id || null,
          customer_id: task.customer_id || null,
          type: "TASK_REMINDER",
          description: `⏰ Recordatorio: ${task.title}`,
          date_due: task.due_date,
          status: "PENDING",
          priority: "medium",
        }

        let { error: alertError } = await (supabase as any)
          .from("alerts")
          .insert(reminderAlertData)

        if (!alertError) {
          await (supabase as any)
            .from("tasks")
            .update({ reminder_sent: true })
            .eq("id", task.id)
          remindersCreated++

          if (task.assigned_to) {
            try {
              await sendPushToUser(supabase, task.assigned_to, {
                title: "⏰ Recordatorio de Tarea",
                body: task.title,
                url: "/tools/tasks",
                tag: `task-reminder-${task.id}`,
              })
            } catch (pushError) {
              console.error("Error enviando push para tarea:", task.id, pushError)
            }
          }
        } else {
          console.error("Error creating reminder alert:", task.id, alertError)
        }
      }
    }

    // ========================================
    // 2. Alertas de tareas que vencen HOY
    // ========================================
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const { data: dueTodayTasks, error: dueError } = await (supabase as any)
      .from("tasks")
      .select("id, title, due_date, assigned_to, operation_id, customer_id, agency_id")
      .neq("status", "DONE")
      .gte("due_date", todayStart.toISOString())
      .lte("due_date", todayEnd.toISOString())

    if (!dueError && dueTodayTasks) {
      for (const task of dueTodayTasks) {
        // Verificar que no exista ya una alerta TASK_DUE_TODAY para esta tarea hoy
        const { data: existingAlert } = await (supabase as any)
          .from("alerts")
          .select("id")
          .eq("user_id", task.assigned_to)
          .eq("type", "TASK_DUE_TODAY")
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString())
          .ilike("description", `%${task.title}%`)
          .limit(1)

        if (existingAlert && existingAlert.length > 0) continue

        const dueAlertData = {
          user_id: task.assigned_to,
          agency_id: task.agency_id,
          operation_id: task.operation_id || null,
          customer_id: task.customer_id || null,
          type: "TASK_DUE_TODAY",
          description: `🔴 Tarea vence hoy: ${task.title}`,
          date_due: task.due_date,
          status: "PENDING",
          priority: "high",
        }

        // Intentar TASK_DUE_TODAY, fallback a OTHER si constraint no lo permite aún
        let { error: alertError } = await (supabase as any)
          .from("alerts")
          .insert(dueAlertData)

        if (alertError && alertError.code === "23514") {
          const res = await (supabase as any)
            .from("alerts")
            .insert({ ...dueAlertData, type: "OTHER" })
          alertError = res.error
        }

        if (!alertError) {
          dueAlerts++

          if (task.assigned_to) {
            try {
              await sendPushToUser(supabase, task.assigned_to, {
                title: "🔴 Tarea vence hoy",
                body: task.title,
                url: "/tools/tasks",
                tag: `task-due-${task.id}`,
              })
            } catch (pushError) {
              console.error("Error enviando push due today:", task.id, pushError)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersCreated,
      dueAlerts,
      tasksChecked: (tasks?.length || 0) + (dueTodayTasks?.length || 0),
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error("Error in task reminders cron:", error)
    return NextResponse.json({ error: "Error", detail: error?.message }, { status: 500 })
  }
}
