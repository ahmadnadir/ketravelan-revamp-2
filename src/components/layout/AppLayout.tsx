import { ReactNode, useState } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { MenuDrawer } from "./MenuDrawer";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications } from "@/hooks/useNotifications";

interface AppLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  showBottomNav?: boolean;
  focusedFlow?: boolean;
  className?: string;
  mainClassName?: string;
  fullWidth?: boolean;
}

export function AppLayout({
  children,
  hideHeader = false,
  hideBottomNav = false,
  headerContent,
  footerContent,
  showBottomNav: showBottomNavProp,
  focusedFlow = false,
  className,
  mainClassName,
  fullWidth = false,
}: AppLayoutProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Subscribe to real-time notifications
  useRealtimeNotifications();

  // Only show bottom nav for authenticated users
  const showBottomNav = isAuthenticated && (showBottomNavProp !== undefined ? showBottomNavProp : !hideBottomNav);

  // Focused flow layout for single scroll authority
  if (focusedFlow) {
    return (
      <div className="fixed inset-0 flex flex-col h-dvh overflow-hidden bg-background">
        {/* Header zone - truly anchored */}
        {headerContent && (
          <div className="flex-none z-10">
            {headerContent}
          </div>
        )}

        {/* Scrollable content - ONLY this element scrolls */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${showBottomNav ? 'pb-[calc(10rem+env(safe-area-inset-bottom))]' : 'pb-[calc(2rem+env(safe-area-inset-bottom))]'} ${className || ""}`}
        >
          {children}
        </div>

        {/* Footer zone - truly anchored */}
        {footerContent && (
          <div className="flex-none z-20 safe-bottom">
            {footerContent}
          </div>
        )}

        {/* Bottom nav - truly anchored */}
        {showBottomNav && (
          <div className="flex-none z-10">
            <BottomNav />
          </div>
        )}
      </div>
    );
  }

  // Standard layout
  return (
    <div className="app-shell min-h-screen bg-background">
      {!hideHeader && (
        <Header
          onNotificationsClick={() => setNotificationsOpen(true)}
          onMenuClick={() => setMenuOpen(true)}
        />
      )}

      <main
        className={`${
          fullWidth
            ? "w-full"
            : "container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-6"
        } ${
          showBottomNav
            ? "pb-24"
            : "pb-4"
        } ${mainClassName || ""}`}
      >
        {children}
      </main>

      {showBottomNav && (
        <BottomNav />
      )}


      <NotificationsSheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />

      <MenuDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
    </div>
  );
}
