import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // became online again after being offline
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const queryClient = useQueryClient();

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    // Refetch all stale queries now that we're back online
    queryClient.refetchQueries({ type: "active", stale: true });
    // Clear "was offline" flag after a short delay
    setTimeout(() => setWasOffline(false), 4000);
  }, [queryClient]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(false);
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
