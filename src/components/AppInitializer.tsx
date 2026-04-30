import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * AppInitializer Component
 *
 * Handles one-time app initialization tasks:
 * - Clear badge count on first app load (mobile only)
 * - Ensures badge reflects accurate unread count
 * - Initialize push notifications (request permissions, register listeners)
 * - Sync push token with backend when user authenticates
 *
 * This component should be mounted in App.tsx at the root level.
 */
export function AppInitializer() {
  const { isAuthenticated, user } = useAuth();
  const badgeClearedRef = useRef(false);
  const pushInitializedRef = useRef(false);

  // Initialize push notifications on app load and after user authentication
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    // Only initialize push once per session
    if (pushInitializedRef.current) {
      return;
    }

    if (isAuthenticated && user?.id) {
      pushInitializedRef.current = true;

      (async () => {
        try {
          console.log("[AppInitializer] Initializing push notifications...");

          // Sync push notifications (this will register listeners + request permissions + register token)
          const { syncPushNotifications } = await import("@/lib/pushNotifications");
          await syncPushNotifications(user.id, true);
          console.log("[AppInitializer] ✅ Push notifications fully initialized");
        } catch (err) {
          console.warn("[AppInitializer] Push notification setup warning:", err);
          // Don't fail the app if push setup fails - it's non-critical
        }
      })();
    }
  }, [isAuthenticated, user?.id]);

  // Badge initialization
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
