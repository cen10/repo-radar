// Database types for Supabase
// Will be expanded in T033-T036 when we set up the actual database schema
// For MVP Slice 1-2, we only need Supabase Auth (no custom tables yet)

export interface Database {
  public: {
    Tables: {
      // Placeholder - will add tables as we implement them
      [_ in never]: never;
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
