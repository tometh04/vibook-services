// Tipos para el sistema de billing
// TODO: Regenerar con `supabase gen types` después de ejecutar la migración

export type SubscriptionPlanName = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'SUSPENDED'
export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type PaymentMethodType = 'CARD' | 'ACCOUNT_MONEY' | 'BANK_TRANSFER'

export interface SubscriptionPlan {
  id: string
  name: SubscriptionPlanName
  display_name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  mp_preapproval_amount: number | null
  currency: string
  max_users: number | null
  max_operations_per_month: number | null
  max_integrations: number | null
  max_storage_mb: number | null
  max_api_calls_per_day: number | null
  features: {
    trello?: boolean
    manychat?: boolean
    emilia?: boolean
    whatsapp?: boolean
    reports?: boolean
    custom_integrations?: boolean
    priority_support?: boolean
  }
  is_active: boolean
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  agency_id: string
  plan_id: string
  mp_preapproval_id: string | null
  mp_payer_id: string | null
  mp_preference_id: string | null
  mp_status: string | null
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  trial_start: string | null
  trial_end: string | null
  canceled_at: string | null
  cancel_at_period_end: boolean
  billing_cycle: BillingCycle
  created_at: string
  updated_at: string
}

export interface PaymentMethod {
  id: string
  agency_id: string
  mp_payment_method_id: string | null
  mp_card_id: string | null
  mp_payer_id: string
  type: PaymentMethodType
  card_first6?: string | null
  card_brand: string | null
  card_last4: string | null
  card_exp_month: number | null
  card_exp_year: number | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UsageMetrics {
  id: string
  agency_id: string
  period_start: string
  period_end: string
  operations_count: number
  api_calls_count: number
  storage_bytes: number
  users_count: number
  integrations_count: number
  created_at: string
  updated_at: string
}

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan
}
