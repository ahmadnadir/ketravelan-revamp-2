import { Instagram, Youtube, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoryBlock, SocialPlatform, blockTypeConfig } from "@/data/communityMockData";

interface SocialLinkBlockProps {
  block: StoryBlock;
  onUpdate: (updates: Partial<StoryBlock>) => void;
  onRemove: () => void;
}

const platforms: { value: SocialPlatform; label: string; icon: typeof Instagram }[] = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "tiktok", label: "TikTok", icon: Link2 },
  { value: "facebook", label: "Facebook", icon: Link2 },
  { value: "twitter", label: "X / Twitter", icon: Link2 },
];

export function SocialLinkBlock({ block, onUpdate }: SocialLinkBlockProps) {
  const selectedPlatform = platforms.find((p) => p.value === block.platform);

  return (
    <div className="space-y-3">
      <Select
        value={block.platform || ""}
        onValueChange={(value: SocialPlatform) => onUpdate({ platform: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {platforms.map((platform) => (
            <SelectItem key={platform.value} value={platform.value}>
              <div className="flex items-center gap-2">
                <platform.icon className="h-4 w-4" />
                {platform.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        value={block.url || ""}
        onChange={(e) => onUpdate({ url: e.target.value })}
        placeholder={blockTypeConfig["social-link"].placeholder}
        type="url"
      />
      
      {block.url && (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {selectedPlatform && <selectedPlatform.icon className="h-4 w-4" />}
          View on {selectedPlatform?.label || "platform"}
        </a>
      )}
    </div>
  );
}
