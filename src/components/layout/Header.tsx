import { Bell, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onNotificationsClick?: () => void;
  onMenuClick?: () => void;
}

export function Header({ onNotificationsClick, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: unreadCount = 0 } = useUnreadNotificationCount({
    enabled: isAuthenticated,
  });

  return (
    <header className="h-full bg-white/[0.97] backdrop-blur-xl border-b border-black/[0.07] safe-x" style={{ boxShadow: '0 0.5px 0 rgba(0,0,0,0.08)' }}>
      <div className="h-[var(--safe-top)]" />
      <div className="mx-auto max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-none flex h-[var(--header-height)] items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center flex-shrink-0 -ml-0.5">
          <img
            src="/ketravelan_logo.png"
            alt="Ketravelan"
            className="h-8 w-auto"
          />
        </Link>

        {/* Right Actions */}
        <div className="flex items-center -mr-1.5">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="relative flex items-center justify-center w-11 h-11 rounded-2xl text-foreground/70 hover:text-foreground active:bg-black/[0.06] transition-colors"
                onClick={onNotificationsClick}
                aria-label="Notifications"
              >
                <Bell className="w-[22px] h-[22px]" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className={cn(
                    "absolute top-2 right-2 flex items-center justify-center rounded-full bg-destructive text-white font-bold ring-[1.5px] ring-white",
                    unreadCount > 99 ? "text-[7px] min-w-[15px] h-[15px] px-0.5" : "text-[8px] min-w-[14px] h-[14px]"
                  )}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="lg:hidden flex items-center justify-center w-11 h-11 rounded-2xl text-foreground/70 hover:text-foreground active:bg-black/[0.06] transition-colors"
                onClick={onMenuClick}
                aria-label="Menu"
              >
                <Menu className="w-[22px] h-[22px]" strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-sm font-medium h-9 px-4"
                onClick={() => navigate("/auth?mode=login")}
              >
                Log In
              </Button>
              <Button
                size="sm"
                className="rounded-full text-sm font-medium h-9 px-4 ml-1"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
