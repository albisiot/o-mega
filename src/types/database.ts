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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ability_definitions: {
        Row: {
          code: string
          family: string
          icon: string | null
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          family: string
          icon?: string | null
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          family?: string
          icon?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ability_definitions_family_fkey"
            columns: ["family"]
            isOneToOne: false
            referencedRelation: "ability_families"
            referencedColumns: ["code"]
          },
        ]
      }
      ability_families: {
        Row: {
          code: string
          color: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          color: string
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          color?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      card_definitions: {
        Row: {
          art_url: string | null
          code: string
          created_at: string
          faction: string
          flavor: string
          id: string
          is_active: boolean
          name: string
          power_code: string | null
          power_params: Json
          rarity_code: string
          stats: Json
        }
        Insert: {
          art_url?: string | null
          code: string
          created_at?: string
          faction: string
          flavor?: string
          id?: string
          is_active?: boolean
          name: string
          power_code?: string | null
          power_params?: Json
          rarity_code: string
          stats: Json
        }
        Update: {
          art_url?: string | null
          code?: string
          created_at?: string
          faction?: string
          flavor?: string
          id?: string
          is_active?: boolean
          name?: string
          power_code?: string | null
          power_params?: Json
          rarity_code?: string
          stats?: Json
        }
        Relationships: [
          {
            foreignKeyName: "card_definitions_rarity_code_fkey"
            columns: ["rarity_code"]
            isOneToOne: false
            referencedRelation: "rarity_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      card_instances: {
        Row: {
          acquired_at: string
          acquired_via: string
          definition_id: string
          id: string
          is_starter: boolean
          locked_until: string | null
          owner_id: string
        }
        Insert: {
          acquired_at?: string
          acquired_via: string
          definition_id: string
          id?: string
          is_starter?: boolean
          locked_until?: string | null
          owner_id: string
        }
        Update: {
          acquired_at?: string
          acquired_via?: string
          definition_id?: string
          id?: string
          is_starter?: boolean
          locked_until?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_instances_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_instances_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_transfers: {
        Row: {
          created_at: string
          from_user: string | null
          id: number
          instance_id: string
          match_id: string | null
          reason: string
          to_user: string | null
        }
        Insert: {
          created_at?: string
          from_user?: string | null
          id?: never
          instance_id: string
          match_id?: string | null
          reason: string
          to_user?: string | null
        }
        Update: {
          created_at?: string
          from_user?: string | null
          id?: never
          instance_id?: string
          match_id?: string | null
          reason?: string
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_transfers_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transfers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_transfers_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_config: {
        Row: {
          description: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          cards_conquered: number
          cards_lost: number
          conquest_unlocked: boolean
          created_at: string
          current_streak: number
          draws: number
          id: string
          level: number
          losses: number
          matches_played: number
          starter_granted_at: string | null
          updated_at: string
          username: string
          wins: number
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          cards_conquered?: number
          cards_lost?: number
          conquest_unlocked?: boolean
          created_at?: string
          current_streak?: number
          draws?: number
          id: string
          level?: number
          losses?: number
          matches_played?: number
          starter_granted_at?: string | null
          updated_at?: string
          username: string
          wins?: number
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          cards_conquered?: number
          cards_lost?: number
          conquest_unlocked?: boolean
          created_at?: string
          current_streak?: number
          draws?: number
          id?: string
          level?: number
          losses?: number
          matches_played?: number
          starter_granted_at?: string | null
          updated_at?: string
          username?: string
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      rarity_definitions: {
        Row: {
          code: string
          color: string
          drop_weight: number
          name: string
          rank: number
        }
        Insert: {
          code: string
          color: string
          drop_weight: number
          name: string
          rank: number
        }
        Update: {
          code?: string
          color?: string
          drop_weight?: number
          name?: string
          rank?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_player: {
        Args: never
        Returns: {
          avatar_url: string | null
          best_streak: number
          cards_conquered: number
          cards_lost: number
          conquest_unlocked: boolean
          created_at: string
          current_streak: number
          draws: number
          id: string
          level: number
          losses: number
          matches_played: number
          starter_granted_at: string | null
          updated_at: string
          username: string
          wins: number
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      config_int: { Args: { p_key: string }; Returns: number }
      grant_starter_set: { Args: { p_user: string }; Returns: number }
      set_username: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string | null
          best_streak: number
          cards_conquered: number
          cards_lost: number
          conquest_unlocked: boolean
          created_at: string
          current_streak: number
          draws: number
          id: string
          level: number
          losses: number
          matches_played: number
          starter_granted_at: string | null
          updated_at: string
          username: string
          wins: number
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      username_base: { Args: { p_source: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
