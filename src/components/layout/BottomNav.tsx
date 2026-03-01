import { useCallback, useEffect, useState } from "react";
import { Compass, PlusCircle, MessageCircle, Users, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavItem {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  isPrimary?: boolean;
  isProfile?: boolean;
}

const navItems: NavItem[] = [
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: PlusCircle, label: "Create", path: "/create", isPrimary: true },
  { icon: Users, label: "Community", path: "/community" },
  { label: "Profile", path: "/profile", isProfile: true },
];

const STORY_DRAFT_KEY = "ketravelan-story-draft";

interface BottomNavProps {
  inline?: boolean;
}

export function BottomNav({ inline = false }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const keyboardHeight = useKeyboardHeight();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hasStoryDraft, setHasStoryDraft] = useState(false);

  const refreshStoryDraftState = useCallback(() => {
    setHasStoryDraft(Boolean(localStorage.getItem(STORY_DRAFT_KEY)));
  }, []);

  useEffect(() => {
    refreshStoryDraftState();
  }, [refreshStoryDraftState]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORY_DRAFT_KEY) {
        refreshStoryDraftState();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshStoryDraftState]);

  const handleCreateClick = () => {
    refreshStoryDraftState();
    setShowCreateModal(true);
  };

  const handleCreateTrip = () => {
    setShowCreateModal(false);
    navigate("/create");
  };

  const handleContinueDraft = () => {
    setShowCreateModal(false);
    navigate("/create-story");
  };

  // Hide bottom nav for logged-out users
  if (!isAuthenticated) {
    return null;
  }

  // Hide bottom nav when keyboard is visible on mobile
  if (keyboardHeight > 0) {
    return null;
  }

  return (
    <>
      <nav className={cn(
        "z-50 glass border-t border-border/50 transition-all duration-300",
        inline ? "" : "fixed bottom-0 left-0 right-0 w-full"
      )}>
        <div className="w-full px-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between h-16 sm:h-18 w-full px-2 sm:px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/" && location.pathname.startsWith(item.path));

            const Icon = item.icon;

            if (item.isPrimary) {
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={handleCreateClick}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-2 rounded-xl transition-all flex-1",
                    isActive 
                      ? "text-nav-active" 
                      : "text-nav-inactive hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive && "stroke-[2.5]")} />
                  <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                </button>
              );
            }

            // Profile item with icon
            if (item.isProfile) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-2 rounded-xl transition-colors flex-1",
                    isActive 
                      ? "text-nav-active" 
                      : "text-nav-inactive hover:text-foreground"
                  )}
                >
                  <User className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive && "stroke-[2.5]")} />
                  <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                </Link>
              );
            }

            // Regular nav items
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-2 rounded-xl transition-colors flex-1",
                  isActive 
                    ? "text-nav-active" 
                    : "text-nav-inactive hover:text-foreground"
                )}
              >
                {Icon && <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive && "stroke-[2.5]")} />}
                <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
          </div>
        </div>
      </nav>
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>Choose how you want to start.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" onClick={handleCreateTrip}>
              Create a Trip
            </Button>
            <Button
              variant="secondary"
              onClick={handleContinueDraft}
              disabled={!hasStoryDraft}
            >
              Continue Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
