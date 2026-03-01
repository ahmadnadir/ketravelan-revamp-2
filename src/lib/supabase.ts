/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '@/lib/capacitor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const hybridNativeStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    if (value !== null && value !== undefined) {
      return value;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures in WebView.
    }
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures in WebView.
    }
  },
};

const useNativeStorage = isNativePlatform();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !useNativeStorage,
    storage: useNativeStorage ? (hybridNativeStorage as any) : window.localStorage,
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Prefer': 'return=representation',
    },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'traveler' | 'agent';
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          phone: string | null;
          date_of_birth: string | null;
          is_verified: boolean;
          is_public: boolean;
          is_admin: boolean;
          email_notifications: boolean;
          push_notifications: boolean;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'traveler' | 'agent';
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_verified?: boolean;
          is_public?: boolean;
          is_admin?: boolean;
          email_notifications?: boolean;
          push_notifications?: boolean;
          onboarding_completed?: boolean;
        };
        Update: {
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_verified?: boolean;
          is_public?: boolean;
          email_notifications?: boolean;
          push_notifications?: boolean;
          onboarding_completed?: boolean;
        };
      };
    };
  };
};
