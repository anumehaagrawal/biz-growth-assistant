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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          brand_voice: string
          created_at: string
          description: string
          goals: string | null
          id: string
          industry: string
          location: string | null
          name: string
          target_audience: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          brand_voice?: string
          created_at?: string
          description: string
          goals?: string | null
          id?: string
          industry: string
          location?: string | null
          name: string
          target_audience: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          brand_voice?: string
          created_at?: string
          description?: string
          goals?: string | null
          id?: string
          industry?: string
          location?: string | null
          name?: string
          target_audience?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      content_pieces: {
        Row: {
          content_type: string
          created_at: string
          id: string
          metadata: Json | null
          output: string
          prompt: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          output: string
          prompt: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          output?: string
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      follow_up_contacts: {
        Row: {
          activity_attended: string
          child_name: string
          created_at: string
          date_attended: string
          follow_up_status: string
          grade: string
          guardian_contact: string
          id: string
          interest_area: string | null
          notes: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activity_attended: string
          child_name: string
          created_at?: string
          date_attended: string
          follow_up_status?: string
          grade: string
          guardian_contact: string
          id?: string
          interest_area?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activity_attended?: string
          child_name?: string
          created_at?: string
          date_attended?: string
          follow_up_status?: string
          grade?: string
          guardian_contact?: string
          id?: string
          interest_area?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      org_resources: {
        Row: {
          char_count: number
          created_at: string
          error: string | null
          extracted_text: string
          id: string
          kind: string
          metadata: Json
          name: string
          source_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          char_count?: number
          created_at?: string
          error?: string | null
          extracted_text?: string
          id?: string
          kind: string
          metadata?: Json
          name: string
          source_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          char_count?: number
          created_at?: string
          error?: string | null
          extracted_text?: string
          id?: string
          kind?: string
          metadata?: Json
          name?: string
          source_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_plans: {
        Row: {
          created_at: string
          id: string
          strategies: Json
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          strategies: Json
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          strategies?: Json
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string
          created_at: string
          id: string
          media_type: string
          media_url: string
          org_name: string | null
          prompt: string | null
          published: boolean
          slug: string
          user_id: string
        }
        Insert: {
          caption: string
          created_at?: string
          id?: string
          media_type: string
          media_url: string
          org_name?: string | null
          prompt?: string | null
          published?: boolean
          slug: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          org_name?: string | null
          prompt?: string | null
          published?: boolean
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
