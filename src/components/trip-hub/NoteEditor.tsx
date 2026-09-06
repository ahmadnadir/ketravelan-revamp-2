import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  CheckSquare,
  ChevronLeft,
  Copy,
  Info,
  Link as LinkIcon,
  List,
  ListOrdered,
  MoreHorizontal,
  Redo2,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  TripNoteDB,
  NoteBlock,
  notifyNoteEdited,
} from "@/lib/tripNotes.db";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface NoteEditorProps {
  note: TripNoteDB;
  open: boolean;
  onClose: () => void;
  onSave: (
    note: TripNoteDB,
    options?: { silent?: boolean }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  tripId: string;
  onNoteEdited?: (note: TripNoteDB) => void;
}

type SaveState = "idle" | "saving" | "saved";

type HistoryState = {
  title: string;
  content: string;
  selectionStart: number;
  selectionEnd: number;
};

type ListType = "bullet" | "number" | "checklist";

const MAX_HISTORY = 50;

const INDENT_UNIT = "  ";

const TOUCH_BUTTON =
  "h-11 w-11 shrink-0 rounded-full";

const linkPattern =
  /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/*
 * Renumbers every numbered-list line in the whole note, per indent
 * level. Each level keeps its own running counter; a shallower level
 * resumes where it left off; any non-numbered line resets the
 * counters at that depth and deeper. Must always run on the full
 * content, never a slice, or the rest of the list goes stale.
 */
const renumberNumberedLines = (
  text: string
): string => {
  const lines =
    text.split("\n");

  const counters: Record<string, number> =
    {};

  return lines
    .map((line) => {
      const match =
        line.match(
          /^(\s*)(\d+)(\.\s+)(.*)$/
        );

      if (!match) {
        for (const key of Object.keys(
          counters
        )) {
          delete counters[key];
        }

        return line;
      }

      const indentation =
        match[1];

      const rest =
        match[4];

      for (const key of Object.keys(
        counters
      )) {
        if (
          key.length >
          indentation.length
        ) {
          delete counters[key];
        }
      }

      const nextNumber =
        (counters[
          indentation
        ] ?? 0) + 1;

      counters[indentation] =
        nextNumber;

      return `${indentation}${nextNumber}. ${rest}`;
    })
    .join("\n");
};

export function NoteEditor({
  note,
  open,
  onClose,
  onSave,
  onDelete,
  tripId,
  onNoteEdited,
}: NoteEditorProps) {
  // =========================================================
  // STATE
  // =========================================================

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [saveState, setSaveState] =
    useState<SaveState>("idle");

  const [showDeleteDialog, setShowDeleteDialog] =
    useState(false);

  const [showMoreTools, setShowMoreTools] =
    useState(false);

  const [showSearch, setShowSearch] =
    useState(false);

  const [showLinkDialog, setShowLinkDialog] =
    useState(false);

  const [showStats, setShowStats] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchIndex, setSearchIndex] =
    useState(0);

  const [pendingLinkUrl, setPendingLinkUrl] =
    useState("");

  const [linkDialogMode, setLinkDialogMode] =
    useState<"add" | "open">("add");

  const [useMirrorLayer, setUseMirrorLayer] =
    useState(true);

  const [searchKeyboardOffset, setSearchKeyboardOffset] =
    useState(0);

  const [history, setHistory] =
    useState<HistoryState[]>([]);

  const [future, setFuture] =
    useState<HistoryState[]>([]);

  const [isSelectAllActive, setIsSelectAllActive] =
    useState(false);

  const [peopleNames, setPeopleNames] =
    useState<Record<string, string>>({});

  // =========================================================
  // DERIVED
  // =========================================================

  /*
   * Keep the existing mirror architecture, but force it on while
   * Search is active with a query. Touch devices normally disable
   * the mirror through the hover/pointer preference, which also
   * removes the only layer that paints search highlights.
   */
  const forceMirrorForSearch =
    showSearch && searchQuery.trim().length > 0;

  /*
   * Also force the mirror on when the note has a checklist, so the
   * real tappable checkbox control still renders on touch devices
   * that otherwise disable the mirror layer.
   */
  const forceMirrorForChecklist =
    /(^|\n)\s*(?:☐|☑)/.test(content);

  const shouldRenderMirror =
    (useMirrorLayer || forceMirrorForSearch || forceMirrorForChecklist) &&
    content.length > 0;

  // =========================================================
  // REFS
  // =========================================================

  const saveTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const typingHistoryRef =
    useRef(false);

  const typingHistoryTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleRef =
    useRef<HTMLInputElement>(null);

  const contentRef =
    useRef<HTMLTextAreaElement>(null);

  const contentScrollRef =
    useRef<HTMLDivElement>(null);

  const contentMirrorRef =
    useRef<HTMLDivElement>(null);

  const editorWrapperRef =
    useRef<HTMLDivElement>(null);

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const searchViewportHeightRef =
    useRef(0);

  const searchKeyboardHeightRef =
    useRef(0);

  const editorKeyboardHeightRef =
    useRef(0);

  const selectionMirrorRef =
    useRef<HTMLPreElement>(null);

  const isInitialMount =
    useRef(true);

  const hasUnnotifiedEdit =
    useRef(false);

  const lastSavedContent =
    useRef({
      title: "",
      content: "",
    });

  const { toast } =
    useToast();

  const { user } =
    useAuth();

  // =========================================================
  // BLOCK CONVERSION
  // =========================================================

  const blocksToText =
    useCallback(
      (blocks: NoteBlock[]): string => {
        let numberCounter = 0;

        return blocks
          .map((block) => {
            switch (block.type) {
              case "checklist":
                numberCounter = 0;

                return `${
                  block.checked
                    ? "☑"
                    : "☐"
                } ${block.content}`;

              case "bullet":
                numberCounter = 0;

                return `• ${block.content}`;

              case "number":
                numberCounter += 1;

                return `${numberCounter}. ${block.content}`;

              default:
                numberCounter = 0;

                return block.content;
            }
          })
          .join("\n");
      },
      []
    );

  const textToBlocks =
    useCallback(
      (text: string): NoteBlock[] => {
        return text
          .split("\n")
          .filter(
            (line) => line.trim()
          )
          .map((line, index) => {
            const checklistMatch =
              line.match(
                /^(\s*)(☑|☐)\s+(.*)$/
              );

            const bulletMatch =
              line.match(
                /^(\s*)•\s+(.*)$/
              );

            const numberMatch =
              line.match(
                /^(\s*)\d+\.\s+(.*)$/
              );

            if (checklistMatch) {
              return {
                id: `${Date.now()}-${index}-${Math.random()
                  .toString(36)
                  .slice(2, 7)}`,
                type: "checklist",
                content:
                  checklistMatch[3],
                checked:
                  checklistMatch[2] ===
                  "☑",
              };
            }

            if (bulletMatch) {
              return {
                id: `${Date.now()}-${index}-${Math.random()
                  .toString(36)
                  .slice(2, 7)}`,
                type: "bullet",
                content:
                  bulletMatch[2],
              };
            }

            if (numberMatch) {
              return {
                id: `${Date.now()}-${index}-${Math.random()
                  .toString(36)
                  .slice(2, 7)}`,
                type: "number",
                content:
                  numberMatch[2],
              };
            }

            return {
              id: `${Date.now()}-${index}-${Math.random()
                .toString(36)
                .slice(2, 7)}`,
              type: "text",
              content: line,
            };
          });
      },
      []
    );

  // =========================================================
  // INITIALIZE
  // =========================================================

  useEffect(() => {
    if (!note || !open) {
      return;
    }

    const contentText =
      blocksToText(note.blocks || []);

    setTitle(
      note.title || ""
    );

    setContent(
      contentText
    );

    setHistory([]);
    setFuture([]);

    setSearchQuery("");
    setSearchIndex(0);

    setShowMoreTools(false);
    setShowSearch(false);
    setShowStats(false);
    setShowLinkDialog(false);

    setPendingLinkUrl("");
    setIsSelectAllActive(false);

    lastSavedContent.current = {
      title:
        note.title || "",
      content:
        contentText,
    };

    setSaveState("idle");

    isInitialMount.current =
      true;

    hasUnnotifiedEdit.current =
      false;

    typingHistoryRef.current =
      false;

    /*
     * The textarea/mirror DOM nodes persist across notes, so a
     * leftover scrollTop from a previous note/session otherwise
     * clips the first line under the top edge on open. Reset it
     * a few times since focus/resize effects can re-scroll it
     * shortly after the initial reset.
     */
    const resetScroll = () => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }

      if (contentMirrorRef.current) {
        contentMirrorRef.current.scrollTop = 0;
      }
    };

    requestAnimationFrame(resetScroll);
    const resetTimers = [50, 200, 400].map((delay) =>
      setTimeout(resetScroll, delay)
    );

    return () => {
      resetTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    note,
    open,
    blocksToText,
  ]);

  // =========================================================
  // FOCUS TITLE
  // =========================================================

  useEffect(() => {
    if (
      !open ||
      !titleRef.current
    ) {
      return;
    }

    const isTouchDevice =
      typeof window !== "undefined" &&
      window.matchMedia?.(
        "(hover: none), (pointer: coarse)"
      ).matches;

    if (isTouchDevice) {
      return;
    }

    const timer =
      setTimeout(() => {
        titleRef.current?.focus();
      }, 180);

    return () =>
      clearTimeout(timer);
  }, [open]);

  // =========================================================
  // MIRROR PREFERENCE
  // =========================================================

  useEffect(() => {
    if (
      typeof window ===
        "undefined" ||
      !window.matchMedia
    ) {
      return;
    }

    const mediaQuery =
      window.matchMedia(
        "(hover: hover) and (pointer: fine)"
      );

    const applyPreference =
      () => {
        setUseMirrorLayer(
          mediaQuery.matches
        );
      };

    applyPreference();

    if (
      typeof mediaQuery.addEventListener ===
      "function"
    ) {
      mediaQuery.addEventListener(
        "change",
        applyPreference
      );
    } else {
      mediaQuery.addListener(
        applyPreference
      );
    }

    return () => {
      if (
        typeof mediaQuery.removeEventListener ===
        "function"
      ) {
        mediaQuery.removeEventListener(
          "change",
          applyPreference
        );
      } else {
        mediaQuery.removeListener(
          applyPreference
        );
      }
    };
  }, []);

  // =========================================================
  // MIRROR SCROLL
  // =========================================================

  const syncMirrorScroll =
    useCallback(() => {
      if (
        !shouldRenderMirror ||
        !contentRef.current ||
        !contentMirrorRef.current
      ) {
        return;
      }

      contentMirrorRef.current.scrollTop =
        contentRef.current.scrollTop;

      contentMirrorRef.current.scrollLeft =
        contentRef.current.scrollLeft;
    }, [
      shouldRenderMirror,
    ]);

  const handleContentScroll =
    () => {
      syncMirrorScroll();
    };

  // =========================================================
  // SELECTION / CURSOR
  // =========================================================

  const restoreTextareaSelection =
    useCallback(
      (
        start: number,
        end = start
      ) => {
        requestAnimationFrame(() => {
          const textarea =
            contentRef.current;

          if (!textarea) {
            return;
          }

          textarea.focus();

          const safeStart =
            Math.max(
              0,
              Math.min(
                start,
                textarea.value.length
              )
            );

          const safeEnd =
            Math.max(
              safeStart,
              Math.min(
                end,
                textarea.value.length
              )
            );

          textarea.setSelectionRange(
            safeStart,
            safeEnd
          );

          syncMirrorScroll();
        });
      },
      [syncMirrorScroll]
    );

  const ensureCursorVisible =
    useCallback(() => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      const style =
        window.getComputedStyle(
          textarea
        );

      const lineHeight =
        parseFloat(
          style.lineHeight
        );

      if (
        !Number.isFinite(
          lineHeight
        ) ||
        lineHeight <= 0
      ) {
        textarea.scrollTop =
          textarea.scrollHeight;

        syncMirrorScroll();

        return;
      }

      const caret =
        textarea.selectionStart;

      const beforeCaret =
        textarea.value.slice(
          0,
          caret
        );

      const currentLineIndex =
        beforeCaret.split(
          "\n"
        ).length - 1;

      const targetTop =
        currentLineIndex *
        lineHeight;

      const targetBottom =
        targetTop +
        lineHeight;

      const visibleTop =
        textarea.scrollTop;

      const visibleBottom =
        textarea.scrollTop +
        textarea.clientHeight;

      if (
        targetTop <
        visibleTop + 8
      ) {
        textarea.scrollTop =
          Math.max(
            0,
            targetTop - 8
          );
      } else if (
        targetBottom >
        visibleBottom - 8
      ) {
        textarea.scrollTop =
          targetBottom -
          textarea.clientHeight +
          8;
      }

      syncMirrorScroll();
    }, [
      syncMirrorScroll,
    ]);

  const ensureEditorCaretVisible =
    useCallback(() => {
      const textarea =
        contentRef.current;
      const scrollContainer =
        contentScrollRef.current;
      const keyboardHeight =
        editorKeyboardHeightRef.current;

      if (
        !textarea ||
        !scrollContainer ||
        keyboardHeight <= 0
      ) {
        return;
      }

      const caretMirror =
        selectionMirrorRef.current;

      if (!caretMirror) {
        return;
      }

      const textareaStyle =
        window.getComputedStyle(textarea);
      const beforeCaret =
        textarea.value.slice(
          0,
          textarea.selectionStart
        );
      const caretMarker =
        document.createElement("span");

      caretMarker.textContent = "\u200b";
      caretMirror.textContent = beforeCaret;
      caretMirror.appendChild(caretMarker);
      caretMirror.style.width =
        `${textarea.clientWidth}px`;
      caretMirror.style.padding =
        textareaStyle.padding;
      caretMirror.style.border =
        textareaStyle.border;
      caretMirror.style.boxSizing =
        textareaStyle.boxSizing;
      caretMirror.style.font =
        textareaStyle.font;
      caretMirror.style.letterSpacing =
        textareaStyle.letterSpacing;
      caretMirror.style.lineHeight =
        textareaStyle.lineHeight;
      caretMirror.style.whiteSpace =
        textareaStyle.whiteSpace;
      caretMirror.style.overflowWrap =
        textareaStyle.overflowWrap;
      caretMirror.style.wordBreak =
        textareaStyle.wordBreak;

      const caretBottom =
        textarea.getBoundingClientRect().top +
        caretMarker.offsetTop +
        caretMarker.offsetHeight -
        textarea.scrollTop +
        0;
      const visibleBottom =
        (window.visualViewport
          ? window.visualViewport.height +
            window.visualViewport.offsetTop
          : window.innerHeight - keyboardHeight) -
        16;

      scrollContainer.style.paddingBottom =
        `${keyboardHeight + 16}px`;

      if (caretBottom > visibleBottom) {
        scrollContainer.scrollBy({
          top: caretBottom - visibleBottom,
          behavior: "auto",
        });
      }
    }, []);

  // =========================================================
  // MOBILE KEYBOARD / VISUAL VIEWPORT
  // =========================================================
  //
  // Keep Note Editor and Search keyboard behavior completely
  // separate. The textarea is allowed to scroll naturally;
  // Search alone receives a viewport offset when its input owns
  // focus.
  // =========================================================

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !open
    ) {
      return;
    }

    const visualViewport =
      window.visualViewport;

    if (!visualViewport) {
      return;
    }

    searchViewportHeightRef.current = Math.max(
      window.innerHeight,
      visualViewport.height +
        visualViewport.offsetTop
    );

    const updateKeyboardState =
      () => {
        const activeElement =
          document.activeElement;

        const isSearchFocused =
          activeElement ===
          searchInputRef.current;

        const isNoteFocused =
          activeElement ===
          contentRef.current;

        const nativeKeyboardHeight =
          Number.parseFloat(
            getComputedStyle(
              document.documentElement
            ).getPropertyValue(
              "--keyboard-height"
            )
          ) || 0;

        const viewportKeyboardHeight = Math.max(
          0,
          searchViewportHeightRef.current -
            visualViewport.height -
            visualViewport.offsetTop
        );

        const measuredKeyboardHeight = Math.max(
          nativeKeyboardHeight,
          viewportKeyboardHeight
        );

        const keyboardIsOpen =
          measuredKeyboardHeight > 0 ||
          document.body.classList.contains(
            "keyboard-open"
          );

        if (keyboardIsOpen) {
          editorKeyboardHeightRef.current =
            Math.max(
              editorKeyboardHeightRef.current,
              measuredKeyboardHeight
            );

          /*
           * `min-h-[50vh]` is computed against the layout viewport,
           * which mobile browsers do not shrink when the keyboard
           * opens, so the editor's own internal scroll can extend
           * behind the keyboard and never reach a reachable "end".
           * Cap both the wrapper and the textarea to the space
           * actually visible above the keyboard instead.
           */
          if (
            isNoteFocused &&
            editorWrapperRef.current &&
            contentRef.current
          ) {
            const wrapperTop =
              editorWrapperRef.current.getBoundingClientRect()
                .top;

            const availableHeight = Math.max(
              160,
              visualViewport.height +
                visualViewport.offsetTop -
                wrapperTop
            );

            editorWrapperRef.current.style.height =
              `${availableHeight}px`;

            contentRef.current.style.height =
              `${availableHeight}px`;
          }
        } else {
          editorKeyboardHeightRef.current = 0;
          if (contentScrollRef.current) {
            contentScrollRef.current.style.paddingBottom = "";
          }
          if (editorWrapperRef.current) {
            editorWrapperRef.current.style.height = "";
          }
          if (contentRef.current) {
            contentRef.current.style.height = "";
          }
        }

        if (isSearchFocused) {
          if (keyboardIsOpen) {
            searchKeyboardHeightRef.current =
              Math.max(
                searchKeyboardHeightRef.current,
                measuredKeyboardHeight
              );
          } else {
            searchKeyboardHeightRef.current = 0;
          }

          setSearchKeyboardOffset(
            searchKeyboardHeightRef.current
          );
          return;
        }

        if (isNoteFocused) {
          requestAnimationFrame(() => {
            ensureCursorVisible();
            ensureEditorCaretVisible();
          });
          return;
        }

        searchKeyboardHeightRef.current = 0;
        setSearchKeyboardOffset(0);

        /*
         * Do not carry Search's keyboard offset into the editor.
         * The Note Editor remains in its normal layout position.
         */
        setSearchKeyboardOffset(0);
      };

    const handleFocusIn =
      (event: FocusEvent) => {
        const target =
          event.target as Element | null;

        if (
          target ===
          searchInputRef.current ||
          target ===
          contentRef.current
        ) {
          updateKeyboardState();
        }
      };

    const handleFocusOut =
      () => {
        requestAnimationFrame(
          updateKeyboardState
        );
      };

    updateKeyboardState();

    visualViewport.addEventListener(
      "resize",
      updateKeyboardState
    );

    visualViewport.addEventListener(
      "scroll",
      updateKeyboardState
    );

    document.addEventListener(
      "focusin",
      handleFocusIn
    );

    document.addEventListener(
      "focusout",
      handleFocusOut
    );

    return () => {
      visualViewport.removeEventListener(
        "resize",
        updateKeyboardState
      );

      visualViewport.removeEventListener(
        "scroll",
        updateKeyboardState
      );

      document.removeEventListener(
        "focusin",
        handleFocusIn
      );

      document.removeEventListener(
        "focusout",
        handleFocusOut
      );
    };
  }, [
    open,
    ensureCursorVisible,
    ensureEditorCaretVisible,
  ]);

  useEffect(() => {
    if (
      !showSearch ||
      !searchInputRef.current
    ) {
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

    return () =>
      cancelAnimationFrame(frame);
  }, [showSearch]);


  // =========================================================
  // HISTORY
  // =========================================================

  const pushHistory =
    useCallback(
      (
        overrideTitle?: string,
        overrideContent?: string,
        overrideStart?: number,
        overrideEnd?: number
      ) => {
        const textarea =
          contentRef.current;

        const snapshot: HistoryState = {
          title:
            overrideTitle ??
            title,
          content:
            overrideContent ??
            content,
          selectionStart:
            overrideStart ??
            textarea?.selectionStart ??
            content.length,
          selectionEnd:
            overrideEnd ??
            textarea?.selectionEnd ??
            content.length,
        };

        setHistory(
          (current) => [
            ...current.slice(
              -(MAX_HISTORY - 1)
            ),
            snapshot,
          ]
        );

        setFuture([]);
      },
      [
        title,
        content,
      ]
    );

  const undo =
    useCallback(() => {
      if (!history.length) {
        return;
      }

      const textarea =
        contentRef.current;

      const previous =
        history[
          history.length - 1
        ];

      const currentState: HistoryState =
        {
          title,
          content,
          selectionStart:
            textarea?.selectionStart ??
            content.length,
          selectionEnd:
            textarea?.selectionEnd ??
            content.length,
        };

      setFuture(
        (current) => [
          currentState,
          ...current,
        ]
      );

      setTitle(
        previous.title
      );

      setContent(
        previous.content
      );

      setHistory(
        (current) =>
          current.slice(0, -1)
      );

      typingHistoryRef.current =
        false;

      restoreTextareaSelection(
        previous.selectionStart,
        previous.selectionEnd
      );
    }, [
      history,
      title,
      content,
      restoreTextareaSelection,
    ]);

  const redo =
    useCallback(() => {
      if (!future.length) {
        return;
      }

      const textarea =
        contentRef.current;

      const next =
        future[0];

      const currentState: HistoryState =
        {
          title,
          content,
          selectionStart:
            textarea?.selectionStart ??
            content.length,
          selectionEnd:
            textarea?.selectionEnd ??
            content.length,
        };

      setHistory(
        (current) => [
          ...current,
          currentState,
        ]
      );

      setTitle(
        next.title
      );

      setContent(
        next.content
      );

      setFuture(
        (current) =>
          current.slice(1)
      );

      typingHistoryRef.current =
        false;

      restoreTextareaSelection(
        next.selectionStart,
        next.selectionEnd
      );
    }, [
      future,
      title,
      content,
      restoreTextareaSelection,
    ]);

  // =========================================================
  // AUTOSAVE
  // =========================================================

  const performSave =
    useCallback(
      async (
        silent = true
      ) => {
        const normalizedTitle =
          title.trim() ||
          "Untitled";

        const hasChanges =
          normalizedTitle !==
            lastSavedContent.current
              .title ||
          content !==
            lastSavedContent.current
              .content;

        if (!hasChanges) {
          return;
        }

        setSaveState(
          "saving"
        );

        try {
          const updatedNote:
            TripNoteDB = {
            ...note,
            title:
              normalizedTitle,
            blocks:
              textToBlocks(
                content
              ),
            trip_id:
              tripId,
          };

          await onSave(
            updatedNote,
            {
              silent,
            }
          );

          lastSavedContent.current =
            {
              title:
                normalizedTitle,
              content,
            };

          hasUnnotifiedEdit.current =
            true;

          setSaveState(
            "saved"
          );

          if (
            savedTimeoutRef.current
          ) {
            clearTimeout(
              savedTimeoutRef.current
            );
          }

          savedTimeoutRef.current =
            setTimeout(() => {
              setSaveState(
                "idle"
              );
            }, 1800);
        } catch {
          setSaveState(
            "idle"
          );
        }
      },
      [
        title,
        content,
        note,
        tripId,
        onSave,
        textToBlocks,
      ]
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      isInitialMount.current
    ) {
      isInitialMount.current =
        false;

      return;
    }

    if (
      saveTimeoutRef.current
    ) {
      clearTimeout(
        saveTimeoutRef.current
      );
    }

    saveTimeoutRef.current =
      setTimeout(() => {
        performSave(true);
      }, 900);

    return () => {
      if (
        saveTimeoutRef.current
      ) {
        clearTimeout(
          saveTimeoutRef.current
        );
      }
    };
  }, [
    title,
    content,
    open,
    performSave,
  ]);

  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose =
    async () => {
      await performSave(true);

      if (
        hasUnnotifiedEdit.current
      ) {
        hasUnnotifiedEdit.current =
          false;

        notifyNoteEdited(
          note.id
        );

        onNoteEdited?.({
          ...note,
          title:
            title.trim() ||
            "Untitled",
          blocks:
            textToBlocks(
              content
            ),
          trip_id:
            tripId,
        });
      }

      onClose();
    };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete =
    async () => {
      try {
        await onDelete(
          note.id
        );

        setShowDeleteDialog(
          false
        );

        onClose();
      } catch {
        setShowDeleteDialog(
          false
        );
      }
    };

  // =========================================================
  // TITLE KEYBOARD
  // =========================================================

  const handleTitleKeyDown =
    (
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (
        e.key === "Enter"
      ) {
        e.preventDefault();

        contentRef.current?.focus();

        contentRef.current?.setSelectionRange(
          0,
          0
        );
      }
    };

  // =========================================================
  // CHECKLIST MARKER
  // =========================================================

  const toggleCheckbox =
    (
      lineIndex: number,
      cursorPos?: number
    ) => {
      const lines =
        content.split("\n");

      const line =
        lines[lineIndex] ??
        "";

      if (
        /^\s*☐/.test(line)
      ) {
        pushHistory();

        lines[lineIndex] =
          line.replace(
            "☐",
            "☑"
          );
      } else if (
        /^\s*☑/.test(line)
      ) {
        pushHistory();

        lines[lineIndex] =
          line.replace(
            "☑",
            "☐"
          );
      } else {
        return;
      }

      const newContent =
        lines.join("\n");

      setContent(
        newContent
      );

      if (
        typeof cursorPos ===
        "number"
      ) {
        restoreTextareaSelection(
          cursorPos,
          cursorPos
        );
      }
    };

  // =========================================================
  // TEXTAREA CLICK
  // =========================================================

  const handleContentClick =
    () => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      const pos =
        textarea.selectionStart;

      const value =
        textarea.value;

      const lineStart =
        value.lastIndexOf(
          "\n",
          pos - 1
        ) + 1;

      const lineEndIndex =
        value.indexOf(
          "\n",
          pos
        );

      const lineEnd =
        lineEndIndex === -1
          ? value.length
          : lineEndIndex;

      const line =
        value.slice(
          lineStart,
          lineEnd
        );

      const match =
        line.match(
          /^(\s*)(?:☐|☑)/
        );

      if (!match) {
        return;
      }

      const tokenStart =
        lineStart +
        match[1].length;

      const tokenEnd =
        tokenStart + 1;

      if (
        pos >= tokenStart &&
        pos <= tokenEnd
      ) {
        const lineIndex =
          value
            .slice(
              0,
              lineStart
            )
            .split("\n")
            .length - 1;

        toggleCheckbox(
          lineIndex,
          pos
        );
      }
    };

  // =========================================================
  // CONTENT CHANGE
  // =========================================================

  const handleContentChange =
    (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      const cursorPos =
        e.currentTarget.selectionStart;

      let nextValue =
        e.currentTarget.value;

      let overrideCursorPos:
        | number
        | null = null;

      /*
       * Auto-bullet on "- " / "* ". Gated on the input event itself
       * (a real single-space keystroke) so paste, autocomplete, and
       * IME composition never trigger it.
       */
      const inputEvent =
        e.nativeEvent as InputEvent;

      if (
        inputEvent?.inputType ===
          "insertText" &&
        inputEvent.data === " "
      ) {
        const beforeCursor =
          nextValue.slice(
            0,
            cursorPos
          );

        const lineStart =
          beforeCursor.lastIndexOf(
            "\n"
          ) + 1;

        const currentLine =
          beforeCursor.slice(
            lineStart
          );

        const autoBulletMatch =
          currentLine.match(
            /^(\s*)[-*] $/
          );

        if (autoBulletMatch) {
          const replacementPrefix =
            `${autoBulletMatch[1]}• `;

          nextValue =
            nextValue.slice(
              0,
              lineStart
            ) +
            replacementPrefix +
            nextValue.slice(
              cursorPos
            );

          overrideCursorPos =
            lineStart +
            replacementPrefix.length;
        }
      }

      if (
        !typingHistoryRef.current
      ) {
        pushHistory(
          title,
          content,
          e.currentTarget
            .selectionStart,
          e.currentTarget
            .selectionEnd
        );

        typingHistoryRef.current =
          true;
      }

      if (
        typingHistoryTimeoutRef.current
      ) {
        clearTimeout(
          typingHistoryTimeoutRef.current
        );
      }

      typingHistoryTimeoutRef.current =
        setTimeout(() => {
          typingHistoryRef.current =
            false;
        }, 700);

      setContent(
        nextValue
      );

      if (
        overrideCursorPos !== null
      ) {
        restoreTextareaSelection(
          overrideCursorPos,
          overrideCursorPos
        );
      }

      requestAnimationFrame(() => {
        ensureCursorVisible();
        ensureEditorCaretVisible();
      });
    };

  // =========================================================
  // LIST HELPERS
  // =========================================================

  const getLineRange =
    useCallback(
      (
        start: number,
        end: number
      ) => {
        let lineStart =
          content.lastIndexOf(
            "\n",
            start - 1
          ) + 1;

        let lineEnd =
          content.indexOf(
            "\n",
            end
          );

        if (
          lineEnd === -1
        ) {
          lineEnd =
            content.length;
        }

        /*
         * If selection ends exactly at the
         * beginning of a new line, do not
         * accidentally include that line.
         */
        if (
          end > start &&
          end > lineStart &&
          content[end - 1] ===
            "\n"
        ) {
          lineEnd =
            end - 1;
        }

        return {
          lineStart,
          lineEnd,
        };
      },
      [content]
    );

  const stripListPrefix =
    (
      line: string
    ) => {
      const match =
        line.match(
          /^(\s*)(?:•|☐|☑|\d+\.)\s*/
        );

      if (!match) {
        return {
          indentation: "",
          text: line,
          type: null as
            | ListType
            | null,
          checked: false,
        };
      }

      const marker =
        match[0];

      let type:
        | ListType
        | null =
        null;

      let checked =
        false;

      if (
        /•/.test(marker)
      ) {
        type = "bullet";
      } else if (
        /☐|☑/.test(marker)
      ) {
        type = "checklist";
        checked =
          /☑/.test(marker);
      } else if (
        /\d+\./.test(marker)
      ) {
        type = "number";
      }

      return {
        indentation:
          match[1] || "",
        text:
          line.slice(
            marker.length
          ),
        type,
        checked,
      };
    };

  /*
   * Shared engine for Bullet + Checklist.
   *
   * This is intentionally one formatter.
   * The only difference is the marker that
   * gets inserted.
   */
  const toggleListFormat =
    (
      type: ListType
    ) => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      const start =
        textarea.selectionStart;

      const end =
        textarea.selectionEnd;

      pushHistory();

      const {
        lineStart,
        lineEnd,
      } = getLineRange(
        start,
        end
      );

      const selectedText =
        content.slice(
          lineStart,
          lineEnd
        );

      const lines =
        selectedText.split(
          "\n"
        );

      const parsedLines =
        lines.map(
          (line) =>
            stripListPrefix(
              line
            )
        );

      const meaningfulLines =
        parsedLines.filter(
          (line) =>
            line.text.trim()
        );

      if (
        !meaningfulLines.length
      ) {
        return;
      }

      const allSameType =
        meaningfulLines.every(
          (line) =>
            line.type ===
            type
        );

      /*
       * Same format pressed again:
       * remove the format completely.
       *
       * This gives us the iPhone/Notes-style
       * toggle behavior.
       */
      if (allSameType) {
        const unformatted =
          parsedLines.map(
            (line) =>
              line.text
                ? `${line.indentation}${line.text}`
                : line.text
          );

        const replacement =
          unformatted.join(
            "\n"
          );

        const newContent =
          renumberNumberedLines(
            content.slice(
              0,
              lineStart
            ) +
            replacement +
            content.slice(
              lineEnd
            )
          );

        setContent(
          newContent
        );

        const selectedLength =
          replacement.length;

        requestAnimationFrame(
          () => {
            textarea.focus();

            textarea.setSelectionRange(
              lineStart,
              lineStart +
                selectedLength
            );

            ensureCursorVisible();
          }
        );

        return;
      }

      /*
       * Convert selected lines to
       * the requested list type.
       */
      let numberCounter =
        0;

      const formattedLines =
        parsedLines.map(
          (line) => {
            if (
              !line.text.trim()
            ) {
              return line.text;
            }

            if (
              type ===
              "bullet"
            ) {
              return `${line.indentation}• ${line.text}`;
            }

            if (
              type ===
              "checklist"
            ) {
              /*
               * Preserve an existing checked
               * checklist item when converting
               * mixed selections.
               */
              const marker =
                line.type ===
                  "checklist" &&
                line.checked
                  ? "☑"
                  : "☐";

              return `${line.indentation}${marker} ${line.text}`;
            }

            numberCounter += 1;

            return `${line.indentation}${numberCounter}. ${line.text}`;
          }
        );

      const replacement =
        formattedLines.join(
          "\n"
        );

      const newContent =
        renumberNumberedLines(
          content.slice(
            0,
            lineStart
          ) +
          replacement +
          content.slice(
            lineEnd
          )
        );

      setContent(
        newContent
      );

      requestAnimationFrame(
        () => {
          textarea.focus();

          textarea.setSelectionRange(
            lineStart,
            lineStart +
              replacement.length
          );

          ensureCursorVisible();
        }
      );
    };

  // =========================================================
  // KEYBOARD
  // =========================================================

  const handleContentKeyDown =
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      const hasCommandModifier =
        e.metaKey ||
        e.ctrlKey;

      // -------------------------------------------------------
      // UNDO / REDO
      // -------------------------------------------------------

      if (
        hasCommandModifier
      ) {
        const key =
          e.key.toLowerCase();

        if (
          key === "z"
        ) {
          e.preventDefault();

          typingHistoryRef.current =
            false;

          if (
            e.shiftKey
          ) {
            redo();
          } else {
            undo();
          }

          return;
        }

        if (
          key === "y" &&
          !e.shiftKey
        ) {
          e.preventDefault();

          typingHistoryRef.current =
            false;

          redo();

          return;
        }

        // -----------------------------------------------------
        // SELECT ALL
        // -----------------------------------------------------

        if (
          key === "a" &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();

          setIsSelectAllActive(
            true
          );

          requestAnimationFrame(
            () => {
              textarea.focus();

              textarea.setSelectionRange(
                0,
                textarea.value.length
              );
            }
          );

          return;
        }
      }

      // -------------------------------------------------------
      // DELETE ALL
      // -------------------------------------------------------

      if (
        e.key === "Backspace" &&
        textarea.selectionStart ===
          0 &&
        textarea.selectionEnd ===
          textarea.value.length
      ) {
        e.preventDefault();

        if (content.length) {
          pushHistory();

          setContent("");

          setIsSelectAllActive(
            false
          );

          requestAnimationFrame(
            () => {
              textarea.focus();

              textarea.setSelectionRange(
                0,
                0
              );

              textarea.scrollTop =
                0;

              syncMirrorScroll();
            }
          );
        }

        return;
      }

      // -------------------------------------------------------
      // ESCAPE
      // -------------------------------------------------------

      if (
        e.key === "Escape"
      ) {
        setIsSelectAllActive(
          false
        );
      }

      // -------------------------------------------------------
      // ENTER - SMART LIST CONTINUATION
      // -------------------------------------------------------

      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.nativeEvent.isComposing
      ) {
        const cursorPos =
          textarea.selectionStart;

        const beforeCursor =
          content.slice(
            0,
            cursorPos
          );

        const afterCursor =
          content.slice(
            cursorPos
          );

        const lines =
          beforeCursor.split(
            "\n"
          );

        const currentLine =
          lines[
            lines.length - 1
          ];

        const bulletMatch =
          currentLine.match(
            /^(\s*)•\s+(.*)$/
          );

        const numberMatch =
          currentLine.match(
            /^(\s*)(\d+)\.\s+(.*)$/
          );

        const checklistMatch =
          currentLine.match(
            /^(\s*)(☐|☑)\s*(.*)$/
          );

        // Empty list item ends the list.
        if (
          (
            bulletMatch &&
            !bulletMatch[2].trim()
          ) ||
          (
            numberMatch &&
            !numberMatch[3].trim()
          ) ||
          (
            checklistMatch &&
            !checklistMatch[3].trim()
          )
        ) {
          e.preventDefault();

          pushHistory();

          const newLines =
            [...lines];

          newLines[
            newLines.length - 1
          ] = "";

          const newContent =
            newLines.join(
              "\n"
            ) +
            afterCursor;

          setContent(
            newContent
          );

          requestAnimationFrame(
            () => {
              const newPos =
                newContent.length -
                afterCursor.length;

              textarea.focus();

              textarea.setSelectionRange(
                newPos,
                newPos
              );

              ensureCursorVisible();
              ensureEditorCaretVisible();
            }
          );

          return;
        }

        let prefix =
          "";

        if (
          bulletMatch &&
          bulletMatch[2].trim()
        ) {
          prefix =
            `${bulletMatch[1]}• `;
        } else if (
          numberMatch &&
          numberMatch[3].trim()
        ) {
          const nextNumber =
            parseInt(
              numberMatch[2],
              10
            ) + 1;

          prefix =
            `${numberMatch[1]}${nextNumber}. `;
        } else if (
          checklistMatch &&
          checklistMatch[3].trim()
        ) {
          prefix =
            `${checklistMatch[1]}☐ `;
        }

        if (prefix) {
          e.preventDefault();

          pushHistory();

          const newContent =
            renumberNumberedLines(
              beforeCursor +
              "\n" +
              prefix +
              afterCursor
            );

          setContent(
            newContent
          );

          requestAnimationFrame(
            () => {
              const newPos =
                cursorPos +
                1 +
                prefix.length;

              textarea.focus();

              textarea.setSelectionRange(
                newPos,
                newPos
              );

              ensureCursorVisible();
            }
          );

          return;
        }
      }

      // -------------------------------------------------------
      // TAB / SHIFT+TAB - INDENT / OUTDENT LIST ITEMS
      // -------------------------------------------------------

      if (
        e.key === "Tab" &&
        !e.nativeEvent.isComposing
      ) {
        const start =
          textarea.selectionStart;

        const end =
          textarea.selectionEnd;

        const {
          lineStart,
          lineEnd,
        } = getLineRange(
          start,
          end
        );

        const selectedText =
          content.slice(
            lineStart,
            lineEnd
          );

        const selectedLines =
          selectedText.split(
            "\n"
          );

        const parsedSelectedLines =
          selectedLines.map(
            (line) =>
              stripListPrefix(
                line
              )
          );

        const isListSelection =
          parsedSelectedLines.some(
            (line) =>
              line.type !== null
          );

        // Not a list line: let Tab through for focus navigation.
        if (!isListSelection) {
          return;
        }

        e.preventDefault();

        pushHistory();

        const indentedLines =
          selectedLines.map(
            (line, index) => {
              if (
                parsedSelectedLines[
                  index
                ].type === null
              ) {
                return line;
              }

              if (e.shiftKey) {
                if (
                  line.startsWith(
                    INDENT_UNIT
                  )
                ) {
                  return line.slice(
                    INDENT_UNIT.length
                  );
                }

                return line.replace(
                  /^\s+/,
                  ""
                );
              }

              return `${INDENT_UNIT}${line}`;
            }
          );

        const replacement =
          indentedLines.join(
            "\n"
          );

        const newContent =
          renumberNumberedLines(
            content.slice(
              0,
              lineStart
            ) +
            replacement +
            content.slice(
              lineEnd
            )
          );

        setContent(
          newContent
        );

        requestAnimationFrame(
          () => {
            textarea.focus();

            textarea.setSelectionRange(
              lineStart,
              lineStart +
                replacement.length
            );

            ensureCursorVisible();
          }
        );

        return;
      }

      // -------------------------------------------------------
      // ARROW UP / DOWN
      //
      // Never prevent native textarea movement.
      // -------------------------------------------------------

      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        requestAnimationFrame(
          () => {
            ensureCursorVisible();
            ensureEditorCaretVisible();
          }
        );

        return;
      }

      // -------------------------------------------------------
      // BACKSPACE LIST MARKER
      // -------------------------------------------------------

      if (
        e.key === "Backspace" &&
        !e.altKey &&
        !e.nativeEvent.isComposing
      ) {
        const start =
          textarea.selectionStart;

        const end =
          textarea.selectionEnd;

        if (
          start !== end
        ) {
          return;
        }

        if (
          start > 0
        ) {
          const before =
            content.slice(
              0,
              start
            );

          const lineStart =
            before.lastIndexOf(
              "\n"
            ) + 1;

          const line =
            before.slice(
              lineStart
            );

          if (
            /^(\s*)• $/.test(
              line
            ) ||
            /^(\s*)☐ $/.test(
              line
            ) ||
            /^(\s*)☑ $/.test(
              line
            ) ||
            /^(\s*)\d+\. $/.test(
              line
            )
          ) {
            e.preventDefault();

            pushHistory();

            const indentMatch =
              line.match(
                /^(\s*)/
              );

            const indentation =
              indentMatch
                ? indentMatch[1]
                : "";

            /*
             * Two-stage backspace: an indented empty item is
             * outdented one level first, keeping its marker.
             * Only a top-level empty item has its marker removed.
             */
            if (
              indentation.length >
              0
            ) {
              const outdented =
                line.startsWith(
                  INDENT_UNIT
                )
                  ? line.slice(
                      INDENT_UNIT.length
                    )
                  : line.replace(
                      /^\s+/,
                      ""
                    );

              const removedLength =
                line.length -
                outdented.length;

              const newContent =
                renumberNumberedLines(
                  content.slice(
                    0,
                    lineStart
                  ) +
                  outdented +
                  content.slice(
                    start
                  )
                );

              setContent(
                newContent
              );

              const newPos =
                start -
                removedLength;

              requestAnimationFrame(
                () => {
                  textarea.focus();

                  textarea.setSelectionRange(
                    newPos,
                    newPos
                  );

                  ensureCursorVisible();
                  ensureEditorCaretVisible();
                }
              );

              return;
            }

            const newContent =
              renumberNumberedLines(
                content.slice(
                  0,
                  lineStart
                ) +
                content.slice(
                  start
                )
              );

            setContent(
              newContent
            );

            requestAnimationFrame(
              () => {
                textarea.focus();

                textarea.setSelectionRange(
                  lineStart,
                  lineStart
                );

                ensureCursorVisible();
                ensureEditorCaretVisible();
              }
            );

            return;
          }
        }
      }
    };

  // =========================================================
  // KEYUP
  // =========================================================

  const handleContentKeyUp =
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "Enter"
      ) {
        requestAnimationFrame(
          () => {
            ensureCursorVisible();
            ensureEditorCaretVisible();
          }
        );
      }

      if (
        e.key === "Escape"
      ) {
        setIsSelectAllActive(
          false
        );
      }
    };

  // =========================================================
  // SEARCH
  // =========================================================

  const searchMatches =
    useMemo(() => {
      if (
        !searchQuery.trim()
      ) {
        return [];
      }

      const query =
        searchQuery.toLowerCase();

      const lowerContent =
        content.toLowerCase();

      const matches: Array<{
        start: number;
        end: number;
      }> = [];

      let position =
        lowerContent.indexOf(
          query
        );

      while (
        position !== -1
      ) {
        matches.push({
          start:
            position,
          end:
            position +
            query.length,
        });

        position =
          lowerContent.indexOf(
            query,
            position +
              query.length
          );
      }

      return matches;
    }, [
      content,
      searchQuery,
    ]);

  useEffect(() => {
    setSearchIndex(
      0
    );
  }, [
    searchQuery,
  ]);

  const goToSearchMatch =
    (
      direction: 1 | -1
    ) => {
      if (
        !searchMatches.length
      ) {
        return;
      }

      const next =
        (
          searchIndex +
          direction +
          searchMatches.length
        ) %
        searchMatches.length;

      setSearchIndex(
        next
      );

      const match =
        searchMatches[next];

      restoreTextareaSelection(
        match.start,
        match.end
      );

      requestAnimationFrame(
        () => {
          ensureCursorVisible();
        }
      );
    };

  // =========================================================
  // LINK HELPERS
  // =========================================================

  const normalizeExternalUrl =
    (
      rawUrl: string
    ): string | null => {
      const trimmed =
        rawUrl.trim();

      if (!trimmed) {
        return null;
      }

      const withProtocol =
        /^https?:\/\//i.test(
          trimmed
        )
          ? trimmed
          : `https://${trimmed}`;

      try {
        const parsed =
          new URL(
            withProtocol
          );

        if (
          parsed.protocol !==
            "http:" &&
          parsed.protocol !==
            "https:"
        ) {
          return null;
        }

        return parsed.toString();
      } catch {
        return null;
      }
    };

  const requestOpenLink =
    (
      rawUrl: string
    ) => {
      const normalized =
        normalizeExternalUrl(
          rawUrl
        );

      if (!normalized) {
        return;
      }

      setPendingLinkUrl(
        normalized
      );

      setLinkDialogMode(
        "open"
      );

      setShowLinkDialog(
        true
      );
    };

  const addLink =
    () => {
      setPendingLinkUrl(
        ""
      );

      setLinkDialogMode(
        "add"
      );

      setShowLinkDialog(
        true
      );
    };

  const cancelOpenLink =
    () => {
      setShowLinkDialog(
        false
      );

      setPendingLinkUrl(
        ""
      );

      setLinkDialogMode(
        "add"
      );
    };

  const confirmOpenLink =
    () => {
      if (
        !pendingLinkUrl
      ) {
        return;
      }

      window.open(
        pendingLinkUrl,
        "_blank",
        "noopener,noreferrer"
      );

      cancelOpenLink();
    };

  const insertLinkIntoContent =
    (
      rawUrl: string
    ) => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      const normalized =
        normalizeExternalUrl(
          rawUrl
        );

      if (!normalized) {
        return;
      }

      const start =
        textarea.selectionStart;

      const end =
        textarea.selectionEnd;

      pushHistory();

      const selectedText =
        content.slice(
          start,
          end
        );

      const replacement =
        selectedText.trim()
          ? `${selectedText} (${normalized})`
          : normalized;

      const newContent =
        content.slice(
          0,
          start
        ) +
        replacement +
        content.slice(
          end
        );

      const newCursor =
        start +
        replacement.length;

      setContent(
        newContent
      );

      cancelOpenLink();

      requestAnimationFrame(
        () => {
          textarea.focus();

          textarea.setSelectionRange(
            newCursor,
            newCursor
          );

          ensureCursorVisible();
        }
      );
    };

  // =========================================================
  // MIRROR RENDERING
  // =========================================================

  const renderDecoratedLine =
    (
      line: string,
      lineIndex: number,
      lineStartOffset: number
    ) => {
      const query =
        searchQuery.trim();

      const renderSegment =
        (
          segment: string,
          key: string,
          segmentOffset: number
        ) => {
          if (
            !segment
          ) {
            return null;
          }

          linkPattern.lastIndex =
            0;

          const isLink =
            linkPattern.test(
              segment
            );

          linkPattern.lastIndex =
            0;

          if (
            isLink
          ) {
            return (
              <button
                key={key}
                type="button"
                onPointerDown={(
                  e
                ) => {
                  e.stopPropagation();
                  e.preventDefault();

                  requestOpenLink(
                    segment
                  );
                }}
                className="
                  pointer-events-auto
                  relative
                  z-30
                  cursor-pointer
                  text-blue-600
                  underline
                  underline-offset-2
                  hover:text-blue-700
                "
              >
                {segment}
              </button>
            );
          }

          if (
            !query
          ) {
            return (
              <span
                key={key}
              >
                {segment}
              </span>
            );
          }

          const lower =
            segment.toLowerCase();

          const lowerQuery =
            query.toLowerCase();

          const pieces: React.ReactNode[] =
            [];

          let cursor =
            0;

          let index =
            lower.indexOf(
              lowerQuery
            );

          let matchNumber =
            0;

          while (
            index !== -1
          ) {
            if (
              index >
              cursor
            ) {
              pieces.push(
                <span
                  key={`${key}-text-${matchNumber}`}
                >
                  {segment.slice(
                    cursor,
                    index
                  )}
                </span>
              );
            }

            const absoluteMatchStart =
              lineStartOffset +
              segmentOffset +
              index;

            const isActiveMatch =
              searchMatches[searchIndex]?.start ===
              absoluteMatchStart;

            pieces.push(
              <mark
                key={`${key}-match-${matchNumber}`}
                className={cn(
                  "rounded-[2px] px-0 text-inherit",
                  isActiveMatch
                    ? "bg-black text-white"
                    : "bg-transparent text-muted-foreground"
                )}
              >
                {segment.slice(
                  index,
                  index +
                    query.length
                )}
              </mark>
            );

            cursor =
              index +
              query.length;

            matchNumber +=
              1;

            index =
              lower.indexOf(
                lowerQuery,
                cursor
              );
          }

          if (
            cursor <
            segment.length
          ) {
            pieces.push(
              <span
                key={`${key}-tail`}
              >
                {segment.slice(
                  cursor
                )}
              </span>
            );
          }

          return pieces;
        };

      /*
       * Split URLs first so links remain clickable.
       */
      const parts =
        line.split(
          linkPattern
        );

      let partOffset = 0;

      return parts.map(
        (
          part,
          partIndex
        ) => {
          const currentOffset =
            partOffset;

          partOffset +=
            part.length;

          return (
            <span
              key={`line-${lineIndex}-part-${partIndex}`}
            >
              {renderSegment(
                part,
                `segment-${lineIndex}-${partIndex}`,
                currentOffset
              )}
            </span>
          );
        }
      );
    };

  // =========================================================
  // NOTE STATISTICS
  // =========================================================

  const noteStats =
    useMemo(() => {
      const lines =
        content.split(
          "\n"
        );

      const words =
        content
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      let bullets = 0;
      let numbered = 0;
      let checklists = 0;
      let completed = 0;
      let textBlocks = 0;

      lines.forEach(
        (line) => {
          if (
            /^\s*•\s+/.test(
              line
            )
          ) {
            bullets += 1;
          } else if (
            /^\s*\d+\.\s+/.test(
              line
            )
          ) {
            numbered += 1;
          } else if (
            /^\s*[☐☑]\s+/.test(
              line
            )
          ) {
            checklists += 1;

            if (
              /^\s*☑/.test(
                line
              )
            ) {
              completed += 1;
            }
          } else if (
            line.trim()
          ) {
            textBlocks += 1;
          }
        }
      );

      linkPattern.lastIndex =
        0;

      const links =
        content.match(
          linkPattern
        )?.length || 0;

      linkPattern.lastIndex =
        0;

      return {
        words:
          words.length,
        characters:
          content.length,
        blocks:
          lines.filter(
            (line) =>
              line.trim()
          ).length,
        textBlocks,
        bullets,
        numbered,
        checklists,
        completed,
        links,
      };
    }, [
      content,
    ]);

  // =========================================================
  // NOTE DETAILS
  // =========================================================

  const formatTimestamp =
    (
      value?: string | null
    ) => {
      if (!value) {
        return null;
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return new Intl.DateTimeFormat(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }
      ).format(date);
    };

  const createdAtLabel =
    formatTimestamp(
      note.created_at
    );

  const updatedAtLabel =
    formatTimestamp(
      note.updated_at
    );

  const lastEditedById =
    note.last_edited_by ||
    note.author_id;

  const noteSummary =
    useMemo(() => {
      const summary =
        content
          .replace(
            /(^|\n)\s*(?:•|☐|☑|\d+\.)\s*/g,
            "$1"
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      if (!summary) {
        return null;
      }

      if (
        summary.length <=
        220
      ) {
        return summary;
      }

      return `${summary
        .slice(0, 220)
        .trimEnd()}…`;
    }, [
      content,
    ]);

  const displayName =
    (
      id?: string | null
    ) => {
      if (!id) {
        return null;
      }

      if (
        id === user?.id
      ) {
        return "You";
      }

      return (
        peopleNames[id] ||
        "Trip member"
      );
    };

  // =========================================================
  // LOAD PROFILE NAMES
  // =========================================================

  useEffect(() => {
    if (!showStats) {
      return;
    }

    const ids = [
      note.author_id,
      note.last_edited_by,
    ].filter(
      (
        id
      ): id is string =>
        Boolean(id)
    );

    const missing =
      ids.filter(
        (id) =>
          id !== user?.id &&
          !peopleNames[id]
      );

    if (
      !missing.length
    ) {
      return;
    }

    let cancelled =
      false;

    const loadNames =
      async () => {
        const {
          data,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              "id, full_name, username"
            )
            .in(
              "id",
              Array.from(
                new Set(
                  missing
                )
              )
            );

        if (
          cancelled ||
          !data
        ) {
          return;
        }

        setPeopleNames(
          (
            current
          ) => ({
            ...current,
            ...Object.fromEntries(
              data.map(
                (
                  profile
                ) => [
                  profile.id,
                  profile.full_name ||
                    profile.username ||
                    "Trip member",
                ]
              )
            ),
          })
        );
      };

    loadNames();

    return () => {
      cancelled = true;
    };
  }, [
    showStats,
    note.author_id,
    note.last_edited_by,
    user?.id,
    peopleNames,
  ]);

  // =========================================================
  // COPY
  // =========================================================

  const copyNote =
    async () => {
      try {
        await navigator.clipboard.writeText(
          `${title}\n\n${content}`.trim()
        );

        toast({
          title:
            "Note copied",
          description:
            "The note content was copied to your clipboard.",
        });
      } catch {
        toast({
          title:
            "Copy failed",
          description:
            "The note could not be copied to your clipboard.",
        });
      }
    };

  // =========================================================
  // SELECT ALL / DELETE ALL
  // =========================================================

  const selectAllContent =
    () => {
      const textarea =
        contentRef.current;

      if (!textarea) {
        return;
      }

      setIsSelectAllActive(
        true
      );

      textarea.focus();

      textarea.setSelectionRange(
        0,
        textarea.value.length
      );
    };

  const clearEntireNoteBody =
    useCallback(() => {
      if (!content.length) {
        return;
      }

      const textarea =
        contentRef.current;

      pushHistory();

      setContent("");

      setIsSelectAllActive(
        false
      );

      requestAnimationFrame(
        () => {
          textarea?.focus();

          textarea?.setSelectionRange(
            0,
            0
          );

          if (textarea) {
            textarea.scrollTop =
              0;
          }

          syncMirrorScroll();
        }
      );
    }, [
      content.length,
      pushHistory,
      syncMirrorScroll,
    ]);

  // =========================================================
  // MIRROR SYNC
  // =========================================================

  useEffect(() => {
    if (
      !open ||
      !shouldRenderMirror ||
      !contentMirrorRef.current ||
      !contentRef.current
    ) {
      return;
    }

    const frame =
      requestAnimationFrame(
        () => {
          syncMirrorScroll();
        }
      );

    return () =>
      cancelAnimationFrame(
        frame
      );
  }, [
    content,
    open,
    shouldRenderMirror,
    syncMirrorScroll,
  ]);

  // =========================================================
  // SELECTION STATE
  // =========================================================

  useEffect(() => {
    if (
      !isSelectAllActive
    ) {
      return;
    }

    const handlePointerDown =
      () => {
        setIsSelectAllActive(
          false
        );
      };

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, [
    isSelectAllActive,
  ]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            void handleClose();
          }
        }}
      >
        <DrawerContent
          data-enable-drag="true"
          className="
            flex
            max-h-[100dvh]
            min-h-[100dvh]
            flex-col
            overflow-hidden
            rounded-t-2xl
          "
        >
          {/* ================================================= */}
          {/* TOP HEADER                                        */}
          {/* ================================================= */}

          <div
            className="
              shrink-0
              border-b
              border-border/50
              bg-background
              pt-[calc(env(safe-area-inset-top)+0.75rem)]
              sm:pt-0
            "
          >
            <div
              className="
                relative
                flex
                h-14
                items-center
                justify-between
                px-3
              "
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void handleClose()
                }
                className="gap-1 px-2"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">
                  Back
                </span>
              </Button>

              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                {saveState === "saving" && "Saving..."}
                {saveState === "saved" && (
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Saved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setShowSearch(
                      true
                    )
                  }
                  className={
                    TOUCH_BUTTON
                  }
                  title="Search"
                >
                  <Search className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setShowMoreTools(
                      true
                    )
                  }
                  className={
                    TOUCH_BUTTON
                  }
                  title="More Tools"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setShowDeleteDialog(
                      true
                    )
                  }
                  className={cn(
                    TOUCH_BUTTON,
                    "text-destructive"
                  )}
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* ================================================= */}
            {/* EDITOR TOOLBAR                                   */}
            {/* ================================================= */}

            <div
              className="
                flex
                items-center
                gap-1
                overflow-x-auto
                border-t
                border-border/40
                px-3
                py-2
                scrollbar-none
              "
            >
              {/* Undo */}
              <Button
                variant="ghost"
                size="icon"
                disabled={
                  history.length ===
                  0
                }
                onClick={
                  undo
                }
                className={
                  TOUCH_BUTTON
                }
                title="Undo"
              >
                <Undo2 className="h-5 w-5" />
              </Button>

              {/* Redo */}
              <Button
                variant="ghost"
                size="icon"
                disabled={
                  future.length ===
                  0
                }
                onClick={
                  redo
                }
                className={
                  TOUCH_BUTTON
                }
                title="Redo"
              >
                <Redo2 className="h-5 w-5" />
              </Button>

              <div className="mx-1 h-6 w-px shrink-0 bg-border" />

              {/* Bullet */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleListFormat(
                    "bullet"
                  )
                }
                className={
                  TOUCH_BUTTON
                }
                title="Bullet List"
              >
                <List className="h-5 w-5" />
              </Button>

              {/* Numbered */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleListFormat(
                    "number"
                  )
                }
                className={
                  TOUCH_BUTTON
                }
                title="Numbered List"
              >
                <ListOrdered className="h-5 w-5" />
              </Button>

              {/* Checklist */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleListFormat(
                    "checklist"
                  )
                }
                className={
                  TOUCH_BUTTON
                }
                title="Checklist"
              >
                <CheckSquare className="h-5 w-5" />
              </Button>

              {/* Link */}
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  addLink
                }
                className={
                  TOUCH_BUTTON
                }
                title="Link"
              >
                <LinkIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* ================================================= */}
          {/* EDITOR BODY                                       */}
          {/* ================================================= */}

          <div
            ref={contentScrollRef}
            data-vaul-no-drag="true"
            className="
              flex
              flex-col
              min-h-0
              flex-1
              overflow-y-auto
              overscroll-contain
              bg-background
            "
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
              {/* TITLE */}

              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleTitleKeyDown
                }
                placeholder="Title"
                className="w-full shrink-0 border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/50 sm:text-3xl"
              />

              {/* ================================================= */}
              {/* SINGLE TEXTAREA EDITOR                            */}
              {/* ================================================= */}

              <div ref={editorWrapperRef} className="relative flex flex-1 flex-col">
                {shouldRenderMirror && (
                  <div
                    ref={
                      contentMirrorRef
                    }
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 z-20 overflow-hidden whitespace-pre-wrap break-words leading-relaxed text-foreground py-2 px-3",
                      "text-base sm:text-lg"
                    )}
                  >
                    {(() => {
                      let lineStartOffset = 0;

                      return content
                        .split("\n")
                        .map(
                          (
                            line,
                            lineIndex
                          ) => {
                            const currentLineOffset =
                              lineStartOffset;

                            lineStartOffset +=
                              line.length +
                              1;

                            /*
                             * The mirror must stay metrically
                             * identical to the textarea, so every
                             * character of a checklist line still
                             * renders in flow: the ☐/☑ glyph is
                             * painted transparent (preserving its
                             * exact width) and the real tappable
                             * checkbox is layered on top of it via
                             * position:absolute, contributing zero
                             * layout.
                             */
                            const checklistMatch =
                              line.match(
                                /^(\s*)(☐|☑)([ \t]*)([\s\S]*)$/
                              );

                            if (line.length === 0) {
                              return (
                                <div
                                  key={`line-${lineIndex}`}
                                  className="min-h-[1.5em]"
                                >
                                  <span>
                                    &nbsp;
                                  </span>
                                </div>
                              );
                            }

                            if (!checklistMatch) {
                              return (
                                <div
                                  key={`line-${lineIndex}`}
                                  className="min-h-[1.5em]"
                                >
                                  {renderDecoratedLine(
                                    line,
                                    lineIndex,
                                    currentLineOffset
                                  )}
                                </div>
                              );
                            }

                            const indentation =
                              checklistMatch[1];

                            const glyph =
                              checklistMatch[2];

                            const gap =
                              checklistMatch[3];

                            const rest =
                              checklistMatch[4];

                            const isChecked =
                              glyph === "☑";

                            const restOffset =
                              currentLineOffset +
                              indentation.length +
                              glyph.length +
                              gap.length;

                            return (
                              <div
                                key={`line-${lineIndex}`}
                                className="min-h-[1.5em]"
                              >
                                <span>
                                  {indentation}
                                </span>

                                <span className="relative inline-block">
                                  <span className="text-transparent">
                                    {glyph}
                                  </span>

                                  <button
                                    type="button"
                                    aria-label={
                                      isChecked
                                        ? "Mark as not done"
                                        : "Mark as done"
                                    }
                                    onPointerDown={(
                                      event
                                    ) => {
                                      event.stopPropagation();
                                      event.preventDefault();

                                      toggleCheckbox(
                                        lineIndex,
                                        currentLineOffset +
                                          indentation.length +
                                          1
                                      );
                                    }}
                                    className="pointer-events-auto absolute left-1/2 top-1/2 z-30 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center overflow-visible"
                                  >
                                    <span
                                      className={cn(
                                        "flex h-[17px] w-[17px] items-center justify-center rounded border-2 transition-colors",
                                        isChecked
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-muted-foreground/50 bg-transparent"
                                      )}
                                    >
                                      {isChecked && (
                                        <Check
                                          className="h-3 w-3"
                                          strokeWidth={3}
                                        />
                                      )}
                                    </span>
                                  </button>
                                </span>

                                <span>
                                  {gap}
                                </span>

                                <span
                                  className={
                                    isChecked
                                      ? "text-muted-foreground line-through"
                                      : undefined
                                  }
                                >
                                  {renderDecoratedLine(
                                    rest,
                                    lineIndex,
                                    restOffset
                                  )}
                                </span>
                              </div>
                            );
                          }
                        );
                    })()}
                  </div>
                )}

                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={handleContentChange}
                  onClick={handleContentClick}
                  onKeyDown={handleContentKeyDown}
                  onKeyUp={handleContentKeyUp}
                  onScroll={handleContentScroll}
                  placeholder="Start typing..."
                  className={cn(
                    "relative z-10 w-full min-h-0 flex-1 border-none outline-none resize-none overflow-y-auto whitespace-pre-wrap break-words leading-relaxed bg-transparent text-base sm:text-lg placeholder:text-muted-foreground/50 py-2 px-3",
                    shouldRenderMirror
                      ? "text-transparent caret-foreground selection:bg-primary/25"
                      : "text-foreground"
                  )}
                />

                {isSelectAllActive && (
                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-0
                      z-[25]
                      rounded-sm
                      bg-primary/5
                    "
                  />
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ===================================================== */}
      {/* MORE TOOLS                                           */}
      {/* ===================================================== */}

      <Drawer
        open={showMoreTools}
        onOpenChange={
          setShowMoreTools
        }
      >
        <DrawerContent
          data-enable-drag="true"
          className="max-h-[70vh]"
        >
          <DrawerHeader>
            <DrawerTitle>
              Note Tools
            </DrawerTitle>
          </DrawerHeader>

          <div
            className="
              grid
              grid-cols-3
              gap-2
              px-5
              pb-8
            "
          >
            {/* Search */}

            <button
              type="button"
              onClick={() => {
                setShowMoreTools(
                  false
                );

                setShowSearch(
                  true
                );
              }}
              className="
                flex
                min-h-[80px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-muted/60
                text-sm
                active:scale-[0.98]
              "
            >
              <Search className="h-5 w-5" />
              Search
            </button>

            {/* Copy */}

            <button
              type="button"
              onClick={() => {
                void copyNote();

                setShowMoreTools(
                  false
                );
              }}
              className="
                flex
                min-h-[80px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-muted/60
                text-sm
                active:scale-[0.98]
              "
            >
              <Copy className="h-5 w-5" />
              Copy
            </button>

            {/* Details */}

            <button
              type="button"
              onClick={() => {
                setShowMoreTools(
                  false
                );

                setShowStats(
                  true
                );
              }}
              className="
                flex
                min-h-[80px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-muted/60
                text-sm
                active:scale-[0.98]
              "
            >
              <Info className="h-5 w-5" />
              Details
            </button>

            {/* Select All */}

            <button
              type="button"
              onClick={() => {
                selectAllContent();

                setShowMoreTools(
                  false
                );
              }}
              className="
                flex
                min-h-[80px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-muted/60
                text-sm
                active:scale-[0.98]
              "
            >
              <span className="text-xl font-semibold">
                A
              </span>
              Select All
            </button>

            {/* Delete All */}

            <button
              type="button"
              onClick={() => {
                setShowMoreTools(
                  false
                );

                requestAnimationFrame(
                  () => {
                    clearEntireNoteBody();
                  }
                );
              }}
              className="
                flex
                min-h-[80px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-muted/60
                text-sm
                text-destructive
                active:scale-[0.98]
              "
            >
              <Trash2 className="h-5 w-5" />
              Delete All
            </button>

            {/* Add Link */}

            <button
              type="button"
              onClick={() => {
                setShowMoreTools(
                  false
                );

                addLink();
              }}
              className="
                flex
                min-h-[80px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-muted/60
                text-sm
                active:scale-[0.98]
              "
            >
              <LinkIcon className="h-5 w-5" />
              Link
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ===================================================== */}
      {/* SEARCH                                               */}
      {/* ===================================================== */}

      <Drawer
        open={showSearch}
        onOpenChange={
          setShowSearch
        }
      >
        <DrawerContent
          data-enable-drag="true"
          className="max-h-[42vh]"
          style={
            searchKeyboardOffset > 0
              ? {
                  bottom: `${searchKeyboardOffset}px`,
                }
              : undefined
          }
        >
          <DrawerHeader>
            <DrawerTitle>
              Find in Note
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-5 pb-7">
            <div
              className="
                flex
                items-center
                gap-2
                rounded-2xl
                border
                bg-muted/30
                px-3
              "
            >
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />

              <input
                ref={searchInputRef}
                autoFocus
                value={
                  searchQuery
                }
                onChange={(event) =>
                  setSearchQuery(
                    event.target
                      .value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    goToSearchMatch(
                      event.shiftKey
                        ? -1
                        : 1
                    );
                  }
                }}
                placeholder="Search this note..."
                className="
                  h-12
                  min-w-0
                  flex-1
                  bg-transparent
                  outline-none
                "
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                  className="text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {searchMatches.length
                  ? `${searchIndex + 1} of ${searchMatches.length}`
                  : searchQuery
                  ? "No results"
                  : "Type to search"}
              </span>

              {searchMatches.length >
                0 && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      goToSearchMatch(
                        -1
                      )
                    }
                  >
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      goToSearchMatch(
                        1
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ===================================================== */}
      {/* NOTE DETAILS                                          */}
      {/* ===================================================== */}

      <AlertDialog
        open={showStats}
        onOpenChange={
          setShowStats
        }
      >
        <AlertDialogContent className="z-[300]">
          <button
            type="button"
            aria-label="Close details"
            onClick={() =>
              setShowStats(
                false
              )
            }
            className="
              absolute
              right-3
              top-3
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              text-muted-foreground
              transition-colors
              hover:bg-muted
              active:bg-muted
            "
          >
            <X className="h-5 w-5" />
          </button>

          <AlertDialogHeader>
            <AlertDialogTitle>
              Note Details
            </AlertDialogTitle>

            <AlertDialogDescription>
              {title.trim() ||
                "Untitled note"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto py-1">
            {/* TIMESTAMPS */}

            <div className="space-y-3">
              {createdAtLabel && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Created
                  </div>

                  <div className="text-sm">
                    {displayName(
                      note.author_id
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {createdAtLabel}
                  </div>
                </div>
              )}

              {!createdAtLabel && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Created By
                  </div>

                  <div className="text-sm">
                    {displayName(
                      note.author_id
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Last Edited
                </div>

                <div className="text-sm">
                  {displayName(
                    lastEditedById
                  )}
                </div>

                {updatedAtLabel && (
                  <div className="text-sm text-muted-foreground">
                    {updatedAtLabel}
                  </div>
                )}
              </div>
            </div>

            {/* SUMMARY */}

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Summary
              </div>

              <p className="text-sm leading-relaxed">
                {noteSummary ||
                  "This note is empty."}
              </p>
            </div>

            {/* CONTENT */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Content
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {
                      noteStats.blocks
                    }
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Items
                  </div>
                </div>

                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {
                      noteStats.completed
                    }
                    /
                    {
                      noteStats.checklists
                    }
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Completed
                  </div>
                </div>

                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {
                      noteStats.words
                    }
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Words
                  </div>
                </div>

                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {
                      noteStats.characters
                    }
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Characters
                  </div>
                </div>
              </div>
            </div>

            {/* BREAKDOWN */}

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Breakdown
              </div>

              <div className="space-y-1.5 text-sm">
                {[
                  {
                    label:
                      "Text",
                    value:
                      noteStats.textBlocks,
                  },
                  {
                    label:
                      "Bullets",
                    value:
                      noteStats.bullets,
                  },
                  {
                    label:
                      "Numbered",
                    value:
                      noteStats.numbered,
                  },
                  {
                    label:
                      "Checklist",
                    value:
                      noteStats.checklists,
                  },
                  {
                    label:
                      "Links",
                    value:
                      noteStats.links,
                  },
                ].map(
                  (
                    row
                  ) => (
                    <div
                      key={
                        row.label
                      }
                      className="flex items-center justify-between"
                    >
                      <span className="text-muted-foreground">
                        {
                          row.label
                        }
                      </span>

                      <span className="font-medium">
                        {
                          row.value
                        }
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <AlertDialogAction>
              Done
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================== */}
      {/* DELETE                                               */}
      {/* ===================================================== */}

      <AlertDialog
        open={
          showDeleteDialog
        }
        onOpenChange={
          setShowDeleteDialog
        }
      >
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Note
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want
              to delete "
              {
                title ||
                "this note"
              }
              "? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={
                handleDelete
              }
              className="
                bg-destructive
                text-destructive-foreground
                hover:bg-destructive/90
              "
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================== */}
      {/* LINK                                                 */}
      {/* ===================================================== */}

      <AlertDialog
        open={
          showLinkDialog
        }
        onOpenChange={(
          value
        ) => {
          if (!value) {
            cancelOpenLink();
          } else {
            setShowLinkDialog(
              true
            );
          }
        }}
      >
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {linkDialogMode ===
              "open"
                ? "Open External Link?"
                : "Add Link"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {linkDialogMode ===
              "open"
                ? "You are about to open this link in your browser."
                : "Enter a website URL to add to this note."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <div className="flex items-center gap-2 rounded-xl border px-3">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

              <input
                autoFocus
                type="url"
                value={
                  pendingLinkUrl
                }
                onChange={(
                  event
                ) =>
                  setPendingLinkUrl(
                    event.target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.nativeEvent
                      .isComposing
                  ) {
                    event.preventDefault();

                    if (
                      linkDialogMode ===
                      "open"
                    ) {
                      confirmOpenLink();
                      return;
                    }

                    if (
                      pendingLinkUrl
                    ) {
                      insertLinkIntoContent(
                        pendingLinkUrl
                      );
                    }
                  }
                }}
                placeholder="https://example.com"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={
                cancelOpenLink
              }
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                if (
                  linkDialogMode ===
                  "open"
                ) {
                  confirmOpenLink();
                  return;
                }

                if (
                  pendingLinkUrl
                ) {
                  insertLinkIntoContent(
                    pendingLinkUrl
                  );
                }
              }}
            >
              {linkDialogMode ===
              "open"
                ? "Open Link"
                : "Add Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================== */}
      {/* OFFSCREEN SELECTION MIRROR                            */}
      {/* ===================================================== */}

      <pre
        ref={
          selectionMirrorRef
        }
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          left-[-99999px]
          top-[-99999px]
          h-px
          w-px
          overflow-hidden
          whitespace-pre-wrap
        "
      >
        {content}
      </pre>
    </>
  );
}