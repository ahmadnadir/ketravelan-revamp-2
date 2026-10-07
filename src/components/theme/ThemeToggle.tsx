import { useTheme } from "next-themes";
import { Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground">
      <Moon className="h-5 w-5 flex-none text-muted-foreground" aria-hidden="true" />
      <span className="flex-1">Dark mode</span>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Dark mode"
      />
    </div>
  );
}