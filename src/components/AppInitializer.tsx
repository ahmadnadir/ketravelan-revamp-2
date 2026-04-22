import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * AppInitializer Component
 *
 * Handles one-time app initialization tasks:
 * - Clear badge count on first app load (mobile only)
 * - Ensures badge reflects accurate unread count
 *
 * This component should be mounted in App.tsx at the root level.
 */
export function AppInitializer() {
  const { isAuthenticated } = useAuth();
  const badgeClearedRef = useRef(false);

  useEffect(() => {
    if (!isNativePlatform() || !isAuthenticated || badgeClearedRef.current) {
      return;
    }

    badgeClearedRef.current = true;

    (async () => {
      try {
        // Clear the badge count on app load to reset any stale notification counts
        const { clearBadgeCount, syncBadgeWithUnreadCount } = await import("@/lib/badge");
        
        // First clear completely
        await clearBadgeCount();
        
        // Then sync with actual unread count from DB
        // This ensures the badge shows the correct number if there are unread notifications
        setTimeout(() => {
          import("@/lib/notifications").then(({ syncBadgeWithUnreadCount }) => {
            syncBadgeWithUnreadCount().catch(() => {
              // Silently fail - badge clearing is non-critical
            });
          });
        }, 500);
      } catch (err) {
        console.warn("[AppInitializer] Failed to clear badge on app load", err);
      }
    })();
  }, [isAuthenticated]);

  return null;
}
