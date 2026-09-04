export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
};

export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: SupabaseUser;
};

export type SupabaseProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SupabaseSavedDiscoveryRow = {
  id: string;
  user_id: string;
  item_type: string;
  title: string;
  description: string | null;
  source_url: string | null;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type SupabaseUserPreferences = {
  id: string;
  user_id: string;
  explanation_level: string;
  topics: string[];
  daily_briefing_emails: boolean;
  public_profile: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SupabaseMissionControlLayoutRow = {
  id: string;
  user_id: string;
  layout: unknown;
  created_at?: string;
  updated_at?: string;
};

export type AuthActionState = {
  error?: string;
  success?: string;
};
