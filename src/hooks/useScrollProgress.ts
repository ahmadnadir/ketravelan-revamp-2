import { useEffect, useRef, useState } from "react";

interface UseScrollProgressOptions {
  containerSelector?: string;
}

export function useScrollProgress(options: UseScrollProgressOptions = {}) {
  const { containerSelector = ".app-shell-content" } = options;
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const readScrollY = () => {
      const container = document.querySelector(containerSelector) as HTMLElement | null;
      const containerY = container?.scrollTop || 0;
      const windowY = window.scrollY || document.documentElement.scrollTop || 0;
      return Math.max(containerY, windowY);
    };

    const scheduleSync = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const y = readScrollY();
        setScrollY((prev) => (Math.abs(prev - y) < 0.5 ? prev : y));
      });
    };

    const onViewportChange = () => scheduleSync();

    // Capture phase ensures we catch nested scroll containers.
    document.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("orientationchange", onViewportChange);

    // Catch restored scroll positions after route transitions.
    scheduleSync();
    const rafA = window.requestAnimationFrame(scheduleSync);
    const rafB = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scheduleSync);
    });

    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      window.cancelAnimationFrame(rafA);
      window.cancelAnimationFrame(rafB);
      document.removeEventListener("scroll", scheduleSync, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, [containerSelector]);

  return { scrollY };
}
