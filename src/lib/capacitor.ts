import { Capacitor } from "@capacitor/core";

export async function configureIOSStatusBarForLightHeader() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return;
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.show();
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#ffffff" });
  } catch (error) {
    console.warn("Failed to configure iOS status bar:", error);
  }
}

/**
 * Initialize Capacitor plugins for native mobile functionality.
 * This function should be called once when the app starts.
 */
export async function initializeCapacitor() {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if (Capacitor.getPlatform() === "ios") {
      await configureIOSStatusBarForLightHeader();
    }

    // Keep Android status bar background aligned with app shell.
    if (Capacitor.getPlatform() === "android") {
      const { StatusBar } = await import("@capacitor/status-bar");
      await StatusBar.setBackgroundColor({ color: "#1a1a2e" });
    }

    // Initialize Splash Screen - will auto-hide after configured duration
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();

    // Initialize Keyboard for better form handling on iOS
    const { Keyboard } = await import("@capacitor/keyboard");
    
    const setKeyboardHeight = (height: number) => {
      const keyboardHeight = Math.max(0, Math.round(height || 0));
      document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
      document.body.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    };

    // Walk up DOM to find the nearest overflow:auto/scroll ancestor.
    const getScrollableParent = (element: HTMLElement): HTMLElement | null => {
      let current: HTMLElement | null = element.parentElement;
      while (current) {
        const ov = window.getComputedStyle(current).overflowY;
        if ((ov === "auto" || ov === "scroll") && current.scrollHeight > current.clientHeight) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    // Returns true when an element lives inside a position:fixed ancestor
    // (e.g. a bottom-above-nav action bar). Those elements are positioned by
    // CSS rules – no JS scroll adjustment is needed.
    const isInFixedContainer = (element: HTMLElement): boolean => {
      let current: HTMLElement | null = element.parentElement;
      while (current && current !== document.body) {
        if (window.getComputedStyle(current).position === "fixed") return true;
        current = current.parentElement;
      }
      return false;
    };

    // Scroll position snapshot taken just before keyboard opens.
    // iOS WKWebView auto-scrolls the container to keep the focused input
    // visible even when the field is already above the keyboard.  We capture
    // the pre-keyboard position here so ensureFocusedFieldVisible can undo
    // any unneeded scroll, preventing the header from appearing to "jump".
    let savedScrollTop = 0;

    /**
     * After the keyboard animation completes, make sure the focused input is
     * visible above the keyboard.
     *
     * Three cases:
     * A) Element is in a fixed container (e.g. bottom-above-nav action bar)
     *    → CSS keyword rules already handle positioning, nothing to do.
     * B) Element is in the flex footer (chat composer, outside app-shell-content)
     *    → Shell shrank – scroll the message list to the bottom so the latest
     *      message appears above the composer.
     * C) Element is inside a scrollable container (form field)
     *    → Scroll just enough to reveal the focused field.
     *
     * `immediate` skips the transition-wait delay (used for focusin while
     * keyboard is already open).
     */
    const ensureFocusedFieldVisible = (keyboardHeight = 0, immediate = false) => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) return;
      if (activeElement.closest('[data-disable-keyboard-autoscroll="true"]')) return;

      const isTextInput = activeElement.matches(
        "input, textarea, [contenteditable=''], [contenteditable='true'], [role='textbox']"
      );
      if (!isTextInput) return;

      // Wait for the CSS transition (app-shell bottom: 250 ms + small buffer).
      // The `immediate` path uses a short delay for already-open keyboard.
      window.setTimeout(() => {
        const scrollParent = getScrollableParent(activeElement);

        // Case A: inside a fixed container – CSS handles it.
        if (!scrollParent && isInFixedContainer(activeElement)) return;

        // Case D: inside a dialog – the dialog itself is the scrollable area.
        // Scroll within the dialog content to bring the focused field into view.
        const dialogEl = activeElement.closest<HTMLElement>('[role="dialog"]');
        if (dialogEl) {
          const dialogScrollParent = scrollParent ?? (
            window.getComputedStyle(dialogEl).overflowY !== 'visible' ? dialogEl : null
          );
          if (dialogScrollParent) {
            const keyboardInset = Math.max(0, keyboardHeight || 0);
            const viewportBottom = window.innerHeight - keyboardInset;
            const rect = activeElement.getBoundingClientRect();
            const minVisibleBottom = viewportBottom - 20;
            if (rect.bottom > minVisibleBottom) {
              dialogScrollParent.scrollBy({ top: rect.bottom - minVisibleBottom + 16, behavior: "smooth" });
            }
          }
          return;
        }

        // Case B: in the flex footer outside the scroll area (chat composer).
        // The shell shrank so scroll the content list to the bottom.
        if (!scrollParent) {
          const shellContent = document.querySelector(".app-shell-content");
          if (shellContent instanceof HTMLElement) {
            shellContent.scrollTo({ top: shellContent.scrollHeight, behavior: "smooth" });
          }
          return;
        }

        // Case C: inside a scroll container – nudge until field is visible.
        const keyboardInset = Math.max(0, keyboardHeight || 0);
        const viewportBottom = window.innerHeight - keyboardInset;
        const rect = activeElement.getBoundingClientRect();
        const minVisibleBottom = viewportBottom - 20;
        if (rect.bottom <= minVisibleBottom) {
          // Input is already visible  undo any iOS auto-scroll that occurred.
          if (scrollParent && scrollParent.scrollTop !== savedScrollTop) {
            scrollParent.scrollTop = savedScrollTop;
          }
          return;
        }
        scrollParent.scrollBy({ top: rect.bottom - minVisibleBottom + 16, behavior: "smooth" });
      }, immediate ? 60 : 310);
    };

    // Add keyboard event listeners for iOS scroll adjustments
    if (Capacitor.getPlatform() === "ios") {
      document.body.classList.add("native-ios-no-safe-area");

      // Initialise --vv-height to the current full-screen height so the
      // app shell has a concrete pixel value from the very first paint.
      document.documentElement.style.setProperty(
        "--vv-height",
        `${window.innerHeight}px`,
      );

      Keyboard.addListener("keyboardWillShow", (event) => {
        // Snapshot scroll position BEFORE the keyboard-open class is applied.
        const shellContent = document.querySelector(".app-shell-content");
        savedScrollTop = shellContent instanceof HTMLElement ? shellContent.scrollTop : 0;

        document.body.classList.add("keyboard-open");
        const kh = event?.keyboardHeight ?? 0;
        setKeyboardHeight(kh);

        // Immediately resize the app shell to the area above the keyboard.
        // VisualViewport resize events will keep this in sync frame-by-frame
        // during the animation; this first update avoids a one-frame flash.
        document.documentElement.style.setProperty(
          "--vv-height",
          `${Math.max(0, window.innerHeight - kh)}px`,
        );

        ensureFocusedFieldVisible(kh);
      });

      Keyboard.addListener("keyboardDidShow", (event) => {
        // Re-check after native show confirms final height (handles predictive bar toggling).
        const kh = event?.keyboardHeight ?? 0;
        setKeyboardHeight(kh);
        document.documentElement.style.setProperty(
          "--vv-height",
          `${Math.max(0, window.innerHeight - kh)}px`,
        );
      });

      Keyboard.addListener("keyboardWillHide", () => {
        document.body.classList.remove("keyboard-open");
        setKeyboardHeight(0);

        // Restore the shell to full height; VisualViewport resize will
        // also fire and confirm this value.
        document.documentElement.style.setProperty(
          "--vv-height",
          `${window.innerHeight}px`,
        );

        // After the shell height restores, clamp any over-scrolled containers
        // so blank content doesn't appear below messages.
        window.setTimeout(() => {
          const shellContent = document.querySelector(".app-shell-content");
          if (shellContent instanceof HTMLElement) {
            const maxScroll = shellContent.scrollHeight - shellContent.clientHeight;
            if (shellContent.scrollTop > maxScroll) {
              shellContent.scrollTop = maxScroll;
            }
          }
        }, 310);
      });

      // When the user taps a different input while the keyboard is already open,
      // quickly re-check visibility (no need to wait for the full transition).
      document.addEventListener("focusin", () => {
        if (!document.body.classList.contains("keyboard-open")) return;
        const rawHeight = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--keyboard-height") || "0"
        );
        ensureFocusedFieldVisible(Number.isFinite(rawHeight) ? rawHeight : 0, true);
      });

      // ── VisualViewport sync (iOS 26.x / WKWebView regression fix) ────────────
      // Keeps --vv-height accurate frame-by-frame during the keyboard slide
      // animation, and corrects any VisualViewport.offsetTop > 0 shifts.
      //
      // Why this matters across iOS 26.1 vs 26.3.1:
      //   Different WebKit builds handle position:fixed + keyboard differently.
      //   On some builds vv.offsetTop becomes non-zero when the keyboard opens,
      //   making fixed/positioned elements appear to "jump" because the visual
      //   viewport has panned away from layout y=0.
      //
      //   With body { position:fixed; inset:0 } the document cannot scroll so
      //   vv.offsetTop should stay 0; but we translate the shell defensively for
      //   any build that pans anyway.
      if (window.visualViewport) {
        const vv = window.visualViewport;

        const syncWithVV = () => {
          const h = Math.round(vv.height);
          const offsetY = Math.round(vv.offsetTop);

          // Keep the app-shell height in lock-step with the visible area.
          // vv.height is the definitive source of truth for the keyboard-free area.
          document.documentElement.style.setProperty("--vv-height", `${h}px`);

          // Counter any visual-viewport panning (vv.offsetTop > 0) by
          // translating ONLY the header element, not the whole shell.
          // Correcting only the header avoids turning .app-shell into a new
          // containing block for position:fixed children (bottom-above-nav
          // bars) which would break the keyboard-height CSS adjustments.
          // With body { position:fixed; inset:0 } this offset should always
          // be 0  the translateY is a safety net for iOS 26.x builds that
          // still pan the visual viewport despite the body lock.
          const header = document.querySelector<HTMLElement>(".app-shell-top");
          if (header) {
            header.style.transform =
              offsetY > 0.5
                ? `translateZ(0) translateY(${offsetY}px)`
                : "translateZ(0)";
          }
        };

        vv.addEventListener("resize", syncWithVV, { passive: true });
        vv.addEventListener("scroll", syncWithVV, { passive: true });
        syncWithVV(); // initial sync on mount
      }
    }

    console.log("Capacitor initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize Capacitor plugins:", error);
  }
}

/**
 * Check if running on a native platform (iOS or Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}
