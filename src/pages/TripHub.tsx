/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
// Declare window.supabase type
declare global {
  interface Window {
    supabase: any;
  }
}
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, Users } from "lucide-react";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { TripChat } from "@/components/trip-hub/TripChat";
import { TripExpenses } from "@/components/trip-hub/TripExpenses";
import { TripNotes } from "@/components/trip-hub/TripNotes";
import { GroupInfoModal } from "@/components/trip-hub/GroupInfoModal";
import { ChatPage } from "@/components/chat/ChatPage";
import { fetchTripConversation } from "@/lib/conversations";
import { fetchTripDetails } from "@/lib/trips";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function TripHub() {
  const { id: tripId } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("chat");
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  // Load trip, conversation and members data in parallel for faster initial load
  useEffect(() => {
    const loadData = async () => {
      if (!tripId) {
        setError("Trip ID is missing");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const [tripData, convData, membersRes] = await Promise.all([
          fetchTripDetails(tripId),
          fetchTripConversation(tripId),
          supabase
            .from('trip_members')
            .select(`
              id,
              role,
              is_admin,
              user:profiles(id, username, full_name, avatar_url)
            `)
            .eq('trip_id', tripId)
            .is('left_at', null),
        ]);

        if (!tripData) {
          setError("Trip not found");
          setTrip(null);
          setConversation(null);
          setMembers([]);
          setIsLoading(false);
          return;
        }

        setTrip(tripData);
        setConversation(convData);

        const { data: tripMembers, error: membersError } = membersRes;

        if (!membersError && tripMembers) {
          const processedMembers = tripMembers.map((m: any) => ({
            id: m.user.id,
            username: m.user.username,
            full_name: m.user.full_name,
            avatar_url: m.user.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.user.id}`,
            name: m.user.full_name || m.user.username,
            imageUrl: m.user.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.user.id}`,
            role: m.is_admin ? 'Admin' : m.role || 'Member'
          }));
          setMembers(processedMembers);
        } else {
          setMembers([]);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading trip data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trip data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [tripId]);

  // Read tab from URL query param on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "expenses" || tabParam === "notes" || tabParam === "chat") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const displayTrip = trip;
  const displayMembers = members;
  const { user } = useAuth();

  // Always call ChatPage at top level to maintain hook order
  const chatPageContent = ChatPage({
    conversationId: conversation?.id || '',
    headerTitle: displayTrip?.title || "Group Chat",
    headerImageUrl: displayTrip?.cover_image || "",
    headerImageFallback: displayTrip?.title?.charAt(0) || "T",
    showBackButton: false,
    currentUserId: user?.id,
    tripId: displayTrip?.id,
    tripMembers: displayMembers,
  });

  // Only use footer when on chat tab
  const chatFooter = activeTab === "chat" && conversation ? chatPageContent.footerContent : null;

  const headerContent = (
    <header className="glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
      <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 h-20 sm:h-18">
          <Link to="/chat">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          {/* Interactive Trip Header - Opens Group Info Modal */}
          <button
            onClick={() => setGroupInfoOpen(true)}
            className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
            disabled={isLoading || !displayTrip}
          >
            {isLoading ? (
              // Loading skeleton for header
              <>
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </>
            ) : (
              <>
                {/* Circular Trip Image */}
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden shrink-0 border-2 border-background shadow-sm">
                  {displayTrip ? (
                    <img
                      src={displayTrip.cover_image || displayTrip.imageUrl || `https://ui-avatars.com/api/?name=Trip`}
                      alt={displayTrip.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">?</div>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="font-semibold text-foreground truncate text-base sm:text-lg">
                    {displayTrip ? displayTrip.title : ""}
                  </h1>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span className="truncate">{displayTrip ? displayTrip.destination : "-"}</span>
                    <span>•</span>
                    <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span>{displayTrip ? displayMembers.length : "-"}</span>
                  </div>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Tabs - Chat, Expenses, Notes */}
        <div className="pb-2 sm:pb-3">
          <SegmentedControl
            options={[
              { label: "Chat", value: "chat" },
              { label: "Expenses", value: "expenses" },
              { label: "Notes", value: "notes" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>
    </header>
  );

  return (
    <>
      <AppLayout 
        headerContent={headerContent} 
        footerContent={chatFooter}
        showBottomNav={activeTab !== "chat"}
        focusedFlow={true}
        className="px-0 sm:px-0"
      >
        <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto">
          {isLoading ? (
            <div className="px-3 sm:px-4 space-y-4 animate-pulse">
              {activeTab === "chat" && (
                // Chat Loading Skeleton
                <div className="space-y-3 pt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${i % 3 === 0 ? "justify-end" : "justify-start"}`}
                    >
                      {i % 3 !== 0 && <div className="h-8 w-8 rounded-full bg-muted shrink-0" />}
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        <div className={`h-16 bg-muted rounded-2xl ${i % 3 === 0 ? "w-48" : "w-56"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "expenses" && (
                // Expenses Loading Skeleton
                <div className="space-y-3 pt-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
                      <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                      <div className="h-5 w-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "notes" && (
                // Notes Loading Skeleton
                <div className="space-y-3 pt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
                      <div className="h-5 w-48 bg-muted rounded" />
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-5/6 bg-muted rounded" />
                        <div className="h-3 w-4/6 bg-muted rounded" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-6 w-16 bg-muted rounded-full" />
                        <div className="h-6 w-20 bg-muted rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !trip ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Trip not found.</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-destructive">{error}</div>
            </div>
          ) : (
            <>
              {activeTab === "chat" && (
                conversation ? (
                  <div className="w-full py-4 sm:py-6 space-y-4">
                    {chatPageContent.messagesContent}
                    <div ref={chatPageContent.messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">No conversation found for this trip.</div>
                  </div>
                )
              )}
              {activeTab === "expenses" && <TripExpenses tripId={trip.id} members={displayMembers} conversationId={conversation?.id} />}
              {activeTab === "notes" && <TripNotes tripId={trip.id} />}
            </>
          )}
        </div>
      </AppLayout>

      {/* Group Info Modal */}
      <GroupInfoModal
        open={groupInfoOpen}
        onOpenChange={setGroupInfoOpen}
        trip={trip ? {
          id: trip.id,
          title: trip.title,
          imageUrl: trip.cover_image || trip.imageUrl,
          destination: trip.destination
        } : null}
        members={members.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          imageUrl: m.imageUrl
        }))}
        isLoading={isLoading}
      />
    </>
  );
}
