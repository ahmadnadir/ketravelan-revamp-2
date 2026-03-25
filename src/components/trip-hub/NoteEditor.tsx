import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Trash2, Check, List, ListOrdered, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripNoteDB, NoteBlock } from "@/lib/tripNotes.db";
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

interface NoteEditorProps {
  note: TripNoteDB;
  open: boolean;
  onClose: () => void;
  onSave: (note: TripNoteDB) => Promise<void>;
  onDelete: (id: string) => void;
  tripId: string;
}

type SaveState = "idle" | "saving" | "saved";

export function NoteEditor({
  note,
  open,
  onClose,
  onSave,
  onDelete,
  tripId,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const isInitialMount = useRef(true);
  const lastSavedContent = useRef({ title: "", content: "" });

  // Convert blocks to plain text for editing
  const blocksToText = (blocks: NoteBlock[]): string => {
    let numberCounter = 0;
    return blocks
      .map((block) => {
        switch (block.type) {
          case "checklist":
            return `${block.checked ? "☑" : "☐"} ${block.content}`;
          case "bullet":
            return `• ${block.content}`;
          case "number":
            numberCounter++;
            return `${numberCounter}. ${block.content}`;
          default:
            numberCounter = 0;
            return block.content;
        }
      })
      .join("\n");
  };

  // Convert plain text back to blocks
  const textToBlocks = (text: string): NoteBlock[] => {
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line, idx) => {
        const checklistMatch = line.match(/^(☑|☐)\s+(.*)$/);
        const bulletMatch = line.match(/^•\s+(.*)$/);
        const numberMatch = line.match(/^\d+\.\s+(.*)$/);

        if (checklistMatch) {
          return {
            id: `${Date.now()}-${idx}`,
            type: "checklist",
            content: checklistMatch[2],
            checked: checklistMatch[1] === "☑",
          };
        }
        if (bulletMatch) {
          return {
            id: `${Date.now()}-${idx}`,
            type: "bullet",
            content: bulletMatch[1],
          };
        }
        if (numberMatch) {
          return {
            id: `${Date.now()}-${idx}`,
            type: "number",
            content: numberMatch[1],
          };
        }
        return {
          id: `${Date.now()}-${idx}`,
          type: "text",
          content: line,
        };
      });
  };

  // Initialize state when note changes
  useEffect(() => {
    if (note && open) {
      const contentText = blocksToText(note.blocks);
      setTitle(note.title);
      setContent(contentText);
      lastSavedContent.current = { title: note.title, content: contentText };
      setSaveState("idle");
      isInitialMount.current = true;
    }
  }, [note, open]);

  // Focus title on open
  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced save
  useEffect(() => {
    if (!open) return;

    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Check if content changed
    const hasChanges =
      title !== lastSavedContent.current.title ||
      content !== lastSavedContent.current.content;

    if (!hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveState("idle");

    saveTimeoutRef.current = setTimeout(() => {
      setSaveState("saving");

      const blocks = textToBlocks(content);
      const updatedNote: TripNoteDB = {
        ...note,
        title: title || "Untitled",
        blocks,
        trip_id: tripId,
      };

      onSave(updatedNote);
      lastSavedContent.current = { title: title || "Untitled", content };

      setTimeout(() => {
        setSaveState("saved");
      }, 150);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, open, onSave, note, tripId]);

  const handleClose = () => {
    // Save immediately on close if there are unsaved changes
    const hasChanges =
      title !== lastSavedContent.current.title ||
      content !== lastSavedContent.current.content;

    if (hasChanges && (title || content)) {
      const blocks = textToBlocks(content);
      const updatedNote: TripNoteDB = {
        ...note,
        title: title || "Untitled",
        blocks,
        trip_id: tripId,
      };
      onSave(updatedNote);
    }
    onClose();
  };

  const handleDelete = () => {
    onDelete(note.id);
    setShowDeleteDialog(false);
    onClose();
  };

  // Handle title Enter key - move focus to body
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      contentRef.current?.focus();
      contentRef.current?.setSelectionRange(0, 0);
    }
  };

  // Toggle checkbox at specific line
  const toggleCheckbox = (lineIndex: number, cursorPos?: number) => {
    const lines = content.split("\n");
    const line = lines[lineIndex] ?? "";

    if (/^\s*☐/.test(line)) {
      lines[lineIndex] = line.replace(/☐/, "☑");
    } else if (/^\s*☑/.test(line)) {
      lines[lineIndex] = line.replace(/☑/, "☐");
    } else {
      return;
    }

    setContent(lines.join("\n"));

    if (typeof cursorPos === "number") {
      setTimeout(() => {
        contentRef.current?.focus();
        contentRef.current?.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    }
  };

  const handleContentClick = () => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const value = textarea.value;

    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const lineEndIdx = value.indexOf("\n", pos);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const line = value.slice(lineStart, lineEnd);

    const match = line.match(/^(\s*)(?:☐|☑)/);
    if (!match) return;

    const tokenStart = lineStart + match[1].length;
    const tokenLen = 1;
    const tokenEnd = tokenStart + tokenLen;

    if (pos >= tokenStart && pos <= tokenEnd) {
      const lineIndex = value.slice(0, lineStart).split("\n").length - 1;
      toggleCheckbox(lineIndex, pos);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.currentTarget.value);
  };

  // Handle content Enter key - smart list continuation
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      const textarea = contentRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const beforeCursor = content.slice(0, cursorPos);
      const afterCursor = content.slice(cursorPos);

      const lines = beforeCursor.split("\n");
      const currentLine = lines[lines.length - 1];

      const bulletMatch = currentLine.match(/^(\s*)•\s+(.*)$/);
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      const checklistMatch = currentLine.match(/^(\s*)(☐|☑)\s*(.*)$/);

      // If current list item is empty, end the list
      if ((bulletMatch && !bulletMatch[2].trim()) ||
          (numberMatch && !numberMatch[3].trim()) ||
          (checklistMatch && !checklistMatch[3].trim())) {
        e.preventDefault();
        const newLines = [...lines];
        newLines[newLines.length - 1] = "";
        const newContent = newLines.join("\n") + afterCursor;
        setContent(newContent);
        setTimeout(() => {
          const newPos = newContent.length - afterCursor.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }

      // Auto-continue lists
      let prefix = "";

      if (bulletMatch && bulletMatch[2].trim()) {
        prefix = `${bulletMatch[1]}• `;
      } else if (numberMatch && numberMatch[3].trim()) {
        const nextNum = parseInt(numberMatch[2]) + 1;
        prefix = `${numberMatch[1]}${nextNum}. `;
      } else if (checklistMatch && checklistMatch[3].trim()) {
        prefix = `${checklistMatch[1]}☐ `;
      }

      if (prefix) {
        e.preventDefault();
        const newContent = beforeCursor + "\n" + prefix + afterCursor;
        setContent(newContent);

        setTimeout(() => {
          const newPos = cursorPos + 1 + prefix.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      }
    }
  };

  // Insert formatting or convert selection
  const insertFormat = (type: "bullet" | "number" | "checklist") => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;

    if (hasSelection) {
      // Convert selected text to list format
      const selectedText = content.slice(start, end);
      const lines = selectedText.split("\n");
      const formattedLines = lines.map((line, idx) => {
        // Remove existing list markers
        const cleanLine = line.replace(/^(\s*)(?:•|☐|☑|\d+\.)\s*/, "$1").trim();
        if (!cleanLine) return line;

        switch (type) {
          case "bullet":
            return `• ${cleanLine}`;
          case "number":
            return `${idx + 1}. ${cleanLine}`;
          case "checklist":
            return `☐ ${cleanLine}`;
          default:
            return cleanLine;
        }
      });

      const newContent = content.slice(0, start) + formattedLines.join("\n") + content.slice(end);
      setContent(newContent);

      setTimeout(() => {
        textarea.focus();
        const newEnd = start + formattedLines.join("\n").length;
        textarea.setSelectionRange(start, newEnd);
      }, 10);
    } else {
      // Insert new list item
      const prefix =
        type === "bullet" ? "• " : type === "number" ? "1. " : "☐ ";

      let newContent: string;
      if (!content.trim()) {
        newContent = prefix;
      } else {
        newContent = content + (content.endsWith("\n") ? "" : "\n") + prefix;
      }

      setContent(newContent);

      setTimeout(() => {
        textarea.focus();
        const length = newContent.length;
        textarea.setSelectionRange(length, length);
      }, 10);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
        shouldScaleBackground={false}
        repositionInputs={false}
      >
        <DrawerContent className="h-[95vh] max-h-[95vh]" data-disable-keyboard-autoscroll="true">
          <DrawerHeader className="border-b border-border/50 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="gap-1 -ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <DrawerTitle className="sr-only">
                {title || "New Note"}
              </DrawerTitle>

              <div className="flex items-center gap-1">
                {/* Save state indicator */}
                <div className="mr-2 min-w-[60px] text-right">
                  {saveState === "saving" && (
                    <span className="text-xs text-muted-foreground">
                      Saving...
                    </span>
                  )}
                  {saveState === "saved" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end transition-opacity duration-200">
                      <Check className="h-3 w-3 text-green-500" />
                      Saved
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col">
            {/* Formatting Toolbar */}
            <div className="flex gap-1 px-4 py-2 border-b border-border/50 bg-accent/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormat("bullet")}
                className="h-8 w-8 p-0"
                title="Bullet list"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormat("number")}
                className="h-8 w-8 p-0"
                title="Numbered list"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertFormat("checklist")}
                className="h-8 w-8 p-0"
                title="Checklist"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 p-4 sm:p-6 space-y-4">
              {/* Title */}
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder="Title"
                className="w-full text-2xl sm:text-3xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              />

              <textarea
                ref={contentRef}
                value={content}
                onChange={handleContentChange}
                onClick={handleContentClick}
                onKeyDown={handleContentKeyDown}
                placeholder="Start typing..."
                className="w-full min-h-[50vh] text-base sm:text-lg bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed"
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title || "this note"}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
