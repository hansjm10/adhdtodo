// ABOUTME: TypeScript types for Supabase database schema
// Auto-generated types based on database schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
          updated_at: string;
          notification_preferences: Json;
          preferred_start_time: string | null;
          theme: string;
          current_streak: number;
          longest_streak: number;
          xp_total: number;
          device_tokens: string[] | null;
          last_active: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          notification_preferences?: Json;
          preferred_start_time?: string | null;
          theme?: string;
          current_streak?: number;
          longest_streak?: number;
          xp_total?: number;
          device_tokens?: string[] | null;
          last_active?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          notification_preferences?: Json;
          preferred_start_time?: string | null;
          theme?: string;
          current_streak?: number;
          longest_streak?: number;
          xp_total?: number;
          device_tokens?: string[] | null;
          last_active?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          priority: 'low' | 'medium' | 'high';
          status: 'pending' | 'in_progress' | 'completed';
          due_date: string | null;
          time_estimate: number | null;
          time_spent: number;
          started_at: string | null;
          completed_at: string | null;
          assigned_by: string | null;
          assigned_to: string | null;
          reminder_1: string | null;
          reminder_2: string | null;
          reminder_custom: string | null;
          xp_earned: number;
          streak_contribution: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string;
          priority?: 'low' | 'medium' | 'high';
          status?: 'pending' | 'in_progress' | 'completed';
          due_date?: string | null;
          time_estimate?: number | null;
          time_spent?: number;
          started_at?: string | null;
          completed_at?: string | null;
          assigned_by?: string | null;
          assigned_to?: string | null;
          reminder_1?: string | null;
          reminder_2?: string | null;
          reminder_custom?: string | null;
          xp_earned?: number;
          streak_contribution?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          priority?: 'low' | 'medium' | 'high';
          status?: 'pending' | 'in_progress' | 'completed';
          due_date?: string | null;
          time_estimate?: number | null;
          time_spent?: number;
          started_at?: string | null;
          completed_at?: string | null;
          assigned_by?: string | null;
          assigned_to?: string | null;
          reminder_1?: string | null;
          reminder_2?: string | null;
          reminder_custom?: string | null;
          xp_earned?: number;
          streak_contribution?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      partnerships: {
        Row: {
          id: string;
          adhd_user_id: string | null;
          partner_id: string | null;
          status: 'pending' | 'active' | 'paused' | 'declined' | 'terminated';
          invite_code: string;
          invite_sent_by: string | null;
          settings: Json;
          stats: Json;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          terminated_at: string | null;
        };
        Insert: {
          id?: string;
          adhd_user_id?: string | null;
          partner_id?: string | null;
          status?: 'pending' | 'active' | 'paused' | 'declined' | 'terminated';
          invite_code?: string;
          invite_sent_by?: string | null;
          settings?: Json;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          terminated_at?: string | null;
        };
        Update: {
          id?: string;
          adhd_user_id?: string | null;
          partner_id?: string | null;
          status?: 'pending' | 'active' | 'paused' | 'declined' | 'terminated';
          invite_code?: string;
          invite_sent_by?: string | null;
          settings?: Json;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          terminated_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json;
          priority: string;
          read: boolean;
          read_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json;
          priority?: string;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json;
          priority?: string;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
          expires_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      cleanup_old_notifications: {
        Args: Record<string, never>;
        Returns: void;
      };
      generate_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      update_partnership_stats: {
        Args: {
          partnership_id: string;
          stat_key: string;
          increment: number;
        };
        Returns: void;
      };
      update_partnership_durations: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
