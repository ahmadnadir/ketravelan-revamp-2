import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StoryBlock, blockTypeConfig } from "@/data/communityMockData";
import { uploadImageFromDataUrl } from "@/lib/imageStorage";
import { toast } from "@/hooks/use-toast";

interface ImageBlockProps {
  block: StoryBlock;
  onUpdate: (updates: Partial<StoryBlock>) => void;
  onRemove: () => void;
}

export function ImageBlock({ block, onUpdate }: ImageBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target?.result as string;
        const uploadedUrl = await uploadImageFromDataUrl(base64Data, {
          folder: "stories/images",
        });
        onUpdate({ imageUrl: uploadedUrl });
      } catch (error) {
        console.error("Failed to upload story image:", error);
        toast({
          title: "Upload failed",
          description: "Could not upload image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Could not read image file.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      {block.imageUrl ? (
        <div className="relative group">
          <div className="aspect-[4/3] rounded-lg overflow-hidden">
            <img
              src={block.imageUrl}
              alt="Block image"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => !isUploading && inputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <span className="text-white text-sm font-medium">Change Image</span>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={() => !isUploading && inputRef.current?.click()}
          disabled={isUploading}
          className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isUploading ? "Uploading image..." : "Upload image"}
          </span>
        </button>
      )}
      
      <Input
        value={block.caption || ""}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder={blockTypeConfig.image.placeholder}
        className="text-sm"
      />
    </div>
  );
}
