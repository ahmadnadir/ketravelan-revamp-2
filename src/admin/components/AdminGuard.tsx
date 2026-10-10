import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAdminAccess,
  hasPermission,
  type AdminPermission,
} from '@/admin/lib/adminAccess';

export function AdminGuard({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: AdminPermission;
}) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    setChecking(true);
    if (!isAuthenticated) {
      setChecking(false);
      setAllowed(false);
      return;
    }

    void getAdminAccess().then((access) => {
      if (!active) return;
      setAllowed(permission ? hasPermission(access, permission) : access.isAdmin);
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, permission]);

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
