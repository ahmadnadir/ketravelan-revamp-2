/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-useless-escape */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAuthRedirectUrl } from "@/lib/authRedirect";

export default function Auth() {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isAuthenticated, loading, profile } = useAuth();

  const isProfileComplete = useCallback((profileToCheck: typeof profile) => {
    if (!profileToCheck) return false;
    if (profileToCheck.onboarding_completed) return true;
    const hasName = Boolean((profileToCheck.full_name || "").trim() || (profileToCheck.username || "").trim());
    const hasLocation = Boolean((profileToCheck.country || "").trim() || (profileToCheck.location || "").trim());
    return hasName && hasLocation;
  }, []);

  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if profile exists and onboarding is completed
      if (profile === null) {
        // Profile doesn't exist yet, redirect to onboarding
        navigate("/onboarding");
      } else if (profile && !isProfileComplete(profile)) {
        // Profile exists but missing required fields
        navigate("/onboarding");
      } else if (profile && isProfileComplete(profile)) {
        // Profile exists and onboarding completed, go to explore
        navigate("/explore");
      }
      // If profile is undefined (still loading), don't navigate
    }
  }, [isAuthenticated, loading, profile, navigate, isProfileComplete]);



  // Synchronous ref guard — prevents concurrent calls from rapid double-taps
  // (React state updates are async so isSubmitting alone is not enough).
  const googleSignInInProgress = useRef(false);

  const handleGoogleSignIn = async () => {
    if (googleSignInInProgress.current) return;
    googleSignInInProgress.current = true;
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      googleSignInInProgress.current = false;
    }
  };

  // Password validation: min 8 chars, at least 1 digit, only alphabet and digit (special allowed but not required)
  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]*$/.test(pwd)) return "Password contains invalid characters.";
    if (!/[A-Za-z]/.test(pwd)) return "Password must contain at least one letter.";
    return null;
  };

  useEffect(() => {
    if (mode === "signup") {
      setPasswordError(password ? validatePassword(password) : null);
    }
  }, [password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      const err = validatePassword(password);
      setPasswordError(err);
      if (err) {
        toast({
          title: "Invalid password",
          description: err,
          variant: "destructive",
        });
        return;
      }
      if (password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (mode === "login") {
        await signInWithEmail(email, password);
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        // Navigation handled by useEffect after profile loads
      } else {
        await signUpWithEmail(email, password);
        toast({
          title: "Thank you for signing up!",
          description: "We’ve sent a verification link to your email. Please check your inbox to verify your account.",
        });
        navigate("/verification-pending");
      }
    } catch (error: any) {
      // Show specific messages from edge function or auth errors
      const msg = error?.message || "Authentication failed";
      if (msg.toLowerCase().includes("not confirmed")) {
        toast({
          title: "Email not verified",
          description: "Your email address is not verified yet. Please check your inbox (and spam folder) for the verification link. If you need a new link, try signing up again or contact support.",
          variant: "destructive",
        });
        setCanResend(true);
      } else if (mode === "signup") {
        // Display the exact message returned by the signup edge function (e.g., duplicate email)
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      // Call the Edge Function without password to regenerate invite link
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signup-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          name: null,
          redirectTo: getAuthRedirectUrl(),
          useTemplate: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          const msg = json?.error || json?.message || text;
          throw new Error(typeof msg === 'string' ? msg : 'Failed to resend verification');
        } catch {
          throw new Error(text || 'Failed to resend verification');
        }
      }
      toast({
        title: 'Verification link resent',
        description: 'Please check your email for the new verification link.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend verification',
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email to reset your password.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl(),
      });
      if (error) throw error;
      toast({
        title: "Password reset sent",
        description: "Check your inbox for the reset link.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell bg-background">
      {/* Header  lives in the protected non-scrollable zone */}
      <div className="app-shell-top">
        <header className="h-full bg-white/90 backdrop-blur-xl border-b border-black/[0.06] safe-x">
          <div className="h-[var(--safe-top)]" />
          <div className="container max-w-lg mx-auto flex h-[var(--header-height)] items-center px-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="mr-2 h-9 w-9 rounded-xl text-muted-foreground hover:bg-black/5"
            >
              <ArrowLeft className="h-[22px] w-[22px]" />
            </Button>
            <h1 className="text-base font-semibold">
              {mode === "login" ? "Log In" : "Sign Up"}
            </h1>
          </div>
        </header>
      </div>

      {/* Content  the only scrollable zone; keyboard open shrinks this naturally */}
      <div className="app-shell-content container max-w-lg mx-auto px-4 pt-8 pb-6">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mx-auto mb-4">
            <img
              src="/ketravelan_logo.png"
              alt="Ketravelan"
              className="h-16 w-auto"
            />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground">
            {mode === "login"
              ? "Log in to continue your journey"
              : "Start planning your next adventure"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium rounded-xl mb-6"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password (min. 8 chars, 1 number)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {mode === "signup" && password && passwordError && (
              <div className="text-sm text-red-500 mt-1">{passwordError}</div>
            )}
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </Button>
        </form>

        {canResend && (
          <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Didn’t get the email? Resend the verification link.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? 'Resending...' : 'Resend'}
              </Button>
            </div>
          </div>
        )}

        {mode === "login" && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-foreground font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="ml-1 text-foreground font-medium hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
