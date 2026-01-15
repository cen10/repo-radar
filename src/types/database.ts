// Database types for Supabase
// Follows Supabase type generation patterns for type-safe database access

export interface Database {
  public: {
    Tables: {
      radars: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      radar_repos: {
        Row: {
          id: string;
          radar_id: string;
          github_repo_id: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          radar_id: string;
          github_repo_id: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          radar_id?: string;
          github_repo_id?: number;
          added_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases for application use
export type Radar = Database['public']['Tables']['radars']['Row'];
export type RadarInsert = Database['public']['Tables']['radars']['Insert'];
export type RadarUpdate = Database['public']['Tables']['radars']['Update'];

export type RadarRepo = Database['public']['Tables']['radar_repos']['Row'];
export type RadarRepoInsert = Database['public']['Tables']['radar_repos']['Insert'];
export type RadarRepoUpdate = Database['public']['Tables']['radar_repos']['Update'];

// Extended types for UI consumption (with computed counts)
export interface RadarWithCount extends Radar {
  repo_count: number;
}
