import { getCurrentUser, getUserAgencies } from "@/lib/auth"
import { MessagingCenter } from "@/components/messaging/messaging-center"
import { PaywallGate } from "@/components/billing/paywall-gate"

export const dynamic = "force-dynamic"

export default async function MessagingPage() {
  const { user } = await getCurrentUser()
  const userAgencies = await getUserAgencies(user.id)
  const agencyId = userAgencies[0]?.agency_id || ""

  return (
    <div className="flex flex-1 flex-col" style={{ height: "calc(100vh - var(--header-height) - 4rem)" }}>
      <PaywallGate
        feature="messaging"
        requiredPlan="Pro"
        message="El Centro de Mensajería está disponible en el plan Pro y superiores."
      >
        <MessagingCenter
          currentUserId={user.id}
          currentUserName={user.name || "Usuario"}
          agencyId={agencyId}
          userRole={user.role}
        />
      </PaywallGate>
    </div>
  )
}
