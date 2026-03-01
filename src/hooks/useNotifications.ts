import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  subscribeToNotifications,
  type Notification,
  type NotificationFilters,
} from '@/lib/notifications';
import { createElement } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Hook to fetch notifications with React Query
 */
export function useNotifications(
  filters?: NotificationFilters,
  options?: Omit<UseQueryOptions<Notification[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Notification[], Error>({
    queryKey: ['notifications', filters],
    queryFn: () => fetchNotifications(filters),
    staleTime: 1000 * 30, // Fresh for 30 seconds
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadNotificationCount(
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<number, Error>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 1000 * 20, // Fresh for 20 seconds
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Hook to mark a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    },
  });
}

/**
 * Hook to delete all notifications
 */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    },
    onError: (error) => {
      console.error('Error deleting all notifications:', error);
      toast.error('Failed to clear notifications');
    },
  });
}

/**
 * Hook to subscribe to real-time notification updates
 */
const senderCache = new Map<string, { avatarUrl: string | null; displayName: string }>();

async function getSenderProfile(senderId: string) {
  if (senderCache.has(senderId)) {
    return senderCache.get(senderId)!;
  }

  const { data } = await supabase
    .from("profiles")
    .select("avatar_url, full_name, username")
    .eq("id", senderId)
    .maybeSingle();

  const profile = {
    avatarUrl: data?.avatar_url ? String(data.avatar_url) : null,
    displayName: String(data?.full_name || data?.username || "Someone"),
  };

  senderCache.set(senderId, profile);
  return profile;
}

function navigateToNotificationAction(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return;

  const isNative = isNativePlatform();

  if (trimmed.startsWith("ketravelan://")) {
    const deepLinkPath = trimmed.replace("ketravelan://", "");
    const nextPath = deepLinkPath.startsWith("/") ? deepLinkPath : `/${deepLinkPath}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== nextPath) {
      window.history.pushState({}, "", nextPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    return;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      const inAppPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || "/";
      const isSameOrigin = parsedUrl.origin === window.location.origin;

      if (isNative || isSameOrigin) {
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (current !== inAppPath) {
          window.history.pushState({}, "", inAppPath);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } else {
        window.location.assign(trimmed);
      }
      return;
    } catch {
      if (isNative) {
        return;
      }
      window.location.assign(trimmed);
      return;
    }
  }

  const nextPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== nextPath) {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function isChatPageActive() {
  if (typeof window === "undefined") return false;

  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get("tab");

  const isDirectChatPage = pathname === "/chat" || pathname.startsWith("/chat/");
  const isTripHubChatTab = pathname.startsWith("/trip/") && pathname.endsWith("/hub") && tab === "chat";

  return isDirectChatPage || isTripHubChatTab;
}

export function useRealtimeNotifications(onNotification?: (notification: Notification) => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      // Use custom handler if provided, otherwise show default toast
      if (onNotification) {
        onNotification(notification);
      } else {
        const isChatNotification = notification.type === "new_message" || notification.type === "message";

        if (isChatNotification && isChatPageActive()) {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          return;
        }

        const metadata = notification.metadata || {};
        const senderId = typeof metadata.sender_id === "string" ? metadata.sender_id : null;

        const showToast = (icon?: ReturnType<typeof createElement>) => {
          const actionUrl = notification.action_url || "";
          const isClickable = Boolean(actionUrl);
          const descriptionText = notification.message || "";

          if (isClickable) {
            toast.custom((id) =>
              createElement(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    toast.dismiss(id);
                    navigateToNotificationAction(actionUrl);
                  },
                  className:
                    "flex w-full items-center gap-3 rounded-[inherit] bg-transparent px-1 py-1.5 text-left text-sm",
                },
                icon || null,
                createElement(
                  "div",
                  { className: "min-w-0" },
                  createElement("div", { className: "font-semibold" }, notification.title),
                  descriptionText
                    ? createElement(
                        "div",
                        { className: "mt-1 text-xs text-muted-foreground" },
                        descriptionText,
                      )
                    : null,
                ),
              )
            );
            return;
          }

          toast.info(notification.title, {
            description: notification.message || undefined,
            icon,
            descriptionClassName: "mt-1",
          });
        };

        if (isChatNotification && senderId) {
          void (async () => {
            try {
              const sender = await getSenderProfile(senderId);
              const icon = sender.avatarUrl
                ? createElement(
                    "span",
                    {
                      className: "inline-flex h-9 w-9 shrink-0 rounded-full overflow-hidden",
                    },
                    createElement("img", {
                      src: sender.avatarUrl,
                      alt: sender.displayName,
                      className: "h-full w-full object-cover",
                    }),
                  )
                : createElement(
                    "span",
                    {
                      className:
                        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-black text-sm font-semibold",
                    },
                    sender.displayName.charAt(0).toUpperCase(),
                  );
              showToast(icon);
            } catch {
              const fallbackIcon = createElement(
                "span",
                {
                  className:
                    "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-black text-sm font-semibold",
                },
                notification.title?.charAt(0).toUpperCase() || "?",
              );
              showToast(fallbackIcon);
            }
          })();
          return;
        }

        const defaultIcon = isChatNotification
          ? createElement(
              "span",
              {
                className:
                  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-black",
              },
              createElement(MessageCircle, { className: "h-4 w-4" }),
            )
          : undefined;

        showToast(defaultIcon);
      }

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return unsubscribe;
  }, [user?.id, queryClient, onNotification]);
}
