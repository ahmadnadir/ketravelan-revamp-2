import { useNetwork } from "@/contexts/NetworkStatusContext";
import { Wifi, WifiOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Thin global banner that slides down when the device goes offline or
 * briefly shows a "Back online" confirmation after reconnecting.
 * Mount it once at the root level so it appears on every page.
 */
export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetwork();

  const visible = !isOnline || wasOffline;
  if (!visible) return null;

  const isRestored = isOnline && wasOffline;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
        "transition-all duration-300 ease-in-out",
        "safe-top-offset", // respect iOS notch / safe area
        isRestored
          ? "bg-emerald-500 text-white"
          : "bg-gray-900 text-white"
      )}
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 8px)` }}
    >
      {isRestored ? (
        <>
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>No internet connection</span>
        </>
      )}
    </div>
  );
}
