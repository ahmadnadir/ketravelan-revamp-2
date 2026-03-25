import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaLayoutProps {
  children: ReactNode;
  className?: string;
}

export function SafeAreaLayout({
  children,
  className,
}: SafeAreaLayoutProps) {
  return (
    <div className={cn("safe-area-layout", className)}>
      {children}
    </div>
  );
}
