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
    <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto flex h-20 sm:h-18 items-center justify-between px-6 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/ketravelan_logo.png"
            alt="Ketravelan"
            className="h-8 w-auto sm:h-9"
          />
        </Link>

        {/* Right Actions - Conditional based on auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            // Logged in: Show notifications and menu
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 sm:h-10 sm:w-10 relative"
                onClick={onNotificationsClick}
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className={cn(
                    "absolute top-1 right-1 flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1",
                    unreadCount > 99 && "text-[8px]"
                  )}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 sm:h-10 sm:w-10"
                onClick={onMenuClick}
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              </Button>
            </>
          ) : (
            // Logged out: Show Sign Up / Log In buttons
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-full text-sm font-medium"
                onClick={() => navigate("/auth?mode=login")}
              >
                Log In
              </Button>
              <Button 
                size="sm"
                className="rounded-full text-sm font-medium"
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
