import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const progressVariants = cva(
  "h-full w-full flex-1",
  {
    variants: {
      variant: {
        default: "bg-primary",
        calm: "bg-amber-500/70",
        success: "bg-stat-green",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface ProgressProps 
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  animate?: boolean;
  animationDelay?: number;
  /** Auto-select variant based on value: 100 = success, otherwise calm */
  autoVariant?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, animate = false, animationDelay = 300, variant, autoVariant = false, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(animate ? 0 : value);

  React.useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setDisplayValue(value);
      }, animationDelay);
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate, animationDelay]);

  // Determine variant based on value if autoVariant is enabled
  const resolvedVariant = autoVariant 
    ? (value === 100 ? "success" : "calm")
    : variant;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          progressVariants({ variant: resolvedVariant }),
          animate ? "transition-transform duration-700 ease-out" : "transition-all"
        )}
        style={{ transform: `translateX(-${100 - (displayValue || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressVariants };
