import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const ensureSessionFromHash = async () => {
      try {
        // Try to exchange code if present (general callback safety)
        try {
          const code = new URL(window.location.href).searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        } catch (e) {
          // no code available, continue
        }
        // Set session from recovery hash tokens if present
        if (window.location.hash && window.location.hash.includes("access_token")) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            try {
              await supabase.auth.setSession({ access_token, refresh_token });
            } catch (err) {
              console.error("Failed to set session from hash:", err);
            }
          }
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          toast({
            title: "Session missing",
            description: "Your reset link may have expired. Please request a new one.",
            variant: "destructive",
          });
          navigate("/forgot-password");
          return;
        }
        setIsReady(true);
      } catch (err) {
        console.error("Unexpected error preparing reset:", err);
        toast({ title: "Error", description: "Could not prepare password reset.", variant: "destructive" });
        navigate("/forgot-password");
      }
    };
    ensureSessionFromHash();
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) {
      toast({ title: "Missing fields", description: "Please enter and confirm your new password.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don’t match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now log in with your new password." });
      navigate("/auth?mode=login");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update password", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell bg-background">
      <div className="app-shell-top">
        <header className="h-full glass border-b border-border/50 safe-x">
          <div className="h-[var(--safe-top)]" />
          <div className="container max-w-lg mx-auto flex h-[var(--header-height)] items-center px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Reset Password</h1>
          </div>
        </header>
      </div>

      <div className="app-shell-content" style={{ paddingTop: "var(--header-total-height)", paddingBottom: "1rem" }}>
        <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Set a new password</h2>
          <p className="text-muted-foreground">Enter your new password below.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter new password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required disabled={isSubmitting || !isReady} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting || !isReady}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="confirm" type={showConfirm ? "text" : "password"} placeholder="Re-enter new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10 pr-10" required disabled={isSubmitting || !isReady} />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
                disabled={isSubmitting || !isReady}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-medium rounded-xl" disabled={isSubmitting || !isReady}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
