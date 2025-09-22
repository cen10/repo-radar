export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          github_username: string;
          github_id: string;
          email: string | null;
          avatar_url: string | null;
          last_sync: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          github_username: string;
          github_id: string;
          email?: string | null;
          avatar_url?: string | null;
          last_sync?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          github_username?: string;
          github_id?: string;
          email?: string | null;
          avatar_url?: string | null;
          last_sync?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
      };
      repositories: {
        Row: {
          id: string;
          github_id: string;
          name: string;
          owner: string;
          description: string | null;
          current_stars: number;
          language: string | null;
          is_private: boolean;
          last_fetched: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          github_id: string;
          name: string;
          owner: string;
          description?: string | null;
          current_stars?: number;
          language?: string | null;
          is_private?: boolean;
          last_fetched?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          github_id?: string;
          name?: string;
          owner?: string;
          description?: string | null;
          current_stars?: number;
          language?: string | null;
          is_private?: boolean;
          last_fetched?: string | null;
          created_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          repository_id: string;
          is_following: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          repository_id: string;
          is_following?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          repository_id?: string;
          is_following?: boolean;
          created_at?: string;
          updated_at?: string;
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