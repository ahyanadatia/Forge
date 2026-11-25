import type { EvidenceSource, EvidenceType, RecomputeTrigger } from "@/lib/scoring/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      builders: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          first_name: string;
          middle_names: string | null;
          last_name: string;
          display_name: string | null;
          avatar_url: string | null;
          github_username: string | null;
          role_descriptor: string | null;
          location: string | null;
          bio: string | null;
          availability: string;
          skills: Json;
          university_or_company: string | null;
          primary_stack: string | null;
          secondary_stack: string | null;
          commitment_preferences: string | null;
          website_url: string | null;
          linkedin_url: string | null;
          created_at: string;
          score_v3: number | null;
          score_v3_model: string | null;
          score_v3_computed_at: string | null;
          tenure_start: string | null;
          ai_backend: number | null;
          ai_frontend: number | null;
          ai_ml: number | null;
          ai_systems: number | null;
          ai_devops: number | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          first_name: string;
          last_name: string;
          middle_names?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          github_username?: string | null;
          role_descriptor?: string | null;
          location?: string | null;
          bio?: string | null;
          availability?: string;
          skills?: Json;
          university_or_company?: string | null;
          primary_stack?: string | null;
          secondary_stack?: string | null;
          commitment_preferences?: string | null;
          website_url?: string | null;
          linkedin_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          first_name?: string;
          middle_names?: string | null;
          last_name?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          github_username?: string | null;
          role_descriptor?: string | null;
          location?: string | null;
          bio?: string | null;
          availability?: string;
          skills?: Json;
          university_or_company?: string | null;
          primary_stack?: string | null;
          secondary_stack?: string | null;
          commitment_preferences?: string | null;
          website_url?: string | null;
          linkedin_url?: string | null;
          updated_at?: string;
          score_v3?: number | null;
          score_v3_model?: string | null;
          score_v3_computed_at?: string | null;
          tenure_start?: string | null;
          ai_backend?: number | null;
          ai_frontend?: number | null;
          ai_ml?: number | null;
          ai_systems?: number | null;
          ai_devops?: number | null;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          builder_id: string;
          project_id: string | null;
          title: string;
          description: string;
          role: string;
          stack: string[];
          status: string;
          deployment_url: string | null;
          repo_url: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          builder_id: string;
          project_id?: string | null;
          title: string;
          description: string;
          role: string;
          stack?: string[];
          status?: string;
          deployment_url?: string | null;
          repo_url?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          role?: string;
          stack?: string[];
          status?: string;
          deployment_url?: string | null;
          repo_url?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      evidence: {
        Row: {
          id: string;
          delivery_id: string;
          evidence_type: string;
          value: string;
          metadata: Json;
          verified: boolean;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          evidence_type: string;
          value: string;
          metadata?: Json;
          verified?: boolean;
          verified_at?: string | null;
        };
        Update: {
          verified?: boolean;
          verified_at?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      verifications: {
        Row: {
          id: string;
          delivery_id: string;
          deployment_reachable: boolean | null;
          repo_exists: boolean | null;
          timeline_verified: boolean | null;
          collaborator_confirmed: boolean | null;
          overall_status: string;
          last_checked_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          deployment_reachable?: boolean | null;
          repo_exists?: boolean | null;
          timeline_verified?: boolean | null;
          collaborator_confirmed?: boolean | null;
          overall_status?: string;
        };
        Update: {
          deployment_reachable?: boolean | null;
          repo_exists?: boolean | null;
          timeline_verified?: boolean | null;
          collaborator_confirmed?: boolean | null;
          overall_status?: string;
          last_checked_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          goals: string[];
          timeline: string;
          hours_per_week: number;
          required_skills: string[];
          team_size: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description: string;
          goals?: string[];
          timeline: string;
          hours_per_week: number;
          required_skills?: string[];
          team_size?: number;
          status?: string;
        };
        Update: {
          title?: string;
          description?: string;
          goals?: string[];
          timeline?: string;
          hours_per_week?: number;
          required_skills?: string[];
          team_size?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          project_id: string;
          builder_id: string;
          status: string;
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          builder_id: string;
          status?: string;
          message?: string | null;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          builder_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          builder_id: string;
          role?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [];
      };
      team_tasks: {
        Row: {
          id: string;
          team_id: string;
          title: string;
          status: string;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          title: string;
          status?: string;
          owner_id?: string | null;
        };
        Update: {
          title?: string;
          status?: string;
          owner_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          team_id: string;
          actor_id: string;
          event_type: string;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          actor_id: string;
          event_type: string;
          description: string;
          metadata?: Json;
        };
        Update: never;
        Relationships: [];
      };
      forge_scores: {
        Row: {
          id: string;
          builder_id: string;
          score: number;
          verified_deliveries_component: number;
          reliability_component: number;
          collaboration_component: number;
          consistency_component: number;
          confidence: number;
          effective_score: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          builder_id: string;
          score: number;
          verified_deliveries_component: number;
          reliability_component: number;
          collaboration_component: number;
          consistency_component: number;
          confidence: number;
          effective_score: number;
        };
        Update: {
          score?: number;
          verified_deliveries_component?: number;
          reliability_component?: number;
          collaboration_component?: number;
          consistency_component?: number;
          confidence?: number;
          effective_score?: number;
          computed_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          participant_1_id: string;
          participant_2_id: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_1_id: string;
          participant_2_id: string;
        };
        Update: {
          last_message_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      // ─── Forge Score V3 (supabase/migrations/20260228_forge_score_v3.sql) ───
      score_evidence: {
        Row: {
          id: string;
          builder_id: string;
          project_id: string | null;
          delivery_id: string | null;
          type: EvidenceType;
          source: EvidenceSource;
          payload: Json;
          confidence: number;
          hash: string;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          builder_id: string;
          project_id?: string | null;
          delivery_id?: string | null;
          type: EvidenceType;
          source: EvidenceSource;
          payload?: Json;
          confidence?: number;
          hash: string;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      scoring_model_versions: {
        Row: {
          version: string;
          weights: Json;
          caps: Json;
          tier_config: Json;
          effective_from: string;
          deprecated_at: string | null;
          created_at: string;
        };
        Insert: {
          version: string;
          weights: Json;
          caps: Json;
          tier_config?: Json;
          effective_from?: string;
          deprecated_at?: string | null;
        };
        Update: {
          deprecated_at?: string | null;
        };
        Relationships: [];
      };
      score_history: {
        Row: {
          id: string;
          builder_id: string;
          score_v3: number;
          previous_score: number | null;
          delta: number | null;
          breakdown: Json;
          anomaly_flags: Json;
          evidence_snapshot_ids: string[];
          model_version: string;
          reason: string;
          computed_at: string;
        };
        Insert: {
          id?: string;
          builder_id: string;
          score_v3: number;
          previous_score?: number | null;
          delta?: number | null;
          breakdown: Json;
          anomaly_flags?: Json;
          evidence_snapshot_ids?: string[];
          model_version: string;
          reason: string;
          computed_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      score_recompute_queue: {
        Row: {
          id: string;
          builder_id: string;
          trigger_type: RecomputeTrigger;
          trigger_evidence_id: string | null;
          priority: number;
          status: "pending" | "processing" | "completed" | "failed";
          created_at: string;
          processed_at: string | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          builder_id: string;
          trigger_type: RecomputeTrigger;
          trigger_evidence_id?: string | null;
          priority?: number;
          status?: "pending" | "processing" | "completed" | "failed";
        };
        Update: {
          status?: "pending" | "processing" | "completed" | "failed";
          processed_at?: string | null;
          error_message?: string | null;
        };
        Relationships: [];
      };
      score_rate_limits: {
        Row: { builder_id: string; last_computed_at: string };
        Insert: { builder_id: string; last_computed_at?: string };
        Update: { last_computed_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
