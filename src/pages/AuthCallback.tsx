import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

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
      try {
        // Exchange authorization code/magic link for a session if present
        try {
          const code = new URL(window.location.href).searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
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
          navigate("/auth?error=callback_failed");
          return;
        }
        // If this is a recovery flow, redirect to reset-password immediately
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
          navigate('/reset-password');
          return;
        }
        if (data.session) {
          // Fetch user profile to check onboarding and verification
          const userId = data.session.user.id;
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed, full_name, username, country, location')
            .eq('id', userId)
            .maybeSingle();
          if (profileError) {
            console.error("Profile fetch error:", profileError);
            navigate("/auth?error=profile_failed");
            return;
          }
          if (isProfileComplete(profile)) {
            navigate("/explore");
          } else {
            navigate("/onboarding");
          }
        } else {
          navigate("/auth");
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        navigate("/auth?error=unexpected_error");
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
