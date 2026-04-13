import { Home, Map, FileText, Heart, MessageSquare, Settings, LogOut, Wallet, BookOpen, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface MenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Map, label: "My Trips", path: "/my-trips" },
  { icon: Wallet, label: "Expenses", path: "/expenses" },
  { icon: BookOpen, label: "My Stories", path: "/my-stories" },
  { icon: FileText, label: "Approvals & Requests", path: "/approvals" },
  { icon: FileText, label: "Draft Trips", path: "/my-trips?tab=draft" },
  { icon: Heart, label: "Favourites", path: "/favourites" },
  { icon: MessageSquare, label: "Feedback", path: "/feedback" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function MenuDrawer({ open, onOpenChange }: MenuDrawerProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleNavigation = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleLogout = async () => {
    onOpenChange(false);
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Guest";
  
  // Generate gender-based default avatar using Notion style
  const getDefaultAvatar = (userId: string, gender: string) => {
    const timestamp = Date.now(); // Cache buster
    if (gender === "male") {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(`${userId}-female`)}&backgroundType=solid&backgroundColor=ffffff&t=${timestamp}`;
    } else if (gender === "female") {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(`${userId}-male`)}&backgroundType=solid&backgroundColor=ffffff&t=${timestamp}`;
    }
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(userId)}&backgroundType=solid&backgroundColor=ffffff&t=${timestamp}`;
  };

  const gender = profile?.gender || "";
  const defaultAvatar = user 
    ? getDefaultAvatar(user.id, gender)
    : "https://api.dicebear.com/7.x/avataaars/svg?seed=guest";
  
  const avatarUrl = profile?.avatar_url || defaultAvatar;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md px-4 sm:px-6 [&>button]:hidden"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-3">
          <SheetTitle className="flex items-center gap-3 text-base sm:text-lg">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = defaultAvatar;
                }}
              />
            </div>
            <span>{displayName}</span>
          </SheetTitle>
          <SheetClose asChild>
            <button className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus:outline-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </button>
          </SheetClose>
        </SheetHeader>
        
        <div className="mt-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path + item.label}
                onClick={() => handleNavigation(item.path)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {/* Separator */}
          <div className="h-px bg-border my-3" />
          
          {/* Log Out (destructive) */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive text-left"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
