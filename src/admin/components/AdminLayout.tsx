import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  Map,
  Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Trips', path: '/admin/trips', icon: Map },
  { label: 'Moderation', path: '/admin/moderation', icon: ShieldCheck },
  { label: 'Transactions', path: '/admin/transactions', icon: CreditCard },
  { label: 'Affiliate', path: '/admin/affiliate', icon: Handshake },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Notifications', path: '/admin/notifications', icon: Bell },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Administrator';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-background lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <div>
            <div className="text-lg font-bold tracking-tight">Ketravelan</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-foreground/60 hover:bg-secondary/70 hover:text-foreground',
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <div className="mb-2 rounded-xl bg-secondary/50 px-3 py-2">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email || 'Admin account'}</div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 hover:bg-secondary lg:hidden" aria-label="Open admin navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold">Administration</p>
              <p className="text-xs text-muted-foreground">Ketravelan production console</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">Production</span>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
