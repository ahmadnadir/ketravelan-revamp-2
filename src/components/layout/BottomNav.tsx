import { useCallback, useEffect, useState } from "react";
import { Compass, Plus, MessageCircle, Users, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChatCount } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import premiumTravelImage from "@/assets/travel-social-explorer.png";

interface NavItem {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  label: string;
  path: string;
  isPrimary?: boolean;
  isProfile?: boolean;
}

const navItems: NavItem[] = [
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { label: "Create", path: "/create", isPrimary: true },
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
  const unreadCount = useUnreadChatCount(user?.id);
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

  return (
    <>
      <nav
        className={cn(
          "z-[80] bg-white/[0.97] backdrop-blur-xl safe-x lg:hidden",
          "border-t border-black/[0.07]",
          inline ? "relative w-full" : "fixed bottom-0 left-0 right-0 w-full"
        )}
        style={{ boxShadow: '0 -0.5px 0 rgba(0,0,0,0.08)' }}
      >
        <div className="flex h-[var(--tabbar-height)] items-stretch">
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
                  className="flex flex-col items-center justify-center flex-1 gap-[3px] active:opacity-60 transition-opacity duration-75"
                  aria-label="Create"
                >
                  <span className="flex items-center justify-center w-11 h-7 bg-foreground rounded-[14px]">
                    <Plus className="h-[19px] w-[19px] text-background" strokeWidth={2.5} />
                  </span>
                  <span className="text-[10px] font-semibold text-foreground leading-none tracking-tight">{item.label}</span>
                </button>
              );
            }

            if (item.isProfile) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 gap-[3px] active:opacity-60 transition-opacity duration-75",
                    isActive ? "text-foreground" : "text-foreground/40"
                  )}
                >
                  <span className="flex h-7 w-11 items-center justify-center">
                    <User
                      className="h-[22px] w-[22px] transition-all"
                      strokeWidth={isActive ? 2.25 : 1.6}
                    />
                  </span>
                  <span className={cn(
                    "text-[10px] leading-none tracking-tight",
                    isActive ? "font-semibold" : "font-normal"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-[3px] active:opacity-60 transition-opacity duration-75",
                  isActive ? "text-foreground" : "text-foreground/40"
                )}
              >
                <span className="flex h-7 w-11 items-center justify-center relative">
                  {Icon && (
                    <Icon
                      className="h-[22px] w-[22px] transition-all"
                      strokeWidth={isActive ? 2.25 : 1.6}
                    />
                  )}
                  {item.path === "/chat" && unreadCount > 0 && (
                    <span className="absolute top-0 right-1.5 min-w-[16px] h-4 px-[3px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className={cn(
                  "text-[10px] leading-none tracking-tight",
                  isActive ? "font-semibold" : "font-normal"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        {/* Bottom safe area fill  same background as nav so home bar area matches */}
        <div className="h-[var(--safe-bottom)]" />
      </nav>
      <Drawer open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DrawerContent className="rounded-t-[36px] border-t border-black/10">
          <DrawerHeader className="text-center pb-2 pt-2">
            <DrawerTitle className="text-xl font-semibold tracking-tight">Create</DrawerTitle>
            <DrawerDescription className="text-sm">Start bold. Build the trip people will talk about all year.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4 pb-6">
            <Button
              onClick={handleCreateTrip}
              className="h-11 rounded-xl bg-black text-white text-sm font-semibold hover:bg-black/90"
            >
              Create a Trip
            </Button>
            <Button
              variant="secondary"
              onClick={handleContinueDraft}
              disabled={!hasStoryDraft}
              className="h-11 rounded-xl text-sm"
            >
              Continue Draft
            </Button>
            <div className="mt-1 flex items-center justify-center">
              <div className="h-32 w-80 overflow-hidden rounded-2xl border border-black/10">
                <img
                  src={premiumTravelImage}
                  alt="Hero"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
