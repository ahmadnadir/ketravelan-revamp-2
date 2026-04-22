import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Ban, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { getBlockedUsers, unblockUser } from "@/lib/blockUser";
import { toast } from "sonner";

interface BlockedProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function BlockedUsers() {
  const navigate = useNavigate();
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    void loadBlockedUsers();
  }, []);

  async function loadBlockedUsers() {
    setLoading(true);
    try {
      const ids = await getBlockedUsers();
      if (ids.length === 0) {
        setBlockedProfiles([]);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);

      if (error) throw error;
      setBlockedProfiles(data || []);
    } catch (err) {
      console.error("Failed to load blocked users:", err);
      toast.error("Failed to load blocked users");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnblock(userId: string, name: string) {
    setUnblockingId(userId);
    try {
      await unblockUser(userId);
      setBlockedProfiles((prev) => prev.filter((p) => p.id !== userId));
      toast.success(`${name} has been unblocked`);
    } catch (err) {
      console.error("Unblock failed:", err);
      toast.error("Failed to unblock user");
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 rounded-full hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-base">Blocked Users</h1>
        </div>

        <div className="flex-1 px-4 py-4 space-y-2 max-w-lg mx-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center pt-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : blockedProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center">
              <div className="rounded-full bg-muted p-4">
                <UserX className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">No blocked users</p>
              <p className="text-sm text-muted-foreground">
                Users you block will appear here.
              </p>
            </div>
          ) : (
            blockedProfiles.map((profile) => {
              const displayName =
                profile.full_name || profile.username || "Unknown User";
              const initials = displayName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3"
                >
                  <Avatar
                    className="h-10 w-10 cursor-pointer shrink-0"
                    onClick={() => navigate(`/user/${profile.id}`)}
                  >
                    {profile.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={displayName} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/user/${profile.id}`)}
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayName}
                    </p>
                    {profile.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs"
                    disabled={unblockingId === profile.id}
                    onClick={() => void handleUnblock(profile.id, displayName)}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {unblockingId === profile.id ? "Unblocking..." : "Unblock"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
