import { useMemo, useState, useEffect } from "react";
import { MapPin, ChevronRight, Loader2, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountrySelect } from "@/components/ui/country-select";
import { StoryDraft } from "@/hooks/useStoryDraft";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserTrips } from "@/lib/myTrips";
import {
  storyTitleExamples,
  storyFocusOptions,
  StoryFocus,
} from "@/data/communityMockData";
import { travelStyles } from "@/data/travelStyles";

interface StorySetupStepProps {
  draft: StoryDraft;
  onComplete: (data: Partial<StoryDraft>) => void;
}

interface UserTrip {
  id: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
}

export function StorySetupStep({ draft, onComplete }: StorySetupStepProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(draft.title);
  const [storyFocuses, setStoryFocuses] = useState<StoryFocus[]>(draft.storyFocuses || []);
  const [travelStyleIds, setTravelStyleIds] = useState<string[]>(draft.travelStyleIds || []);
  const [country, setCountry] = useState(draft.country);
  const [city, setCity] = useState(draft.city);
  const [linkedTripId, setLinkedTripId] = useState<string | null>(draft.linkedTripId);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [tags, setTags] = useState<string[]>(draft.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [userTrips, setUserTrips] = useState<UserTrip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [wantLinkTrip, setWantLinkTrip] = useState<boolean | null>(
    draft.linkedTripId ? true : null
  );

  // Fetch user's past trips
  useEffect(() => {
    if (!user?.id) return;
    
    const loadTrips = async () => {
      setIsLoadingTrips(true);
      try {
        const trips = await fetchUserTrips(user.id);
        const mappedTrips = trips.map((trip) => ({
          id: trip.id,
          title: trip.title,
          destination: trip.destination || "Unknown",
          startDate: trip.start_date,
          endDate: trip.end_date,
        }));
        setUserTrips(mappedTrips);
      } catch (error) {
        console.error("Failed to load trips:", error);
      } finally {
        setIsLoadingTrips(false);
      }
    };

    loadTrips();
  }, [user?.id]);

  const loadTripsImmediately = async () => {
    if (!user?.id || userTrips.length > 0) return;
    
    setIsLoadingTrips(true);
    try {
      const trips = await fetchUserTrips(user.id);
      const mappedTrips = trips.map((trip) => ({
        id: trip.id,
        title: trip.title,
        destination: trip.destination || "Unknown",
        startDate: trip.start_date,
        endDate: trip.end_date,
      }));
      setUserTrips(mappedTrips);
    } catch (error) {
      console.error("Failed to load trips:", error);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % storyTitleExamples.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLinkTrip = (tripId: string) => {
    if (tripId === linkedTripId) {
      setLinkedTripId(null);
    } else {
      setLinkedTripId(tripId);
      // Auto-fill destination from trip
      const trip = userTrips.find((t) => t.id === tripId);
      if (trip) {
        // Extract country from "Place, Country" format
        const destinationParts = trip.destination.split(',').map(p => p.trim());
        if (destinationParts.length >= 2) {
          // Last part is country
          const countryName = destinationParts[destinationParts.length - 1];
          setCountry(countryName);
          // City is first part
          setCity(destinationParts[0]);
        } else {
          // If no comma, treat whole string as country
          setCountry(trip.destination);
        }
      }
    }
  };

  const normalizedTitle = title.trim();
  const isValid = normalizedTitle && country;

  const toggleFocus = (focus: StoryFocus) => {
    setStoryFocuses((prev) =>
      prev.includes(focus) ? prev.filter((f) => f !== focus) : [...prev, focus]
    );
  };

  const normalizeTag = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const addTag = (raw: string) => {
    const next = normalizeTag(raw);
    if (!next) return;
    setTags((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const suggestedTags = useMemo(() => {
    const suggestions = new Set<string>();

    // Location
    if (country) suggestions.add(normalizeTag(country));
    if (city) suggestions.add(normalizeTag(city));

    // Focuses
    storyFocuses.forEach((focus) => suggestions.add(normalizeTag(focus)));

    // Title keywords (lightweight)
    normalizedTitle
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length >= 5)
      .slice(0, 8)
      .forEach((w) => suggestions.add(normalizeTag(w)));

    // Remove already-selected tags
    tags.forEach((t) => suggestions.delete(t));

    return Array.from(suggestions).filter(Boolean).slice(0, 10);
  }, [country, city, normalizedTitle, storyFocuses, tags]);

  const handleContinue = () => {
    if (isValid) {
      onComplete({
        title: normalizedTitle,
        storyType: null,
        storyFocuses,
        travelStyleIds,
        country,
        city,
        linkedTripId,
        tags,
      });
    }
  };

  return (
    <div className="p-4 space-y-6 pb-40">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Story Setup</h2>
        <p className="text-sm text-muted-foreground">
          First, tell us a bit about what you're sharing
        </p>
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Story Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={storyTitleExamples[placeholderIndex]}
          className="text-base h-12"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground text-right">
          {title.length}/100
        </p>
      </div>

      {/* Story Type */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Story Type</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose one or more (optional)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {storyFocusOptions.map((option) => {
            const selected = storyFocuses.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleFocus(option.value)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  selected
                    ? "bg-foreground text-background"
                    : "border border-border bg-background text-foreground hover:border-foreground/50"
                }`}
              >
                {selected && <Check className="h-4 w-4" />}
                <span>{option.emoji}</span>
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-foreground/50 hover:text-foreground transition-colors"
          >
            + Add custom
          </button>
        </div>
      </div>

      {/* Travel Style */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Travel Style</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick the styles that match this story or add your own (optional)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {travelStyles.map((style) => {
            const selected = travelStyleIds.includes(style.id);
            return (
              <button
                key={style.id}
                type="button"
                onClick={() =>
                  setTravelStyleIds((prev) =>
                    prev.includes(style.id)
                      ? prev.filter((id) => id !== style.id)
                      : [...prev, style.id]
                  )
                }
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  selected
                    ? "bg-foreground text-background"
                    : "border border-border bg-background text-foreground hover:border-foreground/50"
                }`}
              >
                {selected && <Check className="h-4 w-4" />}
                <span>{style.emoji}</span>
                {style.label}
              </button>
            );
          })}
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-foreground/50 hover:text-foreground transition-colors"
          >
            + Add custom
          </button>
        </div>
      </div>

      {/* Destination */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Where did this happen? <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <CountrySelect
            value={country}
            onValueChange={setCountry}
            placeholder="Country"
          />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
          />
        </div>
      </div>

      {/* Link to Trip */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Do you want to link this story to a trip?
        </Label>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => {
              setWantLinkTrip(true);
              if (isLoadingTrips === false && userTrips.length === 0) {
                loadTripsImmediately();
              }
            }}
            variant={wantLinkTrip === true ? "default" : "outline"}
            className="flex-1 h-12 text-base font-medium"
          >
            Yes
          </Button>
          <Button
            type="button"
            onClick={() => {
              setWantLinkTrip(false);
              setLinkedTripId(null);
            }}
            variant={wantLinkTrip === false ? "default" : "outline"}
            className="flex-1 h-12 text-base font-medium"
          >
            No
          </Button>
        </div>

        {/* Trip Selection - Show only if Yes is selected */}
        {wantLinkTrip === true && (
          <div className="mt-4 space-y-4">
            {isLoadingTrips ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Loading your trips...</span>
              </div>
            ) : userTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">You don't have any trips yet.</p>
                <p className="text-xs mt-1">Create a trip first to link it to your story.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const now = new Date();
                  const upcomingTrips = userTrips.filter((trip) => {
                    if (!trip.startDate) return false;
                    return new Date(trip.startDate) > now;
                  });
                  const pastTrips = userTrips.filter((trip) => {
                    if (!trip.startDate) return false;
                    return new Date(trip.startDate) <= now;
                  });

                  return (
                    <>
                      {/* Upcoming trips */}
                      {upcomingTrips.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Upcoming Trips
                          </p>
                          <div className="space-y-2">
                            {upcomingTrips.map((trip) => (
                              <Card
                                key={trip.id}
                                onClick={() => handleLinkTrip(trip.id)}
                                className={`p-3 cursor-pointer transition-all ${
                                  linkedTripId === trip.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-foreground">
                                      {trip.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {trip.destination}
                                    </p>
                                  </div>
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      linkedTripId === trip.id
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {linkedTripId === trip.id && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Past trips */}
                      {pastTrips.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Past Trips
                          </p>
                          <div className="space-y-2">
                            {pastTrips.map((trip) => (
                              <Card
                                key={trip.id}
                                onClick={() => handleLinkTrip(trip.id)}
                                className={`p-3 cursor-pointer transition-all ${
                                  linkedTripId === trip.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-foreground">
                                      {trip.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {trip.destination}
                                    </p>
                                  </div>
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      linkedTripId === trip.id
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {linkedTripId === trip.id && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue Button - Fixed at bottom */}
      <div className="fixed bottom-above-nav left-0 right-0 p-4 bg-background border-t border-border/50">
        <div className="container max-w-3xl mx-auto">
          <Button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full gap-2"
            size="lg"
          >
            Continue to Story Builder
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
