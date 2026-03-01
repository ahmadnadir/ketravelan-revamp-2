import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BlockType, blockTypeConfig } from "@/data/communityMockData";

interface AddBlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (type: BlockType) => void;
}

const blockTypes: BlockType[] = [
  "text",
  "image",
  "location",
  "social-link",
];

export function AddBlockSheet({ open, onOpenChange, onSelectBlock }: AddBlockSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Add a Block</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-2 overflow-y-auto pb-safe">
          {blockTypes.map((type) => {
            const config = blockTypeConfig[type];
            return (
              <button
                key={type}
                onClick={() => onSelectBlock(type)}
                className="w-full p-4 flex items-start gap-4 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <p className="font-medium text-foreground">{config.label}</p>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
