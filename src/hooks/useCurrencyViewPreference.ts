import { useState, useEffect, useCallback } from "react";

export type CurrencyViewMode = "travel" | "home";

const STORAGE_KEY_PREFIX = "ketravelan-currency-view-";

export function useCurrencyViewPreference(tripId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;
  
  const [viewMode, setViewModeState] = useState<CurrencyViewMode>(() => {
    if (typeof window === "undefined") return "travel";
    const stored = localStorage.getItem(storageKey);
    return (stored === "home" || stored === "travel") ? stored : "travel";
  });

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [storageKey, viewMode]);

  const setViewMode = useCallback((mode: CurrencyViewMode) => {
    setViewModeState(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => (prev === "travel" ? "home" : "travel"));
  }, []);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
  };
}
