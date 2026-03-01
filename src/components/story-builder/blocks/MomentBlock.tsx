import { Textarea } from "@/components/ui/textarea";
import { StoryBlock, blockTypeConfig } from "@/data/communityMockData";

interface MomentBlockProps {
  block: StoryBlock;
  onUpdate: (updates: Partial<StoryBlock>) => void;
  onRemove: () => void;
}

export function MomentBlock({ block, onUpdate }: MomentBlockProps) {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✨</span>
        <span className="text-xs font-medium text-primary uppercase tracking-wide">Key Moment</span>
      </div>
      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder={blockTypeConfig.moment.placeholder}
        className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
      />
    </div>
  );
}
