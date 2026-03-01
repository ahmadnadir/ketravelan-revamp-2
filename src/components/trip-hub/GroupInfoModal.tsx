import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MessageCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createDirectConversation } from "@/lib/conversations";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Member {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
}

interface Trip {
  id: string;
  title: string;
  imageUrl: string;
  destination: string;
}

interface GroupInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  members: Member[];
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
  onTripUpdate,
  isLoading = false,
}: GroupInfoModalProps) {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(trip?.title || "");

  const handleMemberClick = (memberId: string) => {
    onOpenChange(false);
    navigate(`/user/${memberId}`);
  };

  const handleMessageClick = async (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Group Info</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
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
              <div className="flex-1 overflow-hidden">
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
              <div className="flex-1 overflow-hidden">
                <h3 className="text-sm font-medium text-muted-foreground px-4 py-3">
                  Members
                </h3>
                <ScrollArea className="h-[calc(100%-40px)]">
                  <div className="px-4 space-y-1">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleMessageClick(member.id, e)}
                          className="shrink-0"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
