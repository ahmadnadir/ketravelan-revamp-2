import { WifiOff, RefreshCw } from "lucide-react";
import { useNetwork } from "@/contexts/NetworkStatusContext";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OfflineScreenProps {
  /** Retry callback — defaults to refetching all active queries */
  onRetry?: () => void | Promise<void>;
  /** Show as a card/inline block instead of a full-screen overlay */
  inline?: boolean;
  className?: string;
}

/**
 * Full-screen (or inline) friendly empty state shown when the network is
 * unavailable and there is no cached data to display.
 *
 * Usage:
 *   if (!isOnline && !data) return <OfflineScreen />;
 *   if (!isOnline && !data) return <OfflineScreen inline />;
 */
export function OfflineScreen({ onRetry, inline = false, className }: OfflineScreenProps) {
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        await queryClient.refetchQueries({ type: "active" });
      }
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-6 px-8 text-center">
      {/* Icon */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
          <WifiOff className="h-11 w-11 text-gray-400" strokeWidth={1.5} />
        </div>
        {/* pulse ring */}
        <div className="absolute inset-0 rounded-full bg-gray-200 animate-ping opacity-30" />
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
          No Internet Connection
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
          Check your Wi-Fi or mobile data and try again.
          {isOnline ? " Your connection looks restored!" : ""}
        </p>
      </div>

      {/* Retry */}
      <button
        onClick={handleRetry}
        disabled={retrying}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold",
          "bg-gray-900 text-white active:scale-95 transition-all duration-150",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "shadow-sm hover:bg-gray-800"
        )}
      >
        <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
        {retrying ? "Retrying…" : "Try Again"}
      </button>
    </div>
  );

  if (inline) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-white",
        className
      )}
    >
      {content}
    </div>
  );
}
