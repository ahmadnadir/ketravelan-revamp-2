import { useState, useEffect } from "react";

/**
 * Hook to detect mobile keyboard height using multiple methods.
 * Returns the keyboard height in pixels when the keyboard is open.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let lastInnerHeight = window.innerHeight;

    const handleResize = () => {
      const currentInnerHeight = window.innerHeight;
      
      // Method 1: Check if innerHeight changed (window height shrinks when keyboard appears)
      if (currentInnerHeight < lastInnerHeight) {
        // Keyboard is likely open
        const heightDiff = lastInnerHeight - currentInnerHeight;
        setKeyboardHeight(heightDiff > 50 ? heightDiff : 0);
      } else {
        // Keyboard is likely closed
        setKeyboardHeight(0);
        lastInnerHeight = currentInnerHeight;
      }
    };

    const handleFocus = () => {
      // Keyboard is about to open, assume default height
      setTimeout(() => {
        handleResize();
      }, 100);
    };

    const handleBlur = () => {
      // Keyboard is closing
      setKeyboardHeight(0);
      lastInnerHeight = window.innerHeight;
    };

    // Initial check
    handleResize();

    // Listen for resize events (most reliable method)
    window.addEventListener("resize", handleResize);
    
    // Also listen for focus/blur on input fields as backup
    const inputs = document.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    });

    // Listen for new inputs being added dynamically
    const observer = new MutationObserver(() => {
      const newInputs = document.querySelectorAll("input, textarea");
      newInputs.forEach((input) => {
        if (!input.hasAttribute("data-keyboard-listener")) {
          input.setAttribute("data-keyboard-listener", "true");
          input.addEventListener("focus", handleFocus);
          input.addEventListener("blur", handleBlur);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      document.querySelectorAll("input, textarea").forEach((input) => {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      });
      observer.disconnect();
    };
  }, []);

  return keyboardHeight;
}
