import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RequirementsSectionProps {
  expectations: string[];
  onChange: (expectations: string[]) => void;
}

const predefinedExpectationGroups = [
  {
    title: 'Budget & Spending',
    icon: '💸',
    options: [
      { label: 'Budget-focused trip', emoji: '💰' },
      { label: 'Shared expenses throughout', emoji: '🤝' },
      { label: 'Pay upfront for some bookings', emoji: '💳' },
      { label: 'Reimbursements via expense tracking', emoji: '📊' },
      { label: 'Eat local, not fancy', emoji: '🍜' },
    ],
  },
  {
    title: 'Trip Style & Pace',
    icon: '🧭',
    options: [
      { label: 'Moderate walking involved', emoji: '🚶' },
      { label: 'Physically active days', emoji: '💪' },
      { label: 'Early starts on some days', emoji: '🌅' },
      { label: 'Flexible itinerary', emoji: '🔀' },
      { label: 'Weather-dependent activities', emoji: '🌤️' },
    ],
  },
  {
    title: 'Logistics & Responsibility',
    icon: '🛂',
    options: [
      { label: 'Passport required', emoji: '🛂' },
      { label: 'Visa may be required', emoji: '📋' },
      { label: 'Travel insurance recommended', emoji: '🛡️' },
      { label: 'Self-responsible for documents', emoji: '📄' },
      { label: 'Flights booked individually', emoji: '✈️' },
    ],
  },
  {
    title: 'Stay & Comfort',
    icon: '🏠',
    options: [
      { label: 'Shared accommodation', emoji: '🏠' },
      { label: 'Budget stays', emoji: '🛏️' },
      { label: 'Basic amenities', emoji: '🧼' },
      { label: 'Limited luggage space', emoji: '🎒' },
    ],
  },
  {
    title: 'Group Dynamics',
    icon: '🤝',
    options: [
      { label: 'Small group travel', emoji: '👥' },
      { label: 'Open to meeting new people', emoji: '🧑‍🤝‍🧑' },
      { label: 'Group decisions & voting', emoji: '🗳️' },
      { label: 'Respect personal space', emoji: '🧘' },
      { label: 'Chill / non-party vibes', emoji: '😌' },
    ],
  },
  {
    title: 'Preferences (optional)',
    icon: '🌿',
    options: [
      { label: 'Able to swim', emoji: '🏊' },
      { label: 'Some hiking involved', emoji: '🥾' },
      { label: 'Photography-focused', emoji: '📸' },
      { label: 'Vegetarian-friendly', emoji: '🥗' },
    ],
  },
];

export function RequirementsSection({
  expectations,
  onChange,
}: RequirementsSectionProps) {
  const [customInput, setCustomInput] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const toggleExpectation = (exp: string) => {
    if (expectations.includes(exp)) {
      onChange(expectations.filter(e => e !== exp));
    } else if (expectations.length < 12) {
      onChange([...expectations, exp]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !expectations.includes(trimmed) && expectations.length < 12) {
      onChange([...expectations, trimmed]);
      setCustomInput('');
    }
  };

  const predefinedLabels = predefinedExpectationGroups.flatMap((group) =>
    group.options.map((option) => option.label)
  );
  const customExpectations = expectations.filter(
    e => !predefinedLabels.includes(e)
  );
  const primaryGroup = predefinedExpectationGroups[0];
  const additionalGroups = predefinedExpectationGroups.slice(1);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          What to Expect
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          These help people join confidently  no pressure, just clarity.
        </p>
      </div>

      {/* Predefined chips by category */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>{primaryGroup.icon}</span>
            <span>{primaryGroup.title}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryGroup.options.map((exp) => (
              <button
                key={exp.label}
                type="button"
                onClick={() => toggleExpectation(exp.label)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border transition-all active:scale-95",
                  expectations.includes(exp.label)
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "bg-white border-border text-muted-foreground hover:bg-foreground hover:text-background"
                )}
              >
                {exp.emoji} {exp.label}
              </button>
            ))}
          </div>
        </div>

        {additionalGroups.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMoreOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showMoreOptions ? 'Show fewer options' : 'Show more options'}
          </button>
        )}

        {showMoreOptions && additionalGroups.map((group) => (
          <div key={group.title} className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>{group.icon}</span>
              <span>{group.title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.map((exp) => (
                <button
                  key={exp.label}
                  type="button"
                  onClick={() => toggleExpectation(exp.label)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-all active:scale-95",
                    expectations.includes(exp.label)
                      ? "bg-foreground text-background border-foreground font-medium"
                      : "bg-white border-border text-muted-foreground hover:bg-foreground hover:text-background"
                  )}
                >
                  {exp.emoji} {exp.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom expectations */}
      {customExpectations.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          {customExpectations.map((exp) => (
            <div
              key={exp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background border border-foreground text-sm rounded-full font-medium"
            >
              <span>{exp}</span>
              <button
                type="button"
                onClick={() => toggleExpectation(exp)}
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom */}
      {expectations.length < 12 && (
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add custom requirement"
            className="rounded-xl text-sm flex-1"
            maxLength={30}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim() || expectations.length >= 12}
            className="p-2.5 bg-secondary rounded-xl hover:bg-secondary/80 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {expectations.length}/12 selected • Max 30 characters per item
      </p>
    </div>
  );
}
