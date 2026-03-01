import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import {
  TripItinerary as TripItineraryType,
  DayPlan,
  getItineraryByTripId,
  saveItinerary,
  createEmptyItinerary,
  dayPlansToSimpleNotes,
  simpleNotesToDayPlans,
} from "@/lib/tripItinerary";

interface TripItineraryProps {
  tripId: string;
}

export function TripItinerary({ tripId }: TripItineraryProps) {
  const [itinerary, setItinerary] = useState<TripItineraryType | null>(null);
  const [newActivity, setNewActivity] = useState<Record<number, string>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load itinerary on mount
  useEffect(() => {
    const stored = getItineraryByTripId(tripId);
    if (stored) {
      setItinerary(stored);
    } else {
      const newItinerary = createEmptyItinerary(tripId);
      setItinerary(newItinerary);
      saveItinerary(newItinerary);
    }
  }, [tripId]);

  // Auto-save with debounce
  const autoSave = useCallback((updated: TripItineraryType) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveItinerary(updated);
    }, 500);
  }, []);

  const updateItinerary = useCallback((updates: Partial<TripItineraryType>) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates, updatedAt: Date.now() };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  const handleViewModeChange = (mode: string) => {
    if (!itinerary) return;
    
    const newMode = mode as "dayByDay" | "simpleNotes";
    
    // Sync data between views when switching
    if (newMode === "simpleNotes" && itinerary.viewMode === "dayByDay") {
      // Convert day plans to simple notes
      const notes = dayPlansToSimpleNotes(itinerary.dayPlans);
      updateItinerary({ viewMode: newMode, simpleNotes: notes });
    } else if (newMode === "dayByDay" && itinerary.viewMode === "simpleNotes") {
      // Convert simple notes to day plans
      const plans = simpleNotesToDayPlans(itinerary.simpleNotes);
      updateItinerary({ viewMode: newMode, dayPlans: plans });
    } else {
      updateItinerary({ viewMode: newMode });
    }
  };

  const addDay = () => {
    if (!itinerary) return;
    const nextDay = Math.max(...itinerary.dayPlans.map((d) => d.day), 0) + 1;
    updateItinerary({
      dayPlans: [...itinerary.dayPlans, { day: nextDay, activities: [] }],
    });
  };

  const removeDay = (dayIndex: number) => {
    if (!itinerary) return;
    const updated = itinerary.dayPlans.filter((_, i) => i !== dayIndex);
    updateItinerary({ dayPlans: updated.length > 0 ? updated : [{ day: 1, activities: [] }] });
  };

  const addActivity = (dayIndex: number) => {
    if (!itinerary) return;
    const activity = newActivity[dayIndex]?.trim();
    if (!activity) return;

    const updated = itinerary.dayPlans.map((day, i) => {
      if (i === dayIndex) {
        return { ...day, activities: [...day.activities, activity] };
      }
      return day;
    });
    
    updateItinerary({ dayPlans: updated });
    setNewActivity((prev) => ({ ...prev, [dayIndex]: "" }));
  };

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    if (!itinerary) return;
    const updated = itinerary.dayPlans.map((day, i) => {
      if (i === dayIndex) {
        return {
          ...day,
          activities: day.activities.filter((_, j) => j !== activityIndex),
        };
      }
      return day;
    });
    updateItinerary({ dayPlans: updated });
  };

  const handleSimpleNotesChange = (notes: string) => {
    updateItinerary({ simpleNotes: notes });
  };

  if (!itinerary) return null;

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 space-y-4">
      {/* View Mode Toggle */}
      <SegmentedControl
        options={[
          { label: "Day by Day", value: "dayByDay" },
          { label: "Simple Notes", value: "simpleNotes" },
        ]}
        value={itinerary.viewMode}
        onChange={handleViewModeChange}
      />

      {/* Day by Day View */}
      {itinerary.viewMode === "dayByDay" && (
        <div className="space-y-4">
          {itinerary.dayPlans.map((day, dayIndex) => (
            <Card key={day.day} className="p-4 border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <h3 className="font-semibold text-foreground">Day {day.day}</h3>
                </div>
                {itinerary.dayPlans.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDay(dayIndex)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Activities List */}
              <div className="space-y-2 mb-3">
                {day.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No activities yet
                  </p>
                ) : (
                  day.activities.map((activity, actIndex) => (
                    <div
                      key={actIndex}
                      className="flex items-center gap-2 py-1.5 px-2 bg-accent/30 rounded-lg group"
                    >
                      <span className="flex-1 text-sm text-foreground">{activity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActivity(dayIndex, actIndex)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Activity Input */}
              <div className="flex gap-2">
                <Input
                  value={newActivity[dayIndex] || ""}
                  onChange={(e) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      [dayIndex]: e.target.value,
                    }))
                  }
                  placeholder="Add activity..."
                  className="flex-1 h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addActivity(dayIndex);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => addActivity(dayIndex)}
                  className="h-9 px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={addDay}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Day
          </Button>
        </div>
      )}

      {/* Simple Notes View */}
      {itinerary.viewMode === "simpleNotes" && (
        <Card className="p-4 border-border/50">
          <Textarea
            value={itinerary.simpleNotes}
            onChange={(e) => handleSimpleNotesChange(e.target.value)}
            placeholder="Day 1: Arrive, check-in, explore the area...&#10;&#10;Day 2: Morning hike, afternoon beach..."
            className="min-h-[300px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-base leading-relaxed"
          />
        </Card>
      )}
    </div>
  );
}
