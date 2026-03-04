import { useState, useEffect } from "react";
import { Bell, MessageCircle, UserPlus, DollarSign, Calendar, Users, X, type LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SwipeableNotificationItem } from "./SwipeableNotificationItem";
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@/lib/notifications";
import { isNativePlatform } from "@/lib/capacitor";

// Persistent logging helper for debugging navigation issues
const persistLog = (label: string, data: unknown) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${label}: ${JSON.stringify(data)}`;
  console.log(message);
  
  try {
    const logs = JSON.parse(localStorage.getItem('notificationDebugLogs') || '[]');
    logs.push(message);
    // Keep only last 50 logs
    if (logs.length > 50) logs.shift();
    localStorage.setItem('notificationDebugLogs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to persist log:', e);
  }
};

persistLog('NotificationsSheet loaded', { timestamp: new Date().toISOString() });

// Add global debug function to window
if (typeof window !== 'undefined') {
  const windowDebug = window as unknown as Record<string, unknown>;
  windowDebug.__debugNotifications = {
    getLogs: () => {
      try {
        const logs = JSON.parse(localStorage.getItem('notificationDebugLogs') || '[]');
        console.log('=== Notification Debug Logs ===');
        logs.forEach((log: string) => console.log(log));
        console.log('=== End Logs ===');
        return logs;
      } catch (e) {
        console.error('Failed to get logs:', e);
        return [];
      }
    },
    clearLogs: () => {
      localStorage.removeItem('notificationDebugLogs');
      console.log('Debug logs cleared');
    },
    showLastLog: () => {
      try {
        const logs = JSON.parse(localStorage.getItem('notificationDebugLogs') || '[]');
        if (logs.length > 0) {
          console.log('Last log:', logs[logs.length - 1]);
        } else {
          console.log('No logs found');
        }
      } catch (e) {
        console.error('Failed to get last log:', e);
      }
    },
  };
};

const iconMap: Record<Notification['type'], LucideIcon> = {
  join_request: UserPlus,
  message: MessageCircle,
  expense: DollarSign,
  trip_update: Calendar,
  member_joined: Users,
  member_left: Users,
  trip_invite: UserPlus,
  trip_join_request: UserPlus,
  trip_join_approved: Calendar,
  trip_join_rejected: Calendar,
  trip_cancelled: Calendar,
  trip_updated: Calendar,
  trip_reminder: Calendar,
  new_message: MessageCircle,
  new_expense: DollarSign,
  expense_paid: DollarSign,
  expense_reminder: DollarSign,
  new_follower: Users,
  new_review: Users,
  new_tip: DollarSign,
  trip_published: Calendar,
  system_announcement: Bell,
  achievement_unlocked: Bell,
  receipt_submitted: DollarSign,
  receipt_approved: DollarSign,
  receipt_rejected: DollarSign,
  trip_settlement_required: DollarSign,
};

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const [filterType, setFilterType] = useState<Notification['type'] | undefined>(undefined);
  const navigate = useNavigate();

  // Fetch notifications with React Query
  const { data: notifications = [], isLoading } = useNotifications({ type: filterType });
  
  // Log notifications data whenever it changes
  useEffect(() => {
    if (notifications.length > 0) {
      persistLog('Notifications data received', {
        count: notifications.length,
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          actionUrl: n.action_url,
          hasMetadata: !!n.metadata,
          metadata: n.metadata,
        })),
      });
    }
  }, [notifications]);
  
  // Mutations
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteAllNotificationsMutation = useDeleteAllNotifications();

  const handleDismiss = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleClearAll = () => {
    deleteAllNotificationsMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    persistLog('Notification clicked', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.action_url,
      read: notification.read,
      metadata: notification.metadata,
    });

    // Mark as read when clicked
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Determine the URL to navigate to
    let urlToNavigate: string | null = null;

    if (notification.action_url) {
      urlToNavigate = notification.action_url;
      persistLog('Using action_url from notification', { urlToNavigate });
    } else if (notification.metadata) {
      // Fallback: reconstruct URL from metadata if action_url is missing
      const metadata = notification.metadata as Record<string, unknown>;
      if (metadata.conversation_id) {
        urlToNavigate = `/chat/${metadata.conversation_id}`;
        persistLog('Reconstructed URL from metadata (conversation)', { urlToNavigate });
      } else if (metadata.trip_id) {
        // Determine the tab based on notification type
        let tab = 'chat';
        if (notification.type === 'new_expense' || notification.type === 'expense' || notification.type === 'expense_paid' || notification.type === 'expense_reminder') {
          tab = 'expenses';
        }
        urlToNavigate = `/trip/${metadata.trip_id}/hub?tab=${tab}`;
        persistLog('Reconstructed URL from metadata (trip)', { urlToNavigate, tab });
      }
    }

    if (urlToNavigate) {
      persistLog('Closing notification sheet before navigation', {});
      onOpenChange(false);
      
      // Fix legacy URLs that use /trips/ instead of /trip/
      const rawUrl = urlToNavigate.replace('/trips/', '/trip/');
      persistLog('Processing URL', { originalUrl: urlToNavigate, rawUrl });
      
      try {
        const isNative = isNativePlatform();

        if (rawUrl.startsWith("http")) {
          const parsedUrl = new URL(rawUrl);
          const inAppPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || "/";
          const isSameOrigin = parsedUrl.origin === window.location.origin;

          persistLog('Full URL detected', {
            parsedOrigin: parsedUrl.origin,
            windowOrigin: window.location.origin,
            isSameOrigin,
            isNative,
            pathname: parsedUrl.pathname,
            search: parsedUrl.search,
            hash: parsedUrl.hash,
            inAppPath,
          });

          if (isNative || isSameOrigin) {
            persistLog('In-app navigation from full URL', { inAppPath });
            setTimeout(() => {
              navigate(inAppPath);
            }, 50);
          } else {
            persistLog('Web cross-origin redirect', { rawUrl });
            window.location.assign(rawUrl);
          }
        } else {
          const inAppPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
          persistLog('Relative URL, navigating in-app', { rawUrl, inAppPath, isNative });
          setTimeout(() => {
            navigate(inAppPath);
          }, 50);
        }
      } catch (e) {
        const isNative = isNativePlatform();
        const inAppFallback = rawUrl.startsWith("http")
          ? rawUrl.replace(/^https?:\/\/[^/]+/i, "") || "/"
          : (rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`);

        persistLog('Error during navigation', {
          error: e instanceof Error ? e.message : String(e),
          url: rawUrl,
          isNative,
          inAppFallback,
        });

        if (isNative) {
          persistLog('Native fallback to in-app path', { inAppFallback });
          setTimeout(() => {
            navigate(inAppFallback);
          }, 50);
        } else if (rawUrl.startsWith("http")) {
          persistLog('Web fallback to location.assign', { rawUrl });
          window.location.assign(rawUrl);
        } else {
          persistLog('Web fallback to in-app relative path', { inAppFallback });
          setTimeout(() => {
            navigate(inAppFallback);
          }, 50);
        }
      }
    } else {
      persistLog('No URL found for notification', {
        type: notification.type,
        title: notification.title,
        hasActionUrl: !!notification.action_url,
        hasMetadata: !!notification.metadata,
        metadata: notification.metadata,
      });
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+2.5rem)] h-[100dvh] flex flex-col [&>button]:hidden"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2">
          <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            Notifications
          </SheetTitle>
          <SheetClose asChild>
            <button className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus:outline-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </SheetClose>
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-1.5 sm:space-y-2 overflow-y-auto flex-1 pb-4">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-card animate-pulse">
                  <div className="p-1.5 sm:p-2 rounded-full bg-muted shrink-0">
                    <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 bg-muted" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Bell;
              return (
                <SwipeableNotificationItem
                  key={notification.id}
                  onDismiss={() => handleDismiss(notification.id)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  isUnread={!notification.read}
                >
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer",
                      "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-full shrink-0",
                      notification.read ? "bg-muted" : "bg-destructive/10"
                    )}>
                      <Icon className={cn(
                        "h-3.5 w-3.5 sm:h-4 sm:w-4",
                        notification.read ? "text-muted-foreground" : "text-destructive"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-xs sm:text-sm",
                          !notification.read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-destructive shrink-0 mt-1 sm:mt-1.5" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </SwipeableNotificationItem>
              );
            })
          )}
        </div>

        {!isLoading && notifications.length > 0 && (
          <div className="mt-auto pb-4 sm:pb-2 border-t border-border/50">
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full text-sm sm:text-base bg-black text-white hover:bg-black/90"
                onClick={handleMarkAllAsRead}
                disabled={!hasUnread || markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
              </Button>
              <Button
                variant="destructive"
                className="w-full text-sm sm:text-base"
                onClick={handleClearAll}
                disabled={deleteAllNotificationsMutation.isPending}
              >
                {deleteAllNotificationsMutation.isPending ? 'Clearing...' : 'Clear all'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
