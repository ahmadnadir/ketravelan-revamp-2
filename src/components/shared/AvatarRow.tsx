import { cn } from "@/lib/utils";

interface AvatarRowProps {
  avatars: { id: string; name: string; imageUrl?: string }[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function AvatarRow({
  avatars,
  max = 4,
  size = "md",
  className,
}: AvatarRowProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((avatar) => (
        <div
          key={avatar.id}
          className={cn(
            "rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden",
            sizeStyles[size]
          )}
        >
          {avatar.imageUrl ? (
            <img
              src={avatar.imageUrl}
              alt={avatar.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-medium text-muted-foreground">
              {avatar.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full border-2 border-card bg-primary flex items-center justify-center",
            sizeStyles[size]
          )}
        >
          <span className="font-medium text-primary-foreground">
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
}