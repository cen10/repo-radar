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
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'radars_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
        Update: never; // radar_repos are added/removed, not updated
        Relationships: [
          {
            foreignKeyName: 'radar_repos_radar_id_fkey';
            columns: ['radar_id'];
            isOneToOne: false;
            referencedRelation: 'radars';
            referencedColumns: ['id'];
          },
        ];
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
// No RadarRepoUpdate - these rows are added/removed, not updated

// Extended types for UI consumption (with computed counts)
export interface RadarWithCount extends Radar {
  repo_count: number;
}
