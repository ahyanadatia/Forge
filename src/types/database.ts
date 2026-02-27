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
        };
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
