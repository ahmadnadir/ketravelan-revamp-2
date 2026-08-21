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
  ExternalLink,
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
}

type SaveState =
  | "idle"
  | "saving"
  | "saved";

type EditorBlock = {
  id: string;
  type:
    | "text"
    | "bullet"
    | "number"
    | "checklist";
  content: string;
  checked?: boolean;
};

type HistoryState = {
  title: string;
  blocks: EditorBlock[];
};

export const canDeleteEmptyListBlock = (
  blocks: EditorBlock[],
  index: number
) => {
  const block = blocks[index];

  if (!block) {
    return false;
  }

  if (
    block.type === "text" ||
    block.content.trim()
  ) {
    return false;
  }

  return true;
};

const MAX_HISTORY = 50;

const TOUCH_BUTTON =
  "h-11 w-11 shrink-0 rounded-full";

const linkPattern =
  /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function NoteEditor({
  note,
  open,
  onClose,
  onSave,
  onDelete,
  tripId,
}: NoteEditorProps) {
  // =========================================================
  // STATE
  // =========================================================

  const [title, setTitle] =
    useState("");

  const [blocks, setBlocks] =
    useState<EditorBlock[]>([]);

  const [saveState, setSaveState] =
    useState<SaveState>("idle");

  const [activeBlockId, setActiveBlockId] =
    useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] =
    useState(false);

  const [showMoreTools, setShowMoreTools] =
    useState(false);

  const [showSearch, setShowSearch] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchIndex, setSearchIndex] =
    useState(0);

  const [showLinkDialog, setShowLinkDialog] =
    useState(false);

  const [pendingLinkUrl, setPendingLinkUrl] =
    useState("");

  const [showStats, setShowStats] =
    useState(false);

  const [history, setHistory] =
    useState<HistoryState[]>([]);

  const [future, setFuture] =
    useState<HistoryState[]>([]);

  const [isSelectAllActive, setIsSelectAllActive] =
    useState(false);

  const [peopleNames, setPeopleNames] =
    useState<
      Record<string, string>
    >({});

  const { toast } = useToast();

  const { user } = useAuth();

  // =========================================================
  // REFS
  // =========================================================

  const titleRef =
    useRef<HTMLInputElement>(null);

  const selectionMirrorRef =
    useRef<HTMLPreElement | null>(
      null
    );

  const blockRefs =
    useRef<
      Record<
        string,
        HTMLTextAreaElement | null
      >
    >({});

  const contentScrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const saveTimeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const savedTimeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const isInitialMount =
    useRef(true);

  // One "note edited" notification per editing session, not per autosave.
  const hasUnnotifiedEdit =
    useRef(false);

  const lastSaved =
    useRef({
      title: "",
      blocks: "",
    });

  // =========================================================
  // HELPERS
  // =========================================================

  const createId = () =>
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

  const cloneBlocks = (
    value: EditorBlock[]
  ): EditorBlock[] =>
    value.map((block) => ({
      ...block,
    }));

  const serializeBlocks = (
    value: EditorBlock[]
  ) =>
    JSON.stringify(
      value.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        ...(block.type ===
        "checklist"
          ? {
              checked: Boolean(
                block.checked
              ),
            }
          : {}),
      }))
    );

  // =========================================================
  // DB -> EDITOR
  // =========================================================

  const blocksToEditorBlocks = (
    source: NoteBlock[]
  ): EditorBlock[] => {
    return source.map(
      (block, index) => ({
        id:
          block.id ||
          `${Date.now()}-${index}`,
        type:
          block.type === "bullet" ||
          block.type === "number" ||
          block.type ===
            "checklist"
            ? block.type
            : "text",
        content:
          block.content || "",
        ...(block.type ===
        "checklist"
          ? {
              checked:
                Boolean(
                  block.checked
                ),
            }
          : {}),
      })
    );
  };

  // =========================================================
  // EDITOR -> DB
  // =========================================================

  const editorBlocksToDbBlocks = (
    source: EditorBlock[]
  ): NoteBlock[] => {
    return source.map(
      (block) => {
        if (
          block.type ===
          "checklist"
        ) {
          return {
            id: block.id,
            type: "checklist",
            content:
              block.content,
            checked:
              Boolean(
                block.checked
              ),
          } as NoteBlock;
        }

        return {
          id: block.id,
          type: block.type,
          content:
            block.content,
        } as NoteBlock;
      }
    );
  };

  // =========================================================
  // INITIALIZE
  // =========================================================

  useEffect(() => {
    if (!note || !open) {
      return;
    }

    const initialBlocks =
      blocksToEditorBlocks(
        note.blocks || []
      );

    setTitle(
      note.title || ""
    );

    setBlocks(
      initialBlocks
    );

    setHistory([]);
    setFuture([]);

    setActiveBlockId(
      initialBlocks[0]?.id ||
        null
    );

    setSearchQuery("");
    setSearchIndex(0);

    lastSaved.current = {
      title:
        note.title || "",
      blocks:
        serializeBlocks(
          initialBlocks
        ),
    };

    setSaveState("idle");

    isInitialMount.current =
      true;
  }, [note, open]);

  // =========================================================
  // INITIAL FOCUS
  // =========================================================

  useEffect(() => {
    if (!open) {
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
  // HISTORY
  // =========================================================

  const pushHistory = useCallback(() => {
    setHistory((current) => [
      ...current.slice(
        -(MAX_HISTORY - 1)
      ),
      {
        title,
        blocks:
          cloneBlocks(blocks),
      },
    ]);

    setFuture([]);
  }, [title, blocks]);

  const undo = () => {
    if (!history.length) {
      return;
    }

    const previous =
      history[
        history.length - 1
      ];

    setFuture((current) => [
      {
        title,
        blocks:
          cloneBlocks(blocks),
      },
      ...current,
    ]);

    setTitle(previous.title);
    setBlocks(
      cloneBlocks(
        previous.blocks
      )
    );

    setHistory((current) =>
      current.slice(0, -1)
    );
  };

  const redo = () => {
    if (!future.length) {
      return;
    }

    const next = future[0];

    setHistory((current) => [
      ...current,
      {
        title,
        blocks:
          cloneBlocks(blocks),
      },
    ]);

    setTitle(next.title);
    setBlocks(
      cloneBlocks(next.blocks)
    );

    setFuture((current) =>
      current.slice(1)
    );
  };

  // =========================================================
  // SAVE
  // =========================================================

  const performSave =
    useCallback(
      async (
        silent = true
      ) => {
        const serialized =
          serializeBlocks(
            blocks
          );

        const normalizedTitle =
          title.trim() ||
          "Untitled";

        const hasChanges =
          normalizedTitle !==
            lastSaved.current
              .title ||
          serialized !==
            lastSaved.current
              .blocks;

        if (!hasChanges) {
          return;
        }

        setSaveState("saving");

        try {
          const updatedNote:
            TripNoteDB = {
            ...note,
            title:
              normalizedTitle,
            blocks:
              editorBlocksToDbBlocks(
                blocks
              ),
            trip_id: tripId,
          };

          await onSave(
            updatedNote,
            {
              silent,
            }
          );

          lastSaved.current = {
            title:
              normalizedTitle,
            blocks:
              serialized,
          };

          hasUnnotifiedEdit.current =
            true;

          setSaveState("saved");

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
          setSaveState("idle");
        }
      },
      [
        blocks,
        title,
        note,
        tripId,
        onSave,
      ]
    );

  // =========================================================
  // AUTOSAVE
  // =========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current =
        false;
      return;
    }

    if (saveTimeoutRef.current) {
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
    blocks,
    open,
    performSave,
  ]);

  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = async () => {
    await performSave(true);

    if (hasUnnotifiedEdit.current) {
      hasUnnotifiedEdit.current =
        false;
      notifyNoteEdited(note.id);
    }

    onClose();
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async () => {
    try {
      await onDelete(note.id);

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
  // FOCUS BLOCK
  // =========================================================

  const syncTextareaHeight = (
    input: HTMLTextAreaElement | null
  ) => {
    if (!input) {
      return;
    }

    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  };

  const ensureCursorVisible = (
    input: HTMLTextAreaElement
  ) => {
    const container =
      contentScrollRef.current;

    if (!container) {
      return;
    }

    const containerRect =
      container.getBoundingClientRect();
    const inputRect =
      input.getBoundingClientRect();

    const topThreshold =
      containerRect.top + 32;
    const bottomThreshold =
      containerRect.bottom - 96;

    if (
      inputRect.top <
        topThreshold
    ) {
      const delta =
        topThreshold -
        inputRect.top;
      container.scrollTop =
        Math.max(
          0,
          container.scrollTop -
            delta
        );
      return;
    }

    if (
      inputRect.bottom >
        bottomThreshold
    ) {
      const delta =
        inputRect.bottom -
        bottomThreshold;
      container.scrollTop =
        Math.max(
          0,
          container.scrollTop +
            delta +
            8
        );
    }
  };

  const focusBlock = (
    id: string,
    position?: number
  ) => {
    setActiveBlockId(id);

    requestAnimationFrame(() => {
      const input =
        blockRefs.current[id];

      if (!input) {
        return;
      }

      const isAlreadyFocused =
        document.activeElement ===
        input;

      if (!isAlreadyFocused) {
        input.focus({
          preventScroll: true,
        });
      }

      input.scrollTop = 0;
      input.scrollLeft = 0;

      if (
        typeof position ===
        "number"
      ) {
        input.setSelectionRange(
          position,
          position
        );
      }
    });
  };

  // =========================================================
  // UPDATE BLOCK
  // =========================================================

  const detectAutoListType = (
    value: string
  ):
    | {
        type: "number" | "bullet";
        content: string;
      }
    | null => {
    const numericMatch =
      value.match(
        /^(\d+)\.\s*(.*)$/
      );

    if (
      numericMatch &&
      (numericMatch[2].length > 0 ||
        /\d+\.\s*$/.test(value))
    ) {
      return {
        type: "number",
        content:
          numericMatch[2],
      };
    }

    const bulletMatch =
      value.match(
        /^[-*]\s*(.*)$/
      );

    if (
      bulletMatch &&
      (bulletMatch[1].length > 0 ||
        /^[-*]\s*$/.test(value))
    ) {
      return {
        type: "bullet",
        content:
          bulletMatch[1],
      };
    }

    return null;
  };

  const updateBlockContent = (
    id: string,
    value: string
  ) => {
    const autoList =
      detectAutoListType(
        value
      );

    if (autoList) {
      setBlocks((current) =>
        current.map(
          (block) =>
            block.id === id
              ? {
                  ...block,
                  type: autoList.type,
                  content:
                    autoList.content,
                  checked:
                    undefined,
                }
              : block
        )
      );

      requestAnimationFrame(() => {
        const input =
          blockRefs.current[id];
        if (!input) {
          return;
        }

        if (
          document.activeElement !==
          input
        ) {
          input.focus({
            preventScroll: true,
          });
        }

        input.scrollTop = 0;
        input.scrollLeft = 0;
        input.setSelectionRange(
          autoList.content.length,
          autoList.content.length
        );
      });

      return;
    }

    setBlocks((current) =>
      current.map(
        (block) =>
          block.id === id
            ? {
                ...block,
                content:
                  value,
              }
            : block
      )
    );
  };

  const updateBlockType = (
    id: string,
    type:
      | "text"
      | "bullet"
      | "number"
      | "checklist"
  ) => {
    pushHistory();

    setBlocks((current) =>
      current.map(
        (block) =>
          block.id === id
            ? {
                ...block,
                type,
                checked:
                  type ===
                  "checklist"
                    ? Boolean(
                        block.checked
                      )
                    : undefined,
              }
            : block
      )
    );
  };

  const toggleBlockType = (
    type:
      | "bullet"
      | "number"
      | "checklist"
  ) => {
    if (!activeBlock) {
      addBlock(type);
      return;
    }

    updateBlockType(
      activeBlock.id,
      activeBlock.type === type
        ? "text"
        : type
    );

    focusBlock(
      activeBlock.id,
      activeBlock.content.length
    );
  };

  // =========================================================
  // CHECKLIST
  // =========================================================

  const toggleChecklist = (
    id: string
  ) => {
    pushHistory();

    setBlocks((current) =>
      current.map(
        (block) =>
          block.id === id &&
          block.type ===
            "checklist"
            ? {
                ...block,
                checked:
                  !block.checked,
              }
            : block
      )
    );
  };

  // =========================================================
  // ADD BLOCK
  // =========================================================

  const addBlock = (
    type:
      | "text"
      | "bullet"
      | "number"
      | "checklist",
    afterIndex?: number
  ) => {
    const newBlock:
      EditorBlock = {
      id: createId(),
      type,
      content: "",
      ...(type ===
      "checklist"
        ? {
            checked: false,
          }
        : {}),
    };

    pushHistory();

    setBlocks((current) => {
      if (
        afterIndex ===
          undefined ||
        afterIndex < 0
      ) {
        return [
          ...current,
          newBlock,
        ];
      }

      return [
        ...current.slice(
          0,
          afterIndex + 1
        ),
        newBlock,
        ...current.slice(
          afterIndex + 1
        ),
      ];
    });

    focusBlock(
      newBlock.id
    );
  };

  // =========================================================
  // REMOVE / MERGE
  // =========================================================

  const handleEmptyBlockBackspace =
    (index: number) => {
      const block =
        blocks[index];

      if (!block) {
        return;
      }

      if (
        block.type !== "text" &&
        !block.content.trim()
      ) {
        pushHistory();
        setBlocks((current) =>
          current.map(
            (item, i) =>
              i === index
                ? {
                    ...item,
                    type: "text",
                    content: "",
                    checked:
                      undefined,
                  }
                : item
          )
        );
        focusBlock(block.id, 0);
        return;
      }

      if (
        block.type === "text" &&
        !block.content.trim()
      ) {
        const previous =
          blocks[index - 1];

        if (
          blocks.length > 1
        ) {
          pushHistory();
          setBlocks((current) =>
            current.filter(
              (_, i) =>
                i !== index
            )
          );

          if (previous) {
            focusBlock(
              previous.id,
              previous.content.length
            );
            return;
          }

          const next =
            blocks[index + 1];
          if (next) {
            focusBlock(next.id, 0);
          }
        }
      }
    };

  // =========================================================
  // ENTER / BACKSPACE
  // =========================================================

  const handleBlockKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    block: EditorBlock,
    index: number
  ) => {
    const hasCommandModifier =
      event.metaKey ||
      event.ctrlKey;

    // -------------------------------------------------------
    // Keyboard shortcuts
    // -------------------------------------------------------

    if (hasCommandModifier) {
      const shortcutKey =
        event.key.toLowerCase();

      if (
        shortcutKey === "z"
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }

        return;
      }

      if (
        shortcutKey === "y" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        redo();
        return;
      }

      if (
        shortcutKey === "a" &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        selectAllBlocks();
        return;
      }

      // Everything else (copy, cut, paste, word navigation,
      // delete-to-line-start) stays native.
      return;
    }

    // -------------------------------------------------------
    // Enter
    // -------------------------------------------------------

    if (
      event.key === "Enter" &&
      !event.nativeEvent
        .isComposing
    ) {
      event.preventDefault();

      const trimmed =
        block.content.trim();

      if (
        !trimmed &&
        block.type !==
          "text"
      ) {
        const convertedBlock:
          EditorBlock = {
          id: createId(),
          type: "text",
          content: "",
        };

        pushHistory();

        setBlocks((current) => [
          ...current.slice(
            0,
            index
          ),
          convertedBlock,
          ...current.slice(
            index + 1
          ),
        ]);

        focusBlock(
          convertedBlock.id,
          0
        );
        return;
      }

      if (
        block.type ===
          "number" &&
        trimmed
      ) {
        const nextBlock:
          EditorBlock = {
          id: createId(),
          type: "number",
          content: "",
        };

        pushHistory();

        setBlocks((current) => [
          ...current.slice(
            0,
            index + 1
          ),
          nextBlock,
          ...current.slice(
            index + 1
          ),
        ]);

        focusBlock(nextBlock.id, 0);
        return;
      }

      if (
        block.type ===
          "bullet" &&
        trimmed
      ) {
        const nextBlock:
          EditorBlock = {
          id: createId(),
          type: "bullet",
          content: "",
        };

        pushHistory();

        setBlocks((current) => [
          ...current.slice(
            0,
            index + 1
          ),
          nextBlock,
          ...current.slice(
            index + 1
          ),
        ]);

        focusBlock(nextBlock.id, 0);
        return;
      }

      if (
        block.type ===
          "checklist"
      ) {
        const nextBlock:
          EditorBlock = {
          id: createId(),
          type: "checklist",
          content: "",
          checked: false,
        };

        pushHistory();

        setBlocks((current) => [
          ...current.slice(
            0,
            index + 1
          ),
          nextBlock,
          ...current.slice(
            index + 1
          ),
        ]);

        focusBlock(nextBlock.id, 0);
        return;
      }

      const nextBlock:
        EditorBlock = {
        id: createId(),
        type: "text",
        content: "",
      };

      pushHistory();

      setBlocks((current) => [
        ...current.slice(
          0,
          index + 1
        ),
        nextBlock,
        ...current.slice(
          index + 1
        ),
      ]);

      focusBlock(nextBlock.id, 0);
      return;
    }

    // -------------------------------------------------------
    // Backspace
    // -------------------------------------------------------

    if (
      event.key ===
        "Backspace" &&
      !event.altKey &&
      !event.nativeEvent
        .isComposing
    ) {
      const input =
        event.currentTarget;

      if (
        input.selectionStart ===
          0 &&
        input.selectionEnd ===
          0
      ) {
        if (
          !block.content.trim() &&
          block.type !==
            "text"
        ) {
          event.preventDefault();
          handleEmptyBlockBackspace(
            index
          );
          return;
        }

        if (
          !block.content.trim() &&
          block.type ===
            "text"
        ) {
          event.preventDefault();
          handleEmptyBlockBackspace(
            index
          );
          return;
        }

        if (
          block.content &&
          block.type ===
            "text"
        ) {
          const previous =
            blocks[index - 1];

          if (
            previous &&
            previous.type ===
              "text"
          ) {
            event.preventDefault();
            pushHistory();
            setBlocks((current) =>
              current
                .filter(
                  (_, i) =>
                    i !== index
                )
                .map(
                  (item, i) =>
                    i ===
                    index - 1
                      ? {
                          ...item,
                          content:
                            item.content +
                            block.content,
                        }
                      : item
                )
            );
            focusBlock(
              previous.id,
              previous.content.length
            );
          }
        }
      }
    }
  };

  // =========================================================
  // LINK HELPERS
  // =========================================================

  const normalizeUrl = (
    value: string
  ): string | null => {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return null;
    }

    const normalized =
      /^https?:\/\//i.test(
        trimmed
      )
        ? trimmed
        : `https://${trimmed}`;

    try {
      const parsed =
        new URL(normalized);

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

  const openExternalLink = (
    rawUrl: string
  ) => {
    const normalized =
      normalizeUrl(rawUrl);

    if (!normalized) {
      return;
    }

    setPendingLinkUrl(
      normalized
    );

    setShowLinkDialog(true);
  };

  const confirmOpenLink = () => {
    if (!pendingLinkUrl) {
      return;
    }

    window.open(
      pendingLinkUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setShowLinkDialog(false);
    setPendingLinkUrl("");
  };

  // =========================================================
  // ADD LINK
  // =========================================================

  const addLinkToCurrentBlock =
    () => {
      if (!activeBlockId) {
        return;
      }

      const block =
        blocks.find(
          (item) =>
            item.id ===
            activeBlockId
        );

      if (!block) {
        return;
      }

      setPendingLinkUrl("");
      setShowLinkDialog(
        true
      );
    };

  // =========================================================
  // LINKIFIED CONTENT
  // =========================================================

  const renderLinkifiedText = (
    value: string
  ) => {
    const parts =
      value.split(
        linkPattern
      );

    return parts.map(
      (part, index) => {
        linkPattern.lastIndex =
          0;

        const isLink =
          linkPattern.test(
            part
          );

        linkPattern.lastIndex =
          0;

        if (!isLink) {
          return (
            <span key={index}>
              {part}
            </span>
          );
        }

        return (
          <button
            key={index}
            type="button"
            onMouseDown={(
              event
            ) => {
              event.preventDefault();
            }}
            onClick={() =>
              openExternalLink(
                part
              )
            }
            className="
              text-sky-600
              underline
              underline-offset-2
            "
          >
            {part}
          </button>
        );
      }
    );
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

      const matches: Array<{
        blockId: string;
        index: number;
      }> = [];

      blocks.forEach(
        (block) => {
          let position =
            block.content
              .toLowerCase()
              .indexOf(query);

          while (
            position !== -1
          ) {
            matches.push({
              blockId:
                block.id,
              index: position,
            });

            position =
              block.content
                .toLowerCase()
                .indexOf(
                  query,
                  position +
                    query.length
                );
          }
        }
      );

      return matches;
    }, [
      blocks,
      searchQuery,
    ]);

  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  const goToSearchMatch =
    (direction: 1 | -1) => {
      if (
        !searchMatches.length
      ) {
        return;
      }

      const next =
        (searchIndex +
          direction +
          searchMatches.length) %
        searchMatches.length;

      setSearchIndex(next);

      const match =
        searchMatches[next];

      focusBlock(
        match.blockId,
        match.index
      );

      requestAnimationFrame(() => {
        const input =
          blockRefs.current[
            match.blockId
          ];

        if (!input) {
          return;
        }

        if (
          document.activeElement !==
          input
        ) {
          input.focus({
            preventScroll: true,
          });
        }

        input.setSelectionRange(
          match.index,
          match.index +
            searchQuery.length
        );
        ensureCursorVisible(input);
      });
    };

  // =========================================================
  // STATS
  // =========================================================

  const noteStats = useMemo(() => {
    const body =
      blocks
        .map(
          (block) =>
            block.content
        )
        .join(" ");

    const words =
      body
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return {
      words: words.length,
      characters: body.length,
      blocks: blocks.length,
      textBlocks:
        blocks.filter(
          (block) =>
            block.type ===
            "text"
        ).length,
      bullets:
        blocks.filter(
          (block) =>
            block.type ===
            "bullet"
        ).length,
      numbered:
        blocks.filter(
          (block) =>
            block.type ===
            "number"
        ).length,
      checklists:
        blocks.filter(
          (block) =>
            block.type ===
            "checklist"
        ).length,
      completed:
        blocks.filter(
          (block) =>
            block.type ===
              "checklist" &&
            block.checked
        ).length,
      links:
        (body.match(
          linkPattern
        ) || []).length,
    };
  }, [blocks]);

  const formatTimestamp = (
    value?: string | null
  ) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

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

  // Older notes predate the created_at column, so it may be absent.
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
      const sentences = blocks
        .map((block) =>
          block.content.trim()
        )
        .filter(Boolean)
        .join(". ")
        .replace(/\.{2,}/g, ".")
        .replace(/\s+/g, " ")
        .trim();

      if (!sentences) {
        return null;
      }

      if (
        sentences.length <= 220
      ) {
        return sentences;
      }

      return `${sentences
        .slice(0, 220)
        .trimEnd()}\u2026`;
    }, [blocks]);

  const displayName = (
    id?: string | null
  ) => {
    if (!id) {
      return null;
    }

    if (id === user?.id) {
      return "You";
    }

    return (
      peopleNames[id] ||
      "Trip member"
    );
  };

  // Names are only looked up for ids that are not already known.
  useEffect(() => {
    if (!showStats) {
      return;
    }

    const missing = [
      note.author_id,
      lastEditedById,
    ].filter(
      (id): id is string =>
        Boolean(id) &&
        id !== user?.id &&
        !peopleNames[id]
    );

    if (!missing.length) {
      return;
    }

    let cancelled = false;

    const loadNames = async () => {
      const { data } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, username"
          )
          .in(
            "id",
            Array.from(
              new Set(missing)
            )
          );

      if (cancelled || !data) {
        return;
      }

      setPeopleNames(
        (current) => ({
          ...current,
          ...Object.fromEntries(
            data.map(
              (profile) => [
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
    lastEditedById,
    user?.id,
    peopleNames,
  ]);

  // =========================================================
  // COPY NOTE
  // =========================================================

  // Radix aria-hides the drawer, so focus must leave it before a dialog opens.
  const blurActiveElement = () => {
    const active =
      document.activeElement;

    if (
      active instanceof
      HTMLElement
    ) {
      active.blur();
    }
  };

  const copyNote = async () => {
    const text = blocks
      .map((block) => {
        if (
          block.type ===
          "checklist"
        ) {
          return `${
            block.checked
              ? "✓"
              : "☐"
          } ${block.content}`;
        }

        if (
          block.type ===
          "bullet"
        ) {
          return `• ${block.content}`;
        }

        if (
          block.type ===
          "number"
        ) {
          return block.content;
        }

        return block.content;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(
        `${title}\n\n${text}`.trim()
      );

      toast({
        title: "Note copied",
        description:
          "The note content was copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description:
          "The note could not be copied to your clipboard.",
      });
    }
  };

  // =========================================================
  // ACTIVE BLOCK
  // =========================================================

  const activeBlock =
    blocks.find(
      (block) =>
        block.id ===
        activeBlockId
    );

  // =========================================================
  // NUMBERING
  // =========================================================

  const getNumber =
    (index: number) => {
      let count = 0;

      for (
        let i = 0;
        i <= index;
        i++
      ) {
        if (
          blocks[i].type ===
          "number"
        ) {
          count++;
        }
      }

      return count;
    };

  // =========================================================
  // SELECT ALL (CROSS BLOCK)
  // =========================================================

  const notePlainText =
    useMemo(() => {
      let numbering = 0;

      return blocks
        .map((block) => {
          if (
            block.type ===
            "number"
          ) {
            numbering++;
            return `${numbering}. ${block.content}`;
          }

          if (
            block.type ===
            "bullet"
          ) {
            return `- ${block.content}`;
          }

          if (
            block.type ===
            "checklist"
          ) {
            return `${
              block.checked
                ? "\u2611"
                : "\u2610"
            } ${block.content}`;
          }

          return block.content;
        })
        .join("\n");
    }, [blocks]);

  // The note is many separate textareas, so a document range is
  // placed over an offscreen mirror holding the serialized text.
  const selectAllBlocks = () => {
    if (!blocks.length) {
      return;
    }

    const focused =
      document.activeElement;

    if (
      focused instanceof
      HTMLElement
    ) {
      focused.blur();
    }

    setIsSelectAllActive(true);

    requestAnimationFrame(() => {
      const mirror =
        selectionMirrorRef.current;

      const selection =
        window.getSelection();

      if (!mirror || !selection) {
        return;
      }

      const range =
        document.createRange();

      range.selectNodeContents(
        mirror
      );

      selection.removeAllRanges();
      selection.addRange(range);
    });
  };

  const clearSelectAll = useCallback(() => {
    setIsSelectAllActive(false);

    const selection =
      window.getSelection();

    const mirror =
      selectionMirrorRef.current;

    if (
      selection &&
      mirror &&
      selection.rangeCount &&
      mirror.contains(
        selection.getRangeAt(0)
          .commonAncestorContainer
      )
    ) {
      selection.removeAllRanges();
    }
  }, []);

  useEffect(() => {
    if (!isSelectAllActive) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      const key =
        event.key.toLowerCase();

      if (
        event.metaKey ||
        event.ctrlKey
      ) {
        if (key === "z") {
          event.preventDefault();

          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }

          clearSelectAll();
        }

        if (key === "y") {
          event.preventDefault();
          redo();
          clearSelectAll();
        }

        if (
          key === "a" &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          selectAllBlocks();
        }

        // Copy and cut stay native.
        return;
      }

      if (
        [
          "Shift",
          "Meta",
          "Control",
          "Alt",
        ].includes(event.key)
      ) {
        return;
      }

      clearSelectAll();
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );
    document.addEventListener(
      "pointerdown",
      clearSelectAll
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
      document.removeEventListener(
        "pointerdown",
        clearSelectAll
      );
    };
  }, [
    isSelectAllActive,
    clearSelectAll,
    undo,
    redo,
  ]);

  // =========================================================
  // RENDER BLOCK
  // =========================================================

  const renderBlock = (
    block: EditorBlock,
    index: number
  ) => {
    const isChecklist =
      block.type ===
      "checklist";

    const isBullet =
      block.type ===
      "bullet";

    const isNumber =
      block.type ===
      "number";

    return (
      <div
        key={block.id}
        className={cn(
          `
            group
            flex
            w-full
            items-start
            rounded-md
          `,
          isSelectAllActive &&
            "bg-sky-500/20"
        )}
      >
        {/* ================================================= */}
        {/* CHECKLIST                                        */}
        {/* ================================================= */}

        {isChecklist && (
          <button
            type="button"
            aria-label={
              block.checked
                ? "Uncheck item"
                : "Check item"
            }
            onClick={() =>
              toggleChecklist(
                block.id
              )
            }
            className="
              -ml-2
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-full
              transition-colors
              active:bg-muted
            "
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-[4px] border-[1.5px] transition-all",
                block.checked
                  ? "border-foreground bg-foreground text-background"
                  : "border-muted-foreground/45"
              )}
            >
              {block.checked && (
                <Check className="h-4 w-4 stroke-[3]" />
              )}
            </span>
          </button>
        )}

        {/* ================================================= */}
        {/* BULLET                                            */}
        {/* ================================================= */}

        {isBullet && (
          <div
            className="
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              text-[17px]
              leading-none
            "
          >
            •
          </div>
        )}

        {/* ================================================= */}
        {/* NUMBER                                            */}
        {/* ================================================= */}

        {isNumber && (
          <div
            className="
              flex
              h-7
              min-w-7
              shrink-0
              items-center
              justify-end
              pr-1
              text-[15px]
              leading-none
            "
          >
            {getNumber(index)}.
          </div>
        )}

        {/* ================================================= */}
        {/* EDITABLE TEXT                                     */}
        {/* ================================================= */}

        <textarea
          ref={(element) => {
            blockRefs.current[
              block.id
            ] = element;
            syncTextareaHeight(
              element
            );
          }}
          value={
            block.content
          }
          rows={1}
          onFocus={() => {
            setActiveBlockId(
              block.id
            );
            requestAnimationFrame(
              () =>
                syncTextareaHeight(
                  blockRefs.current[
                    block.id
                  ]
                )
            );
          }}
          onChange={(event) => {
            updateBlockContent(
              block.id,
              event.target.value
            );
            requestAnimationFrame(
              () =>
                syncTextareaHeight(
                  event.currentTarget
                )
            );
          }}
          onKeyDown={(event) =>
            handleBlockKeyDown(
              event,
              block,
              index
            )
          }
          placeholder={
            index === 0 &&
            blocks.length === 1
              ? "Start typing..."
              : ""
          }
          className={cn(
            `
              min-w-0
              flex-1
              resize-none
              overflow-hidden
              border-none
              bg-transparent
              px-0
              py-0
              text-[18px]
              leading-[1.45]
              outline-none
              scrollbar-none
              placeholder:text-muted-foreground/35
            `,
            block.checked &&
              "text-muted-foreground line-through"
          )}
          style={{
            height: "auto",
          }}
        />
      </div>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(value) => {
          if (!value) {
            handleClose();
          }
        }}
        shouldScaleBackground={false}
        repositionInputs={false}
      >
        <DrawerContent
          className="
            h-[95vh]
            max-h-[95vh]
            overflow-hidden
            sm:mx-auto
            sm:w-full
            sm:max-w-4xl
          "
          data-disable-keyboard-autoscroll="true"
        >
          {/* ================================================= */}
          {/* HEADER                                            */}
          {/* ================================================= */}

          <DrawerHeader
            className="
              shrink-0
              border-b
              border-border/50
              px-3
              py-2
            "
          >
            <div
              className="
                mx-auto
                flex
                h-10
                w-full
                max-w-3xl
                items-center
                justify-between
              "
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  handleClose
                }
                className="
                  h-10
                  w-10
                "
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <DrawerTitle className="sr-only">
                {title ||
                  "New Note"}
              </DrawerTitle>

              <div className="flex items-center gap-1">
                <div className="mr-1 min-w-[60px] text-right">
                  {saveState ===
                    "saving" && (
                    <span className="text-xs text-muted-foreground">
                      Saving...
                    </span>
                  )}

                  {saveState ===
                    "saved" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Saved
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setShowSearch(
                      true
                    )
                  }
                  className="
                    h-10
                    w-10
                  "
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
                  className="
                    h-10
                    w-10
                  "
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    blurActiveElement();
                    setShowDeleteDialog(
                      true
                    );
                  }}
                  className="
                    h-10
                    w-10
                    text-destructive
                    hover:text-destructive
                  "
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          {/* ================================================= */}
          {/* MAIN                                              */}
          {/* ================================================= */}

          <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div
              className="
                mx-auto
                w-full
                max-w-3xl
                px-6
                pb-40
                pt-7
                relative
              "
            >
              {/* ============================================= */}
              {/* TITLE                                           */}
              {/* ============================================= */}

              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.altKey &&
                    !event.nativeEvent
                      .isComposing
                  ) {
                    event.preventDefault();

                    if (
                      blocks.length
                    ) {
                      focusBlock(
                        blocks[0]
                          .id
                      );
                    } else {
                      addBlock(
                        "text"
                      );
                    }
                  }
                }}
                placeholder="Title"
                className="
                  mb-7
                  w-full
                  border-none
                  bg-transparent
                  text-[27px]
                  font-semibold
                  leading-tight
                  tracking-tight
                  outline-none
                  placeholder:text-muted-foreground/35
                "
              />

              {/* ============================================= */}
              {/* BLOCKS                                          */}
              {/* ============================================= */}

              {blocks.length ===
              0 ? (
                <button
                  type="button"
                  onClick={() =>
                    addBlock(
                      "text"
                    )
                  }
                  className="
                    flex
                    h-12
                    items-center
                    text-left
                    text-[18px]
                    text-muted-foreground/40
                  "
                >
                  Start typing...
                </button>
              ) : (
                <div className="space-y-0.5">
                  {blocks.map(
                    renderBlock
                  )}
                </div>
              )}

              {/* ============================================= */}
              {/* SELECTION MIRROR                              */}
              {/* ============================================= */}

              <pre
                ref={selectionMirrorRef}
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  left-0
                  top-0
                  h-px
                  w-px
                  overflow-hidden
                  whitespace-pre-wrap
                  opacity-0
                  select-text
                "
              >
                {notePlainText}
              </pre>

              {/* ============================================= */}
              {/* END SPACE                                       */}
              {/* ============================================= */}

              <div className="h-24" />
            </div>
          </div>

          {/* ================================================= */}
          {/* BOTTOM TOOLBAR                                    */}
          {/* ================================================= */}

          <div
            className="
              shrink-0
              border-t
              border-border/50
              bg-background
              pb-[env(safe-area-inset-bottom)]
            "
          >
            <div
              className="
                mx-auto
                flex
                w-full
                max-w-3xl
                items-center
                gap-1
                overflow-x-auto
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
                onClick={undo}
                className={
                  TOUCH_BUTTON
                }
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
                onClick={redo}
                className={
                  TOUCH_BUTTON
                }
              >
                <Redo2 className="h-5 w-5" />
              </Button>

              <div className="mx-1 h-6 w-px shrink-0 bg-border" />

              {/* Bullet */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleBlockType(
                    "bullet"
                  )
                }
                className={cn(
                  TOUCH_BUTTON,
                  activeBlock?.type ===
                    "bullet" &&
                    "bg-muted"
                )}
              >
                <List className="h-5 w-5" />
              </Button>

              {/* Number */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleBlockType(
                    "number"
                  )
                }
                className={cn(
                  TOUCH_BUTTON,
                  activeBlock?.type ===
                    "number" &&
                    "bg-muted"
                )}
              >
                <ListOrdered className="h-5 w-5" />
              </Button>

              {/* Checklist */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  toggleBlockType(
                    "checklist"
                  )
                }
                className={cn(
                  TOUCH_BUTTON,
                  activeBlock?.type ===
                    "checklist" &&
                    "bg-muted"
                )}
              >
                <CheckSquare className="h-5 w-5" />
              </Button>

              {/* Link */}
              <Button
                variant="ghost"
                size="icon"
                onClick={
                  addLinkToCurrentBlock
                }
                disabled={
                  !activeBlockId
                }
                className={
                  TOUCH_BUTTON
                }
              >
                <LinkIcon className="h-5 w-5" />
              </Button>

              {/* More */}
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
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ===================================================== */}
      {/* MORE TOOLS                                            */}
      {/* ===================================================== */}

      <Drawer
        open={showMoreTools}
        onOpenChange={
          setShowMoreTools
        }
      >
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader>
            <DrawerTitle>
              Note Tools
            </DrawerTitle>
          </DrawerHeader>

          <div className="grid grid-cols-3 gap-2 px-5 pb-8">
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
                copyNote();
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

            {/* Stats */}
            <button
              type="button"
              onClick={() => {
                blurActiveElement();
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

            {/* Add text */}
            <button
              type="button"
              onClick={() => {
                addBlock(
                  "text",
                  blocks.length -
                    1
                );

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
              <span className="text-xl">
                T
              </span>
              Text
            </button>

            {/* Checklist */}
            <button
              type="button"
              onClick={() => {
                addBlock(
                  "checklist",
                  blocks.length -
                    1
                );

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
              <CheckSquare className="h-5 w-5" />
              Checklist
            </button>

            {/* Bullet */}
            <button
              type="button"
              onClick={() => {
                addBlock(
                  "bullet",
                  blocks.length -
                    1
                );

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
              <List className="h-5 w-5" />
              Bullets
            </button>

            {/* Number */}
            <button
              type="button"
              onClick={() => {
                addBlock(
                  "number",
                  blocks.length -
                    1
                );

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
              <ListOrdered className="h-5 w-5" />
              Numbered
            </button>

            {/* Link */}
            <button
              type="button"
              onClick={() => {
                setShowMoreTools(
                  false
                );
                addLinkToCurrentBlock();
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
      {/* SEARCH                                                */}
      {/* ===================================================== */}

      <Drawer
        open={showSearch}
        onOpenChange={
          setShowSearch
        }
      >
        <DrawerContent className="max-h-[40vh]">
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
                autoFocus
                value={
                  searchQuery
                }
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
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
              setShowStats(false)
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

          <div
            className="
              max-h-[60vh]
              space-y-5
              overflow-y-auto
              py-1
            "
          >
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
                    {noteStats.blocks}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Items
                  </div>
                </div>

                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {noteStats.completed}/
                    {noteStats.checklists}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Completed
                  </div>
                </div>

                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {noteStats.words}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Words
                  </div>
                </div>

                <div className="rounded-xl bg-muted/60 p-4">
                  <div className="text-2xl font-semibold">
                    {noteStats.characters}
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
                    label: "Text",
                    value:
                      noteStats.textBlocks,
                  },
                  {
                    label: "Bullets",
                    value:
                      noteStats.bullets,
                  },
                  {
                    label: "Numbered",
                    value:
                      noteStats.numbered,
                  },
                  {
                    label: "Checklist",
                    value:
                      noteStats.checklists,
                  },
                  {
                    label: "Links",
                    value:
                      noteStats.links,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">
                      {row.label}
                    </span>

                    <span className="font-medium">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================== */}
      {/* DELETE                                                */}
      {/* ===================================================== */}

      <AlertDialog
        open={showDeleteDialog}
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
              Are you sure you want to
              delete "
              {title ||
                "this note"}
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
      {/* LINK                                                  */}
      {/* ===================================================== */}

      <AlertDialog
        open={showLinkDialog}
        onOpenChange={(value) => {
          if (!value) {
            setShowLinkDialog(
              false
            );
            setPendingLinkUrl(
              ""
            );
          }
        }}
      >
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingLinkUrl
                ? "Open External Link?"
                : "Add Link"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {pendingLinkUrl
                ? "You are about to open this link in your browser."
                : "Enter a website URL to add to this note."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <div
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                px-3
              "
            >
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

              <input
                autoFocus
                type="url"
                value={
                  pendingLinkUrl
                }
                onChange={(event) =>
                  setPendingLinkUrl(
                    event.target
                      .value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.altKey &&
                    !event.nativeEvent
                      .isComposing
                  ) {
                    event.preventDefault();

                    if (
                      pendingLinkUrl
                    ) {
                      if (
                        activeBlockId
                      ) {
                        const block =
                          blocks.find(
                            (
                              item
                            ) =>
                              item.id ===
                              activeBlockId
                          );

                        if (block) {
                          pushHistory();

                          const value =
                            block.content.trim();

                          const next =
                            value
                              ? `${value} ${pendingLinkUrl}`
                              : pendingLinkUrl;

                          updateBlockContent(
                            block.id,
                            next
                          );

                          setShowLinkDialog(
                            false
                          );

                          focusBlock(
                            block.id,
                            next.length
                          );

                          return;
                        }
                      }

                      confirmOpenLink();
                    }
                  }
                }}
                placeholder="https://example.com"
                className="
                  h-12
                  min-w-0
                  flex-1
                  bg-transparent
                  text-sm
                  outline-none
                "
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowLinkDialog(
                  false
                );
                setPendingLinkUrl(
                  ""
                );
              }}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                if (
                  activeBlockId &&
                  pendingLinkUrl
                ) {
                  const block =
                    blocks.find(
                      (item) =>
                        item.id ===
                        activeBlockId
                    );

                  if (block) {
                    pushHistory();

                    const value =
                      block.content.trim();

                    const next =
                      value
                        ? `${value} ${pendingLinkUrl}`
                        : pendingLinkUrl;

                    updateBlockContent(
                      block.id,
                      next
                    );

                    setShowLinkDialog(
                      false
                    );

                    setPendingLinkUrl(
                      ""
                    );

                    focusBlock(
                      block.id,
                      next.length
                    );

                    return;
                  }
                }

                confirmOpenLink();
              }}
            >
              Add Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}