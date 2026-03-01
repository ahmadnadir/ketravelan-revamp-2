import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, profile } = useAuth();
  const toast = (window as any).sonnerToast || ((msg: any) => alert(msg.description || msg.title));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Force onboarding if username is missing (required for chat mentions)
  const path = window.location.pathname;
  if (!profile?.username || !profile.username.trim()) {
    if (path !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Restrict Explore page access
  if (path === "/explore") {
    if (!profile?.email_confirmed) {
      toast({
        title: "Email verification required",
        description: "Please verify your email before accessing Explore.",
      });
      return <Navigate to="/verification-pending" replace />;
    }
    if (!profile?.onboarding_completed) {
      toast({
        title: "Complete onboarding",
        description: "Please complete onboarding before accessing Explore.",
      });
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
