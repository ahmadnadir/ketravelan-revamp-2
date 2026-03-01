import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Exclude direct chat pages from scroll-to-top behavior
    if (pathname.startsWith("/chat/")) {
      return;
    }
    
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
