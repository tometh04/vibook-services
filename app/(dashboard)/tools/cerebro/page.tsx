import { getCurrentUser } from "@/lib/auth"
import { CerebroChat } from "@/components/tools/cerebro-chat"
import { PaywallGate } from "@/components/billing/paywall-gate"

export default async function CerebroPage() {
  const { user } = await getCurrentUser()

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <PaywallGate feature="cerebro" requiredPlan="Pro" message="Cerebro está disponible en el plan Pro y superiores.">
        <CerebroChat userId={user?.id || ""} userName={user?.name || "Usuario"} />
      </PaywallGate>
    </div>
  )
}
