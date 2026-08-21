import { useEffect } from "react";
import { useNavigationType } from "react-router-dom";

const LIST_ITEM_RESTORE_KEY = "ketravelan:list-item-restore";
const RESTORE_TIMEOUT_MS = 1800;

type PendingListItemRestore = {
  scope: string;
  itemId: string;
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
  window.sessionStorage.setItem(LIST_ITEM_RESTORE_KEY, JSON.stringify({ scope, itemId }));
}

interface UseListItemRestoreOptions {
  scope: string;
  ready: boolean;
  selectorForItemId: (itemId: string) => string;
}

export function useListItemRestore({ scope, ready, selectorForItemId }: UseListItemRestoreOptions) {
  const navigationType = useNavigationType();

  useEffect(() => {
    if (typeof window === "undefined" || navigationType !== "POP" || !ready) return;

    const pendingRestore = readPendingRestore();
    if (!pendingRestore || pendingRestore.scope !== scope) return;

    let frameId = 0;
    let timeoutId = 0;
    const startedAt = Date.now();

    const cleanup = () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };

    const tryRestore = () => {
      const selector = selectorForItemId(pendingRestore.itemId);
      const target = document.querySelector(selector);

      if (target instanceof HTMLElement) {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        clearPendingRestore();
        cleanup();
        return;
      }

      if (Date.now() - startedAt >= RESTORE_TIMEOUT_MS) {
        clearPendingRestore();
        cleanup();
        return;
      }

      frameId = window.requestAnimationFrame(tryRestore);
      timeoutId = window.setTimeout(tryRestore, 120);
    };

    frameId = window.requestAnimationFrame(tryRestore);

    return () => {
      cleanup();
    };
  }, [navigationType, ready, scope, selectorForItemId]);
}

export const buildDataIdSelector = (attributeName: string, itemId: string) => {
  return `[${attributeName}="${escapeSelectorValue(itemId)}"]`;
};