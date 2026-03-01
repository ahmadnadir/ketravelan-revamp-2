import { useState } from 'react';
import { Ban, FileText, CalendarDays, Plus, X } from 'lucide-react';
import { OptionCard } from './OptionCard';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DayPlan {
  day: number;
  activities: string[];
}
interface ItinerarySectionProps {
  itineraryType: 'skip' | 'notes' | 'dayByDay';
  onItineraryTypeChange: (type: 'skip' | 'notes' | 'dayByDay') => void;
  simpleNotes: string;
  onSimpleNotesChange: (notes: string) => void;
  dayByDayPlan: DayPlan[];
  onDayByDayPlanChange: (plan: DayPlan[]) => void;
  startDate: string;
  endDate: string;
}

export function ItinerarySection({
  itineraryType,
  onItineraryTypeChange,
  simpleNotes,
  onSimpleNotesChange,
  dayByDayPlan,
  onDayByDayPlanChange,
  startDate,
  endDate,
}: ItinerarySectionProps) {
  const [newActivity, setNewActivity] = useState<Record<number, string>>({});

  const addDay = () => {
    const nextDay = dayByDayPlan.length + 1;
    onDayByDayPlanChange([...dayByDayPlan, { day: nextDay, activities: [] }]);
  };


  // Only update input value, do not auto-add
  const handleActivityInputChange = (dayIndex: number, value: string) => {
    setNewActivity({ ...newActivity, [dayIndex]: value });
  };

  // Add activity to a specific day
  const addActivity = (dayIndex: number) => {
    const activity = newActivity[dayIndex];
    if (!activity || activity.trim() === '') return;
    const updated = dayByDayPlan.map((d, i) =>
      i === dayIndex ? { ...d, activities: [...d.activities, activity] } : d
    );
    onDayByDayPlanChange(updated);
    setNewActivity({ ...newActivity, [dayIndex]: '' });
  };

  // Remove a day from the plan
  const removeDay = (dayIndex: number) => {
    const updated = dayByDayPlan.filter((_, i) => i !== dayIndex).map((d, i) => ({ ...d, day: i + 1 }));
    onDayByDayPlanChange(updated);
    // Remove newActivity entry for the removed day
    const newActCopy = { ...newActivity };
    delete newActCopy[dayIndex];
    setNewActivity(newActCopy);
  };

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    const updated = dayByDayPlan.map((d, i) =>
      i === dayIndex
        ? { ...d, activities: d.activities.filter((_, ai) => ai !== activityIndex) }
        : d
    );
    onDayByDayPlanChange(updated);
  };

  // Auto-initialize days if dates are set
  const initializeDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const newPlan: DayPlan[] = [];
      for (let i = 1; i <= Math.min(days, 14); i++) {
        newPlan.push({ day: i, activities: [] });
      }
      onDayByDayPlanChange(newPlan);
    } else {
      onDayByDayPlanChange([{ day: 1, activities: [] }, { day: 2, activities: [] }]);
    }
  };

  return (
    <div className="space-y-3">
      <OptionCard
        icon={<Ban className="h-5 w-5" />}
        title="Skip for now"
        description="Plan the itinerary later with your group"
        selected={itineraryType === 'skip'}
        onClick={() => onItineraryTypeChange('skip')}
      />

      <OptionCard
        icon={<FileText className="h-5 w-5" />}
        title="Simple notes"
        description="Add a rough outline or key highlights"
        selected={itineraryType === 'notes'}
        onClick={() => onItineraryTypeChange('notes')}
        
      >
        <Textarea
          value={simpleNotes}
          onChange={(e) => onSimpleNotesChange(e.target.value)}
          placeholder="Day 1: Arrive in Bangkok, check-in, night market&#10;Day 2: Temple tour, street food crawl&#10;Day 3: Day trip to Ayutthaya..."
          className="rounded-xl min-h-[120px] text-sm"
        />
      </OptionCard>

      <OptionCard
        icon={<CalendarDays className="h-5 w-5" />}
        title="Day-by-day plan"
        description="Detailed itinerary with activities per day"
        selected={itineraryType === 'dayByDay'}
        onClick={() => {
          onItineraryTypeChange('dayByDay');
          if (dayByDayPlan.length === 0) {
            initializeDays();
          }
        }}
      >
        <div className="space-y-4">
          {dayByDayPlan.map((day, dayIndex) => (
            <Card key={day.day} className="p-3 border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">
                  Day {day.day}
                </span>
                <button
                  type="button"
                  onClick={() => removeDay(dayIndex)}
                  className="p-1 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {day.activities.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {day.activities.map((activity, actIndex) => (
                    <li
                      key={actIndex}
                      className="flex items-center gap-2 text-sm text-foreground pl-2 py-1 bg-secondary/50 rounded-lg group"
                    >
                      <span className="flex-1">{activity}</span>
                      <button
                        type="button"
                        onClick={() => removeActivity(dayIndex, actIndex)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Input
                  value={newActivity[dayIndex] || ''}
                  onChange={(e) => handleActivityInputChange(dayIndex, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addActivity(dayIndex);
                    }
                  }}
                  onBlur={() => {
                    // Commit any pending activity when leaving the input
                    if ((newActivity[dayIndex] || '').trim()) {
                      addActivity(dayIndex);
                    }
                  }}
                  placeholder="Add activity..."
                  className="rounded-lg text-sm flex-1 h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addActivity(dayIndex)}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {dayByDayPlan.length < 14 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDay}
              className="w-full gap-2 rounded-xl border-dashed"
            >
              <Plus className="h-4 w-4" />
              Add Day {dayByDayPlan.length + 1}
            </Button>
          )}
        </div>
      </OptionCard>
    </div>
  );
}
