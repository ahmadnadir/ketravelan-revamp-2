import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  MessageCircle,
  Users,
  Map,
  Heart,
  BookOpen,
  Settings,
  LogOut,
  FileCheck,
  Plus,
  Wallet,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChatCount } from "@/hooks/useConversations";
import { toast } from "@/hooks/use-toast";

const primaryNavItems = [
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Chat", path: "/chat", hasUnread: true },
  { icon: Users, label: "Community", path: "/community" },
  { icon: Map, label: "My Trips", path: "/my-trips" },
  { icon: Wallet, label: "Expenses", path: "/expenses" },
  { icon: FileCheck, label: "Approvals", path: "/approvals" },
  { icon: Heart, label: "Favourites", path: "/favourites" },
  { icon: BookOpen, label: "My Stories", path: "/my-stories" },
  { icon: MessageSquare, label: "Feedback", path: "/feedback" },
];

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const unreadCount = useUnreadChatCount(user?.id);

  if (!isAuthenticated) return null;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  const getDefaultAvatar = (userId: string, gender: string) => {
    if (gender === "male")
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-female`;
    if (gender === "female")
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-male`;
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`;
  };

  const gender = profile?.gender || "";
  const defaultAvatar = user ? getDefaultAvatar(user.id, gender) : "";
  const isDefaultDicebear = profile?.avatar_url?.includes("dicebear.com");
  const avatarUrl =
    !profile?.avatar_url || isDefaultDicebear ? defaultAvatar : profile.avatar_url;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  return (
    <aside className="hidden lg:flex fixed top-[var(--header-total-height)] left-0 w-60 h-[calc(100dvh-var(--header-total-height))] flex-col bg-background border-r border-black/[0.07] z-40 overflow-y-auto">
      {/* Create Trip button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => navigate("/create")}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-foreground text-background rounded-xl font-semibold text-sm hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create Trip
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-3 py-2 flex-1">
        <div className="space-y-0.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const showUnread = item.hasUnread && unreadCount > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-foreground/60 hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon
                  className="h-5 w-5 flex-none"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className="flex-1">{item.label}</span>
                {showUnread && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 border-t border-black/[0.07] pt-3 space-y-0.5">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
            isActive("/settings")
              ? "bg-secondary text-foreground"
              : "text-foreground/60 hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5 flex-none" strokeWidth={isActive("/settings") ? 2.25 : 1.75} />
          <span>Settings</span>
        </Link>

        {/* User profile row */}
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
            isActive("/profile")
              ? "bg-secondary"
              : "hover:bg-secondary/60"
          )}
        >
          <div className="h-7 w-7 rounded-full overflow-hidden bg-muted flex-none ring-1 ring-border">
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultAvatar;
              }}
            />
          </div>
          <span className="text-sm font-medium text-foreground truncate flex-1">
            {displayName}
          </span>
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5 flex-none" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
