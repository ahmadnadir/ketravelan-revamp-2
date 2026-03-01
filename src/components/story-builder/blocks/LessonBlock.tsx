import { Lightbulb } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { StoryBlock, blockTypeConfig } from "@/data/communityMockData";

interface LessonBlockProps {
  block: StoryBlock;
  onUpdate: (updates: Partial<StoryBlock>) => void;
  onRemove: () => void;
}

export function LessonBlock({ block, onUpdate }: LessonBlockProps) {
  return (
    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Lesson Learned</span>
      </div>
      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder={blockTypeConfig.lesson.placeholder}
        className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
      />
    </div>
  );
}
