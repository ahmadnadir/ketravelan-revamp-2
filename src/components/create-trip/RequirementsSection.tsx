import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RequirementsSectionProps {
  expectations: string[];
  onChange: (expectations: string[]) => void;
}

const predefinedExpectations = [
  { label: 'Shared accommodation', emoji: '🏠' },
  { label: 'Some hiking involved', emoji: '🥾' },
  { label: 'Early mornings', emoji: '🌅' },
  { label: 'Able to swim', emoji: '🏊' },
  { label: 'Passport / Visa required', emoji: '🛂' },
  { label: 'Budget-friendly', emoji: '💰' },
  { label: 'Photography-focused', emoji: '📸' },
  { label: 'Vegetarian-friendly', emoji: '🥗' },
];

export function RequirementsSection({
  expectations,
  onChange,
}: RequirementsSectionProps) {
  const [customInput, setCustomInput] = useState('');

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

  const predefinedLabels = predefinedExpectations.map(e => e.label);
  const customExpectations = expectations.filter(
    e => !predefinedLabels.includes(e)
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          What to Expect
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          These help people join confidently — no pressure, just clarity.
        </p>
      </div>

      {/* Predefined chips */}
      <div className="flex flex-wrap gap-2">
        {predefinedExpectations.map((exp) => (
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
