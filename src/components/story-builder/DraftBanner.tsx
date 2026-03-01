import { formatDistanceToNow } from "date-fns";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DraftBannerProps {
  lastSaved: Date;
  onResume: () => void;
  onStartFresh: () => void;
}

export function DraftBanner({ lastSaved, onResume, onStartFresh }: DraftBannerProps) {
  const timeAgo = formatDistanceToNow(lastSaved, { addSuffix: true });

  return (
    <div className="mx-4 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/20 rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">You have an unfinished story</p>
          <p className="text-sm text-muted-foreground">Last saved {timeAgo}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onResume}>
              Continue Editing
            </Button>
            <Button size="sm" variant="ghost" onClick={onStartFresh}>
              Start Fresh
            </Button>
          </div>
        </div>
        <button
          onClick={onStartFresh}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
