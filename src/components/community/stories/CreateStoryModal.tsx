import { useMemo, useRef, useState } from "react";
import { Image, MapPin, Link2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoryType, storyTypeLabels, countries } from "@/data/communityMockData";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const storyTypes: StoryType[] = [
  "trip-recap",
  "guide",
  "review",
  "tips",
  "itinerary",
  "budget",
  "other",
];

export function CreateStoryModal({ open, onOpenChange }: CreateStoryModalProps) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [location, setLocation] = useState("Malaysia");
  const [city, setCity] = useState("");
  const [selectedType, setSelectedType] = useState<StoryType | null>(null);
  const [tripLink, setTripLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: "Please select an image under 5MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    return Boolean(
      title.trim() ||
      excerpt.trim() ||
      content.trim() ||
      coverImage ||
      city.trim() ||
      tripLink.trim() ||
      selectedType ||
      location !== "Malaysia"
    );
  }, [title, excerpt, content, coverImage, city, tripLink, selectedType, location]);

  const resetForm = () => {
    setTitle("");
    setExcerpt("");
    setContent("");
    setCoverImage(null);
    setSelectedType(null);
    setCity("");
    setTripLink("");
    setLocation("Malaysia");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your story.",
        variant: "destructive",
      });
      return;
    }

    if (!excerpt.trim()) {
      toast({
        title: "Summary required",
        description: "Please write a brief summary of your story.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Story content required",
        description: "Please write your story content.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedType) {
      toast({
        title: "Story type required",
        description: "Please select a story type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Story published! 🎉",
      description: "Your travel story is now live for the community to read.",
    });

    // Reset form
    resetForm();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (hasUnsavedChanges) {
      setShowExitModal(true);
      return;
    }

    onOpenChange(false);
  };

  const handleSaveDraftExit = () => {
    setShowExitModal(false);
    onOpenChange(false);
  };

  const handleDiscardExit = () => {
    resetForm();
    setShowExitModal(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pt-[env(safe-area-inset-top)]">
          <DialogTitle>Share Your Story</DialogTitle>
          <DialogDescription>
            Inspire fellow travelers with your experiences, tips, and lessons learned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {coverImage ? (
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-secondary">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Image className="h-8 w-8" />
                <span className="text-sm font-medium">Add a cover image</span>
                <span className="text-xs">Recommended: 1200x675px</span>
              </button>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="story-title">Title *</Label>
            <Input
              id="story-title"
              placeholder="e.g., How I Spent RM2,500 on 3 Weeks in Vietnam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>

          {/* Excerpt / Summary */}
          <div className="space-y-2">
            <Label htmlFor="story-excerpt">Summary *</Label>
            <Textarea
              id="story-excerpt"
              placeholder="Write a brief summary that will appear on the story card..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {excerpt.length}/200
            </p>
          </div>

          {/* Story Content */}
          <div className="space-y-2">
            <Label htmlFor="story-content">Your Story *</Label>
            <Textarea
              id="story-content"
              placeholder="Share your experience in detail. What happened? What did you learn? What advice would you give others?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Include specific details, costs, and practical tips to help other travelers.
            </p>
          </div>

          {/* Story Type */}
          <div className="space-y-2">
            <Label>Story Type *</Label>
            <div className="flex flex-wrap gap-2">
              {storyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type === selectedType ? null : type)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    selectedType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {storyTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.name} value={country.name}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="story-city">City (optional)</Label>
              <Input
                id="story-city"
                placeholder="e.g., Hanoi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Trip Link (optional) */}
          <div className="space-y-2">
            <Label htmlFor="trip-link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link to Trip (optional)
            </Label>
            <Input
              id="trip-link"
              placeholder="Paste a link to your Ketravelan trip..."
              value={tripLink}
              onChange={(e) => setTripLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Connect this story to one of your published trips.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Publishing..." : "Publish Story"}
          </Button>
        </div>
        </DialogContent>
      </Dialog>
      <Drawer open={showExitModal} onOpenChange={setShowExitModal}>
        <DrawerContent className="pt-[env(safe-area-inset-top)]">
          <DrawerHeader className="text-center">
            <DrawerTitle>Leave story creation?</DrawerTitle>
            <DrawerDescription>
              Your progress can be saved as a draft, or you can discard this story.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="gap-3 pb-8">
            <Button onClick={handleSaveDraftExit} className="rounded-xl h-12">
              Save as Draft
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardExit}
              className="rounded-xl h-12"
            >
              Discard Story
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowExitModal(false)}
              className="rounded-xl h-12"
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
