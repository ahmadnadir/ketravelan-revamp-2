import { useMemo } from "react";

interface UseStickyHeaderOptions {
  scrollY: number;
  transitionStart?: number;
  transitionEnd?: number;
  topResetThreshold?: number;
  contentNavPinned?: boolean;
}

export type StickyHeaderMode = "hero" | "transition" | "reading";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function useStickyHeader(options: UseStickyHeaderOptions) {
  const {
    scrollY,
    transitionStart = 120,
    transitionEnd = 280,
    topResetThreshold = 2,
    contentNavPinned = false,
  } = options;

  return useMemo(() => {
    const transitionProgress = clamp01(
      (scrollY - transitionStart) / Math.max(1, transitionEnd - transitionStart)
    );

    const mode: StickyHeaderMode = contentNavPinned
      ? "reading"
      : transitionProgress <= 0
        ? "hero"
        : "transition";

    const appearProgress = clamp01((scrollY - topResetThreshold) / Math.max(1, transitionStart));

    return {
      mode,
      transitionProgress,
      appearProgress,
      showHeroActions: mode === "hero",
      showFloatingNavigation: mode === "transition",
      opacity: transitionProgress,
      translateY: (1 - transitionProgress) * -14,
      scale: 0.96 + transitionProgress * 0.04,
      blurPx: 10 + transitionProgress * 8,
      shadowOpacity: 0.08 + transitionProgress * 0.12,
    };
  }, [contentNavPinned, scrollY, topResetThreshold, transitionEnd, transitionStart]);
}
