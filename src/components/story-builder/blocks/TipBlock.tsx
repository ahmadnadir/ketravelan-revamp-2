import { MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { StoryBlock, blockTypeConfig } from "@/data/communityMockData";

interface TipBlockProps {
  block: StoryBlock;
  onUpdate: (updates: Partial<StoryBlock>) => void;
  onRemove: () => void;
}

export function TipBlock({ block, onUpdate }: TipBlockProps) {
  return (
    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Tip for Others</span>
      </div>
      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder={blockTypeConfig.tip.placeholder}
        className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
      />
    </div>
  );
}
