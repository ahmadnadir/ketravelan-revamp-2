import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StoryBlock, SocialPlatform } from "@/data/communityMockData";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Instagram,
  Youtube,
  Music2,
  Linkedin,
  Twitter,
  Globe,
  Zap,
} from "lucide-react";

interface AddSocialLinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSocialLinks: (blocks: StoryBlock[]) => void;
}

interface PlatformConfig {
  key: SocialPlatform;
  label: string;
  icon: typeof Instagram;
  color: string;
}

const socialPlatforms: PlatformConfig[] = [
  { key: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { key: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500" },
  { key: "tiktok", label: "TikTok", icon: Music2, color: "text-black" },
  { key: "facebook", label: "Facebook", icon: Zap, color: "text-blue-600" },
  { key: "twitter", label: "X / Twitter", icon: Twitter, color: "text-black" },
];

export function AddSocialLinksModal({
  open,
  onOpenChange,
  onAddSocialLinks,
}: AddSocialLinksModalProps) {
  const { profile } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);

  const getProfileHandle = (platform: string): string | null => {
    if (!profile?.social_links) return null;
    const handle = profile.social_links[platform];
    return typeof handle === "string" && handle.trim() ? handle : null;
  };

  const availablePlatforms = socialPlatforms.filter((platform) => {
    const handle = getProfileHandle(platform.key);
    return handle && handle.trim();
  });

  const handleSelectPlatform = (key: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleDone = () => {
    const socialBlocks: StoryBlock[] = selectedPlatforms.map((platform) => {
      const handle = getProfileHandle(platform);

      return {
        id: `block-${Date.now()}-${platform}`,
        type: "social-link",
        platform: platform,
        url: handle || "",
        content: handle || "",
      };
    });

    onAddSocialLinks(socialBlocks);
    setSelectedPlatforms([]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Add Social Links</SheetTitle>
          <SheetDescription>Select profiles to include in your story</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mb-6">
          {availablePlatforms.length > 0 ? (
            availablePlatforms.map((platform) => {
              const Icon = platform.icon;
              const handle = getProfileHandle(platform.key);
              const isSelected = selectedPlatforms.includes(platform.key);

              return (
                <div
                  key={platform.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 cursor-pointer transition-colors"
                  onClick={() => handleSelectPlatform(platform.key)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectPlatform(platform.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5"
                  />
                  <Icon className={`h-5 w-5 ${platform.color}`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{platform.label}</p>
                    <p className="text-xs text-muted-foreground">@{handle}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No social profiles found. Add social media links to your profile first.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleDone}
          disabled={selectedPlatforms.length === 0}
          className="w-full h-12"
        >
          Done
        </Button>
      </SheetContent>
    </Sheet>
  );
}
