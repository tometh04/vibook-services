export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      afip_config: {
        Row: {
          agency_id: string | null
          automation_status: string | null
          created_at: string | null
          cuit: string
          environment: string | null
          id: string
          is_active: boolean | null
          punto_venta: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          automation_status?: string | null
          created_at?: string | null
          cuit: string
          environment?: string | null
          id?: string
          is_active?: boolean | null
          punto_venta?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          automation_status?: string | null
          created_at?: string | null
          cuit?: string
          environment?: string | null
          id?: string
          is_active?: boolean | null
          punto_venta?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afip_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          city: string
          created_at: string | null
          has_used_trial: boolean | null
          id: string
          name: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          has_used_trial?: boolean | null
          id?: string
          name: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          has_used_trial?: boolean | null
          id?: string
          name?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          agency_id: string | null
          created_at: string | null
          customer_id: string | null
          date_due: string
          description: string
          id: string
          operation_id: string | null
          payment_id: string | null
          priority: string | null
          snoozed_until: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          date_due: string
          description: string
          id?: string
          operation_id?: string | null
          payment_id?: string | null
          priority?: string | null
          snoozed_until?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          date_due?: string
          description?: string
          id?: string
          operation_id?: string | null
          payment_id?: string | null
          priority?: string | null
          snoozed_until?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          agency_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          agency_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          mp_notification_id: string | null
          mp_payment_id: string | null
          subscription_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          mp_notification_id?: string | null
          mp_payment_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          mp_notification_id?: string | null
          mp_payment_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_boxes: {
        Row: {
          agency_id: string
          box_type: string
          created_at: string | null
          created_by: string | null
          currency: string
          current_balance: number | null
          description: string | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          box_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_balance?: number | null
          description?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          box_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_balance?: number | null
          description?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_boxes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_boxes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          account_id: string | null
          agency_id: string | null
          amount: number
          cash_box_id: string | null
          category: string
          created_at: string | null
          currency: string
          id: string
          is_touristic: boolean | null
          ledger_movement_id: string | null
          movement_date: string
          notes: string | null
          operation_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          agency_id?: string | null
          amount: number
          cash_box_id?: string | null
          category: string
          created_at?: string | null
          currency?: string
          id?: string
          is_touristic?: boolean | null
          ledger_movement_id?: string | null
          movement_date: string
          notes?: string | null
          operation_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          agency_id?: string | null
          amount?: number
          cash_box_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_touristic?: boolean | null
          ledger_movement_id?: string | null
          movement_date?: string
          notes?: string | null
          operation_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_ledger_movement_id_fkey"
            columns: ["ledger_movement_id"]
            isOneToOne: false
            referencedRelation: "ledger_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          agency_id: string
          amount: number
          created_at: string | null
          created_by: string
          currency: string
          exchange_rate: number | null
          from_box_id: string
          id: string
          notes: string | null
          reference: string | null
          status: string
          to_box_id: string
          transfer_date: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          amount: number
          created_at?: string | null
          created_by: string
          currency: string
          exchange_rate?: number | null
          from_box_id: string
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string
          to_box_id: string
          transfer_date: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string
          currency?: string
          exchange_rate?: number | null
          from_box_id?: string
          id?: string
          notes?: string | null
          reference?: string | null
          status?: string
          to_box_id?: string
          transfer_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_from_box_id_fkey"
            columns: ["from_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_box_id_fkey"
            columns: ["to_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string | null
          agency_id: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_movement_account: boolean | null
          level: number
          parent_id: string | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type?: string | null
          agency_id?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_movement_account?: boolean | null
          level?: number
          parent_id?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string | null
          agency_id?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_movement_account?: boolean | null
          level?: number
          parent_id?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agency_id: string | null
          channel: string
          created_at: string | null
          id: string
          last_message_at: string | null
          last_search_context: Json | null
          state: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_search_context?: Json | null
          state?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_search_context?: Json | null
          state?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_settings: {
        Row: {
          agency_id: string
          created_at: string | null
          custom_fields_config: Json | null
          id: string
          require_address: boolean | null
          require_document: boolean | null
          require_passport: boolean | null
          show_instagram_field: boolean | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          custom_fields_config?: Json | null
          id?: string
          require_address?: boolean | null
          require_document?: boolean | null
          require_passport?: boolean | null
          show_instagram_field?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          custom_fields_config?: Json | null
          id?: string
          require_address?: boolean | null
          require_document?: boolean | null
          require_passport?: boolean | null
          show_instagram_field?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          agency_id: string
          city: string | null
          country: string | null
          created_at: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          document_number: string | null
          document_type: string | null
          email: string
          first_name: string
          id: string
          instagram_handle: string | null
          last_name: string
          nationality: string | null
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string
          procedure_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          email: string
          first_name: string
          id?: string
          instagram_handle?: string | null
          last_name: string
          nationality?: string | null
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone: string
          procedure_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string
          first_name?: string
          id?: string
          instagram_handle?: string | null
          last_name?: string
          nationality?: string | null
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string
          procedure_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          customer_id: string | null
          file_name: string | null
          file_url: string
          id: string
          lead_id: string | null
          operation_id: string | null
          passenger_id: string | null
          type: string
          uploaded_at: string | null
          uploaded_by_user_id: string
        }
        Insert: {
          customer_id?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          lead_id?: string | null
          operation_id?: string | null
          passenger_id?: string | null
          type: string
          uploaded_at?: string | null
          uploaded_by_user_id: string
        }
        Update: {
          customer_id?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          lead_id?: string | null
          operation_id?: string | null
          passenger_id?: string | null
          type?: string
          uploaded_at?: string | null
          uploaded_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "operation_passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency_from: string
          currency_to: string
          effective_date: string
          id: string
          rate: number
          source: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency_from?: string
          currency_to?: string
          effective_date: string
          id?: string
          rate: number
          source?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency_from?: string
          currency_to?: string
          effective_date?: string
          id?: string
          rate?: number
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_number: string | null
          agency_id: string | null
          asset_description: string | null
          asset_quantity: number | null
          asset_type: string | null
          bank_name: string | null
          card_expiry_date: string | null
          card_holder: string | null
          card_number: string | null
          chart_account_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          current_balance: number | null
          id: string
          initial_balance: number
          is_active: boolean | null
          name: string
          notes: string | null
          type: string
        }
        Insert: {
          account_number?: string | null
          agency_id?: string | null
          asset_description?: string | null
          asset_quantity?: number | null
          asset_type?: string | null
          bank_name?: string | null
          card_expiry_date?: string | null
          card_holder?: string | null
          card_number?: string | null
          chart_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency: string
          current_balance?: number | null
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          name: string
          notes?: string | null
          type: string
        }
        Update: {
          account_number?: string | null
          agency_id?: string | null
          asset_description?: string | null
          asset_quantity?: number | null
          asset_type?: string | null
          bank_name?: string | null
          card_expiry_date?: string | null
          card_holder?: string | null
          card_number?: string | null
          chart_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_balance?: number | null
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          name?: string
          notes?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          agency_id: string
          created_at: string | null
          default_exchange_rate: number | null
          default_payment_method: string | null
          id: string
          iva_percentage: number | null
          show_iva_breakdown: boolean | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          default_exchange_rate?: number | null
          default_payment_method?: string | null
          id?: string
          iva_percentage?: number | null
          show_iva_breakdown?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          default_exchange_rate?: number | null
          default_payment_method?: string | null
          id?: string
          iva_percentage?: number | null
          show_iva_breakdown?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          agency_id: string
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          name: string
          sync_frequency_minutes: number | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          agency_id: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          name: string
          sync_frequency_minutes?: number | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          agency_id?: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          name?: string
          sync_frequency_minutes?: number | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          event_type: string
          id: string
          integration_config_id: string
          request_data: Json | null
          response_data: Json | null
          source_ip: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          event_type: string
          id?: string
          integration_config_id: string
          request_data?: Json | null
          response_data?: Json | null
          source_ip?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          event_type?: string
          id?: string
          integration_config_id?: string
          request_data?: Json | null
          response_data?: Json | null
          source_ip?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_integration_config_id_fkey"
            columns: ["integration_config_id"]
            isOneToOne: false
            referencedRelation: "integration_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_check_results: {
        Row: {
          affected_entities: Json | null
          check_type: string
          checked_at: string | null
          description: string | null
          id: string
          is_latest: boolean | null
          metadata: Json | null
          status: string
        }
        Insert: {
          affected_entities?: Json | null
          check_type: string
          checked_at?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean | null
          metadata?: Json | null
          status: string
        }
        Update: {
          affected_entities?: Json | null
          check_type?: string
          checked_at?: string | null
          description?: string | null
          id?: string
          is_latest?: boolean | null
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          cantidad: number
          created_at: string | null
          descripcion: string
          id: string
          invoice_id: string
          iva_id: number
          iva_importe: number
          iva_porcentaje: number
          orden: number | null
          precio_unitario: number
          subtotal: number
          total: number
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          descripcion: string
          id?: string
          invoice_id: string
          iva_id?: number
          iva_importe?: number
          iva_porcentaje?: number
          orden?: number | null
          precio_unitario: number
          subtotal: number
          total: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          descripcion?: string
          id?: string
          invoice_id?: string
          iva_id?: number
          iva_importe?: number
          iva_porcentaje?: number
          orden?: number | null
          precio_unitario?: number
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          afip_response: Json | null
          agency_id: string
          cae: string | null
          cae_fch_vto: string | null
          cbte_nro: number | null
          cbte_tipo: number
          concepto: number | null
          cotizacion: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          fch_serv_desde: string | null
          fch_serv_hasta: string | null
          fecha_emision: string | null
          fecha_vto_pago: string | null
          id: string
          imp_iva: number
          imp_neto: number
          imp_op_ex: number | null
          imp_tot_conc: number | null
          imp_total: number
          imp_trib: number | null
          moneda: string | null
          notes: string | null
          operation_id: string | null
          pdf_url: string | null
          pto_vta: number
          receptor_condicion_iva: number | null
          receptor_doc_nro: string
          receptor_doc_tipo: number
          receptor_domicilio: string | null
          receptor_nombre: string
          status: string
          updated_at: string | null
        }
        Insert: {
          afip_response?: Json | null
          agency_id: string
          cae?: string | null
          cae_fch_vto?: string | null
          cbte_nro?: number | null
          cbte_tipo: number
          concepto?: number | null
          cotizacion?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          fch_serv_desde?: string | null
          fch_serv_hasta?: string | null
          fecha_emision?: string | null
          fecha_vto_pago?: string | null
          id?: string
          imp_iva?: number
          imp_neto?: number
          imp_op_ex?: number | null
          imp_tot_conc?: number | null
          imp_total?: number
          imp_trib?: number | null
          moneda?: string | null
          notes?: string | null
          operation_id?: string | null
          pdf_url?: string | null
          pto_vta: number
          receptor_condicion_iva?: number | null
          receptor_doc_nro: string
          receptor_doc_tipo?: number
          receptor_domicilio?: string | null
          receptor_nombre: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          afip_response?: Json | null
          agency_id?: string
          cae?: string | null
          cae_fch_vto?: string | null
          cbte_nro?: number | null
          cbte_tipo?: number
          concepto?: number | null
          cotizacion?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          fch_serv_desde?: string | null
          fch_serv_hasta?: string | null
          fecha_emision?: string | null
          fecha_vto_pago?: string | null
          id?: string
          imp_iva?: number
          imp_neto?: number
          imp_op_ex?: number | null
          imp_tot_conc?: number | null
          imp_total?: number
          imp_trib?: number | null
          moneda?: string | null
          notes?: string | null
          operation_id?: string | null
          pdf_url?: string | null
          pto_vta?: number
          receptor_condicion_iva?: number | null
          receptor_doc_nro?: string
          receptor_doc_tipo?: number
          receptor_domicilio?: string | null
          receptor_nombre?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      iva_purchases: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          iva_amount: number
          net_amount: number
          operation_id: string
          operator_cost_total: number
          operator_id: string | null
          purchase_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency: string
          id?: string
          iva_amount: number
          net_amount: number
          operation_id: string
          operator_cost_total: number
          operator_id?: string | null
          purchase_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          iva_amount?: number
          net_amount?: number
          operation_id?: string
          operator_cost_total?: number
          operator_id?: string | null
          purchase_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iva_purchases_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iva_purchases_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      iva_sales: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          iva_amount: number
          net_amount: number
          operation_id: string
          sale_amount_total: number
          sale_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency: string
          id?: string
          iva_amount: number
          net_amount: number
          operation_id: string
          sale_amount_total: number
          sale_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          iva_amount?: number
          net_amount?: number
          operation_id?: string
          sale_amount_total?: number
          sale_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iva_sales_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          adults: number | null
          agency_id: string
          assigned_seller_id: string | null
          budget_currency: string | null
          budget_max: number | null
          budget_min: number | null
          children: number | null
          contact_email: string | null
          contact_instagram: string | null
          contact_name: string
          contact_phone: string
          created_at: string | null
          departure_date: string | null
          destination: string
          external_id: string | null
          external_url: string | null
          id: string
          infants: number | null
          list_name: string | null
          notes: string | null
          priority: number | null
          region: string
          return_date: string | null
          source: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          adults?: number | null
          agency_id: string
          assigned_seller_id?: string | null
          budget_currency?: string | null
          budget_max?: number | null
          budget_min?: number | null
          children?: number | null
          contact_email?: string | null
          contact_instagram?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string | null
          departure_date?: string | null
          destination: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          infants?: number | null
          list_name?: string | null
          notes?: string | null
          priority?: number | null
          region: string
          return_date?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          adults?: number | null
          agency_id?: string
          assigned_seller_id?: string | null
          budget_currency?: string | null
          budget_max?: number | null
          budget_min?: number | null
          children?: number | null
          contact_email?: string | null
          contact_instagram?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string | null
          departure_date?: string | null
          destination?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          infants?: number | null
          list_name?: string | null
          notes?: string | null
          priority?: number | null
          region?: string
          return_date?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_movements: {
        Row: {
          account_id: string | null
          agency_id: string | null
          amount_ars_equivalent: number
          amount_original: number
          concept: string
          created_at: string | null
          created_by: string | null
          currency: string
          exchange_rate: number | null
          id: string
          lead_id: string | null
          method: string
          notes: string | null
          operation_id: string | null
          operator_id: string | null
          receipt_number: string | null
          seller_id: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          agency_id?: string | null
          amount_ars_equivalent: number
          amount_original: number
          concept: string
          created_at?: string | null
          created_by?: string | null
          currency: string
          exchange_rate?: number | null
          id?: string
          lead_id?: string | null
          method: string
          notes?: string | null
          operation_id?: string | null
          operator_id?: string | null
          receipt_number?: string | null
          seller_id?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          agency_id?: string | null
          amount_ars_equivalent?: number
          amount_original?: number
          concept?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          exchange_rate?: number | null
          id?: string
          lead_id?: string | null
          method?: string
          notes?: string | null
          operation_id?: string | null
          operator_id?: string | null
          receipt_number?: string | null
          seller_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_movements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_movements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_movements_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_movements_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_movements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          agency_id: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          emoji_prefix: string | null
          id: string
          is_active: boolean | null
          name: string
          send_hour_from: number | null
          send_hour_to: number | null
          template: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emoji_prefix?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          send_hour_from?: number | null
          send_hour_to?: number | null
          template: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          emoji_prefix?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          send_hour_from?: number | null
          send_hour_to?: number | null
          template?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          api_request_id: string | null
          api_search_id: string | null
          client_id: string | null
          content: Json
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          api_request_id?: string | null
          api_search_id?: string | null
          client_id?: string | null
          content: Json
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          api_request_id?: string | null
          api_search_id?: string | null
          client_id?: string | null
          content?: Json
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      note_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          note_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          note_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          note_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      note_comments: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          note_id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_id: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "note_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          agency_id: string
          color: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          is_pinned: boolean | null
          note_type: string
          operation_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          agency_id: string
          color?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_pinned?: boolean | null
          note_type?: string
          operation_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          agency_id?: string
          color?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_pinned?: boolean | null
          note_type?: string
          operation_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_customers: {
        Row: {
          customer_id: string
          id: string
          operation_id: string
          role: string
        }
        Insert: {
          customer_id: string
          id?: string
          operation_id: string
          role?: string
        }
        Update: {
          customer_id?: string
          id?: string
          operation_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_customers_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_operators: {
        Row: {
          cost_amount: number
          created_at: string | null
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          operation_id: string
          operator_id: string
          status: string | null
        }
        Insert: {
          cost_amount?: number
          created_at?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          operation_id: string
          operator_id: string
          status?: string | null
        }
        Update: {
          cost_amount?: number
          created_at?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          operation_id?: string
          operator_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_operators_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_operators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_passengers: {
        Row: {
          created_at: string | null
          customer_id: string | null
          date_of_birth: string | null
          document_number: string | null
          document_type: string | null
          first_name: string
          id: string
          is_main: boolean | null
          last_name: string
          nationality: string | null
          operation_id: string
          passport_expiry: string | null
          passport_number: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          first_name: string
          id?: string
          is_main?: boolean | null
          last_name: string
          nationality?: string | null
          operation_id: string
          passport_expiry?: string | null
          passport_number?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          first_name?: string
          id?: string
          is_main?: boolean | null
          last_name?: string
          nationality?: string | null
          operation_id?: string
          passport_expiry?: string | null
          passport_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_passengers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_passengers_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_settings: {
        Row: {
          agency_id: string
          alert_operator_payment_days: number | null
          alert_payment_due_days: number | null
          alert_upcoming_trip_days: number | null
          auto_alerts: Json | null
          auto_create_iva_entry: boolean | null
          auto_create_ledger_entry: boolean | null
          auto_create_operator_payment: boolean | null
          auto_create_payment_plan: boolean | null
          auto_generate_invoice: boolean | null
          auto_generate_quotation: boolean | null
          created_at: string | null
          created_by: string | null
          custom_statuses: Json | null
          default_currency: string | null
          default_payment_terms: number | null
          default_status: string | null
          document_templates: Json | null
          id: string
          require_customer: boolean | null
          require_departure_date: boolean | null
          require_destination: boolean | null
          require_documents_before_confirmation: boolean | null
          require_operator: boolean | null
          updated_at: string | null
          updated_by: string | null
          workflows: Json | null
        }
        Insert: {
          agency_id: string
          alert_operator_payment_days?: number | null
          alert_payment_due_days?: number | null
          alert_upcoming_trip_days?: number | null
          auto_alerts?: Json | null
          auto_create_iva_entry?: boolean | null
          auto_create_ledger_entry?: boolean | null
          auto_create_operator_payment?: boolean | null
          auto_create_payment_plan?: boolean | null
          auto_generate_invoice?: boolean | null
          auto_generate_quotation?: boolean | null
          created_at?: string | null
          created_by?: string | null
          custom_statuses?: Json | null
          default_currency?: string | null
          default_payment_terms?: number | null
          default_status?: string | null
          document_templates?: Json | null
          id?: string
          require_customer?: boolean | null
          require_departure_date?: boolean | null
          require_destination?: boolean | null
          require_documents_before_confirmation?: boolean | null
          require_operator?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          workflows?: Json | null
        }
        Update: {
          agency_id?: string
          alert_operator_payment_days?: number | null
          alert_payment_due_days?: number | null
          alert_upcoming_trip_days?: number | null
          auto_alerts?: Json | null
          auto_create_iva_entry?: boolean | null
          auto_create_ledger_entry?: boolean | null
          auto_create_operator_payment?: boolean | null
          auto_create_payment_plan?: boolean | null
          auto_generate_invoice?: boolean | null
          auto_generate_quotation?: boolean | null
          created_at?: string | null
          created_by?: string | null
          custom_statuses?: Json | null
          default_currency?: string | null
          default_payment_terms?: number | null
          default_status?: string | null
          document_templates?: Json | null
          id?: string
          require_customer?: boolean | null
          require_departure_date?: boolean | null
          require_destination?: boolean | null
          require_documents_before_confirmation?: boolean | null
          require_operator?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          workflows?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          adults: number | null
          agency_id: string
          billing_margin: number | null
          billing_margin_amount: number | null
          billing_margin_percentage: number | null
          checkin_date: string | null
          checkout_date: string | null
          children: number | null
          created_at: string | null
          currency: string
          departure_date: string | null
          destination: string
          file_code: string | null
          id: string
          infants: number | null
          invoice_cae: string | null
          invoice_date: string | null
          invoice_number: string | null
          lead_id: string | null
          margin_amount: number
          margin_percentage: number
          notes: string | null
          operation_date: string | null
          operator_cost: number
          operator_cost_currency: string | null
          operator_id: string | null
          origin: string | null
          passengers: Json | null
          product_type: string | null
          reservation_code_air: string | null
          reservation_code_hotel: string | null
          return_date: string | null
          sale_amount_total: number
          sale_currency: string | null
          seller_id: string
          seller_secondary_id: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          adults?: number | null
          agency_id: string
          billing_margin?: number | null
          billing_margin_amount?: number | null
          billing_margin_percentage?: number | null
          checkin_date?: string | null
          checkout_date?: string | null
          children?: number | null
          created_at?: string | null
          currency?: string
          departure_date?: string | null
          destination: string
          file_code?: string | null
          id?: string
          infants?: number | null
          invoice_cae?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          lead_id?: string | null
          margin_amount: number
          margin_percentage: number
          notes?: string | null
          operation_date?: string | null
          operator_cost: number
          operator_cost_currency?: string | null
          operator_id?: string | null
          origin?: string | null
          passengers?: Json | null
          product_type?: string | null
          reservation_code_air?: string | null
          reservation_code_hotel?: string | null
          return_date?: string | null
          sale_amount_total: number
          sale_currency?: string | null
          seller_id: string
          seller_secondary_id?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          adults?: number | null
          agency_id?: string
          billing_margin?: number | null
          billing_margin_amount?: number | null
          billing_margin_percentage?: number | null
          checkin_date?: string | null
          checkout_date?: string | null
          children?: number | null
          created_at?: string | null
          currency?: string
          departure_date?: string | null
          destination?: string
          file_code?: string | null
          id?: string
          infants?: number | null
          invoice_cae?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          lead_id?: string | null
          margin_amount?: number
          margin_percentage?: number
          notes?: string | null
          operation_date?: string | null
          operator_cost?: number
          operator_cost_currency?: string | null
          operator_id?: string | null
          origin?: string | null
          passengers?: Json | null
          product_type?: string | null
          reservation_code_air?: string | null
          reservation_code_hotel?: string | null
          return_date?: string | null
          sale_amount_total?: number
          sale_currency?: string | null
          seller_id?: string
          seller_secondary_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_seller_secondary_id_fkey"
            columns: ["seller_secondary_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          due_date: string
          id: string
          ledger_movement_id: string | null
          notes: string | null
          operation_id: string | null
          operator_id: string
          paid_amount: number
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          due_date: string
          id?: string
          ledger_movement_id?: string | null
          notes?: string | null
          operation_id?: string | null
          operator_id: string
          paid_amount?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          due_date?: string
          id?: string
          ledger_movement_id?: string | null
          notes?: string | null
          operation_id?: string | null
          operator_id?: string
          paid_amount?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_payments_ledger_movement_id_fkey"
            columns: ["ledger_movement_id"]
            isOneToOne: false
            referencedRelation: "ledger_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_payments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_payments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          agency_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          credit_limit: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_accounts: {
        Row: {
          agency_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          partner_name: string
          profit_percentage: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          partner_name: string
          profit_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          partner_name?: string
          profit_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_withdrawals: {
        Row: {
          account_id: string | null
          amount: number
          cash_movement_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          description: string | null
          id: string
          ledger_movement_id: string | null
          partner_id: string
          withdrawal_date: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          cash_movement_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          ledger_movement_id?: string | null
          partner_id: string
          withdrawal_date: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          cash_movement_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          ledger_movement_id?: string | null
          partner_id?: string
          withdrawal_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_withdrawals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_withdrawals_cash_movement_id_fkey"
            columns: ["cash_movement_id"]
            isOneToOne: false
            referencedRelation: "cash_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_withdrawals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_withdrawals_ledger_movement_id_fkey"
            columns: ["ledger_movement_id"]
            isOneToOne: false
            referencedRelation: "ledger_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_withdrawals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          agency_id: string
          card_brand: string | null
          card_first6: string | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          mp_card_id: string | null
          mp_payer_id: string
          mp_payment_method_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          card_brand?: string | null
          card_first6?: string | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          mp_card_id?: string | null
          mp_payer_id: string
          mp_payment_method_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          card_brand?: string | null
          card_first6?: string | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          mp_card_id?: string | null
          mp_payer_id?: string
          mp_payment_method_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string
          amount: number
          amount_usd: number | null
          created_at: string | null
          currency: string
          date_due: string
          date_paid: string | null
          direction: string
          exchange_rate: number | null
          id: string
          method: string
          operation_id: string
          payer_type: string
          reference: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          amount: number
          amount_usd?: number | null
          created_at?: string | null
          currency?: string
          date_due: string
          date_paid?: string | null
          direction: string
          exchange_rate?: number | null
          id?: string
          method: string
          operation_id: string
          payer_type: string
          reference?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          amount_usd?: number | null
          created_at?: string | null
          currency?: string
          date_due?: string
          date_paid?: string | null
          direction?: string
          exchange_rate?: number | null
          id?: string
          method?: string
          operation_id?: string
          payer_type?: string
          reference?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      quota_reservations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          operation_id: string | null
          quantity: number
          quota_id: string
          quotation_id: string | null
          released_at: string | null
          reserved_until: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          operation_id?: string | null
          quantity: number
          quota_id: string
          quotation_id?: string | null
          released_at?: string | null
          reserved_until?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          operation_id?: string | null
          quantity?: number
          quota_id?: string
          quotation_id?: string | null
          released_at?: string | null
          reserved_until?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quota_reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_reservations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_reservations_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_reservations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotas: {
        Row: {
          accommodation_name: string | null
          agency_id: string | null
          available_quota: number | null
          created_at: string | null
          created_by: string | null
          date_from: string
          date_to: string
          destination: string
          id: string
          is_active: boolean | null
          notes: string | null
          operator_id: string
          reserved_quota: number | null
          room_type: string | null
          tariff_id: string | null
          total_quota: number
          updated_at: string | null
        }
        Insert: {
          accommodation_name?: string | null
          agency_id?: string | null
          available_quota?: number | null
          created_at?: string | null
          created_by?: string | null
          date_from: string
          date_to: string
          destination: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          operator_id: string
          reserved_quota?: number | null
          room_type?: string | null
          tariff_id?: string | null
          total_quota: number
          updated_at?: string | null
        }
        Update: {
          accommodation_name?: string | null
          agency_id?: string | null
          available_quota?: number | null
          created_at?: string | null
          created_by?: string | null
          date_from?: string
          date_to?: string
          destination?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          operator_id?: string
          reserved_quota?: number | null
          room_type?: string | null
          tariff_id?: string | null
          total_quota?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotas_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string | null
          currency: string
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          item_type: string
          notes: string | null
          order_index: number | null
          quantity: number | null
          quotation_id: string
          subtotal: number
          tariff_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          item_type: string
          notes?: string | null
          order_index?: number | null
          quantity?: number | null
          quotation_id: string
          subtotal: number
          tariff_id?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          item_type?: string
          notes?: string | null
          order_index?: number | null
          quantity?: number | null
          quotation_id?: string
          subtotal?: number
          tariff_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          adults: number | null
          agency_id: string
          approved_at: string | null
          approved_by: string | null
          children: number | null
          converted_at: string | null
          created_at: string | null
          created_by: string
          currency: string
          departure_date: string
          destination: string
          discounts: number | null
          id: string
          infants: number | null
          lead_id: string | null
          notes: string | null
          operation_id: string | null
          operator_id: string | null
          origin: string | null
          quotation_number: string
          region: string
          rejection_reason: string | null
          return_date: string | null
          seller_id: string
          status: string
          subtotal: number
          taxes: number | null
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string | null
          valid_until: string
        }
        Insert: {
          adults?: number | null
          agency_id: string
          approved_at?: string | null
          approved_by?: string | null
          children?: number | null
          converted_at?: string | null
          created_at?: string | null
          created_by: string
          currency?: string
          departure_date: string
          destination: string
          discounts?: number | null
          id?: string
          infants?: number | null
          lead_id?: string | null
          notes?: string | null
          operation_id?: string | null
          operator_id?: string | null
          origin?: string | null
          quotation_number: string
          region: string
          rejection_reason?: string | null
          return_date?: string | null
          seller_id: string
          status?: string
          subtotal?: number
          taxes?: number | null
          terms_and_conditions?: string | null
          total_amount: number
          updated_at?: string | null
          valid_until: string
        }
        Update: {
          adults?: number | null
          agency_id?: string
          approved_at?: string | null
          approved_by?: string | null
          children?: number | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string
          departure_date?: string
          destination?: string
          discounts?: number | null
          id?: string
          infants?: number | null
          lead_id?: string | null
          notes?: string | null
          operation_id?: string | null
          operator_id?: string | null
          origin?: string | null
          quotation_number?: string
          region?: string
          rejection_reason?: string | null
          return_date?: string | null
          seller_id?: string
          status?: string
          subtotal?: number
          taxes?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payment_categories: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          agency_id: string | null
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          description: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          next_due_date: string
          notes: string | null
          operator_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency: string
          description: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          next_due_date: string
          notes?: string | null
          operator_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          next_due_date?: string
          notes?: string | null
          operator_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "recurring_payment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_api_calls_per_day: number | null
          max_integrations: number | null
          max_operations_per_month: number | null
          max_storage_mb: number | null
          max_users: number | null
          mp_preapproval_amount: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_api_calls_per_day?: number | null
          max_integrations?: number | null
          max_operations_per_month?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          mp_preapproval_amount?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_api_calls_per_day?: number | null
          max_integrations?: number | null
          max_operations_per_month?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          mp_preapproval_amount?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          agency_id: string
          billing_cycle: string
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          last_payment_attempt: string | null
          mp_payer_id: string | null
          mp_preapproval_id: string | null
          mp_preference_id: string | null
          mp_status: string | null
          payment_attempts: number | null
          payment_attempts_reset_date: string | null
          plan_id: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          last_payment_attempt?: string | null
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          mp_preference_id?: string | null
          mp_status?: string | null
          payment_attempts?: number | null
          payment_attempts_reset_date?: string | null
          plan_id: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          last_payment_attempt?: string | null
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          mp_preference_id?: string | null
          mp_status?: string | null
          payment_attempts?: number | null
          payment_attempts_reset_date?: string | null
          plan_id?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      tariff_items: {
        Row: {
          base_price: number
          category: string
          created_at: string | null
          discount_percentage: number | null
          id: string
          is_available: boolean | null
          max_nights: number | null
          max_pax: number | null
          min_nights: number | null
          min_pax: number | null
          notes: string | null
          occupancy_type: string | null
          order_index: number | null
          price_per_night: boolean | null
          price_per_person: boolean | null
          room_type: string | null
          tariff_id: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_available?: boolean | null
          max_nights?: number | null
          max_pax?: number | null
          min_nights?: number | null
          min_pax?: number | null
          notes?: string | null
          occupancy_type?: string | null
          order_index?: number | null
          price_per_night?: boolean | null
          price_per_person?: boolean | null
          room_type?: string | null
          tariff_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_available?: boolean | null
          max_nights?: number | null
          max_pax?: number | null
          min_nights?: number | null
          min_pax?: number | null
          notes?: string | null
          occupancy_type?: string | null
          order_index?: number | null
          price_per_night?: boolean | null
          price_per_person?: boolean | null
          room_type?: string | null
          tariff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariff_items_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      tariffs: {
        Row: {
          agency_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          description: string | null
          destination: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          operator_id: string
          region: string
          tariff_type: string
          terms_and_conditions: string | null
          updated_at: string | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          destination: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          operator_id: string
          region: string
          tariff_type: string
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_from: string
          valid_to: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          destination?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          operator_id?: string
          region?: string
          tariff_type?: string
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariffs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariffs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariffs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          agency_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          leader_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leader_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leader_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string | null
          agency_id: string
          app_name: string | null
          brand_name: string
          company_address_line1: string | null
          company_address_line2: string | null
          company_city: string | null
          company_country: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_postal_code: string | null
          company_state: string | null
          company_tax_id: string | null
          created_at: string | null
          email_footer_text: string | null
          email_from_address: string | null
          email_from_name: string | null
          facebook_url: string | null
          favicon_url: string | null
          id: string
          instagram_url: string | null
          logo_dark_url: string | null
          logo_url: string | null
          palette_id: string | null
          primary_color: string | null
          secondary_color: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_whatsapp: string | null
          support_email: string | null
          support_phone: string | null
          support_whatsapp: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          agency_id: string
          app_name?: string | null
          brand_name?: string
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_postal_code?: string | null
          company_state?: string | null
          company_tax_id?: string | null
          created_at?: string | null
          email_footer_text?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          palette_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_whatsapp?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          agency_id?: string
          app_name?: string | null
          brand_name?: string
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_postal_code?: string | null
          company_state?: string | null
          company_tax_id?: string | null
          created_at?: string | null
          email_footer_text?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          palette_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_whatsapp?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_settings: {
        Row: {
          agency_id: string
          backups_enabled: boolean | null
          backups_frequency: string | null
          backups_include_attachments: boolean | null
          backups_retention_days: number | null
          created_at: string | null
          created_by: string | null
          email_enabled: boolean | null
          email_from_address: string | null
          email_from_name: string | null
          email_provider: string | null
          email_reply_to: string | null
          email_signature: string | null
          email_templates: Json | null
          emilia_allowed_actions: Json | null
          emilia_enabled: boolean | null
          emilia_max_tokens: number | null
          emilia_model: string | null
          emilia_system_prompt: string | null
          emilia_temperature: number | null
          enable_auto_alerts: boolean | null
          enable_emilia_search: boolean | null
          enable_whatsapp_templates: boolean | null
          export_company_info: Json | null
          export_currency_format: string | null
          export_date_format: string | null
          export_default_format: string | null
          export_include_headers: boolean | null
          export_logo_url: string | null
          id: string
          notifications_desktop: boolean | null
          notifications_digest_frequency: string | null
          notifications_email_digest: boolean | null
          notifications_enabled: boolean | null
          notifications_sound: boolean | null
          ui_compact_mode: boolean | null
          ui_date_format: string | null
          ui_default_currency_display: string | null
          ui_language: string | null
          ui_show_tooltips: boolean | null
          ui_sidebar_collapsed: boolean | null
          ui_theme: string | null
          ui_time_format: string | null
          updated_at: string | null
          updated_by: string | null
          whatsapp_api_key: string | null
          whatsapp_default_country_code: string | null
          whatsapp_provider: string | null
          whatsapp_templates: Json | null
        }
        Insert: {
          agency_id: string
          backups_enabled?: boolean | null
          backups_frequency?: string | null
          backups_include_attachments?: boolean | null
          backups_retention_days?: number | null
          created_at?: string | null
          created_by?: string | null
          email_enabled?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_provider?: string | null
          email_reply_to?: string | null
          email_signature?: string | null
          email_templates?: Json | null
          emilia_allowed_actions?: Json | null
          emilia_enabled?: boolean | null
          emilia_max_tokens?: number | null
          emilia_model?: string | null
          emilia_system_prompt?: string | null
          emilia_temperature?: number | null
          enable_auto_alerts?: boolean | null
          enable_emilia_search?: boolean | null
          enable_whatsapp_templates?: boolean | null
          export_company_info?: Json | null
          export_currency_format?: string | null
          export_date_format?: string | null
          export_default_format?: string | null
          export_include_headers?: boolean | null
          export_logo_url?: string | null
          id?: string
          notifications_desktop?: boolean | null
          notifications_digest_frequency?: string | null
          notifications_email_digest?: boolean | null
          notifications_enabled?: boolean | null
          notifications_sound?: boolean | null
          ui_compact_mode?: boolean | null
          ui_date_format?: string | null
          ui_default_currency_display?: string | null
          ui_language?: string | null
          ui_show_tooltips?: boolean | null
          ui_sidebar_collapsed?: boolean | null
          ui_theme?: string | null
          ui_time_format?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_api_key?: string | null
          whatsapp_default_country_code?: string | null
          whatsapp_provider?: string | null
          whatsapp_templates?: Json | null
        }
        Update: {
          agency_id?: string
          backups_enabled?: boolean | null
          backups_frequency?: string | null
          backups_include_attachments?: boolean | null
          backups_retention_days?: number | null
          created_at?: string | null
          created_by?: string | null
          email_enabled?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_provider?: string | null
          email_reply_to?: string | null
          email_signature?: string | null
          email_templates?: Json | null
          emilia_allowed_actions?: Json | null
          emilia_enabled?: boolean | null
          emilia_max_tokens?: number | null
          emilia_model?: string | null
          emilia_system_prompt?: string | null
          emilia_temperature?: number | null
          enable_auto_alerts?: boolean | null
          enable_emilia_search?: boolean | null
          enable_whatsapp_templates?: boolean | null
          export_company_info?: Json | null
          export_currency_format?: string | null
          export_date_format?: string | null
          export_default_format?: string | null
          export_include_headers?: boolean | null
          export_logo_url?: string | null
          id?: string
          notifications_desktop?: boolean | null
          notifications_digest_frequency?: string | null
          notifications_email_digest?: boolean | null
          notifications_enabled?: boolean | null
          notifications_sound?: boolean | null
          ui_compact_mode?: boolean | null
          ui_date_format?: string | null
          ui_default_currency_display?: string | null
          ui_language?: string | null
          ui_show_tooltips?: boolean | null
          ui_sidebar_collapsed?: boolean | null
          ui_theme?: string | null
          ui_time_format?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_api_key?: string | null
          whatsapp_default_country_code?: string | null
          whatsapp_provider?: string | null
          whatsapp_templates?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          agency_id: string
          api_calls_count: number | null
          created_at: string | null
          id: string
          integrations_count: number | null
          operations_count: number | null
          period_end: string
          period_start: string
          storage_bytes: number | null
          updated_at: string | null
          users_count: number | null
        }
        Insert: {
          agency_id: string
          api_calls_count?: number | null
          created_at?: string | null
          id?: string
          integrations_count?: number | null
          operations_count?: number | null
          period_end: string
          period_start: string
          storage_bytes?: number | null
          updated_at?: string | null
          users_count?: number | null
        }
        Update: {
          agency_id?: string
          api_calls_count?: number | null
          created_at?: string | null
          id?: string
          integrations_count?: number | null
          operations_count?: number | null
          period_end?: string
          period_start?: string
          storage_bytes?: number | null
          updated_at?: string | null
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agencies: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          created_at: string | null
          email: string
          has_used_trial: boolean | null
          id: string
          is_active: boolean | null
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          email: string
          has_used_trial?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          email?: string
          has_used_trial?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          agency_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string
          id: string
          message: string
          operation_id: string | null
          payment_id: string | null
          phone: string
          quotation_id: string | null
          scheduled_for: string
          sent_at: string | null
          sent_by: string | null
          status: string | null
          template_id: string | null
          whatsapp_link: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          id?: string
          message: string
          operation_id?: string | null
          payment_id?: string | null
          phone: string
          quotation_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_id?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          id?: string
          message?: string
          operation_id?: string | null
          payment_id?: string | null
          phone?: string
          quotation_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          template_id?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_extend_period: {
        Args: {
          new_period_end: string
          reason_param?: string
          subscription_id_param: string
        }
        Returns: boolean
      }
      calculate_cash_box_balance: { Args: { box_id: string }; Returns: number }
      check_active_without_preapproval: { Args: never; Returns: Json }
      check_and_increment_operation_limit: {
        Args: { agency_id_param: string; limit_type_param?: string }
        Returns: Json
      }
      check_excessive_trial_extensions: { Args: never; Returns: Json }
      check_multiple_trials_per_user: { Args: never; Returns: Json }
      check_trial_extension_limits: {
        Args: { additional_days: number; subscription_id_param: string }
        Returns: boolean
      }
      check_usage_metrics_integrity: { Args: never; Returns: Json }
      cleanup_blocked_agencies: { Args: never; Returns: Json }
      create_security_alert: {
        Args: {
          alert_type_param: string
          description_param?: string
          entity_id_param?: string
          entity_type_param?: string
          metadata_param?: Json
          severity_param: string
          title_param: string
        }
        Returns: string
      }
      decrement_usage_count: {
        Args: {
          agency_id_param: string
          limit_type_param: string
          period_start_param: string
        }
        Returns: boolean
      }
      delete_blocked_agency_data: {
        Args: never
        Returns: {
          deleted_agencies: number
          deleted_customers: number
          deleted_leads: number
          deleted_operations: number
        }[]
      }
      execute_readonly_query: { Args: { query_text: string }; Returns: Json }
      generate_quotation_number: { Args: never; Returns: string }
      get_active_integration: {
        Args: { p_agency_id: string; p_integration_type: string }
        Returns: Json
      }
      get_system_config: { Args: { config_key: string }; Returns: string }
      increment_payment_attempt: {
        Args: { subscription_id_param: string }
        Returns: undefined
      }
      increment_user_count: {
        Args: { agency_id_param: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          action_type_param: string
          admin_user_id_param: string
          entity_id_param?: string
          entity_type_param: string
          ip_address_param?: string
          new_values_param?: Json
          old_values_param?: Json
          reason_param?: string
          user_agent_param?: string
        }
        Returns: string
      }
      reset_monthly_usage_limits: { Args: never; Returns: undefined }
      reset_payment_attempts: {
        Args: { subscription_id_param: string }
        Returns: undefined
      }
      run_all_integrity_checks: { Args: never; Returns: Json }
      set_system_config: {
        Args: { config_key: string; config_value: string }
        Returns: undefined
      }
      user_has_used_trial: { Args: { user_id_param: string }; Returns: boolean }
      validate_and_fix_trial_dates: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
