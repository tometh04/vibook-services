import type { Database } from "@/lib/supabase/types"

type User = Database["public"]["Tables"]["users"]["Row"]

export function requireAdminTools(user: User, request: Request): Response | null {
  const enabled = process.env.ADMIN_TOOLS_ENABLED === "true"
  if (!enabled) {
    return new Response("Not found", { status: 404 })
  }

  if (user.role !== "SUPER_ADMIN") {
    return new Response("Forbidden", { status: 403 })
  }

  const token = process.env.ADMIN_API_TOKEN
  if (token) {
    const provided = request.headers.get("x-admin-token")
    if (!provided || provided !== token) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  return null
}
