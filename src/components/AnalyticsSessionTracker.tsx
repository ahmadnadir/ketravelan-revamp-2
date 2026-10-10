import { useEffect } from 'react';
import { recordSessionDuration } from '@/lib/analyticsTracking';

export function AnalyticsSessionTracker() {
  useEffect(() => {
    let activeSince = document.visibilityState === 'visible' ? Date.now() : null;

    const recordElapsed = (continueTracking: boolean) => {
      if (activeSince === null) return;
      const now = Date.now();
      const seconds = Math.floor((now - activeSince) / 1000);
      if (seconds > 0) void recordSessionDuration(seconds);
      activeSince = continueTracking ? now : null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') activeSince ??= Date.now();
      else recordElapsed(false);
    };
    const handlePageHide = () => recordElapsed(false);

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') recordElapsed(true);
    }, 60_000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      recordElapsed(false);
    };
  }, []);

  return null;
}