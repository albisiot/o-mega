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
          owner_id: string | null
        }
        Insert: {
          acquired_at?: string
          acquired_via: string
          converted_at?: string | null
          definition_id: string
          id?: string
          is_starter?: boolean
          locked_until?: string | null
          owner_id?: string | null
        }
        Update: {
          acquired_at?: string
          acquired_via?: string
          converted_at?: string | null
          definition_id?: string
          id?: string
          is_starter?: boolean
          locked_until?: string | null
          owner_id?: string | null
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
      match_lobbies: {
        Row: {
          card_instance_ids: string[]
          code: string
          created_at: string
          expires_at: string
          host_id: string
          mode: string
        }
        Insert: {
          card_instance_ids: string[]
          code: string
          created_at?: string
          expires_at: string
          host_id: string
          mode?: string
        }
        Update: {
          card_instance_ids?: string[]
          code?: string
          created_at?: string
          expires_at?: string
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
      match_rounds: {
        Row: {
          deadline_at: string
          match_id: string
          opened_at: string
          resolved_at: string | null
          round: number
          threat_id: string
          winner_side: string | null
        }
        Insert: {
          deadline_at: string
          match_id: string
          opened_at?: string
          resolved_at?: string | null
          round: number
          threat_id: string
          winner_side?: string | null
        }
        Update: {
          deadline_at?: string
          match_id?: string
          opened_at?: string
          resolved_at?: string | null
          round?: number
          threat_id?: string
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
          bot_difficulty: string | null
          created_at: string
          current_round: number
          end_reason: string | null
          finished_at: string | null
          id: string
          mode: string
          player_a: string
          player_b: string | null
          result: string | null
          reward_coins_a: number | null
          reward_coins_b: number | null
          rounds_won_a: number
          rounds_won_b: number
          status: string
          threat_ids: string[]
          threat_levels: number[]
          total_score_a: number
          total_score_b: number
        }
        Insert: {
          bot_difficulty?: string | null
          created_at?: string
          current_round?: number
          end_reason?: string | null
          finished_at?: string | null
          id?: string
          mode: string
          player_a: string
          player_b?: string | null
          result?: string | null
          reward_coins_a?: number | null
          reward_coins_b?: number | null
          rounds_won_a?: number
          rounds_won_b?: number
          status?: string
          threat_ids: string[]
          threat_levels: number[]
          total_score_a?: number
          total_score_b?: number
        }
        Update: {
          bot_difficulty?: string | null
          created_at?: string
          current_round?: number
          end_reason?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          player_a?: string
          player_b?: string | null
          result?: string | null
          reward_coins_a?: number | null
          reward_coins_b?: number | null
          rounds_won_a?: number
          rounds_won_b?: number
          status?: string
          threat_ids?: string[]
          threat_levels?: number[]
          total_score_a?: number
          total_score_b?: number
        }
        Relationships: [
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
        ]
      }
      matchmaking_queue: {
        Row: {
          card_instance_ids: string[]
          enqueued_at: string
          mode: string
          refreshed_at: string
          user_id: string
        }
        Insert: {
          card_instance_ids: string[]
          enqueued_at?: string
          mode?: string
          refreshed_at?: string
          user_id: string
        }
        Update: {
          card_instance_ids?: string[]
          enqueued_at?: string
          mode?: string
          refreshed_at?: string
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
          user_id: string
        }
        Insert: {
          card_instance_ids: string[]
          id?: string
          is_daily?: boolean | null
          new_card_instance_ids?: string[]
          opened_at?: string
          pack_type: string
          user_id: string
        }
        Update: {
          card_instance_ids?: string[]
          id?: string
          is_daily?: boolean | null
          new_card_instance_ids?: string[]
          opened_at?: string
          pack_type?: string
          user_id?: string
        }
        Relationships: [
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
          match_id: string
          round: number
          side: string
          submitted_at: string
        }
        Insert: {
          card_instance_id: string
          match_id: string
          round: number
          side: string
          submitted_at?: string
        }
        Update: {
          card_instance_id?: string
          match_id?: string
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
          code: string
          color: string
          drop_weight: number
          duplicate_coin_value: number
          name: string
          rank: number
        }
        Insert: {
          code: string
          color: string
          drop_weight: number
          duplicate_coin_value?: number
          name: string
          rank: number
        }
        Update: {
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
          created_at: string
          definition_id: string
          highest_value: number
          match_id: string
          round: number
          score: number
          side: string
        }
        Insert: {
          auto_played?: boolean
          base_score: number
          bonus: number
          card_instance_id?: string | null
          created_at?: string
          definition_id: string
          highest_value: number
          match_id: string
          round: number
          score: number
          side: string
        }
        Update: {
          auto_played?: boolean
          base_score?: number
          bonus?: number
          card_instance_id?: string | null
          created_at?: string
          definition_id?: string
          highest_value?: number
          match_id?: string
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
      threat_definitions: {
        Row: {
          art_url: string | null
          code: string
          created_at: string
          flavor: string
          id: string
          is_active: boolean
          level: number
          modifier_code: string | null
          modifier_params: Json
          name: string
          required_abilities: string[]
        }
        Insert: {
          art_url?: string | null
          code: string
          created_at?: string
          flavor?: string
          id?: string
          is_active?: boolean
          level: number
          modifier_code?: string | null
          modifier_params?: Json
          name: string
          required_abilities: string[]
        }
        Update: {
          art_url?: string | null
          code?: string
          created_at?: string
          flavor?: string
          id?: string
          is_active?: boolean
          level?: number
          modifier_code?: string | null
          modifier_params?: Json
          name?: string
          required_abilities?: string[]
        }
        Relationships: []
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
        }
        Relationships: []
      }
    }
    Functions: {
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
      buy_pack: { Args: never; Returns: Json }
      cancel_lobby: { Args: never; Returns: undefined }
      card_payload: { Args: { p_definition_id: string }; Returns: Json }
      claim_daily_pack: { Args: never; Returns: Json }
      claim_victory: { Args: { p_match_id: string }; Returns: Json }
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
      convert_all_duplicates: { Args: never; Returns: Json }
      convert_definition_duplicates: {
        Args: { p_count: number; p_definition_id: string; p_user: string }
        Returns: Record<string, unknown>
      }
      convert_duplicates: {
        Args: { p_count?: number; p_definition_id: string }
        Returns: Json
      }
      create_lobby: { Args: { p_card_instance_ids: string[] }; Returns: Json }
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
      delete_formation: { Args: { p_formation_id: string }; Returns: undefined }
      draw_pack_definitions: {
        Args: { p_count: number; p_guaranteed_min_rank: number }
        Returns: string[]
      }
      draw_rarity_rank: { Args: { p_min_rank: number }; Returns: number }
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
      finish_match: {
        Args: { p_match_id: string; p_reason: string; p_result: string }
        Returns: undefined
      }
      forfeit_match: { Args: { p_match_id: string }; Returns: Json }
      game_day: { Args: { p_at?: string }; Returns: string }
      get_active_match: { Args: never; Returns: Json }
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
      get_match_state: { Args: { p_match_id: string }; Returns: Json }
      get_pack_odds: { Args: never; Returns: Json }
      get_pack_opening: { Args: { p_opening_id: string }; Returns: Json }
      get_pack_status: { Args: never; Returns: Json }
      grant_starter_set: { Args: { p_user: string }; Returns: number }
      has_active_match: { Args: { p_user: string }; Returns: boolean }
      instance_in_active_match: {
        Args: { p_instance_id: string }
        Returns: boolean
      }
      leave_queue: { Args: never; Returns: undefined }
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
      match_heartbeat: { Args: { p_match_id: string }; Returns: undefined }
      match_join_lobby: {
        Args: {
          p_code: string
          p_guest: string
          p_team: string[]
          p_threat_ids: string[]
        }
        Returns: string
      }
      match_queue_join: {
        Args: { p_team: string[]; p_threat_ids: string[]; p_user: string }
        Returns: string
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
      match_state_payload: {
        Args: { p_match_id: string; p_side: string }
        Returns: Json
      }
      match_submit_play: {
        Args: {
          p_card_instance_id: string
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
      open_pack: {
        Args: { p_pack_type: string; p_user: string }
        Returns: string
      }
      pack_opening_payload: { Args: { p_opening_id: string }; Returns: Json }
      power_text: {
        Args: { p_params: Json; p_power_code: string }
        Returns: string
      }
      pvp_reward: {
        Args: {
          p_match: Database["public"]["Tables"]["matches"]["Row"]
          p_reason: string
          p_result: string
          p_side: string
        }
        Returns: number
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
      username_base: { Args: { p_source: string }; Returns: string }
      validate_team: {
        Args: { p_instance_ids: string[]; p_user: string }
        Returns: string[]
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
