import { Camera, FileText, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AttachmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "image" | "document" | "location") => void;
}

export function AttachmentSheet({ open, onOpenChange, onSelect }: AttachmentSheetProps) {
  const attachmentOptions = [
    { type: "image" as const, icon: Camera, label: "Image", description: "Camera or Gallery" },
    { type: "document" as const, icon: FileText, label: "Document", description: "PDF or Files" },
    { type: "location" as const, icon: MapPin, label: "Location", description: "Share your location" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Share Attachment</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-3 gap-4 pb-6">
          {attachmentOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => onSelect(option.type)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <option.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="text-xs text-muted-foreground text-center">{option.description}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
