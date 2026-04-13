import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Check, X, ChevronRight, Shield, LogOut, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDirectConversation } from "@/lib/conversations";
import { deleteTripPermanently, leaveTripMember } from "@/lib/trips";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Member {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  isAdmin?: boolean;
}

interface Trip {
  id: string;
  title: string;
  imageUrl: string;
  destination: string;
  visibility?: string;
  creatorId?: string;
  tripSettings?: unknown;
}

type TripSettingsState = {
  permissions: {
    canEditTripDetails: "organizer" | "everyone";
    canAddExpenses: "organizer" | "everyone";
  };
  notifications: {
    newMembersJoin: boolean;
    expenseUpdates: boolean;
    chatActivity: boolean;
  };
};

const DEFAULT_TRIP_SETTINGS: TripSettingsState = {
  permissions: {
    canEditTripDetails: "organizer",
    canAddExpenses: "everyone",
  },
  notifications: {
    newMembersJoin: true,
    expenseUpdates: true,
    chatActivity: false,
  },
};

function normalizeTripSettings(raw: any): TripSettingsState {
  if (!raw || typeof raw !== "object") return DEFAULT_TRIP_SETTINGS;

  const permissions = raw.permissions || {};
  const notifications = raw.notifications || {};

  return {
    permissions: {
      canEditTripDetails:
        permissions.can_edit_trip_details === "everyone" || permissions.canEditTripDetails === "everyone"
          ? "everyone"
          : "organizer",
      canAddExpenses:
        permissions.can_add_expenses === "organizer" || permissions.canAddExpenses === "organizer"
          ? "organizer"
          : "everyone",
    },
    notifications: {
      newMembersJoin:
        typeof notifications.new_members_join === "boolean"
          ? notifications.new_members_join
          : typeof notifications.newMembersJoin === "boolean"
            ? notifications.newMembersJoin
            : true,
      expenseUpdates:
        typeof notifications.expense_updates === "boolean"
          ? notifications.expense_updates
          : typeof notifications.expenseUpdates === "boolean"
            ? notifications.expenseUpdates
            : true,
      chatActivity:
        typeof notifications.chat_activity === "boolean"
          ? notifications.chat_activity
          : typeof notifications.chatActivity === "boolean"
            ? notifications.chatActivity
            : false,
    },
  };
}

interface GroupInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  members: Member[];
  currentUserId?: string;
  conversationId?: string;
  canManageTrip?: boolean;
  canEditTripDetails?: boolean;
  onDataChanged?: () => Promise<void> | void;
  onTripUpdate?: (updates: Partial<Trip>) => void;
  isLoading?: boolean;
}

const getDefaultAvatar = (userId: string) => {
  const timestamp = Date.now();
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}&t=${timestamp}`;
};

export function GroupInfoModal({
  open,
  onOpenChange,
  trip,
  members,
  currentUserId,
  conversationId,
  canManageTrip = false,
  canEditTripDetails = false,
  onDataChanged,
  onTripUpdate,
  isLoading = false,
}: GroupInfoModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(trip?.title || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showLastOrganizerLeaveDialog, setShowLastOrganizerLeaveDialog] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<TripSettingsState>(DEFAULT_TRIP_SETTINGS);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const currentUserMembership = useMemo(
    () => members.find((member) => member.id === (currentUserId || user?.id)),
    [members, currentUserId, user?.id],
  );

  const organizerCount = useMemo(
    () => members.filter((member) => member.isAdmin || member.role?.toLowerCase() === 'organizer').length,
    [members],
  );

  const isCurrentUserOrganizer = Boolean(
    currentUserMembership?.isAdmin ||
    currentUserMembership?.role?.toLowerCase() === 'organizer' ||
    ((currentUserId || user?.id) && trip?.creatorId === (currentUserId || user?.id)),
  );
  const isLastOrganizer = isCurrentUserOrganizer && organizerCount <= 1;

  const getLeaveGuardState = async () => {
    const actorId = currentUserId || user?.id;
    if (!trip || !actorId) {
      return { isOrganizer: false, organizerCount: 0, isLastOrganizer: false };
    }

    const [{ data: selfMembership, error: selfError }, { count, error: countError }] = await Promise.all([
      supabase
        .from('trip_members')
        .select('is_admin, role')
        .eq('trip_id', trip.id)
        .eq('user_id', actorId)
        .is('left_at', null)
        .maybeSingle(),
      supabase
        .from('trip_members')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', trip.id)
        .eq('is_admin', true)
        .is('left_at', null),
    ]);

    if (selfError) throw selfError;
    if (countError) throw countError;

    const organizerCountFromDb = count || 0;
    const isSelfOrganizerByMembership = Boolean(
      selfMembership?.is_admin || selfMembership?.role?.toLowerCase() === 'organizer',
    );
    const isSelfCreator = trip.creatorId === actorId;
    const isOrganizer = isSelfOrganizerByMembership || isSelfCreator;

    return {
      isOrganizer,
      organizerCount: organizerCountFromDb,
      isLastOrganizer: isOrganizer && organizerCountFromDb <= 1,
    };
  };

  useEffect(() => {
    setTitle(trip?.title || "");
    setSettingsDraft(normalizeTripSettings(trip?.tripSettings));
    setSettingsDirty(false);
  }, [trip?.id, trip?.title, trip?.tripSettings]);

  const handleMemberClick = (memberId: string) => {
    onOpenChange(false);
    navigate(`/user/${memberId}`);
  };

  const handleMessageClick = async (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;
    try {
      const convo = await createDirectConversation(memberId);
      if (convo && convo.id) {
        onOpenChange(false);
        navigate(`/chat/${convo.id}`);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  const handleMessageFromMenu = async (memberId: string) => {
    if (isSubmitting) return;
    try {
      const convo = await createDirectConversation(memberId);
      if (convo && convo.id) {
        onOpenChange(false);
        navigate(`/chat/${convo.id}`);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  const handleTitleSave = () => {
    if (title.trim() && trip) {
      onTripUpdate?.({ title: title.trim() });
    } else if (trip) {
      setTitle(trip.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitle(trip?.title || "");
    setIsEditingTitle(false);
  };

  const removeUserFromTripConversation = async (userId: string) => {
    if (!conversationId) return;

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Could not remove user from conversation participants:', error);
    }
  };

  const handleEditDetails = () => {
    if (!trip) return;
    onOpenChange(false);
    navigate(`/create?edit=${trip.id}`);
  };

  const handleToggleVisibility = async () => {
    if (!trip) return;
    setIsSubmitting(true);
    const nextVisibility = trip.visibility === 'private' ? 'public' : 'private';

    try {
      const { error } = await supabase
        .from('trips')
        .update({ visibility: nextVisibility })
        .eq('id', trip.id);

      if (error) throw error;

      onTripUpdate?.({ visibility: nextVisibility });
      await onDataChanged?.();

      toast({
        title: 'Trip setting updated',
        description: `Trip is now ${nextVisibility}.`,
      });
    } catch (err) {
      toast({
        title: 'Failed to update trip setting',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTripSettings = async () => {
    if (!trip) return;
    setIsSubmitting(true);

    const payload = {
      permissions: {
        can_edit_trip_details: settingsDraft.permissions.canEditTripDetails,
        can_add_expenses: settingsDraft.permissions.canAddExpenses,
      },
      notifications: {
        new_members_join: settingsDraft.notifications.newMembersJoin,
        expense_updates: settingsDraft.notifications.expenseUpdates,
        chat_activity: settingsDraft.notifications.chatActivity,
      },
    };

    try {
      const { error } = await supabase
        .from("trips")
        .update({ trip_settings: payload })
        .eq("id", trip.id);

      if (error) throw error;

      onTripUpdate?.({ tripSettings: payload });
      await onDataChanged?.();
      setSettingsDirty(false);
      toast({ title: "Trip settings saved" });
    } catch (err) {
      toast({
        title: "Failed to save trip settings",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoteMember = async (member: Member) => {
    if (!trip) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ is_admin: true, role: 'organizer' })
        .eq('trip_id', trip.id)
        .eq('user_id', member.id)
        .is('left_at', null);

      if (error) throw error;

      await onDataChanged?.();
      toast({ title: 'Member promoted', description: `${member.name} is now an organizer.` });
    } catch (err) {
      toast({
        title: 'Unable to promote member',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!trip) return;
    const confirmed = window.confirm(`Remove ${member.name} from this trip?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ left_at: new Date().toISOString() })
        .eq('trip_id', trip.id)
        .eq('user_id', member.id)
        .is('left_at', null);

      if (error) throw error;

      await removeUserFromTripConversation(member.id);
      await onDataChanged?.();

      toast({
        title: 'Member removed',
        description: `${member.name} has been removed from the trip chat too.`,
      });
    } catch (err) {
      toast({
        title: 'Unable to remove member',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const performLeaveTrip = async (forceCancelLastOrganizer = false) => {
    if (!trip) return;

    setIsSubmitting(true);
    try {
      const result = await leaveTripMember(trip.id, {
        forceCancel: forceCancelLastOrganizer,
      });
      const userId = currentUserId || user?.id;
      if (userId) {
        await removeUserFromTripConversation(userId);
      }

      toast({
        title: result.didCancelTrip ? 'Trip cancelled and left' : 'You left the trip',
        description: result.didCancelTrip
          ? 'You were removed from trip members and trip chat. The trip is now cancelled.'
          : result.tripAlreadyCancelled
            ? 'You left this cancelled trip and were removed from trip chat.'
            : 'You were removed from trip members and trip chat.',
      });

      setShowLastOrganizerLeaveDialog(false);
      onOpenChange(false);
      navigate('/chat');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast({
        title: 'Unable to leave trip',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveTrip = async () => {
    if (!trip) return;

    try {
      const guardState = await getLeaveGuardState();
      if (guardState.isLastOrganizer) {
        setShowLastOrganizerLeaveDialog(true);
        return;
      }
    } catch (err) {
      console.warn('Failed to verify organizer state before leaving trip:', err);
    }

    if (isLastOrganizer) {
      setShowLastOrganizerLeaveDialog(true);
      return;
    }

    const confirmed = window.confirm('Leave this trip? You will also be removed from trip chat.');
    if (!confirmed) return;

    await performLeaveTrip(false);
  };

  const handleAssignAnotherOrganizer = () => {
    setShowLastOrganizerLeaveDialog(false);
    setShowTripSettings(false);
    toast({
      title: 'Assign another organiser first',
      description: 'Open a member menu and choose "Promote to Organizer", then try leaving again.',
    });
  };

  const handleLeaveAndCancelTrip = async () => {
    await performLeaveTrip(true);
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;

    const isCreator = (currentUserId || user?.id) === trip.creatorId;
    if (!isCreator) {
      toast({
        title: "Only trip organizer can delete",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm("Delete this trip permanently? This cannot be undone.");
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await deleteTripPermanently(trip.id);
      toast({ title: `${trip.title} has been deleted and the group chat for ${trip.title} has been removed.` });
      onOpenChange(false);
      navigate("/my-trips");
    } catch (err) {
      toast({
        title: "Unable to delete trip",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] sm:h-[80vh] rounded-t-3xl overflow-hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>Group Info</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full min-h-0">
          {/* Loading State */}
          {isLoading || !trip ? (
            <>
              {/* Trip Info Header Skeleton */}
              <div className="flex flex-col items-center pt-4 pb-6 border-b border-border/50 animate-pulse">
                <div className="h-24 w-24 rounded-full bg-muted mb-4" />
                <div className="h-6 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>

              {/* Members List Skeleton */}
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <div className="h-4 w-20 bg-muted rounded mx-4 my-3" />
                <div className="px-4 space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
                    >
                      <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                      <div className="h-9 w-20 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Trip Info Header */}
              <div className="flex flex-col items-center pt-4 pb-6 border-b border-border/50">
                {/* Editable Trip Image */}
                <div className="relative mb-4">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-lg">
                    <img
                      src={trip.imageUrl}
                      alt={trip.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Editable Title */}
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 w-full max-w-xs">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-center font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSave();
                        if (e.key === "Escape") handleTitleCancel();
                      }}
                    />
                    <Button variant="ghost" size="icon" onClick={handleTitleSave} className="h-8 w-8">
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleTitleCancel} className="h-8 w-8">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {trip.title}
                  </button>
                )}

                <p className="text-sm text-muted-foreground mt-1">
                  {trip.destination} • {members.length} members
                </p>
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <div className="px-4 py-3 border-b border-border/50 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Manage Trip</h3>

                  {canManageTrip ? (
                    <div className="space-y-2">
                      <button
                        onClick={handleEditDetails}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm font-medium">Edit Details</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setShowTripSettings(true)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm font-medium">Trip Settings</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : canEditTripDetails ? (
                    <div className="space-y-2">
                      <button
                        onClick={handleEditDetails}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm font-medium">Edit Details</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                        onClick={handleLeaveTrip}
                        disabled={isSubmitting}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Trip
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                      onClick={handleLeaveTrip}
                      disabled={isSubmitting}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Trip
                    </Button>
                  )}
                </div>

                <h3 className="text-sm font-medium text-muted-foreground px-4 py-3">
                  Members
                </h3>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide [webkit-overflow-scrolling:touch] touch-pan-y">
                  <div id="trip-members-list" className="px-4 space-y-1 pb-6">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        {/* Clickable Avatar + Name */}
                        <button
                          onClick={() => handleMemberClick(member.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0">
                            <img
                              src={member.imageUrl && member.imageUrl.trim() ? member.imageUrl : getDefaultAvatar(member.id)}
                              alt={member.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = getDefaultAvatar(member.id);
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {member.name}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {member.role}
                            </span>
                          </div>
                        </button>

                        {/* Message Button */}
                        {member.id !== (currentUserId || user?.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleMessageClick(member.id, e)}
                            className="shrink-0"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {canManageTrip && member.id !== currentUserId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                disabled={isSubmitting}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {!member.isAdmin && (
                                <DropdownMenuItem onClick={() => handlePromoteMember(member)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Promote to Organizer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(member)}
                                className="text-destructive focus:text-destructive"
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                Remove from Trip
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <Sheet open={showTripSettings} onOpenChange={setShowTripSettings}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl">
        <SheetHeader className="border-b border-border/50 pb-3">
          <SheetTitle>Trip Settings</SheetTitle>
        </SheetHeader>

        <div className="h-[calc(100%-56px)] overflow-y-auto scrollbar-hide">
          <div className="space-y-4 pt-3 pb-24">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Privacy & Visibility</p>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Public Trip</p>
                  <p className="text-xs text-muted-foreground">
                    {trip?.visibility === "private"
                      ? "Private trips can only be accessed by members."
                      : "Public trips can be discovered by anyone."}
                  </p>
                </div>
                <Switch checked={trip?.visibility !== "private"} onCheckedChange={handleToggleVisibility} disabled={isSubmitting} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permissions</p>
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <p className="text-sm font-medium mb-2">Who can edit trip details</p>
                  <Select
                    value={settingsDraft.permissions.canEditTripDetails}
                    onValueChange={(value: "organizer" | "everyone") => {
                      setSettingsDraft((prev) => ({
                        ...prev,
                        permissions: { ...prev.permissions, canEditTripDetails: value },
                      }));
                      setSettingsDirty(true);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organizer">Only Organizer</SelectItem>
                      <SelectItem value="everyone">Everyone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <p className="text-sm font-medium mb-2">Who can add expenses</p>
                  <Select
                    value={settingsDraft.permissions.canAddExpenses}
                    onValueChange={(value: "organizer" | "everyone") => {
                      setSettingsDraft((prev) => ({
                        ...prev,
                        permissions: { ...prev.permissions, canAddExpenses: value },
                      }));
                      setSettingsDirty(true);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="organizer">Only Organizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notifications</p>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                <p className="text-sm font-medium">New members join</p>
                <Switch
                  checked={settingsDraft.notifications.newMembersJoin}
                  onCheckedChange={(checked) => {
                    setSettingsDraft((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, newMembersJoin: checked },
                    }));
                    setSettingsDirty(true);
                  }}
                />
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                <p className="text-sm font-medium">Expense updates</p>
                <Switch
                  checked={settingsDraft.notifications.expenseUpdates}
                  onCheckedChange={(checked) => {
                    setSettingsDraft((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, expenseUpdates: checked },
                    }));
                    setSettingsDirty(true);
                  }}
                />
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 flex items-center justify-between">
                <p className="text-sm font-medium">Chat activity</p>
                <Switch
                  checked={settingsDraft.notifications.chatActivity}
                  onCheckedChange={(checked) => {
                    setSettingsDraft((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, chatActivity: checked },
                    }));
                    setSettingsDirty(true);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Danger Zone</p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={handleLeaveTrip}
                disabled={isSubmitting}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Trip
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={handleDeleteTrip}
                disabled={isSubmitting || (currentUserId || user?.id) !== trip?.creatorId}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Trip
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-background p-4">
          <Button type="button" onClick={handleSaveTripSettings} disabled={isSubmitting || !settingsDirty} className="w-full">
            Save Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={showLastOrganizerLeaveDialog} onOpenChange={setShowLastOrganizerLeaveDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Trip</AlertDialogTitle>
          <AlertDialogDescription>
            You are the last organiser for this trip. If you leave without assigning another organiser, the trip will be automatically cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={handleAssignAnotherOrganizer}
            disabled={isSubmitting}
            className="w-full"
          >
            Assign Another Organiser
          </AlertDialogAction>
          <Button
            type="button"
            variant="destructive"
            onClick={handleLeaveAndCancelTrip}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Leaving...' : 'Leave and Cancel Trip'}
          </Button>
          <AlertDialogCancel disabled={isSubmitting} className="w-full m-0">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
