/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { CurrencyCode } from "@/lib/currencyUtils";
import { clearPushToken, syncPushNotifications } from "@/lib/pushNotifications";
import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { isNativePlatform } from "@/lib/capacitor";
import { Browser } from "@capacitor/browser";

const HOME_CURRENCY_KEY = "ketravelan-home-currency";

// Detect currency from browser locale
export function getCurrencyFromLocale(): CurrencyCode {
  try {
    const locale = navigator.language.toLowerCase();
    
    // Malaysian locales
    if (locale.startsWith("ms") || locale.includes("my")) {
      return "MYR";
    }
    // Indonesian
    if (locale.startsWith("id")) {
      return "IDR";
    }
    // US English
    if (locale === "en-us") {
      return "USD";
    }
    // European locales
    if (
      locale.startsWith("de") || 
      locale.startsWith("fr") || 
      locale.startsWith("es") || 
      locale.startsWith("it") ||
      locale.startsWith("nl") ||
      locale.startsWith("pt")
    ) {
      return "EUR";
    }
    
    // Default to MYR for this app
    return "MYR";
  } catch {
    return "MYR";
  }
}

// Get stored home currency or detect from locale
function getInitialHomeCurrency(): CurrencyCode {
  const stored = localStorage.getItem(HOME_CURRENCY_KEY);
  if (stored && ["MYR", "USD", "EUR", "IDR"].includes(stored)) {
    return stored as CurrencyCode;
  }
  return getCurrencyFromLocale();
}

interface Profile {
  [x: string]: string;
  id: string;
  role: 'traveler' | 'agent';
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  emergency_contact: any | null;
  preferences: any | null;
  is_verified: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  accepts_tips?: boolean | null;
  tip_message?: string | null;
  cover_image?: string | null;
  website?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  interests?: string[] | null;
  languages?: string[] | null;
  countries_visited?: number | null;
  trips_organized?: number | null;
  trips_joined?: number | null;
  trip_count?: number | null;
  verified_at?: string | null;
  last_active_at?: string | null;
  profile_views?: number | null;
  is_public: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  show_trips_publicly?: boolean;
  travel_styles?: string[] | null;
  facebook?: string | null;
  threads?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  onboarding_completed: boolean;
  onboarding_goal?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  is_admin: boolean;
  budget_min?: number | null;
  budget_max?: number | null;
  social_links?: Record<string, string> | null;
  home_currency?: CurrencyCode | null;
  name?: string | null;
  gender?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  homeCurrency: CurrencyCode;
  setHomeCurrency: (currency: CurrencyCode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeCurrency, setHomeCurrencyState] = useState<CurrencyCode>(getInitialHomeCurrency);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        // data will be null if no profile exists, or the profile object if it exists
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const redirectTo = getAuthRedirectUrl();
    const isNative = isNativePlatform();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        ...(isNative ? { skipBrowserRedirect: true } : {}),
      },
    });
    if (error) throw error;

    if (isNative) {
      const url = data?.url;
      if (!url) {
        throw new Error("Missing OAuth URL for native sign-in");
      }

      // Attach a browserFinished listener BEFORE opening the browser so we
      // never miss the callback.  When the in-app browser closes (either
      // because iOS intercepted the custom-scheme redirect or the user
      // dismissed it manually), poll for a session.  The deep-link handler in
      // App.tsx handles the happy path; this is the fallback for the case
      // where appUrlOpen fires before the listener is mounted.
      const listenerHandle = await Browser.addListener("browserFinished", async () => {
        listenerHandle.remove();
        try {
          // Give the deep-link handler a short window to run first.
          await new Promise((res) => setTimeout(res, 300));
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            // Session not yet set — the PKCE exchange may not have completed.
            // Re-trigger onAuthStateChange by refreshing; Supabase will pick up
            // any tokens stored from the deep link.
            await supabase.auth.refreshSession();
          }
        } catch {
          // Ignore – the deep-link handler is the primary path.
        }
      });

      // Defensive: close any stale SFSafariViewController before opening a new one.
      // When iOS auto-dismisses the browser via OAuth URL redirect, it does not call
      // safariViewControllerDidFinish, leaving the Browser plugin's internal reference
      // non-nil. A close() here resets that so the upcoming open() always succeeds.
      try {
        await Browser.close();
      } catch {
        // "No active window to close!" is expected when no browser is open — ignore.
      }

      await Browser.open({ url, presentationStyle: "fullscreen" });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    // Custom signup: generate confirmation link via Edge Function and send using Resend
    const { data, error } = await supabase.functions.invoke('send-signup-confirmation', {
      body: {
        email,
        password,
        name: null,
        redirectTo: getAuthRedirectUrl(),
        useTemplate: false,
      },
    });
    if (error) {
      const fnErr: any = error;
      const detailedMsg = fnErr?.context?.error || fnErr?.context?.message || fnErr?.message;
      throw new Error(detailedMsg || 'Failed to initiate signup confirmation');
    }
    // Edge function may return 200 with a JSON error
    if (data && (data as any).error) {
      throw new Error((data as any).error as string);
    }
    // Edge function returns { ok: true } on success
    if (!data?.ok) {
      throw new Error('Failed to initiate signup confirmation');
    }
  };

  const signOut = async () => {
    await clearPushToken();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const setHomeCurrency = (currency: CurrencyCode) => {
    localStorage.setItem(HOME_CURRENCY_KEY, currency);
    setHomeCurrencyState(currency);
    // Optionally update profile in Supabase if home_currency field exists
    if (user && profile) {
      (async () => {
        try {
          await supabase
            .from('profiles')
            .update({ home_currency: currency })
            .eq('id', user.id);
          await refreshProfile();
        } catch (error) {
          console.error(error);
        }
      })();
    }
  };

  // Load home currency from profile if available
  useEffect(() => {
    if (profile?.home_currency) {
      setHomeCurrencyState(profile.home_currency);
      localStorage.setItem(HOME_CURRENCY_KEY, profile.home_currency);
    }
  }, [profile?.home_currency]);

  useEffect(() => {
    if (!user?.id) return;
    syncPushNotifications(user.id, profile?.push_notifications !== false);
  }, [user?.id, profile?.push_notifications]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
        homeCurrency,
        setHomeCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
