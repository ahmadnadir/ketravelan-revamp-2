import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, profile, signOut } = useAuth();
  const toast = (window as Window & {
    sonnerToast?: (message: { title?: string; description?: string }) => void;
  }).sonnerToast || ((message: { title?: string; description?: string }) => {
    window.alert(message.description || message.title || '');
  });

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Avoid false onboarding redirects while profile data is still unavailable.
  if (!profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (profile.admin_account_status !== 'active') {
    const statusMessage = profile.admin_account_status === 'suspended'
      ? 'This account is suspended. Contact Ketravelan support if you believe this is a mistake.'
      : profile.admin_account_status === 'deleted'
        ? 'This account is no longer active.'
        : 'We could not verify this account status. Please try signing in again.';

    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6">
        <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Account unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{statusMessage}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Sign out
          </button>
        </section>
      </div>
    );
  }

  // Force onboarding if username is missing (required for chat mentions)
  const path = window.location.pathname;
  if (!profile.username || !profile.username.trim()) {
    if (path !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  if (!profile.date_of_birth || !profile.date_of_birth.trim()) {
    if (path !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Restrict Explore page access
  if (path === "/explore") {
    if (!profile.email_confirmed) {
      toast({
        title: "Email verification required",
        description: "Please verify your email before accessing Explore.",
      });
      return <Navigate to="/verification-pending" replace />;
    }
    if (!profile.onboarding_completed) {
      toast({
        title: "Complete onboarding",
        description: "Please complete onboarding before accessing Explore.",
      });
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
