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
      access_codes: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          activation_limit: number | null
          activations_used: number | null
          bound_device: string | null
          bound_email: string | null
          code: string
          created_at: string
          created_by: string | null
          duration_days: number
          expires_at: string | null
          grade: Database["public"]["Enums"]["grade_level"]
          id: string
          ip_history: Json | null
          is_payment_generated: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          payment_order_id: string | null
          status: Database["public"]["Enums"]["code_status"]
          stream: Database["public"]["Enums"]["stream_type"]
          tier: Database["public"]["Enums"]["tier_type"]
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          activation_limit?: number | null
          activations_used?: number | null
          bound_device?: string | null
          bound_email?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          duration_days: number
          expires_at?: string | null
          grade: Database["public"]["Enums"]["grade_level"]
          id?: string
          ip_history?: Json | null
          is_payment_generated?: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          payment_order_id?: string | null
          status?: Database["public"]["Enums"]["code_status"]
          stream: Database["public"]["Enums"]["stream_type"]
          tier: Database["public"]["Enums"]["tier_type"]
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          activation_limit?: number | null
          activations_used?: number | null
          bound_device?: string | null
          bound_email?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          expires_at?: string | null
          grade?: Database["public"]["Enums"]["grade_level"]
          id?: string
          ip_history?: Json | null
          is_payment_generated?: boolean | null
          medium?: Database["public"]["Enums"]["medium_type"]
          payment_order_id?: string | null
          status?: Database["public"]["Enums"]["code_status"]
          stream?: Database["public"]["Enums"]["stream_type"]
          tier?: Database["public"]["Enums"]["tier_type"]
        }
        Relationships: []
      }
      cmo_payouts: {
        Row: {
          base_commission_amount: number | null
          base_commission_rate: number | null
          bonus_amount: number | null
          bonus_rate: number | null
          cmo_id: string
          created_at: string | null
          id: string
          net_revenue: number | null
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payout_month: string
          status: string
          total_commission: number | null
          total_creators: number | null
          total_paid_users: number | null
          updated_at: string | null
        }
        Insert: {
          base_commission_amount?: number | null
          base_commission_rate?: number | null
          bonus_amount?: number | null
          bonus_rate?: number | null
          cmo_id: string
          created_at?: string | null
          id?: string
          net_revenue?: number | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_month: string
          status?: string
          total_commission?: number | null
          total_creators?: number | null
          total_paid_users?: number | null
          updated_at?: string | null
        }
        Update: {
          base_commission_amount?: number | null
          base_commission_rate?: number | null
          bonus_amount?: number | null
          bonus_rate?: number | null
          cmo_id?: string
          created_at?: string | null
          id?: string
          net_revenue?: number | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_month?: string
          status?: string
          total_commission?: number | null
          total_creators?: number | null
          total_paid_users?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cmo_payouts_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cmo_profiles: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          referral_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          referral_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          referral_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      creator_payouts: {
        Row: {
          commission_amount: number | null
          commission_rate: number
          created_at: string | null
          creator_id: string
          gross_revenue: number | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          paid_users_count: number | null
          payout_month: string
          status: string
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate: number
          created_at?: string | null
          creator_id: string
          gross_revenue?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_users_count?: number | null
          payout_month: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string | null
          creator_id?: string
          gross_revenue?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_users_count?: number | null
          payout_month?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          cmo_id: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          lifetime_paid_users: number | null
          referral_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cmo_id: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          lifetime_paid_users?: number | null
          referral_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cmo_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          lifetime_paid_users?: number | null
          referral_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_cmo_id_fkey"
            columns: ["cmo_id"]
            isOneToOne: false
            referencedRelation: "cmo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          creator_id: string
          discount_percent: number | null
          id: string
          is_active: boolean | null
          paid_conversions: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          creator_id: string
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          paid_conversions?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          creator_id?: string
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          paid_conversions?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      download_logs: {
        Row: {
          downloaded_at: string
          id: string
          ip_address: string | null
          note_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          note_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          access_code_id: string | null
          created_at: string
          expires_at: string | null
          grade: Database["public"]["Enums"]["grade_level"]
          id: string
          is_active: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          payment_order_id: string | null
          stream: Database["public"]["Enums"]["stream_type"]
          tier: Database["public"]["Enums"]["tier_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code_id?: string | null
          created_at?: string
          expires_at?: string | null
          grade: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_active?: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          payment_order_id?: string | null
          stream: Database["public"]["Enums"]["stream_type"]
          tier: Database["public"]["Enums"]["tier_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code_id?: string | null
          created_at?: string
          expires_at?: string | null
          grade?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_active?: boolean | null
          medium?: Database["public"]["Enums"]["medium_type"]
          payment_order_id?: string | null
          stream?: Database["public"]["Enums"]["stream_type"]
          tier?: Database["public"]["Enums"]["tier_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_url: string | null
          id: string
          is_active: boolean | null
          min_tier: Database["public"]["Enums"]["tier_type"]
          title: string
          topic_id: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: Database["public"]["Enums"]["tier_type"]
          title: string
          topic_id: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          min_tier?: Database["public"]["Enums"]["tier_type"]
          title?: string
          topic_id?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attributions: {
        Row: {
          created_at: string | null
          creator_commission_amount: number
          creator_commission_rate: number
          creator_id: string
          discount_applied: number | null
          enrollment_id: string
          final_amount: number
          id: string
          original_amount: number
          payment_month: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          creator_commission_amount: number
          creator_commission_rate: number
          creator_id: string
          discount_applied?: number | null
          enrollment_id: string
          final_amount: number
          id?: string
          original_amount: number
          payment_month: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          creator_commission_amount?: number
          creator_commission_rate?: number
          creator_id?: string
          discount_applied?: number | null
          enrollment_id?: string
          final_amount?: number
          id?: string
          original_amount?: number
          payment_month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attributions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_financials: {
        Row: {
          cmo_commissions: number | null
          created_at: string | null
          creator_commissions: number | null
          gateway_fees: number | null
          id: string
          infra_costs: number | null
          month: string
          net_profit: number | null
          net_revenue: number | null
          paid_users: number | null
          total_discounts: number | null
          total_revenue: number | null
          total_users: number | null
          updated_at: string | null
        }
        Insert: {
          cmo_commissions?: number | null
          created_at?: string | null
          creator_commissions?: number | null
          gateway_fees?: number | null
          id?: string
          infra_costs?: number | null
          month: string
          net_profit?: number | null
          net_revenue?: number | null
          paid_users?: number | null
          total_discounts?: number | null
          total_revenue?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Update: {
          cmo_commissions?: number | null
          created_at?: string | null
          creator_commissions?: number | null
          gateway_fees?: number | null
          id?: string
          infra_costs?: number | null
          month?: string
          net_profit?: number | null
          net_revenue?: number | null
          paid_users?: number | null
          total_discounts?: number | null
          total_revenue?: number | null
          total_users?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          abuse_flags: number | null
          created_at: string
          device_fingerprint: string | null
          email: string
          full_name: string | null
          id: string
          is_locked: boolean | null
          max_devices: number | null
          updated_at: string
        }
        Insert: {
          abuse_flags?: number | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          full_name?: string | null
          id: string
          is_locked?: boolean | null
          max_devices?: number | null
          updated_at?: string
        }
        Update: {
          abuse_flags?: number | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_locked?: boolean | null
          max_devices?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stream_subjects: {
        Row: {
          basket: string
          created_at: string
          id: string
          is_mandatory: boolean | null
          sort_order: number | null
          stream: Database["public"]["Enums"]["stream_type"]
          subject_code: string | null
          subject_name: string
        }
        Insert: {
          basket?: string
          created_at?: string
          id?: string
          is_mandatory?: boolean | null
          sort_order?: number | null
          stream: Database["public"]["Enums"]["stream_type"]
          subject_code?: string | null
          subject_name: string
        }
        Update: {
          basket?: string
          created_at?: string
          id?: string
          is_mandatory?: boolean | null
          sort_order?: number | null
          stream?: Database["public"]["Enums"]["stream_type"]
          subject_code?: string | null
          subject_name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          grade: Database["public"]["Enums"]["grade_level"]
          icon: string | null
          id: string
          is_active: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          name: string
          sort_order: number | null
          stream: Database["public"]["Enums"]["stream_type"]
          streams: Database["public"]["Enums"]["stream_type"][] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade: Database["public"]["Enums"]["grade_level"]
          icon?: string | null
          id?: string
          is_active?: boolean | null
          medium: Database["public"]["Enums"]["medium_type"]
          name: string
          sort_order?: number | null
          stream: Database["public"]["Enums"]["stream_type"]
          streams?: Database["public"]["Enums"]["stream_type"][] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          grade?: Database["public"]["Enums"]["grade_level"]
          icon?: string | null
          id?: string
          is_active?: boolean | null
          medium?: Database["public"]["Enums"]["medium_type"]
          name?: string
          sort_order?: number | null
          stream?: Database["public"]["Enums"]["stream_type"]
          streams?: Database["public"]["Enums"]["stream_type"][] | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          subject_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          subject_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          current_tier: Database["public"]["Enums"]["tier_type"]
          enrollment_id: string
          id: string
          receipt_url: string | null
          reference_number: string
          requested_tier: Database["public"]["Enums"]["tier_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          current_tier: Database["public"]["Enums"]["tier_type"]
          enrollment_id: string
          id?: string
          receipt_url?: string | null
          reference_number: string
          requested_tier: Database["public"]["Enums"]["tier_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          current_tier?: Database["public"]["Enums"]["tier_type"]
          enrollment_id?: string
          id?: string
          receipt_url?: string | null
          reference_number?: string
          requested_tier?: Database["public"]["Enums"]["tier_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attributions: {
        Row: {
          created_at: string | null
          creator_id: string
          discount_code_id: string | null
          id: string
          referral_source: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          discount_code_id?: string | null
          id?: string
          referral_source: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          discount_code_id?: string | null
          id?: string
          referral_source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attributions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          subject_1: string
          subject_2: string
          subject_3: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          subject_1: string
          subject_2: string
          subject_3: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          subject_1?: string
          subject_2?: string
          subject_3?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_enrollment_access: {
        Args: {
          _grade: Database["public"]["Enums"]["grade_level"]
          _medium: Database["public"]["Enums"]["medium_type"]
          _stream: Database["public"]["Enums"]["stream_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_cmo: { Args: { _user_id: string }; Returns: boolean }
      is_content_creator: { Args: { _user_id: string }; Returns: boolean }
      set_creator_role: {
        Args: {
          _cmo_id: string
          _display_name: string
          _referral_code: string
          _user_id: string
        }
        Returns: Json
      }
      validate_access_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "content_admin"
        | "support_admin"
        | "student"
        | "cmo"
        | "content_creator"
      code_status: "active" | "used" | "expired" | "revoked"
      grade_level: "ol" | "al_grade12" | "al_grade13"
      medium_type: "english" | "sinhala"
      stream_type: "maths" | "biology" | "commerce" | "arts" | "technology"
      tier_type: "starter" | "standard" | "lifetime"
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
    Enums: {
      app_role: [
        "super_admin",
        "content_admin",
        "support_admin",
        "student",
        "cmo",
        "content_creator",
      ],
      code_status: ["active", "used", "expired", "revoked"],
      grade_level: ["ol", "al_grade12", "al_grade13"],
      medium_type: ["english", "sinhala"],
      stream_type: ["maths", "biology", "commerce", "arts", "technology"],
      tier_type: ["starter", "standard", "lifetime"],
    },
  },
} as const
