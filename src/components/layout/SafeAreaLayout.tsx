import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaLayoutProps {
  children: ReactNode;
  className?: string;
  /**
   * Optional override for the top safe-area background color.
   * Defaults to white to match the app header.
   */
  topBackground?: string;
  /**
   * Optional override for the bottom safe-area background color.
   * Defaults to white to match the bottom nav container.
   */
  bottomBackground?: string;
}

export function SafeAreaLayout({
  children,
  className,
  topBackground = "#ffffff",
  bottomBackground = "#ffffff",
}: SafeAreaLayoutProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--safe-top-bg", topBackground);
    root.style.setProperty("--safe-bottom-bg", bottomBackground);

    return () => {
      root.style.removeProperty("--safe-top-bg");
      root.style.removeProperty("--safe-bottom-bg");
    };
  }, [topBackground, bottomBackground]);

  return (
    <div className={cn("safe-area-layout", className)}>
      {children}
    </div>
  );
}
