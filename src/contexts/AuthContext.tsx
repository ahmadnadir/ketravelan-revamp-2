/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { CurrencyCode } from "@/lib/currencyUtils";
import { clearPushToken, syncPushNotifications } from "@/lib/pushNotifications";
import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { isNativePlatform } from "@/lib/capacitor";
import { Browser } from "@capacitor/browser";
import {
  clearAuthError,
  clearPendingAuthIntent,
  getIdentityLinkingDisabled,
  isManualLinkingDisabledMessage,
  normalizeOAuthErrorMessage,
  persistAuthError,
  persistPendingAuthIntent,
  setIdentityLinkingDisabled,
  type OAuthProvider,
} from "@/lib/authFlow";

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
  [x: string]: unknown;
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
  ugc_terms_accepted_at?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  linkGoogleIdentity: (returnTo?: string) => Promise<void>;
  linkAppleIdentity: (returnTo?: string) => Promise<void>;
  linkedProviders: string[];
  identityLinkingAvailable: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{
    ok: boolean;
    mode?: "hard" | "soft";
    email?: {
      attempted: boolean;
      sent: boolean;
      to: string;
      error: string | null;
    };
  }>;
  refreshProfile: () => Promise<void>;
  refreshLinkedProviders: () => Promise<void>;
  homeCurrency: CurrencyCode;
  setHomeCurrency: (currency: CurrencyCode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeCurrency, setHomeCurrencyState] = useState<CurrencyCode>(getInitialHomeCurrency);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [identityLinkingAvailable, setIdentityLinkingAvailable] = useState<boolean>(() => !getIdentityLinkingDisabled());

  const updateLinkedProvidersFromUser = async (currentUser: SupabaseUser | null) => {
    if (!currentUser) {
      setLinkedProviders([]);
      return;
    }

    const providers = new Set<string>();
    const appMetadataProviders = currentUser.app_metadata?.providers;
    if (Array.isArray(appMetadataProviders)) {
      appMetadataProviders.forEach((provider) => {
        if (typeof provider === "string" && provider.trim()) {
          providers.add(provider);
        }
      });
    }

    const userIdentities = Array.isArray((currentUser as any).identities)
      ? ((currentUser as any).identities as Array<{ provider?: string | null }>)
      : [];
    userIdentities.forEach((identity) => {
      if (identity?.provider) {
        providers.add(identity.provider);
      }
    });

    try {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (!error && Array.isArray(data?.identities)) {
        data.identities.forEach((identity) => {
          if (identity?.provider) {
            providers.add(identity.provider);
          }
        });
      }
    } catch {
      // Ignore: user/app metadata fallback above is enough to keep the UI usable.
    }

    setLinkedProviders(Array.from(providers));
  };

  const refreshLinkedProviders = async () => {
    await updateLinkedProvidersFromUser(user);
  };

  const attachBrowserFallbackListener = async () => {
    const listenerHandle = await Browser.addListener("browserFinished", async () => {
      listenerHandle.remove();
      try {
        await new Promise((res) => setTimeout(res, 300));
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          await supabase.auth.refreshSession();
        }
      } catch {
        // Ignore – deep-link handler is the primary path.
      }
    });
  };

  const startOAuth = async (
    provider: OAuthProvider,
    kind: "sign-in" | "link",
    returnTo?: string,
  ) => {
    const redirectTo = getAuthRedirectUrl();
    const isNative = isNativePlatform();

    if (kind === "link" && !identityLinkingAvailable) {
      const message = normalizeOAuthErrorMessage("Manual linking is disabled", provider);
      persistAuthError(message);
      throw new Error(message);
    }

    persistPendingAuthIntent({
      kind,
      provider,
      returnTo,
      startedAt: Date.now(),
    });
    clearAuthError();

    const result = kind === "link"
      ? await supabase.auth.linkIdentity({
          provider,
          options: {
            redirectTo,
            ...(isNative ? { skipBrowserRedirect: true } : {}),
          },
        })
      : await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            ...(isNative ? { skipBrowserRedirect: true } : {}),
          },
        });

    if (result.error) {
      clearPendingAuthIntent();
      if (kind === "link" && isManualLinkingDisabledMessage(result.error.message)) {
        setIdentityLinkingAvailable(false);
        setIdentityLinkingDisabled(true);
      }
      const message = normalizeOAuthErrorMessage(result.error.message, provider);
      persistAuthError(message);
      throw new Error(message);
    }

    if (kind === "link") {
      setIdentityLinkingAvailable(true);
      setIdentityLinkingDisabled(false);
    }

    if (isNative) {
      const url = result.data?.url;
      if (!url) {
        clearPendingAuthIntent();
        const message = `Missing OAuth URL for ${provider} ${kind === "link" ? "linking" : "sign-in"}`;
        persistAuthError(message);
        throw new Error(message);
      }

      await attachBrowserFallbackListener();

      try {
        await Browser.close();
      } catch {
        // Ignore when nothing is open.
      }

      await Browser.open({ url, presentationStyle: "fullscreen" });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void updateLinkedProvidersFromUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLinkedProviders([]);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await updateLinkedProvidersFromUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLinkedProviders([]);
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
    await startOAuth("google", "sign-in");
  };

  const signInWithApple = async () => {
    await startOAuth("apple", "sign-in");
  };

  const linkGoogleIdentity = async (returnTo = "/settings") => {
    await startOAuth("google", "link", returnTo);
  };

  const linkAppleIdentity = async (returnTo = "/settings") => {
    await startOAuth("apple", "link", returnTo);
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

  const deleteAccount = async () => {
    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: {},
    });

    if (error) {
      const fnError = error as {
        message?: string;
        context?: { error?: string; message?: string; status?: number };
      };
      const message =
        fnError?.context?.error ||
        fnError?.context?.message ||
        fnError?.message ||
        "Failed to delete account";

      if (message.toLowerCase().includes("failed to send a request to the edge function")) {
        throw new Error("Delete account service is not reachable. Please try again in a moment.");
      }

      throw new Error(message);
    }

    if (!data?.ok) {
      throw new Error((data as { error?: string })?.error || "Failed to delete account");
    }

    const result = data as {
      ok: boolean;
      mode?: "hard" | "soft";
      email?: {
        attempted: boolean;
        sent: boolean;
        to: string;
        error: string | null;
      };
    };

    // The auth user is now deleted server-side; clear local session remnants.
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore local sign-out failures after deletion.
    }

    return result;
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
        signInWithApple,
        linkGoogleIdentity,
        linkAppleIdentity,
        linkedProviders,
        identityLinkingAvailable,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        deleteAccount,
        refreshProfile,
        refreshLinkedProviders,
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
