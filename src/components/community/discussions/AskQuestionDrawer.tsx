import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { createDiscussion } from "@/lib/community";
import { DiscussionTopic, discussionTopicLabels } from "@/data/communityMockData";
import { cn } from "@/lib/utils";
import { CountrySelect } from "@/components/ui/country-select";
import { toast } from "@/hooks/use-toast";

interface AskQuestionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const topics: DiscussionTopic[] = [
  "general",
  "budget",
  "transport",
  "visa",
  "safety",
  "food",
  "accommodation",
];

export function AskQuestionDrawer({ open, onOpenChange, onCreated }: AskQuestionDrawerProps) {
  const { isAuthenticated, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preload user's country using device location (native + web)
  useEffect(() => {
    if (open && !location) {
      import("@/lib/geolocation").then(({ getCurrentCoords, getCountryFromCoords }) => {
        getCurrentCoords()
          .then(coords => getCountryFromCoords(coords))
          .then(country => { if (country) setLocation(country); })
          .catch(() => fallbackToLocaleDetection());
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fallback: detect country from browser locale
  const fallbackToLocaleDetection = () => {
    try {
      const locale = navigator.language.toLowerCase();
      let detectedCountry = "";
      
      if (locale.includes("my") || locale.startsWith("ms")) {
        detectedCountry = "Malaysia";
      } else if (locale.startsWith("id")) {
        detectedCountry = "Indonesia";
      } else if (locale === "en-us" || locale.startsWith("en-us")) {
        detectedCountry = "United States";
      } else if (locale.startsWith("sg")) {
        detectedCountry = "Singapore";
      } else if (locale.startsWith("th")) {
        detectedCountry = "Thailand";
      } else if (locale.startsWith("ph")) {
        detectedCountry = "Philippines";
      } else if (locale.startsWith("vn")) {
        detectedCountry = "Vietnam";
      }
      
      if (detectedCountry) {
        setLocation(detectedCountry);
      }
    } catch (error) {
      console.error("Error detecting country from locale:", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Question required",
        description: "Please enter your question.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTopic) {
      toast({
        title: "Topic required",
        description: "Please select a topic for your discussion.",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to post a discussion.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createDiscussion({
        title: title.trim(),
        body: details.trim() || null,
        category: selectedTopic,
        locationCountry: location || null,
      });
      onCreated?.();
      toast({
        title: "Question posted!",
        description: "The community will help you out soon.",
      });

      // Reset form
      setTitle("");
      setDetails("");
      setLocation("");
      setSelectedTopic(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Ask the Community</DrawerTitle>
          <DrawerDescription>
            No such thing as a silly question  the community's here to help.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4 overflow-y-auto">
          {/* Question title */}
          <div className="space-y-2">
            <Label htmlFor="question-title">Your question *</Label>
            <Input
              id="question-title"
              placeholder="e.g., Best way to get from KLIA to Langkawi?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label htmlFor="question-details">More details (optional)</Label>
            <Textarea
              id="question-details"
              placeholder="Add any context that might help others answer your question..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <CountrySelect
              value={location}
              onValueChange={setLocation}
              placeholder="Select a country"
            />
          </div>

          {/* Topic selection */}
          <div className="space-y-2">
            <Label>Topic</Label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    selectedTopic === topic
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {discussionTopicLabels[topic]}
                </button>
              ))}
            </div>
          </div>

          {/* Post anonymously */}
          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-base">Post anonymously</Label>
              <p className="text-sm text-muted-foreground mt-1">Your name won't be shown with this question</p>
            </div>
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                isAnonymous ? "bg-primary" : "bg-secondary"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground">
              Sign in to post your question.
            </p>
          )}
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit} className="w-full rounded-full" disabled={isSubmitting} size="lg">
            {isSubmitting ? "Posting..." : "Post Question"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
