import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  selected: boolean;
  onClick: () => void;
  recommended?: boolean;
  children?: ReactNode;
  iconSize?: 'sm' | 'md';
}

export function OptionCard({
  icon,
  title,
  description,
  selected,
  onClick,
  recommended,
  children,
  iconSize = 'sm',
}: OptionCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all border",
        "hover:border-primary/50 hover:shadow-md active:scale-[0.98]",
        selected ? "border-primary/50" : "border-border/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-xl shrink-0 bg-secondary text-muted-foreground",
            iconSize === 'md' ? "p-3" : "p-2"
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-medium text-foreground",
              iconSize === 'md' ? "font-semibold" : "text-sm"
            )}>{title}</h4>
            {recommended && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                Recommended
              </span>
            )}
          </div>
          {typeof description === 'string' ? (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          ) : (
            <div className="mt-1">{description}</div>
          )}
        </div>
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
            selected
              ? "border-primary bg-primary scale-100"
              : "border-muted-foreground/30 scale-100"
          )}
        >
          {selected && <Check className="h-3 w-3 text-primary-foreground animate-scale-in" />}
        </div>
      </div>
      
      {selected && children && (
        <div className="mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </Card>
  );
}
