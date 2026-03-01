import { useState, useEffect } from "react";

/**
 * Simulates a loading state for demo purposes.
 * In a real app, this would be replaced with actual data fetching.
 */
export function useSimulatedLoading(duration = 800) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return isLoading;
}
