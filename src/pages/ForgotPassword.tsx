import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const redirectTo = `${window.location.origin}/reset-password`;
      // Primary: invoke Edge Function (Resend)
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email, redirectTo },
      });
      if (error || !data?.ok) {
        // Fallback: use Supabase built-in email sender
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetErr) throw (error ?? resetErr);
      }
      toast({
        title: "Password reset sent",
        description: "If you don't see it, check spam/junk.",
      });
      navigate("/auth?mode=login");
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
      <div className="app-shell-top">
        <header className="h-full glass border-b border-border/50 safe-x">
          <div className="h-[var(--safe-top)]" />
          <div className="container max-w-lg mx-auto flex h-[var(--header-height)] items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Forgot Password</h1>
          </div>
        </header>
      </div>

      <div className="app-shell-content" style={{ paddingTop: "var(--header-total-height)", paddingBottom: "1rem" }}>
        <div className="container max-w-lg mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Reset your password</h2>
            <p className="text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSendReset} className="space-y-4">
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
                  autoComplete="email"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Remembered your password?
              <button
                type="button"
                onClick={() => navigate("/auth?mode=login")}
                className="ml-1 text-foreground font-medium hover:underline"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
