import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockMembers } from "@/data/mockData";

// Simplified member list component - for reuse in GroupInfoModal
export function TripMembers() {
  const navigate = useNavigate();

  const handleMessage = (memberId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/chat/direct/${memberId}`);
  };

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8">
      <div className="space-y-1">
        {mockMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            {/* Clickable Avatar + Name area */}
            <Link
              to={`/user/${member.id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0">
                {member.imageUrl ? (
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground font-semibold">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-foreground text-sm sm:text-base truncate">
                  {member.name}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {member.role}
                </span>
              </div>
            </Link>

            {/* Message button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleMessage(member.id, e)}
              className="shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
