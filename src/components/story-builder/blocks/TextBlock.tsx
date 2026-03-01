import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoryBlock, TextPrompt, blockTypeConfig } from "@/data/communityMockData";

interface TextBlockProps {
  block: StoryBlock;
  onUpdate: (updates: Partial<StoryBlock>) => void;
  onRemove: () => void;
}

export function TextBlock({ block, onUpdate }: TextBlockProps) {
  const prompt: TextPrompt = block.textPrompt ?? "free";

  const promptOptions: { value: TextPrompt; label: string; placeholder: string }[] = [
    {
      value: "free",
      label: "Free write",
      placeholder: blockTypeConfig.text.placeholder,
    },
    {
      value: "what-happened",
      label: "What happened?",
      placeholder: "Tell the story in your own words — what happened?",
    },
    {
      value: "lesson",
      label: "What did you learn?",
      placeholder: "What did you learn from this experience?",
    },
    {
      value: "tip",
      label: "Any tips for others?",
      placeholder: "What would you tell someone doing this trip next?",
    },
    {
      value: "why-place-matters",
      label: "Why this place matters",
      placeholder: "Why does this place matter to you?",
    },
  ];

  const current = promptOptions.find((p) => p.value === prompt) ?? promptOptions[0];

  return (
    <div className="space-y-3">
      {/* Subtle prompt selector (optional) */}
      <div className="flex items-center justify-between">
        <Select
          value={prompt}
          onValueChange={(value) => onUpdate({ textPrompt: value as TextPrompt })}
        >
          <SelectTrigger className="h-8 w-auto border-0 bg-transparent px-0 text-xs text-muted-foreground hover:text-foreground">
            <SelectValue placeholder="Free write" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            {promptOptions.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder={current.placeholder}
        className="min-h-[140px] resize-none border-0 p-4 focus-visible:ring-0 focus-visible:bg-muted/30 rounded-md"
      />
    </div>
  );
}
