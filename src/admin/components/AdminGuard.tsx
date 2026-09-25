import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { verifyAdminAccess } from '@/admin/lib/adminAccess';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setChecking(false);
      setAllowed(false);
      return;
    }

    void verifyAdminAccess().then((result) => {
      if (!active) return;
      setAllowed(result);
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ShieldAlert className="h-5 w-5" />
          Verifying administrator access…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/auth?return=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
