import { useNavigate } from "react-router-dom";
import { User, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserQuickActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  onDeleteChat?: () => void;
}

export function UserQuickActionsModal({
  open,
  onOpenChange,
  user,
  onDeleteChat,
}: UserQuickActionsModalProps) {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/user/${user.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8">
        <SheetHeader className="sr-only">
          <SheetTitle>User Quick Actions</SheetTitle>
        </SheetHeader>

        {/* User Preview */}
        <div className="flex flex-col items-center text-center pt-4 pb-6">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={user.imageUrl} alt={user.name} />
            <AvatarFallback className="text-xl font-semibold">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-foreground mt-3">{user.name}</h3>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="default"
            className="w-full h-12 rounded-xl"
            onClick={handleViewProfile}
          >
            <User className="h-5 w-5 mr-2" />
            View Profile
          </Button>
          {onDeleteChat && (
            <Button
              variant="destructive"
              className="w-full h-12 rounded-xl"
              onClick={onDeleteChat}
            >
              Delete Chat
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5 mr-2" />
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
