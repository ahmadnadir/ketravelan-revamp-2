import { ReactNode, useRef, useState, RefObject } from "react";
import { Link } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { MenuDrawer } from "./MenuDrawer";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications } from "@/hooks/useNotifications";

interface AppLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  headerContent?: ReactNode;
  subHeaderContent?: ReactNode;
  footerContent?: ReactNode;
  showBottomNav?: boolean;
  focusedFlow?: boolean;
  className?: string;
  mainClassName?: string;
  fullWidth?: boolean;
  wideLayout?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

export function AppLayout({
  children,
  hideHeader = false,
  hideBottomNav = false,
  headerContent,
  subHeaderContent,
  footerContent,
  showBottomNav: showBottomNavProp,
  focusedFlow = false,
  className,
  mainClassName,
  fullWidth = false,
  wideLayout = false,
  scrollContainerRef,
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
      <div className="app-shell bg-background">
        <DesktopSidebar />

        {/* Logo bar – top-left corner above the sidebar, visible on desktop only */}
        {isAuthenticated && (
          <div className="hidden lg:flex fixed top-0 left-0 w-60 h-[var(--header-total-height)] flex-col bg-background border-r border-b border-black/[0.07] z-50" style={{ boxShadow: '0 0.5px 0 rgba(0,0,0,0.08)' }}>
            <div className="h-[var(--safe-top)]" />
            <div className="flex h-[var(--header-height)] items-center px-4 lg:px-5">
              <Link to="/explore" className="flex items-center flex-shrink-0 -ml-0.5">
                <img src="/ketravelan_logo.png" alt="Ketravelan" className="h-8 w-auto" />
              </Link>
            </div>
          </div>
        )}

        {/* Header is outside scroll container to keep it visually locked */}
        {headerContent && (
          <div className={`app-shell-top ${isAuthenticated ? "lg:ml-60" : ""}`}>
            {headerContent}
            {subHeaderContent && (
              <div className="flex-none">{subHeaderContent}</div>
            )}
          </div>
        )}

        {/* Only this area scrolls */}
        <div
          ref={scrollContainerRef as RefObject<HTMLDivElement>}
          className={`app-shell-content overflow-y-auto overflow-x-hidden overscroll-contain ${isAuthenticated ? "lg:ml-60" : ""} ${className || ""}`}
          style={{
            paddingBottom: footerContent
              ? "0.5rem"
              : showBottomNav
              ? "1.5rem"
              : "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
          }}
        >
          {children}
        </div>

        {/* Footer zone - truly anchored */}
        {footerContent && (
          <div className={`flex-none z-20 safe-bottom keyboard-aware-footer ${isAuthenticated ? "lg:ml-60" : ""}`}>
            {footerContent}
          </div>
        )}

        {/* Bottom nav - truly anchored */}
        {showBottomNav && (
          <div className="app-shell-bottom lg:hidden">
            <BottomNav inline />
          </div>
        )}
      </div>
    );
  }

  // Standard layout
  return (
    <div className="app-shell bg-background">
      {!hideHeader && (
        <div className="app-shell-top">
          <Header
            onNotificationsClick={() => setNotificationsOpen(true)}
            onMenuClick={() => setMenuOpen(true)}
          />
          {subHeaderContent && (
            <div className="flex-none">{subHeaderContent}</div>
          )}
        </div>
      )}

      <DesktopSidebar />

      <main
        className={`app-shell-content overflow-y-auto overflow-x-hidden overscroll-contain ${isAuthenticated ? "lg:pl-60" : ""}`}
        style={{
          paddingBottom: showBottomNav
            ? "1.5rem"
            : "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
        }}
      >
        <div
          className={`${
            fullWidth
              ? "w-full"
              : wideLayout
              ? "w-full px-5 sm:px-6 lg:px-8"
              : "container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 sm:px-6"
          } ${mainClassName || ""}`}
        >
          {children}
        </div>
      </main>

      {showBottomNav && (
        <div className="app-shell-bottom lg:hidden">
          <BottomNav inline />
        </div>
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
