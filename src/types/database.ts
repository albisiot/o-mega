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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_code_failed_attempts: {
        Row: {
          attempted_at: string
          id: number
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_code_failed_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_code_redemptions: {
        Row: {
          code_id: string
          id: string
          opening_ids: string[]
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          opening_ids?: string[]
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          opening_ids?: string[]
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "bonus_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_code_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_codes: {
        Row: {
          card_definition_ids: string[]
          card_variant_ids: string[]
          code: string
          coins: number
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          note: string | null
          packs: number
        }
        Insert: {
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          code: string
          coins?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          note?: string | null
          packs?: number
        }
        Update: {
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          code?: string
          coins?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          note?: string | null
          packs?: number
        }
        Relationships: []
      }
      boss_definitions: {
        Row: {
          code: string
          created_at: string
          flavor: string
          id: string
          is_active: boolean
          name: string
          scene: string
        }
        Insert: {
          code: string
          created_at?: string
          flavor: string
          id?: string
          is_active?: boolean
          name: string
          scene: string
        }
        Update: {
          code?: string
          created_at?: string
          flavor?: string
          id?: string
          is_active?: boolean
          name?: string
          scene?: string
        }
        Relationships: []
      }
      boss_fronts: {
        Row: {
          boss_id: string
          slot: number
          threat_id: string
        }
        Insert: {
          boss_id: string
          slot: number
          threat_id: string
        }
        Update: {
          boss_id?: string
          slot?: number
          threat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_fronts_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "boss_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_fronts_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threat_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      card_definition_traits: {
        Row: {
          definition_id: string
          trait_code: string
        }
        Insert: {
          definition_id: string
          trait_code: string
        }
        Update: {
          definition_id?: string
          trait_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_definition_traits_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_definition_traits_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_definition_traits_trait_code_fkey"
            columns: ["trait_code"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["code"]
          },
        ]
      }
      card_definitions: {
        Row: {
          art_url: string | null
          code: string
          created_at: string
          faction: string
          flavor: string
          id: string
          in_packs: boolean
          is_active: boolean
          name: string
          power_code: string | null
          power_params: Json
          powers_text: string | null
          rarity_code: string
          real_name: string | null
          stats: Json
          unlock_level: number | null
        }
        Insert: {
          art_url?: string | null
          code: string
          created_at?: string
          faction: string
          flavor?: string
          id?: string
          in_packs?: boolean
          is_active?: boolean
          name: string
          power_code?: string | null
          power_params?: Json
          powers_text?: string | null
          rarity_code: string
          real_name?: string | null
          stats: Json
          unlock_level?: number | null
        }
        Update: {
          art_url?: string | null
          code?: string
          created_at?: string
          faction?: string
          flavor?: string
          id?: string
          in_packs?: boolean
          is_active?: boolean
          name?: string
          power_code?: string | null
          power_params?: Json
          powers_text?: string | null
          rarity_code?: string
          real_name?: string | null
          stats?: Json
          unlock_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_definitions_power_code_fkey"
            columns: ["power_code"]
            isOneToOne: false
            referencedRelation: "power_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "card_definitions_rarity_code_fkey"
            columns: ["rarity_code"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["rarity_code"]
          },
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
          converted_at: string | null
          definition_id: string
          id: string
          is_starter: boolean
          locked_until: string | null
          out_of_play_at: string | null
          owner_id: string | null
          variant_id: string | null
        }
        Insert: {
          acquired_at?: string
          acquired_via: string
          converted_at?: string | null
          definition_id: string
          id?: string
          is_starter?: boolean
          locked_until?: string | null
          out_of_play_at?: string | null
          owner_id?: string | null
          variant_id?: string | null
        }
        Update: {
          acquired_at?: string
          acquired_via?: string
          converted_at?: string | null
          definition_id?: string
          id?: string
          is_starter?: boolean
          locked_until?: string | null
          out_of_play_at?: string | null
          owner_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_instances_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "card_instances_variant_fkey"
            columns: ["variant_id", "definition_id"]
            isOneToOne: false
            referencedRelation: "card_variants"
            referencedColumns: ["id", "definition_id"]
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
            foreignKeyName: "card_transfers_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
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
      card_variants: {
        Row: {
          art_url: string
          created_at: string
          definition_id: string
          id: string
          is_active: boolean
          style: string
          style_name: string
        }
        Insert: {
          art_url: string
          created_at?: string
          definition_id: string
          id?: string
          is_active?: boolean
          style: string
          style_name: string
        }
        Update: {
          art_url?: string
          created_at?: string
          definition_id?: string
          id?: string
          is_active?: boolean
          style?: string
          style_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_variants_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_variants_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_ledger: {
        Row: {
          amount: number
          created_at: string
          id: number
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conquest_claims: {
        Row: {
          auto_assigned: boolean
          bonus_coins: number
          chosen_instance_id: string | null
          deadline_at: string
          eligible_instance_ids: string[]
          loser_id: string | null
          match_id: string
          resolved_at: string | null
          winner_id: string | null
        }
        Insert: {
          auto_assigned?: boolean
          bonus_coins?: number
          chosen_instance_id?: string | null
          deadline_at: string
          eligible_instance_ids?: string[]
          loser_id?: string | null
          match_id: string
          resolved_at?: string | null
          winner_id?: string | null
        }
        Update: {
          auto_assigned?: boolean
          bonus_coins?: number
          chosen_instance_id?: string | null
          deadline_at?: string
          eligible_instance_ids?: string[]
          loser_id?: string | null
          match_id?: string
          resolved_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conquest_claims_chosen_instance_id_fkey"
            columns: ["chosen_instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conquest_claims_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conquest_claims_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conquest_claims_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_claims: {
        Row: {
          claimed_at: string
          day: string
          pack_opening_id: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          day: string
          pack_opening_id?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          day?: string
          pack_opening_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_claims_pack_opening_id_fkey"
            columns: ["pack_opening_id"]
            isOneToOne: false
            referencedRelation: "pack_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_objective_days: {
        Row: {
          created_at: string
          day: string
          refreshes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          refreshes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          refreshes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_objective_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_objective_definitions: {
        Row: {
          card_definition_ids: string[]
          card_variant_ids: string[]
          code: string
          coins: number | null
          created_at: string
          difficulty: string
          is_active: boolean
          metric: string
          packs: number
          params: Json
          target: number
          title: string
        }
        Insert: {
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          code: string
          coins?: number | null
          created_at?: string
          difficulty: string
          is_active?: boolean
          metric: string
          packs?: number
          params?: Json
          target: number
          title: string
        }
        Update: {
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          code?: string
          coins?: number | null
          created_at?: string
          difficulty?: string
          is_active?: boolean
          metric?: string
          packs?: number
          params?: Json
          target?: number
          title?: string
        }
        Relationships: []
      }
      daily_objectives: {
        Row: {
          assigned_at: string
          card_definition_ids: string[]
          card_variant_ids: string[]
          claimed_at: string | null
          coins: number
          completed_at: string | null
          day: string
          definition_code: string
          difficulty: string
          id: string
          metric: string
          opening_ids: string[]
          packs: number
          params: Json
          progress: number
          replaced_at: string | null
          slot: number
          target: number
          title: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          claimed_at?: string | null
          coins: number
          completed_at?: string | null
          day: string
          definition_code: string
          difficulty: string
          id?: string
          metric: string
          opening_ids?: string[]
          packs: number
          params: Json
          progress?: number
          replaced_at?: string | null
          slot: number
          target: number
          title: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          claimed_at?: string | null
          coins?: number
          completed_at?: string | null
          day?: string
          definition_code?: string
          difficulty?: string
          id?: string
          metric?: string
          opening_ids?: string[]
          packs?: number
          params?: Json
          progress?: number
          replaced_at?: string | null
          slot?: number
          target?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_objectives_definition_code_fkey"
            columns: ["definition_code"]
            isOneToOne: false
            referencedRelation: "daily_objective_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "daily_objectives_user_id_day_fkey"
            columns: ["user_id", "day"]
            isOneToOne: false
            referencedRelation: "daily_objective_days"
            referencedColumns: ["user_id", "day"]
          },
        ]
      }
      emergency_days: {
        Row: {
          created_at: string
          day: string
          threat_ids: string[]
          threat_levels: number[]
          threat_modifiers: Json
        }
        Insert: {
          created_at?: string
          day: string
          threat_ids: string[]
          threat_levels: number[]
          threat_modifiers?: Json
        }
        Update: {
          created_at?: string
          day?: string
          threat_ids?: string[]
          threat_levels?: number[]
          threat_modifiers?: Json
        }
        Relationships: []
      }
      emergency_plays: {
        Row: {
          base_score: number
          bonus: number
          card_instance_id: string
          created_at: string
          definition_id: string
          passed: boolean
          required_score: number
          round: number
          run_id: string
          score: number
          threat_id: string
        }
        Insert: {
          base_score: number
          bonus: number
          card_instance_id: string
          created_at?: string
          definition_id: string
          passed: boolean
          required_score: number
          round: number
          run_id: string
          score: number
          threat_id: string
        }
        Update: {
          base_score?: number
          bonus?: number
          card_instance_id?: string
          created_at?: string
          definition_id?: string
          passed?: boolean
          required_score?: number
          round?: number
          run_id?: string
          score?: number
          threat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_plays_card_instance_id_fkey"
            columns: ["card_instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_plays_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_plays_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_plays_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "emergency_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_plays_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threat_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_runs: {
        Row: {
          card_instance_ids: string[]
          coins: number
          created_at: string
          current_round: number
          day: string
          definition_ids: string[]
          failed: number
          finished_at: string | null
          id: string
          passed: number
          status: string
          total_score: number
          user_id: string
          xp: number
        }
        Insert: {
          card_instance_ids: string[]
          coins?: number
          created_at?: string
          current_round?: number
          day: string
          definition_ids: string[]
          failed?: number
          finished_at?: string | null
          id?: string
          passed?: number
          status?: string
          total_score?: number
          user_id: string
          xp?: number
        }
        Update: {
          card_instance_ids?: string[]
          coins?: number
          created_at?: string
          current_round?: number
          day?: string
          definition_ids?: string[]
          failed?: number
          finished_at?: string | null
          id?: string
          passed?: number
          status?: string
          total_score?: number
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "emergency_runs_day_fkey"
            columns: ["day"]
            isOneToOne: false
            referencedRelation: "emergency_days"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "emergency_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_points: {
        Row: {
          created_at: string
          event_id: string
          id: string
          kind: string
          opponent_id: string | null
          outcome: string
          points: number
          ref_id: string
          round: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          kind: string
          opponent_id?: string | null
          outcome: string
          points: number
          ref_id: string
          round?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          kind?: string
          opponent_id?: string | null
          outcome?: string
          points?: number
          ref_id?: string
          round?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_points_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_points_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rewards: {
        Row: {
          coins: number
          event_id: string
          granted_at: string
          id: string
          opening_ids: string[]
          packs: number
          seen_at: string | null
          tier: number
          user_id: string
        }
        Insert: {
          coins: number
          event_id: string
          granted_at?: string
          id?: string
          opening_ids?: string[]
          packs: number
          seen_at?: string | null
          tier: number
          user_id: string
        }
        Update: {
          coins?: number
          event_id?: string
          granted_at?: string
          id?: string
          opening_ids?: string[]
          packs?: number
          seen_at?: string | null
          tier?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rewards_event_id_tier_fkey"
            columns: ["event_id", "tier"]
            isOneToOne: false
            referencedRelation: "event_tiers"
            referencedColumns: ["event_id", "tier"]
          },
          {
            foreignKeyName: "event_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tiers: {
        Row: {
          card_definition_ids: string[]
          card_variant_ids: string[]
          coins: number
          event_id: string
          packs: number
          points: number
          tier: number
        }
        Insert: {
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          coins?: number
          event_id: string
          packs?: number
          points: number
          tier: number
        }
        Update: {
          card_definition_ids?: string[]
          card_variant_ids?: string[]
          coins?: number
          event_id?: string
          packs?: number
          points?: number
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          daily_cap: number | null
          description: string
          ends_at: string
          id: string
          is_active: boolean
          points: Json
          starts_at: string
          title: string
          traits: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_cap?: number | null
          description?: string
          ends_at: string
          id?: string
          is_active?: boolean
          points: Json
          starts_at: string
          title: string
          traits?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_cap?: number | null
          description?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          points?: Json
          starts_at?: string
          title?: string
          traits?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          card_instance_ids: string[]
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_instance_ids: string[]
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_instance_ids?: string[]
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formations_user_id_fkey"
            columns: ["user_id"]
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
      level_rewards: {
        Row: {
          coins: number
          created_at: string
          level: number
          match_id: string | null
          user_id: string
        }
        Insert: {
          coins: number
          created_at?: string
          level: number
          match_id?: string | null
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          level?: number
          match_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_rewards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level_unlocks: {
        Row: {
          created_at: string
          definition_id: string
          instance_id: string
          match_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          definition_id: string
          instance_id: string
          match_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          definition_id?: string
          instance_id?: string
          match_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_unlocks_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_unlocks_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_unlocks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_unlocks_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lobbies: {
        Row: {
          card_instance_ids: string[]
          code: string
          created_at: string
          expires_at: string
          format: string
          host_id: string
          mode: string
        }
        Insert: {
          card_instance_ids: string[]
          code: string
          created_at?: string
          expires_at: string
          format?: string
          host_id: string
          mode?: string
        }
        Update: {
          card_instance_ids?: string[]
          code?: string
          created_at?: string
          expires_at?: string
          format?: string
          host_id?: string
          mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lobbies_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_reward_rules: {
        Row: {
          coins: number
          mode_key: string
          opponent: string
          outcome: string
          packs: number
          updated_at: string
          xp: number
        }
        Insert: {
          coins?: number
          mode_key: string
          opponent: string
          outcome: string
          packs?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          coins?: number
          mode_key?: string
          opponent?: string
          outcome?: string
          packs?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      match_rounds: {
        Row: {
          deadline_at: string
          holders: Json | null
          match_id: string
          opened_at: string
          resolved_at: string | null
          round: number
          threat_id: string | null
          winner_side: string | null
        }
        Insert: {
          deadline_at: string
          holders?: Json | null
          match_id: string
          opened_at?: string
          resolved_at?: string | null
          round: number
          threat_id?: string | null
          winner_side?: string | null
        }
        Update: {
          deadline_at?: string
          holders?: Json | null
          match_id?: string
          opened_at?: string
          resolved_at?: string | null
          round?: number
          threat_id?: string | null
          winner_side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threat_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_teams: {
        Row: {
          card_instance_ids: string[] | null
          definition_ids: string[]
          last_seen_at: string | null
          match_id: string
          side: string
          user_id: string | null
        }
        Insert: {
          card_instance_ids?: string[] | null
          definition_ids: string[]
          last_seen_at?: string | null
          match_id: string
          side: string
          user_id?: string | null
        }
        Update: {
          card_instance_ids?: string[] | null
          definition_ids?: string[]
          last_seen_at?: string | null
          match_id?: string
          side?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_teams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          boss_id: string | null
          boss_values: Json | null
          bot_difficulty: string | null
          created_at: string
          current_round: number
          end_reason: string | null
          finished_at: string | null
          format: string
          id: string
          mode: string
          player_a: string
          player_b: string | null
          points_a: number
          points_b: number
          quadrant_abilities: string[] | null
          quadrant_board: Json | null
          quadrant_first: string | null
          result: string | null
          reward_coins_a: number | null
          reward_coins_b: number | null
          reward_opening_ids_a: string[]
          reward_opening_ids_b: string[]
          reward_xp_a: number | null
          reward_xp_b: number | null
          rounds_won_a: number
          rounds_won_b: number
          status: string
          story_mission_id: string | null
          threat_ids: string[]
          threat_levels: number[]
          threat_modifiers: Json
          total_score_a: number
          total_score_b: number
        }
        Insert: {
          boss_id?: string | null
          boss_values?: Json | null
          bot_difficulty?: string | null
          created_at?: string
          current_round?: number
          end_reason?: string | null
          finished_at?: string | null
          format?: string
          id?: string
          mode: string
          player_a: string
          player_b?: string | null
          points_a?: number
          points_b?: number
          quadrant_abilities?: string[] | null
          quadrant_board?: Json | null
          quadrant_first?: string | null
          result?: string | null
          reward_coins_a?: number | null
          reward_coins_b?: number | null
          reward_opening_ids_a?: string[]
          reward_opening_ids_b?: string[]
          reward_xp_a?: number | null
          reward_xp_b?: number | null
          rounds_won_a?: number
          rounds_won_b?: number
          status?: string
          story_mission_id?: string | null
          threat_ids: string[]
          threat_levels: number[]
          threat_modifiers?: Json
          total_score_a?: number
          total_score_b?: number
        }
        Update: {
          boss_id?: string | null
          boss_values?: Json | null
          bot_difficulty?: string | null
          created_at?: string
          current_round?: number
          end_reason?: string | null
          finished_at?: string | null
          format?: string
          id?: string
          mode?: string
          player_a?: string
          player_b?: string | null
          points_a?: number
          points_b?: number
          quadrant_abilities?: string[] | null
          quadrant_board?: Json | null
          quadrant_first?: string | null
          result?: string | null
          reward_coins_a?: number | null
          reward_coins_b?: number | null
          reward_opening_ids_a?: string[]
          reward_opening_ids_b?: string[]
          reward_xp_a?: number | null
          reward_xp_b?: number | null
          rounds_won_a?: number
          rounds_won_b?: number
          status?: string
          story_mission_id?: string | null
          threat_ids?: string[]
          threat_levels?: number[]
          threat_modifiers?: Json
          total_score_a?: number
          total_score_b?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "boss_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_a_fkey"
            columns: ["player_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_b_fkey"
            columns: ["player_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_story_mission_id_fkey"
            columns: ["story_mission_id"]
            isOneToOne: false
            referencedRelation: "story_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          card_instance_ids: string[]
          enqueued_at: string
          format: string
          level: number
          mode: string
          refreshed_at: string
          team_value: number
          user_id: string
        }
        Insert: {
          card_instance_ids: string[]
          enqueued_at?: string
          format?: string
          level?: number
          mode?: string
          refreshed_at?: string
          team_value?: number
          user_id: string
        }
        Update: {
          card_instance_ids?: string[]
          enqueued_at?: string
          format?: string
          level?: number
          mode?: string
          refreshed_at?: string
          team_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_openings: {
        Row: {
          card_instance_ids: string[]
          id: string
          is_daily: boolean | null
          new_card_instance_ids: string[]
          opened_at: string
          pack_type: string
          special_pack_id: string | null
          user_id: string
        }
        Insert: {
          card_instance_ids: string[]
          id?: string
          is_daily?: boolean | null
          new_card_instance_ids?: string[]
          opened_at?: string
          pack_type: string
          special_pack_id?: string | null
          user_id: string
        }
        Update: {
          card_instance_ids?: string[]
          id?: string
          is_daily?: boolean | null
          new_card_instance_ids?: string[]
          opened_at?: string
          pack_type?: string
          special_pack_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_openings_special_pack_id_fkey"
            columns: ["special_pack_id"]
            isOneToOne: false
            referencedRelation: "special_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_openings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_plays: {
        Row: {
          card_instance_id: string
          cell_x: number | null
          cell_y: number | null
          front_slot: number | null
          match_id: string
          rotation: number | null
          round: number
          side: string
          submitted_at: string
        }
        Insert: {
          card_instance_id: string
          cell_x?: number | null
          cell_y?: number | null
          front_slot?: number | null
          match_id: string
          rotation?: number | null
          round: number
          side: string
          submitted_at?: string
        }
        Update: {
          card_instance_id?: string
          cell_x?: number | null
          cell_y?: number | null
          front_slot?: number | null
          match_id?: string
          rotation?: number | null
          round?: number
          side?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_plays_card_instance_id_fkey"
            columns: ["card_instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_plays_match_id_round_fkey"
            columns: ["match_id", "round"]
            isOneToOne: false
            referencedRelation: "match_rounds"
            referencedColumns: ["match_id", "round"]
          },
        ]
      }
      power_definitions: {
        Row: {
          code: string
          description_template: string
          name: string
          required_params: string[]
          tier: string
        }
        Insert: {
          code: string
          description_template: string
          name: string
          required_params?: string[]
          tier: string
        }
        Update: {
          code?: string
          description_template?: string
          name?: string
          required_params?: string[]
          tier?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          bot_draws: number
          bot_losses: number
          bot_wins: number
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
          bot_draws?: number
          bot_losses?: number
          bot_wins?: number
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
          bot_draws?: number
          bot_losses?: number
          bot_wins?: number
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
          ability_budget: number
          code: string
          color: string
          drop_weight: number
          duplicate_coin_value: number
          name: string
          rank: number
        }
        Insert: {
          ability_budget: number
          code: string
          color: string
          drop_weight: number
          duplicate_coin_value?: number
          name: string
          rank: number
        }
        Update: {
          ability_budget?: number
          code?: string
          color?: string
          drop_weight?: number
          duplicate_coin_value?: number
          name?: string
          rank?: number
        }
        Relationships: []
      }
      round_plays: {
        Row: {
          auto_played: boolean
          base_score: number
          bonus: number
          card_instance_id: string | null
          cell_x: number | null
          cell_y: number | null
          created_at: string
          definition_id: string
          front_slot: number | null
          highest_value: number
          match_id: string
          parts: Json | null
          points: number | null
          required: number | null
          rotation: number | null
          round: number
          score: number
          side: string
        }
        Insert: {
          auto_played?: boolean
          base_score: number
          bonus: number
          card_instance_id?: string | null
          cell_x?: number | null
          cell_y?: number | null
          created_at?: string
          definition_id: string
          front_slot?: number | null
          highest_value: number
          match_id: string
          parts?: Json | null
          points?: number | null
          required?: number | null
          rotation?: number | null
          round: number
          score: number
          side: string
        }
        Update: {
          auto_played?: boolean
          base_score?: number
          bonus?: number
          card_instance_id?: string | null
          cell_x?: number | null
          cell_y?: number | null
          created_at?: string
          definition_id?: string
          front_slot?: number | null
          highest_value?: number
          match_id?: string
          parts?: Json | null
          points?: number | null
          required?: number | null
          rotation?: number | null
          round?: number
          score?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_plays_card_instance_id_fkey"
            columns: ["card_instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_plays_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_plays_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_plays_match_id_round_fkey"
            columns: ["match_id", "round"]
            isOneToOne: false
            referencedRelation: "match_rounds"
            referencedColumns: ["match_id", "round"]
          },
        ]
      }
      special_pack_cards: {
        Row: {
          definition_id: string
          pack_id: string
          percent: number | null
        }
        Insert: {
          definition_id: string
          pack_id: string
          percent?: number | null
        }
        Update: {
          definition_id?: string
          pack_id?: string
          percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "special_pack_cards_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_pack_cards_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_pack_cards_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "special_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      special_pack_rarities: {
        Row: {
          pack_id: string
          percent: number
          rarity_code: string
        }
        Insert: {
          pack_id: string
          percent: number
          rarity_code: string
        }
        Update: {
          pack_id?: string
          percent?: number
          rarity_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_pack_rarities_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "special_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_pack_rarities_rarity_code_fkey"
            columns: ["rarity_code"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["rarity_code"]
          },
          {
            foreignKeyName: "special_pack_rarities_rarity_code_fkey"
            columns: ["rarity_code"]
            isOneToOne: false
            referencedRelation: "rarity_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      special_packs: {
        Row: {
          cards_per_pack: number
          color: string
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          guaranteed_min_rarity_rank: number | null
          id: string
          is_active: boolean
          name: string
          odds_mode: string
          price: number
          starts_at: string | null
          updated_at: string
          variant_chance_percent: number
          version: number
        }
        Insert: {
          cards_per_pack: number
          color: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          guaranteed_min_rarity_rank?: number | null
          id?: string
          is_active?: boolean
          name: string
          odds_mode: string
          price: number
          starts_at?: string | null
          updated_at?: string
          variant_chance_percent: number
          version?: number
        }
        Update: {
          cards_per_pack?: number
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          guaranteed_min_rarity_rank?: number | null
          id?: string
          is_active?: boolean
          name?: string
          odds_mode?: string
          price?: number
          starts_at?: string | null
          updated_at?: string
          variant_chance_percent?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "special_packs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spy_reveals: {
        Row: {
          definition_id: string
          match_id: string
          round: number
          side: string
        }
        Insert: {
          definition_id: string
          match_id: string
          round: number
          side: string
        }
        Update: {
          definition_id?: string
          match_id?: string
          round?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "spy_reveals_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spy_reveals_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spy_reveals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      story_chapters: {
        Row: {
          chapter: number
          intro: string
          number: number
          outro: string | null
          season: number
          title: string
        }
        Insert: {
          chapter: number
          intro: string
          number: number
          outro?: string | null
          season: number
          title: string
        }
        Update: {
          chapter?: number
          intro?: string
          number?: number
          outro?: string | null
          season?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_chapters_season_fkey"
            columns: ["season"]
            isOneToOne: false
            referencedRelation: "story_seasons"
            referencedColumns: ["season"]
          },
        ]
      }
      story_missions: {
        Row: {
          bot_definition_ids: string[]
          bot_difficulty: string
          chapter: number
          code: string
          id: string
          intro: string
          opponent: string
          ord: number
          reward_coins: number
          reward_definition_id: string | null
          threat_ids: string[]
          threat_modifiers: Json
          title: string
        }
        Insert: {
          bot_definition_ids: string[]
          bot_difficulty: string
          chapter: number
          code: string
          id?: string
          intro: string
          opponent: string
          ord: number
          reward_coins: number
          reward_definition_id?: string | null
          threat_ids: string[]
          threat_modifiers: Json
          title: string
        }
        Update: {
          bot_definition_ids?: string[]
          bot_difficulty?: string
          chapter?: number
          code?: string
          id?: string
          intro?: string
          opponent?: string
          ord?: number
          reward_coins?: number
          reward_definition_id?: string | null
          threat_ids?: string[]
          threat_modifiers?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_missions_chapter_fkey"
            columns: ["chapter"]
            isOneToOne: false
            referencedRelation: "story_chapters"
            referencedColumns: ["chapter"]
          },
          {
            foreignKeyName: "story_missions_reward_definition_id_fkey"
            columns: ["reward_definition_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_missions_reward_definition_id_fkey"
            columns: ["reward_definition_id"]
            isOneToOne: false
            referencedRelation: "card_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      story_progress: {
        Row: {
          card_instance_id: string | null
          completed_at: string
          match_id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          card_instance_id?: string | null
          completed_at?: string
          match_id: string
          mission_id: string
          user_id: string
        }
        Update: {
          card_instance_id?: string | null
          completed_at?: string
          match_id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_progress_card_instance_id_fkey"
            columns: ["card_instance_id"]
            isOneToOne: false
            referencedRelation: "card_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_progress_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "story_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_seasons: {
        Row: {
          ending: string
          season: number
          title: string
        }
        Insert: {
          ending: string
          season: number
          title: string
        }
        Update: {
          ending?: string
          season?: number
          title?: string
        }
        Relationships: []
      }
      threat_definitions: {
        Row: {
          art_url: string | null
          code: string
          created_at: string
          emergency_target: number | null
          flavor: string
          id: string
          is_active: boolean
          level: number
          modifier_code: string | null
          modifier_params: Json
          name: string
          rarity_code: string | null
          region: string
          required_abilities: string[]
          updated_at: string
        }
        Insert: {
          art_url?: string | null
          code: string
          created_at?: string
          emergency_target?: number | null
          flavor?: string
          id?: string
          is_active?: boolean
          level: number
          modifier_code?: string | null
          modifier_params?: Json
          name: string
          rarity_code?: string | null
          region?: string
          required_abilities: string[]
          updated_at?: string
        }
        Update: {
          art_url?: string | null
          code?: string
          created_at?: string
          emergency_target?: number | null
          flavor?: string
          id?: string
          is_active?: boolean
          level?: number
          modifier_code?: string | null
          modifier_params?: Json
          name?: string
          rarity_code?: string | null
          region?: string
          required_abilities?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_definitions_rarity_code_fkey"
            columns: ["rarity_code"]
            isOneToOne: false
            referencedRelation: "threat_rarities"
            referencedColumns: ["code"]
          },
        ]
      }
      threat_rarities: {
        Row: {
          code: string
          color: string
          name: string
          one_in: number
          rank: number
          updated_at: string
        }
        Insert: {
          code: string
          color: string
          name: string
          one_in: number
          rank: number
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          name?: string
          one_in?: number
          rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      threat_sightings: {
        Row: {
          first_seen_at: string
          last_seen_at: string
          threat_id: string
          times: number
          user_id: string
        }
        Insert: {
          first_seen_at?: string
          last_seen_at?: string
          threat_id: string
          times?: number
          user_id: string
        }
        Update: {
          first_seen_at?: string
          last_seen_at?: string
          threat_id?: string
          times?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threat_sightings_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threat_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threat_sightings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_categories: {
        Row: {
          code: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      traits: {
        Row: {
          category_code: string
          code: string
          description: string
          name: string
          sort_order: number
        }
        Insert: {
          category_code: string
          code: string
          description: string
          name: string
          sort_order: number
        }
        Update: {
          category_code?: string
          code?: string
          description?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "traits_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "trait_categories"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      card_catalog: {
        Row: {
          art_url: string | null
          code: string | null
          duplicate_coin_value: number | null
          faction: string | null
          flavor: string | null
          id: string | null
          name: string | null
          power_name: string | null
          power_text: string | null
          rarity_code: string | null
          rarity_color: string | null
          rarity_name: string | null
          rarity_rank: number | null
          stats: Json | null
          unlock_level: number | null
          variant_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_daily_objective_progress: {
        Args: { p_amount: number; p_objective_id: string }
        Returns: undefined
      }
      admin_bonus_codes_payload: { Args: never; Returns: Json }
      admin_boss_table_payload: { Args: never; Returns: Json }
      admin_create_bonus_code: {
        Args: {
          p_card_codes?: string[]
          p_code: string
          p_coins?: number
          p_expires_on?: string
          p_max_uses?: number
          p_note?: string
          p_packs?: number
        }
        Returns: Json
      }
      admin_daily_objectives_payload: { Args: never; Returns: Json }
      admin_delete_daily_objective: { Args: { p_code: string }; Returns: Json }
      admin_delete_event: { Args: { p_id: string }; Returns: Json }
      admin_delete_special_pack: { Args: { p_id: string }; Returns: Json }
      admin_events_payload: { Args: never; Returns: Json }
      admin_get_boss_table: { Args: never; Returns: Json }
      admin_list_bonus_codes: { Args: never; Returns: Json }
      admin_list_daily_objectives: { Args: never; Returns: Json }
      admin_list_events: { Args: never; Returns: Json }
      admin_list_pack_cards: { Args: never; Returns: Json }
      admin_list_special_packs: { Args: never; Returns: Json }
      admin_list_threats: { Args: never; Returns: Json }
      admin_pack_cards_payload: { Args: never; Returns: Json }
      admin_save_boss_table: {
        Args: {
          p_base_value: number
          p_hot_fronts: number
          p_hot_growth: number
          p_hot_value: number
        }
        Returns: Json
      }
      admin_save_daily_objective: {
        Args: {
          p_code: string
          p_coins: number
          p_difficulty: string
          p_metric: string
          p_packs: number
          p_params: Json
          p_target: number
          p_title: string
        }
        Returns: Json
      }
      admin_save_event: {
        Args: {
          p_daily_cap?: number
          p_description: string
          p_ends_at: string
          p_id?: string
          p_points: Json
          p_starts_at: string
          p_tiers: Json
          p_title: string
          p_traits?: string[]
        }
        Returns: Json
      }
      admin_save_match_rewards: {
        Args: { p_rules: Json; p_settings: Json }
        Returns: Json
      }
      admin_save_special_pack: {
        Args: {
          p_cards: Json
          p_cards_per_pack: number
          p_color: string
          p_description: string
          p_ends_at?: string
          p_guaranteed_min_rarity_rank?: number
          p_id?: string
          p_name: string
          p_odds_mode: string
          p_price: number
          p_rarities?: Json
          p_starts_at?: string
          p_variant_chance_percent: number
        }
        Returns: Json
      }
      admin_set_bonus_code_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: Json
      }
      admin_set_cards_in_packs: {
        Args: { p_card_codes: string[]; p_in_packs: boolean }
        Returns: Json
      }
      admin_set_daily_objective_active: {
        Args: { p_code: string; p_is_active: boolean }
        Returns: Json
      }
      admin_set_event_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: Json
      }
      admin_set_special_pack_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: Json
      }
      admin_special_packs_payload: { Args: never; Returns: Json }
      admin_update_threat: {
        Args: {
          p_code: string
          p_emergency_target: number
          p_flavor: string
          p_is_active: boolean
          p_modifier_code: string
          p_modifier_params: Json
          p_name: string
          p_rarity_code: string
        }
        Returns: undefined
      }
      admin_update_threat_rarity: {
        Args: {
          p_code: string
          p_color: string
          p_name: string
          p_one_in: number
        }
        Returns: undefined
      }
      advance_daily_objectives: {
        Args: { p_amount?: number; p_metric: string; p_user: string }
        Returns: undefined
      }
      award_event_points: {
        Args: {
          p_kind: string
          p_opponent: string
          p_outcome: string
          p_ref_id: string
          p_round: number
          p_started_at: string
          p_user: string
        }
        Returns: number
      }
      bootstrap_player: {
        Args: never
        Returns: {
          avatar_url: string | null
          best_streak: number
          bot_draws: number
          bot_losses: number
          bot_wins: number
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
      boss_is_playable: { Args: { p_boss_id: string }; Returns: boolean }
      boss_state_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      busy_instance_ids: {
        Args: { p_user: string }
        Returns: {
          instance_id: string
        }[]
      }
      buy_pack: { Args: never; Returns: Json }
      buy_special_pack: {
        Args: { p_pack_id: string; p_version: number }
        Returns: Json
      }
      cancel_lobby: { Args: never; Returns: undefined }
      card_matches_traits: {
        Args: { p_definition_id: string; p_traits: string[] }
        Returns: boolean
      }
      card_payload:
        | { Args: { p_definition_id: string }; Returns: Json }
        | {
            Args: { p_definition_id: string; p_instance_id: string }
            Returns: Json
          }
      card_trait_codes: { Args: { p_definition_id: string }; Returns: Json }
      cards_lost_today: { Args: { p_user: string }; Returns: number }
      check_conquest_team: {
        Args: { p_instance_ids: string[]; p_user: string }
        Returns: string[]
      }
      check_daily_objectives_enough: { Args: never; Returns: undefined }
      check_team: {
        Args: { p_instance_ids: string[]; p_user: string }
        Returns: string[]
      }
      check_team_of: {
        Args: { p_instance_ids: string[]; p_size: number; p_user: string }
        Returns: string[]
      }
      claim_conquest_card: {
        Args: { p_card_instance_id: string; p_match_id: string }
        Returns: Json
      }
      claim_daily_objective: { Args: { p_objective_id: string }; Returns: Json }
      claim_daily_pack: { Args: never; Returns: Json }
      claim_victory: { Args: { p_match_id: string }; Returns: Json }
      classic_match_state_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      close_abandoned_matches: { Args: { p_user: string }; Returns: undefined }
      coin_balance: { Args: { p_user: string }; Returns: number }
      collection_summary: {
        Args: { p_user: string }
        Returns: {
          convertible_copies: number
          copies: number
          definition_id: string
          locked_copies: number
          starter_copies: number
        }[]
      }
      config_int: { Args: { p_key: string }; Returns: number }
      config_text: { Args: { p_key: string }; Returns: string }
      conquest_pair_on_cooldown: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      conquest_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      convert_all_duplicates: { Args: never; Returns: Json }
      convert_definition_duplicates: {
        Args: { p_count: number; p_definition_id: string; p_user: string }
        Returns: Record<string, unknown>
      }
      convert_duplicates: {
        Args: { p_count?: number; p_definition_id: string }
        Returns: Json
      }
      create_bonus_code: {
        Args: {
          p_card_codes?: string[]
          p_code: string
          p_coins?: number
          p_expires_at?: string
          p_max_uses?: number
          p_note?: string
          p_packs?: number
        }
        Returns: string
      }
      create_lobby: {
        Args: { p_card_instance_ids: string[]; p_format?: string }
        Returns: Json
      }
      create_pvp_match: {
        Args: {
          p_mode: string
          p_player_a: string
          p_player_b: string
          p_team_a: string[]
          p_team_b: string[]
          p_threat_ids: string[]
        }
        Returns: string
      }
      current_event_id: { Args: { p_at?: string }; Returns: string }
      daily_objective_card_fits: {
        Args: { p_faction: string; p_params: Json; p_rank: number }
        Returns: boolean
      }
      daily_objective_match_amount: {
        Args: {
          p_match: Database["public"]["Tables"]["matches"]["Row"]
          p_metric: string
          p_params: Json
          p_side: string
        }
        Returns: number
      }
      daily_objective_params_valid: {
        Args: { p_metric: string; p_params: Json }
        Returns: boolean
      }
      daily_objectives_payload: {
        Args: { p_day: string; p_user: string }
        Returns: Json
      }
      delete_formation: { Args: { p_formation_id: string }; Returns: undefined }
      draw_daily_objective: {
        Args: {
          p_day: string
          p_difficulty: string
          p_slot: number
          p_user: string
        }
        Returns: string
      }
      draw_fixed_modifiers: {
        Args: { p_threat_ids: string[] }
        Returns: Json[]
      }
      draw_match_modifiers: { Args: { p_threat_ids: string[] }; Returns: Json }
      draw_pack_definitions: {
        Args: { p_count: number; p_guaranteed_min_rank: number }
        Returns: string[]
      }
      draw_rarity_rank: { Args: { p_min_rank: number }; Returns: number }
      draw_special_pack_card: {
        Args: { p_min_rank: number; p_pack_id: string }
        Returns: string
      }
      draw_threat_modifiers: { Args: { p_levels: number[] }; Returns: Json }
      draw_threat_rule: {
        Args: { p_previous: string; p_threat_id: string }
        Returns: Json
      }
      draw_variant: { Args: { p_definition_id: string }; Returns: string }
      draw_variant_at: {
        Args: { p_chance_percent: number; p_definition_id: string }
        Returns: string
      }
      eligible_rarities: {
        Args: never
        Returns: {
          code: string
          color: string
          drop_weight: number
          name: string
          rank: number
        }[]
      }
      emergency_ensure_day: {
        Args: { p_threat_ids: string[] }
        Returns: undefined
      }
      emergency_play_context: { Args: { p_user: string }; Returns: Json }
      emergency_record_play: {
        Args: {
          p_base: number
          p_bonus: number
          p_card_instance_id: string
          p_required: number
          p_round: number
          p_score: number
          p_user: string
        }
        Returns: undefined
      }
      emergency_record_play_state: {
        Args: {
          p_base: number
          p_bonus: number
          p_card_instance_id: string
          p_required: number
          p_round: number
          p_score: number
          p_user: string
        }
        Returns: Json
      }
      emergency_start: {
        Args: { p_card_instance_ids: string[]; p_user: string }
        Returns: string
      }
      emergency_state_payload: { Args: { p_user: string }; Returns: Json }
      emergency_state_payload_base: { Args: { p_user: string }; Returns: Json }
      ensure_daily_objectives: { Args: { p_user: string }; Returns: string }
      event_payload: {
        Args: { p_event_id: string; p_user: string }
        Returns: Json
      }
      event_points_rules: { Args: { p_points: Json }; Returns: Json }
      event_ref_team: {
        Args: { p_ref_id: string; p_user: string }
        Returns: string[]
      }
      event_reward_cards: {
        Args: { p_card_codes: string[] }
        Returns: Record<string, unknown>
      }
      event_team_admitted: {
        Args: { p_definition_ids: string[]; p_traits: string[] }
        Returns: boolean
      }
      finish_match: {
        Args: { p_match_id: string; p_reason: string; p_result: string }
        Returns: undefined
      }
      forfeit_match: { Args: { p_match_id: string }; Returns: Json }
      game_day: { Args: { p_at?: string }; Returns: string }
      get_active_match: { Args: never; Returns: Json }
      get_bestiary: { Args: never; Returns: Json }
      get_collection: {
        Args: never
        Returns: {
          convertible_copies: number
          copies: number
          definition_id: string
          locked_copies: number
          starter_copies: number
        }[]
      }
      get_conquest_history: { Args: never; Returns: Json }
      get_conquest_status: { Args: never; Returns: Json }
      get_daily_objectives: { Args: never; Returns: Json }
      get_emergency_leaderboard: { Args: { p_limit?: number }; Returns: Json }
      get_event: { Args: never; Returns: Json }
      get_event_points_for: { Args: { p_ref_id: string }; Returns: Json }
      get_lobby_format: { Args: { p_code: string }; Returns: string }
      get_match_history: { Args: { p_limit?: number }; Returns: Json }
      get_match_reward: { Args: { p_match_id: string }; Returns: Json }
      get_match_rewards: { Args: never; Returns: Json }
      get_match_state: { Args: { p_match_id: string }; Returns: Json }
      get_pack_odds: { Args: never; Returns: Json }
      get_pack_opening: { Args: { p_opening_id: string }; Returns: Json }
      get_pack_status: { Args: never; Returns: Json }
      get_special_packs: { Args: never; Returns: Json }
      get_story: { Args: never; Returns: Json }
      get_story_reward: { Args: { p_match_id: string }; Returns: Json }
      grant_event_tier: {
        Args: {
          p_tier: Database["public"]["Tables"]["event_tiers"]["Row"]
          p_user: string
        }
        Returns: undefined
      }
      grant_level_rewards: {
        Args: { p_match_id: string; p_user: string }
        Returns: undefined
      }
      grant_level_unlocks: {
        Args: { p_match_id: string; p_user: string }
        Returns: undefined
      }
      grant_starter_set: { Args: { p_user: string }; Returns: number }
      has_active_match: { Args: { p_user: string }; Returns: boolean }
      insert_boss_match: {
        Args: {
          p_boss_id?: string
          p_boss_values: Json
          p_bot_difficulty: string
          p_definitions_a: string[]
          p_definitions_b: string[]
          p_mode: string
          p_player_a: string
          p_player_b: string
          p_team_a: string[]
          p_team_b: string[]
        }
        Returns: string
      }
      insert_conquest_bot_match: {
        Args: {
          p_bot_definition_ids: string[]
          p_definitions: string[]
          p_difficulty: string
          p_team: string[]
          p_threat_ids: string[]
          p_user: string
        }
        Returns: string
      }
      insert_pvp_match: {
        Args: {
          p_definitions_a: string[]
          p_definitions_b: string[]
          p_mode: string
          p_player_a: string
          p_player_b: string
          p_team_a: string[]
          p_team_b: string[]
          p_threat_ids: string[]
        }
        Returns: string
      }
      insert_quadrant_match: {
        Args: {
          p_abilities?: string[]
          p_bot_difficulty: string
          p_definitions_a: string[]
          p_definitions_b: string[]
          p_first?: string
          p_format: string
          p_mode: string
          p_player_a: string
          p_player_b: string
          p_team_a: string[]
          p_team_b: string[]
        }
        Returns: string
      }
      insert_triple_match: {
        Args: {
          p_bot_difficulty: string
          p_definitions_a: string[]
          p_definitions_b: string[]
          p_mode: string
          p_player_a: string
          p_player_b: string
          p_team_a: string[]
          p_team_b: string[]
          p_threat_ids?: string[]
        }
        Returns: string
      }
      instance_in_active_match: {
        Args: { p_instance_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_pack_card: {
        Args: {
          p_definition: Database["public"]["Tables"]["card_definitions"]["Row"]
        }
        Returns: boolean
      }
      is_quadrant: { Args: { p_format: string }; Returns: boolean }
      leave_queue: { Args: never; Returns: undefined }
      level_for_xp: { Args: { p_xp: number }; Returns: number }
      mark_event_rewards_seen: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      match_create_boss_bot: {
        Args: {
          p_boss_id?: string
          p_boss_values: Json
          p_bot_definition_ids: string[]
          p_card_instance_ids: string[]
          p_difficulty: string
          p_user: string
        }
        Returns: string
      }
      match_create_bot: {
        Args: {
          p_bot_definition_ids: string[]
          p_card_instance_ids: string[]
          p_difficulty: string
          p_threat_ids: string[]
          p_user: string
        }
        Returns: string
      }
      match_create_conquest_bot: {
        Args: {
          p_bot_definition_ids: string[]
          p_difficulty: string
          p_threat_ids: string[]
          p_user: string
        }
        Returns: string
      }
      match_create_quadrant_bot: {
        Args: {
          p_abilities?: string[]
          p_bot_definition_ids: string[]
          p_card_instance_ids: string[]
          p_difficulty: string
          p_first?: string
          p_format: string
          p_user: string
        }
        Returns: string
      }
      match_create_triple_bot: {
        Args: {
          p_bot_definition_ids: string[]
          p_card_instance_ids: string[]
          p_difficulty: string
          p_threat_ids?: string[]
          p_user: string
        }
        Returns: string
      }
      match_heartbeat: { Args: { p_match_id: string }; Returns: undefined }
      match_join_lobby: {
        Args: {
          p_boss_values?: Json
          p_code: string
          p_guest: string
          p_team: string[]
          p_threat_ids: string[]
        }
        Returns: string
      }
      match_ping: { Args: { p_match_id: string }; Returns: Json }
      match_queue_join: {
        Args: {
          p_boss_values?: Json
          p_bot_definition_ids?: string[]
          p_bot_difficulty?: string
          p_format?: string
          p_mode: string
          p_team: string[]
          p_threat_ids: string[]
          p_user: string
        }
        Returns: string
      }
      match_record_boss_turn: {
        Args: {
          p_holders: Json
          p_match_id: string
          p_play_a: Json
          p_play_b: Json
          p_result: string
          p_turn: number
        }
        Returns: undefined
      }
      match_record_boss_turn_state: {
        Args: {
          p_holders: Json
          p_match_id: string
          p_play_a: Json
          p_play_b: Json
          p_result: string
          p_side: string
          p_turn: number
        }
        Returns: Json
      }
      match_record_quadrant_move: {
        Args: {
          p_board: Json
          p_match_id: string
          p_move: number
          p_play: Json
          p_result: string
        }
        Returns: undefined
      }
      match_record_quadrant_move_state: {
        Args: {
          p_board: Json
          p_match_id: string
          p_move: number
          p_play: Json
          p_result: string
          p_side: string
        }
        Returns: Json
      }
      match_record_round: {
        Args: {
          p_match_id: string
          p_play_a: Json
          p_play_b: Json
          p_result: string
          p_round: number
          p_winner_side: string
        }
        Returns: undefined
      }
      match_record_round_state: {
        Args: {
          p_match_id: string
          p_play_a: Json
          p_play_b: Json
          p_result: string
          p_round: number
          p_side: string
          p_winner_side: string
        }
        Returns: Json
      }
      match_record_triple_round: {
        Args: {
          p_match_id: string
          p_plays_a: Json
          p_plays_b: Json
          p_result: string
          p_round: number
          p_winners: Json
        }
        Returns: undefined
      }
      match_record_triple_round_state: {
        Args: {
          p_match_id: string
          p_plays_a: Json
          p_plays_b: Json
          p_result: string
          p_round: number
          p_side: string
          p_winners: Json
        }
        Returns: Json
      }
      match_reward_mode: {
        Args: { p_match: Database["public"]["Tables"]["matches"]["Row"] }
        Returns: string
      }
      match_reward_rule: {
        Args: {
          p_match: Database["public"]["Tables"]["matches"]["Row"]
          p_outcome: string
        }
        Returns: {
          coins: number
          mode_key: string
          opponent: string
          outcome: string
          packs: number
          updated_at: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "match_reward_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      match_reward_setting_bounds: {
        Args: never
        Returns: {
          key: string
          max_value: number
          min_value: number
        }[]
      }
      match_rewards_payload: { Args: never; Returns: Json }
      match_round_context: {
        Args: { p_match_id: string; p_user: string }
        Returns: Json
      }
      match_state_for_user: {
        Args: { p_match_id: string; p_user: string }
        Returns: Json
      }
      match_state_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      match_submit_play: {
        Args: {
          p_card_instance_id: string
          p_front_slot?: number
          p_match_id: string
          p_round: number
          p_user: string
        }
        Returns: string
      }
      match_submit_quadrant: {
        Args: {
          p_card_instance_id: string
          p_match_id: string
          p_move: number
          p_rotation: number
          p_user: string
          p_x: number
          p_y: number
        }
        Returns: string
      }
      match_submit_triple: {
        Args: {
          p_card_instance_ids: string[]
          p_match_id: string
          p_round: number
          p_user: string
        }
        Returns: string
      }
      next_reset_at: { Args: { p_at?: string }; Returns: string }
      notify_match: {
        Args: { p_kind: string; p_match_id: string }
        Returns: undefined
      }
      notify_player: {
        Args: { p_kind: string; p_match_id: string; p_user: string }
        Returns: undefined
      }
      nullified_in_round: {
        Args: { p_match_id: string; p_round: number; p_side: string }
        Returns: boolean
      }
      open_conquest_claim: {
        Args: { p_match_id: string; p_winner_side: string }
        Returns: undefined
      }
      open_pack: {
        Args: { p_pack_type: string; p_user: string }
        Returns: string
      }
      open_quadrant_move: {
        Args: { p_match_id: string; p_move: number }
        Returns: undefined
      }
      open_special_pack: {
        Args: { p_pack_id: string; p_user: string }
        Returns: string
      }
      open_triple_round: {
        Args: { p_match_id: string; p_round: number }
        Returns: undefined
      }
      pack_opening_payload: { Args: { p_opening_id: string }; Returns: Json }
      place_modifier: {
        Args: { p_code: string; p_params: Json }
        Returns: Json
      }
      play_parts_valid: {
        Args: { p_bonus: number; p_parts: Json }
        Returns: boolean
      }
      power_text: {
        Args: { p_params: Json; p_power_code: string }
        Returns: string
      }
      quadrant_cell_legal: {
        Args: { p_board: Json; p_format: string; p_x: number; p_y: number }
        Returns: boolean
      }
      quadrant_controlled: {
        Args: { p_board: Json; p_side: string }
        Returns: number
      }
      quadrant_hand: {
        Args: { p_match_id: string; p_side: string }
        Returns: {
          definition_id: string
          instance_id: string
          ord: number
        }[]
      }
      quadrant_result_of: {
        Args: { p_board: Json; p_first: string }
        Returns: string
      }
      quadrant_seals: {
        Args: { p_board: Json; p_side: string }
        Returns: number
      }
      quadrant_side_of_move: {
        Args: { p_first: string; p_move: number }
        Returns: string
      }
      quadrant_state_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      quadrant_values: {
        Args: {
          p_abilities: string[]
          p_definition_id: string
          p_rotation: number
        }
        Returns: number[]
      }
      queue_candidates: {
        Args: {
          p_level: number
          p_mode: string
          p_since: string
          p_user: string
          p_value: number
        }
        Returns: {
          card_instance_ids: string[]
          enqueued_at: string
          format: string
          level: number
          mode: string
          refreshed_at: string
          team_value: number
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "matchmaking_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_threat_sighting: {
        Args: { p_at: string; p_threat_id: string; p_user: string }
        Returns: undefined
      }
      redeem_bonus_code: { Args: { p_code: string }; Returns: Json }
      refresh_daily_objective: {
        Args: { p_objective_id: string }
        Returns: Json
      }
      resolve_conquest_claim: {
        Args: { p_auto: boolean; p_instance_id: string; p_match_id: string }
        Returns: undefined
      }
      rule_abilities: {
        Args: { p_modifier: Json; p_required: string[] }
        Returns: Json
      }
      rule_levels: {
        Args: { p_modifiers: Json; p_threat_ids: string[] }
        Returns: number[]
      }
      rule_threat_entry: {
        Args: {
          p_entry: Json
          p_hide: boolean
          p_modifier: Json
          p_required: string[]
        }
        Returns: Json
      }
      save_formation: {
        Args: {
          p_card_instance_ids: string[]
          p_formation_id: string
          p_name: string
        }
        Returns: {
          card_instance_ids: string[]
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "formations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_username: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string | null
          best_streak: number
          bot_draws: number
          bot_losses: number
          bot_wins: number
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
      settle_expired_claims: { Args: { p_user: string }; Returns: undefined }
      special_pack_card_odds: {
        Args: { p_pack_id: string }
        Returns: {
          definition_id: string
          probability: number
          rarity_rank: number
        }[]
      }
      special_pack_is_open: {
        Args: { p_pack: Database["public"]["Tables"]["special_packs"]["Row"] }
        Returns: boolean
      }
      special_pack_shop_payload: {
        Args: { p_pack: Database["public"]["Tables"]["special_packs"]["Row"] }
        Returns: Json
      }
      store_play_parts: {
        Args: {
          p_match_id: string
          p_play: Json
          p_round: number
          p_side: string
        }
        Returns: undefined
      }
      story_create_match: {
        Args: {
          p_card_instance_ids: string[]
          p_mission_code: string
          p_user: string
        }
        Returns: string
      }
      story_mission_unlocked: {
        Args: {
          p_mission: Database["public"]["Tables"]["story_missions"]["Row"]
          p_user: string
        }
        Returns: boolean
      }
      team_size_for: { Args: { p_format: string }; Returns: number }
      team_value: { Args: { p_definition_ids: string[] }; Returns: number }
      threat_rarity_payload: { Args: { p_threat_id: string }; Returns: Json }
      trait_admitted_count: { Args: { p_traits: string[] }; Returns: number }
      trait_catalog_payload: { Args: never; Returns: Json }
      traits_description: { Args: { p_traits: string[] }; Returns: Json }
      triple_deck_size: { Args: never; Returns: number }
      triple_state_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      username_base: { Args: { p_source: string }; Returns: string }
      valid_boss_values: { Args: { p_values: Json }; Returns: boolean }
      validate_conquest_team: {
        Args: { p_instance_ids: string[]; p_user: string }
        Returns: string[]
      }
      validate_team: {
        Args: { p_instance_ids: string[]; p_user: string }
        Returns: string[]
      }
      validate_team_for: {
        Args: { p_format: string; p_instance_ids: string[]; p_user: string }
        Returns: string[]
      }
      visible_modifier: {
        Args: { p_hide: boolean; p_modifier: Json }
        Returns: Json
      }
      with_place_modifiers:
        | { Args: { p_modifiers: Json; p_threat_ids: string[] }; Returns: Json }
        | {
            Args: {
              p_modifiers: Json
              p_previous: Json
              p_threat_ids: string[]
            }
            Returns: Json
          }
      with_play_parts: {
        Args: { p_match_id: string; p_payload: Json; p_side: string }
        Returns: Json
      }
      with_rare_rules: {
        Args: { p_match_id: string; p_payload: Json; p_side: string }
        Returns: Json
      }
      with_rare_threats: { Args: { p_threat_ids: string[] }; Returns: string[] }
      with_rare_triple_rules: {
        Args: { p_match_id: string; p_payload: Json }
        Returns: Json
      }
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
