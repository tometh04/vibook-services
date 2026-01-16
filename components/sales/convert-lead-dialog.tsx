"use client"

import { NewOperationDialog } from "@/components/operations/new-operation-dialog"

interface ConvertLeadDialogProps {
  lead: {
    id: string
    contact_name: string
    contact_email?: string | null
    contact_phone?: string | null
    destination: string
    status?: string
    agency_id?: string
    assigned_seller_id: string | null
    notes?: string | null
  }
  agencies: Array<{ id: string; name: string }>
  sellers: Array<{ id: string; name: string }>
  operators: Array<{ id: string; name: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ConvertLeadDialog({
  lead,
  agencies,
  sellers,
  operators,
  open,
  onOpenChange,
  onSuccess,
}: ConvertLeadDialogProps) {
  return (
    <NewOperationDialog
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      agencies={agencies}
      sellers={sellers}
      operators={operators}
      defaultAgencyId={lead.agency_id}
      defaultSellerId={lead.assigned_seller_id || undefined}
      lead={{
        id: lead.id,
        contact_name: lead.contact_name,
        contact_email: lead.contact_email,
        contact_phone: lead.contact_phone,
        destination: lead.destination,
        agency_id: lead.agency_id,
        assigned_seller_id: lead.assigned_seller_id,
        notes: lead.notes,
      }}
    />
  )
}
