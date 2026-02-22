export interface TeamChannel {
  id: string
  agency_id: string
  type: "channel" | "dm"
  name: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TeamChannelWithMeta extends TeamChannel {
  member_count: number
  unread_count: number
  last_message: {
    content: string
    sender_name: string
    created_at: string
  } | null
  // Para DMs: info del otro participante
  dm_partner?: {
    id: string
    name: string
    email: string
  }
}

export interface TeamMessage {
  id: string
  channel_id: string
  sender_id: string
  content: string
  created_at: string
  updated_at: string
  sender_name?: string
  sender_email?: string
}

export interface TeamChannelMember {
  id: string
  channel_id: string
  user_id: string
  last_read_at: string
  joined_at: string
}

export interface AgencyMember {
  id: string
  name: string
  email: string
  role: string
}
