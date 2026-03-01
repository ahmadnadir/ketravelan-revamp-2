import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  userName?: string;
  userImageUrl?: string;
  className?: string;
}

export function TypingIndicator({ userName, userImageUrl, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-end gap-2 mb-3", className)}>
      {/* Avatar for group chat */}
      {userName && (
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={userImageUrl} alt={userName} />
          <AvatarFallback className="text-xs">{userName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      
      <div className="flex flex-col gap-0.5 sm:gap-1">
        {userName && (
          <span className="text-[10px] sm:text-xs text-muted-foreground ml-2 sm:ml-3">
            {userName}
          </span>
        )}
        <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm px-4 py-3 w-fit">
          <div className="flex items-center gap-1">
            <span 
              className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "600ms" }}
            />
            <span 
              className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "150ms", animationDuration: "600ms" }}
            />
            <span 
              className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: "300ms", animationDuration: "600ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
