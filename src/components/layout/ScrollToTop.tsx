import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Exclude direct chat pages from scroll-to-top behavior
    if (pathname.startsWith("/chat/") || navigationType === "POP") {
      return;
    }

    const shellContent = document.querySelector(".app-shell-content");
    if (shellContent instanceof HTMLElement) {
      shellContent.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    window.scrollTo(0, 0);
  }, [navigationType, pathname]);

  return null;
}
