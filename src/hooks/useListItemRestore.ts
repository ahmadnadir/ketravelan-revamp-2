import { useLayoutEffect } from "react";
import { useNavigationType } from "react-router-dom";

const LIST_ITEM_RESTORE_KEY = "ketravelan:list-item-restore";
const RESTORE_TIMEOUT_MS = 1800;
const activeRestoreScopes = new Set<string>();

type PendingListItemRestore = {
  scope: string;
  itemId: string;
  scrollTop?: number;
};

const readPendingRestore = (): PendingListItemRestore | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(LIST_ITEM_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingListItemRestore;
    if (!parsed?.scope || !parsed?.itemId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const clearPendingRestore = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LIST_ITEM_RESTORE_KEY);
};

const escapeSelectorValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export function savePendingListItemRestore(scope: string, itemId: string) {
  if (typeof window === "undefined" || !scope || !itemId) return;
  const target = document.querySelector(buildDataIdSelector("data-trip-id", itemId));
  const container = target instanceof HTMLElement
    ? target.closest<HTMLElement>(".app-shell-content")
    : null;
  let scrollTop: number | undefined;

  if (container && target instanceof HTMLElement) {
    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    scrollTop = Math.max(
      0,
      container.scrollTop +
        targetRect.top -
        containerRect.top -
        (container.clientHeight - targetRect.height) / 2,
    );
  }

  window.sessionStorage.setItem(LIST_ITEM_RESTORE_KEY, JSON.stringify({ scope, itemId, scrollTop }));
}

interface UseListItemRestoreOptions {
  scope: string;
  ready: boolean;
  selectorForItemId: (itemId: string) => string;
}

export function useListItemRestore({
  scope,
  ready,
  selectorForItemId,
}: UseListItemRestoreOptions) {
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (typeof window === "undefined" || navigationType !== "POP" || !ready) return;

    const pendingRestore = readPendingRestore();
    if (!pendingRestore || pendingRestore.scope !== scope) return;
    if (activeRestoreScopes.has(scope)) return;
    activeRestoreScopes.add(scope);

    let frameId = 0;
    let isCancelled = false;
    let highlightedTarget: HTMLElement | null = null;
    let highlightEndHandler: (() => void) | null = null;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const startedAt = Date.now();

    const cleanup = () => {
      isCancelled = true;
      window.cancelAnimationFrame(frameId);
      if (highlightedTarget && highlightEndHandler) {
        highlightedTarget.removeEventListener("animationend", highlightEndHandler);
        highlightedTarget.classList.remove("restore-trip-card");
      }
      activeRestoreScopes.delete(scope);
      window.history.scrollRestoration = previousScrollRestoration;
    };

    const tryRestore = () => {
      if (isCancelled) return;

      const selector = selectorForItemId(pendingRestore.itemId);
      const target = document.querySelector(selector);

      if (target instanceof HTMLElement) {
        const container = target.closest<HTMLElement>(".app-shell-content");
        if (container && typeof pendingRestore.scrollTop === "number") {
          container.scrollTop = pendingRestore.scrollTop;
        } else if (container) {
          const targetRect = target.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const centeredTop =
            container.scrollTop +
            targetRect.top -
            containerRect.top -
            (container.clientHeight - targetRect.height) / 2;
          container.scrollTop = Math.max(0, centeredTop);
        } else {
          target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        }
        highlightedTarget = target;
        highlightEndHandler = cleanup;
        target.addEventListener("animationend", highlightEndHandler, { once: true });
        target.classList.add("restore-trip-card");
        clearPendingRestore();
        return;
      }

      if (Date.now() - startedAt >= RESTORE_TIMEOUT_MS) {
        clearPendingRestore();
        cleanup();
        return;
      }

      frameId = window.requestAnimationFrame(tryRestore);
    };

    tryRestore();

    return () => {
      cleanup();
    };
  }, [navigationType, ready, scope, selectorForItemId]);
}

export const buildDataIdSelector = (attributeName: string, itemId: string) => {
  return `[${attributeName}="${escapeSelectorValue(itemId)}"]`;
};