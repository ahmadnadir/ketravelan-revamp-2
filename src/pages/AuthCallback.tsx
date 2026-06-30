import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  clearPendingAuthIntent,
  consumeAuthError,
  getPendingAuthIntent,
  normalizeOAuthErrorMessage,
} from "@/lib/authFlow";

export default function AuthCallback() {
  const navigate = useNavigate();

  const isPkceVerifierMissingError = (message: string | null | undefined) => {
    return (message || "").toLowerCase().includes("pkce code verifier not found");
  };

  const isProfileComplete = (profile: {
    onboarding_completed?: boolean | null;
    full_name?: string | null;
    username?: string | null;
    country?: string | null;
    location?: string | null;
  } | null) => {
    if (!profile) return false;
    if (profile.onboarding_completed) return true;
    const hasName = Boolean((profile.full_name || "").trim() || (profile.username || "").trim());
    const hasLocation = Boolean((profile.country || "").trim() || (profile.location || "").trim());
    return hasName && hasLocation;
  };

  useEffect(() => {
    const handleCallback = async () => {
      const pendingIntent = getPendingAuthIntent();
      const routeOnError = pendingIntent?.kind === "link" ? pendingIntent.returnTo || "/settings" : "/auth";

      try {
        const queryError = new URL(window.location.href).searchParams.get("error_description")
          || new URL(window.location.href).searchParams.get("error");
        const pendingError = consumeAuthError();
        const authError = pendingError || normalizeOAuthErrorMessage(queryError, pendingIntent?.provider);

        if (pendingError || queryError) {
          // On some OAuth flows, a stale/duplicate PKCE callback can surface this error
          // even though a valid session is already established. Treat that case as success.
          if (isPkceVerifierMissingError(authError)) {
            const { data: existingSessionData } = await supabase.auth.getSession();
            if (existingSessionData.session) {
              // Continue normally to session/profile routing below.
            } else {
              clearPendingAuthIntent();
              toast({
                title: pendingIntent?.kind === "link" ? "Account connection failed" : "Sign-in failed",
                description: authError,
                variant: "destructive",
              });
              navigate(routeOnError, { replace: true });
              return;
            }
          } else {
            clearPendingAuthIntent();
            toast({
              title: pendingIntent?.kind === "link" ? "Account connection failed" : "Sign-in failed",
              description: authError,
              variant: "destructive",
            });
            navigate(routeOnError, { replace: true });
            return;
          }
        }

        // Exchange authorization code/magic link for a session if present
        try {
          const code = new URL(window.location.href).searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              if (isPkceVerifierMissingError(exchangeError.message)) {
                const { data: existingSessionData } = await supabase.auth.getSession();
                if (!existingSessionData.session) {
                  clearPendingAuthIntent();
                  toast({
                    title: pendingIntent?.kind === "link" ? "Account connection failed" : "Sign-in failed",
                    description: normalizeOAuthErrorMessage(exchangeError.message, pendingIntent?.provider),
                    variant: "destructive",
                  });
                  navigate(routeOnError, { replace: true });
                  return;
                }
              } else {
                clearPendingAuthIntent();
                toast({
                  title: pendingIntent?.kind === "link" ? "Account connection failed" : "Sign-in failed",
                  description: normalizeOAuthErrorMessage(exchangeError.message, pendingIntent?.provider),
                  variant: "destructive",
                });
                navigate(routeOnError, { replace: true });
                return;
              }
            }
          }
        } catch (e) {
          // It's okay if there's no code in URL; proceed to check session
        }
        // Fallback: if tokens are in hash (e.g., recovery), set session manually
        if (window.location.hash && window.location.hash.includes('access_token')) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            try {
              await supabase.auth.setSession({ access_token, refresh_token });
            } catch (setErr) {
              console.error('Failed to set session from hash:', setErr);
            }
          }
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth callback error:", error);
          clearPendingAuthIntent();
          navigate(`${routeOnError}?error=callback_failed`, { replace: true });
          return;
        }
        // If this is a recovery flow, redirect to reset-password immediately
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
          navigate('/reset-password');
          return;
        }
        if (data.session) {
          if (pendingIntent?.kind === "link") {
            clearPendingAuthIntent();
            toast({
              title: "Account connected",
              description: `${pendingIntent.provider === "apple" ? "Apple" : "Google"} is now linked to your account.`,
            });
            navigate(pendingIntent.returnTo || "/settings", { replace: true });
            return;
          }

          // Fetch user profile to check onboarding and verification
          const userId = data.session.user.id;
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed, full_name, username, country, location')
            .eq('id', userId)
            .maybeSingle();
          if (profileError) {
            console.error("Profile fetch error:", profileError);
            clearPendingAuthIntent();
            navigate("/auth?error=profile_failed", { replace: true });
            return;
          }
          clearPendingAuthIntent();
          if (isProfileComplete(profile)) {
            navigate("/explore", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        } else {
          clearPendingAuthIntent();
          navigate(routeOnError, { replace: true });
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        clearPendingAuthIntent();
        navigate("/auth?error=unexpected_error", { replace: true });
      }
    };
    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
