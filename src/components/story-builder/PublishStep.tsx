import { useMemo, useState } from "react";
import { Eye, Globe, Users, User, Instagram, Youtube, Music2, Facebook, Twitter, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StoryDraft } from "@/hooks/useStoryDraft";
import { StoryVisibility, SocialLink, SocialPlatform, storyTypeLabels } from "@/data/communityMockData";
import { toast } from "sonner";

// Helper function to process and clean HTML for preview display
const processContentForPreview = (htmlContent: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  
  // Find all image blocks and process them
  const imageBlocks = doc.querySelectorAll("[data-image-block]");
  imageBlocks.forEach((block) => {
    const img = block.querySelector("img");
    const button = block.querySelector("button");
    const input = block.querySelector("input");
    const caption = img?.getAttribute("data-caption") || "";
    
    // Hide button and input
    if (button) button.style.display = "none";
    if (input) input.style.display = "none";
    
    // Create a wrapper for image and caption
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "0";
    wrapper.style.marginBottom = "1rem";
    
    // Clone the image block without caption input
    const blockClone = block.cloneNode(true) as Element;
    const inputClone = blockClone.querySelector("input");
    const buttonClone = blockClone.querySelector("button");
    if (inputClone) inputClone.remove();
    if (buttonClone) buttonClone.remove();
    
    wrapper.appendChild(blockClone);
    
    // Add caption as a separate block if exists
    if (caption) {
      const captionText = document.createElement("p");
      captionText.className = "text-sm text-muted-foreground italic text-center m-0";
      captionText.textContent = caption;
      
      wrapper.appendChild(captionText);
    }
    
    // Replace original block with wrapper
    block.parentNode?.replaceChild(wrapper, block);
  });
  
  return doc.body.innerHTML;
};

// Helper function to extract image captions from HTML content
const extractImageCaptions = (htmlContent: string): Array<{ caption: string }> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const imageCaptions: Array<{ caption: string }> = [];
  
  const images = doc.querySelectorAll("img[data-caption]");
  images.forEach((img) => {
    const caption = img.getAttribute("data-caption") || "";
    if (caption) {
      imageCaptions.push({ caption });
    }
  });
  
  return imageCaptions;
};

interface PublishStepProps {
  draft: StoryDraft;
  saveDraft: (updates: Partial<StoryDraft>) => void;
  onPublish: () => void;
  onSaveAsDraft: () => void;
  onBack: () => void;
  isEditMode?: boolean;
}

const visibilityOptions: { value: StoryVisibility; label: string; description: string; icon: typeof Globe }[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can see this story",
    icon: Globe,
  },
  {
    value: "unlisted",
    label: "Community Only",
    description: "Only logged-in users can see",
    icon: Users,
  },
  {
    value: "private",
    label: "Profile Only",
    description: "Only visible on your profile",
    icon: User,
  },
];

const socialPlatforms: { value: SocialPlatform; label: string; icon: typeof Instagram; placeholder: string }[] = [
  { value: "instagram", label: "Instagram", icon: Instagram, placeholder: "instagram.com/username" },
  { value: "youtube", label: "YouTube", icon: Youtube, placeholder: "youtube.com/@channel" },
  { value: "tiktok", label: "TikTok", icon: Link2, placeholder: "tiktok.com/@username" },
];

export function PublishStep({
  draft,
  saveDraft,
  onPublish,
  onSaveAsDraft,
  onBack,
  isEditMode = false,
}: PublishStepProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState<SocialPlatform | null>(null);
  const [newSocialUrl, setNewSocialUrl] = useState("");

  const getSocialIcon = (platform: SocialPlatform) => {
    const iconMap: Record<SocialPlatform, typeof Instagram> = {
      instagram: Instagram,
      youtube: Youtube,
      tiktok: Music2,
      facebook: Facebook,
      twitter: Twitter,
    };
    return iconMap[platform] || Link2;
  };

  const [tagInput, setTagInput] = useState("");

  const normalizeTag = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const tags = useMemo(() => draft.tags || [], [draft.tags]);

  const suggestedTags = useMemo(() => {
    const s = new Set<string>();
    if (draft.country) s.add(normalizeTag(draft.country));
    if (draft.city) s.add(normalizeTag(draft.city));
    (draft.storyFocuses || []).forEach((f) => s.add(normalizeTag(f)));
    tags.forEach((t) => s.delete(t));
    return Array.from(s).filter(Boolean).slice(0, 10);
  }, [draft.country, draft.city, draft.storyFocuses, tags]);

  const handleRemoveTag = (tag: string) => {
    saveDraft({ tags: tags.filter((t) => t !== tag) });
  };

  const handleAddTag = (raw: string) => {
    const next = normalizeTag(raw);
    if (!next) return;
    if (tags.includes(next)) return;
    saveDraft({ tags: [...tags, next] });
    setTagInput("");
  };

  const handleVisibilityChange = (visibility: StoryVisibility) => {
    saveDraft({ visibility });
  };

  const handleAddSocialLink = () => {
    if (newSocialPlatform && newSocialUrl.trim()) {
      const normalizedUrl = (() => {
        const value = newSocialUrl.trim();
        if (/^https?:\/\//i.test(value)) return value;
        const noScheme = value.replace(/^\/+/, "");
        const clean = value.replace(/^@/, "");
        switch (newSocialPlatform) {
          case "instagram":
            return /^(www\.)?instagram\.com\//i.test(noScheme)
              ? `https://${noScheme}`
              : `https://instagram.com/${clean}`;
          case "youtube":
            return /^(www\.)?youtube\.com\//i.test(noScheme)
              ? `https://${noScheme}`
              : `https://youtube.com/@${clean}`;
          case "tiktok":
            return /^(www\.)?tiktok\.com\//i.test(noScheme)
              ? `https://${noScheme}`
              : `https://tiktok.com/@${clean}`;
          case "facebook":
            return /^(www\.)?facebook\.com\//i.test(noScheme)
              ? `https://${noScheme}`
              : `https://facebook.com/${clean}`;
          case "twitter":
            return /^(www\.)?(x|twitter)\.com\//i.test(noScheme)
              ? `https://${noScheme}`
              : `https://x.com/${clean}`;
          default:
            return `https://${noScheme || clean}`;
        }
      })();
      const newLinks: SocialLink[] = [
        ...(draft.socialLinks || []),
        { platform: newSocialPlatform, url: normalizedUrl },
      ];
      saveDraft({ socialLinks: newLinks });
      setNewSocialPlatform(null);
      setNewSocialUrl("");
    }
  };

  const handleRemoveSocialLink = (platform: SocialPlatform) => {
    const newLinks = (draft.socialLinks || []).filter((l) => l.platform !== platform);
    saveDraft({ socialLinks: newLinks });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    onPublish();
  };

  const handleSaveDraft = () => {
    onSaveAsDraft();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Header */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Story Card */}
          <Card className="overflow-hidden">
            {/* Cover Image */}
            {draft.coverImage && (
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={draft.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Story Content */}
            <div className="p-6 space-y-4">
              {/* Type Badge */}
              {draft.storyType && (
                <Badge variant="secondary" className="text-xs">
                  {storyTypeLabels[draft.storyType]}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-2xl font-bold text-foreground">{draft.title}</h1>

              {/* Description/Content with Images and Captions */}
              {draft.blocks[0]?.content && (
                <div className="text-sm text-foreground leading-relaxed space-y-6">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: processContentForPreview(draft.blocks[0].content),
                    }}
                    className="space-y-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_img]:w-full [&_img]:rounded-lg [&_img]:m-0"
                  />
                </div>
              )}

              {/* Social Links */}
              {draft.blocks.find((b) => b.type === "social-link" && b.socialLinks?.length)
                ?.socialLinks && (
                <div className="pt-4 border-t border-border">
                  <div className="flex flex-wrap gap-2 pt-3">
                    {draft.blocks
                      .find((b) => b.type === "social-link" && b.socialLinks?.length)
                      ?.socialLinks?.map((link, index) => {
                        const handle = link.url ? link.url.split("/").pop() || link.url : "";
                        const Icon = getSocialIcon(link.platform);
                        return (
                          <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            @{handle}
                          </Badge>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Visibility Section */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Who can see this?</h2>
            <div className="space-y-2">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    onClick={() => handleVisibilityChange(option.value)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      draft.visibility === option.value
                        ? "border-primary bg-white ring-1 ring-primary"
                        : "border-border/50 bg-white hover:border-primary/30"
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          draft.visibility === option.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {draft.visibility === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="fixed bottom-[70px] left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Save as Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex-1"
            size="lg"
          >
            {isPublishing ? (isEditMode ? "Updating..." : "Publishing...") : (isEditMode ? "Update Story" : "Publish Story")}
          </Button>
        </div>
      </div>
    </div>
  );
}
