import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  BarChart3,
  Bell,
  CreditCard,
  LoaderCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  UserCog,
  ShieldCheck,
  Users,
  Map,
  Handshake,
  House,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminAccess, hasPermission, type AdminAccess, type AdminPermission } from '@/admin/lib/adminAccess';
import { supabase } from '@/lib/supabase';
import { formatAdminRole } from '@/admin/lib/adminAccess';

const navigationSections = [
  { label: 'Overview', items: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true, permission: 'analytics.view' },
  ] },
  { label: 'Platform', items: [
    { label: 'Users', path: '/admin/users', icon: Users, permission: 'users.view' },
    { label: 'Trips', path: '/admin/trips', icon: Map, permission: 'trips.view' },
    { label: 'Moderation', path: '/admin/moderation', icon: ShieldCheck, permission: 'moderation.view' },
  ] },
  { label: 'Commerce', items: [
    { label: 'Transactions', path: '/admin/transactions', icon: CreditCard, permission: 'transactions.view' },
    { label: 'Affiliate Revenue', path: '/admin/affiliate', icon: Handshake, permission: 'affiliate.view' },
  ] },
  { label: 'Insights', items: [
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, permission: 'analytics.view' },
  ] },
  { label: 'System', items: [
    { label: 'Notifications', path: '/admin/notifications', icon: Bell, permission: 'notifications.manage' },
    { label: 'Feedback', path: '/admin/feedback', icon: MessageSquare, permission: 'feedback.view' },
    { label: 'Administration', path: '/admin/administration', icon: UserCog, permission: 'administration.manage' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: ClipboardList, permission: 'audit.view' },
    { label: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings.manage' },
  ] },
];

interface GlobalSearchResult {
  kind: string;
  title: string;
  subtitle: string;
  path: string;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Administrator';

  useEffect(() => {
    let active = true;
    void getAdminAccess().then((value) => {
      if (active) setAccess(value);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavigationOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileNavigationOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      setSearchLoading(true);
      void supabase.rpc('admin_global_search', { p_query: query })
        .then(({ data, error }) => {
          if (!active) return;
          setSearchResults(error ? [] : (data || []) as GlobalSearchResult[]);
        }, () => {
          if (active) setSearchResults([]);
        })
        .then(() => { if (active) setSearchLoading(false); });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const closeOnPointer = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeOnPointer);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [searchOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderNavigation = (onNavigate?: () => void) => navigationSections.map((section) => {
    const items = section.items.filter((item) => hasPermission(access, item.permission as AdminPermission));
    if (items.length === 0) return null;
    return (
      <section key={section.label} className="space-y-1">
        <h2 className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 first:pt-0">{section.label}</h2>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onClick={onNavigate}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
      </section>
    );
  });

  const openSearchResult = (result: GlobalSearchResult) => {
    navigate(result.path);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    setMobileNavigationOpen(false);
  };

  const renderGlobalSearch = () => (
    <div ref={searchContainerRef} className="relative w-[min(44vw,18rem)] sm:w-64">
      <label className="relative block">
        <span className="sr-only">Search admin records</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && searchResults[0]) {
              event.preventDefault();
              openSearchResult(searchResults[0]);
            }
          }}
          placeholder="Search admin records"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          role="combobox"
          aria-expanded={searchOpen && searchQuery.trim().length >= 2}
          aria-controls="admin-global-search-results"
          aria-autocomplete="list"
        />
      </label>
      {searchOpen && searchQuery.trim().length >= 2 && (
        <div id="admin-global-search-results" role="listbox" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,28rem)] w-[min(24rem,90vw)] overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-xl">
          {searchLoading ? <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Searching…</div>
            : searchResults.length === 0 ? <div className="px-3 py-4 text-sm text-muted-foreground">No matching records.</div>
              : searchResults.map((result, index) => (
                <button key={`${result.kind}-${result.path}-${index}`} type="button" role="option" aria-selected="false" onClick={() => openSearchResult(result)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{result.kind}</span><span className="block truncate text-sm font-medium">{result.title}</span><span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
        </div>
      )}
    </div>
  );

  const renderPublicSiteLink = (onNavigate?: () => void) => (
    <div className="shrink-0 border-t border-border/60 bg-white px-3 py-3">
      <NavLink
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-secondary/70 hover:text-foreground"
      >
        <House className="h-4.5 w-4.5" />
        <span>Switch to Public</span>
      </NavLink>
    </div>
  );

  const renderAccountFooter = () => (
    <div className="border-t bg-white border-border/60 p-3">
      <div className="mb-2 rounded-xl bg-secondary/50 px-3 py-2">
        <div className="truncate text-sm font-medium">{displayName}</div>
        <div className="truncate text-xs text-muted-foreground">{formatAdminRole(access?.role) || user?.email || 'Admin account'}</div>
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
  );

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-background lg:flex lg:flex-col">
        <div className="flex h-16 bg-white items-center border-b border-border/60 px-5">
          <div>
              <Link to="/admin" className="flex items-center flex-shrink-0 -ml-0.5">
                <img src="/ketravelan_logo.png" alt="Ketravelan" className="h-8 w-auto" />
              </Link>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto bg-white px-3 py-4">
          {renderNavigation()}
        </nav>

        {renderPublicSiteLink()}
        {renderAccountFooter()}
      </aside>

      {mobileNavigationOpen && (
        <>
          <button
            type="button"
            aria-label="Close admin navigation"
            className="fixed inset-0 z-50 bg-black/35 lg:hidden"
            onClick={() => setMobileNavigationOpen(false)}
          />
          <aside
            id="admin-mobile-navigation"
            aria-label="Admin navigation"
            className="fixed inset-y-0 left-0 z-[60] flex w-[min(18rem,85vw)] flex-col border-r border-border/60 bg-background shadow-xl lg:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5">
              <div>
                <div className="text-lg font-bold tracking-tight">Ketravelan</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console</div>
              </div>
              <button
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setMobileNavigationOpen(false)}
                className="rounded-lg p-2 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {renderNavigation(() => setMobileNavigationOpen(false))}
            </nav>
            {renderPublicSiteLink(() => setMobileNavigationOpen(false))}
            {renderAccountFooter()}
          </aside>
        </>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 bg-white px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-secondary lg:hidden"
              aria-label="Open admin navigation"
              aria-expanded={mobileNavigationOpen}
              aria-controls="admin-mobile-navigation"
              onClick={() => setMobileNavigationOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold">Administration</p>
              <p className="text-xs text-muted-foreground">Ketravelan production</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {renderGlobalSearch()}
            <span className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Production</span>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
