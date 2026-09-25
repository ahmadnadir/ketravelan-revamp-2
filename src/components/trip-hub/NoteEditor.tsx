import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
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
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  NoteBlock,
  TripNoteDB,
  notifyNoteEdited,
} from "@/lib/tripNotes.db";

type NoteEditorProps = {
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
  presentation?: "drawer" | "page";
};

type ListType = "bullet" | "number" | "checklist";

const EXTRA_SCROLL_LINES = 100;

type InlineMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

type InlineNode = {
  type: string;
  text?: string;
  marks?: InlineMark[];
  attrs?: Record<string, unknown>;
};

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};

type TiptapDocument = {
  type: "doc";
  content?: TiptapNode[];
};

const TOUCH_BUTTON = "h-11 w-11 shrink-0 rounded-full";
const searchPluginKey = new PluginKey("note-search");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const canDeleteEmptyListBlock = (
  blocks: Array<{
    type: string;
    content: string;
  }>,
  index: number
) => {
  const block = blocks[index];
  return Boolean(
    block &&
      block.type === "checklist" &&
      !block.content.trim()
  );
};

const inlineToHtml = (nodes?: InlineNode[]) =>
  (nodes || [])
    .map((node) => {
      if (node.type !== "text") return "";
      let value = escapeHtml(node.text || "");
      for (const mark of node.marks || []) {
        if (mark.type === "bold") value = `<strong>${value}</strong>`;
        if (mark.type === "italic") value = `<em>${value}</em>`;
        if (mark.type === "underline") value = `<u>${value}</u>`;
        if (mark.type === "link") {
          const href = escapeHtml(String(mark.attrs?.href || ""));
          value = `<a href="${href}">${value}</a>`;
        }
      }
      return value;
    })
    .join("");

const blockContent = (node: TiptapNode) =>
  inlineToHtml(node.content as InlineNode[] | undefined);

const blocksToHtml = (blocks: NoteBlock[]): string => {
  const result: string[] = [];
  let index = 0;
  while (index < (blocks || []).length) {
    const block = blocks[index];
    const content = block.content || "";
    const inline = /<\/?(?:strong|em|u|a)(?:\s|>)/i.test(content)
      ? content
      : escapeHtml(content);

    if (block.type === "bullet" || block.type === "number") {
      const tag = block.type === "bullet" ? "ul" : "ol";
      const items: string[] = [];
      while (blocks[index]?.type === block.type) {
        const item = blocks[index];
        const itemContent = item.content || "";
        const itemInline = /<\/?(?:strong|em|u|a)(?:\s|>)/i.test(itemContent)
          ? itemContent
          : escapeHtml(itemContent);
        items.push(`<li><p>${itemInline}</p></li>`);
        index += 1;
      }
      result.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    if (block.type === "checklist") {
      const items: string[] = [];
      while (blocks[index]?.type === "checklist") {
        const item = blocks[index];
        const itemContent = item.content || "";
        const itemInline = /<\/?(?:strong|em|u|a)(?:\s|>)/i.test(itemContent)
          ? itemContent
          : escapeHtml(itemContent);
        items.push(
          `<li data-type="taskItem" data-checked="${Boolean(item.checked)}"><p>${itemInline}</p></li>`
        );
        index += 1;
      }
      result.push(`<ul data-type="taskList">${items.join("")}</ul>`);
      continue;
    }

    result.push(`<p>${inline}</p>`);
    index += 1;
  }
  return result.join("");
};

const nodeToBlock = (node: TiptapNode): NoteBlock[] => {
  const inline = blockContent(node);
  if (node.type === "paragraph") {
    return [{ id: crypto.randomUUID(), type: "text", content: inline }];
  }
  if (node.type === "heading") {
    return [{ id: crypto.randomUUID(), type: "text", content: inline }];
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    return (node.content || []).flatMap((item) => {
      const paragraph = item.content?.find((child) => child.type === "paragraph");
      return [{
        id: crypto.randomUUID(),
        type: node.type === "bulletList" ? "bullet" : "number",
        content: blockContent(paragraph || { type: "paragraph" }),
      } as NoteBlock];
    });
  }
  if (node.type === "taskList") {
    return (node.content || []).flatMap((item) => {
      const paragraph = item.content?.find((child) => child.type === "paragraph");
      return [{
        id: crypto.randomUUID(),
        type: "checklist",
        checked: Boolean(item.attrs?.checked),
        content: blockContent(paragraph || { type: "paragraph" }),
      } as NoteBlock];
    });
  }
  return [];
};

const documentToBlocks = (document: TiptapDocument): NoteBlock[] =>
  (document.content || []).flatMap(nodeToBlock);

const normalizeBlocks = (blocks: NoteBlock[]) =>
  blocks.map((block) => ({
    ...block,
    id: block.id || crypto.randomUUID(),
  }));

const searchExtension = Extension.create({
  name: "noteSearch",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init: () => ({ query: "", decorations: DecorationSet.empty }),
          apply(transaction, value) {
            const query = transaction.getMeta(searchPluginKey) ?? value.query;
            if (query === value.query && !transaction.docChanged) {
              return value;
            }
            if (!query) return { query: "", decorations: DecorationSet.empty };
            const decorations: Decoration[] = [];
            const normalized = String(query).toLowerCase();
            transaction.doc.descendants((node, position) => {
              if (!node.isText) return;
              const text = node.text || "";
              let index = text.toLowerCase().indexOf(normalized);
              while (index >= 0) {
                decorations.push(
                  Decoration.inline(
                    position + index,
                    position + index + normalized.length,
                    { class: "bg-yellow-300 text-foreground rounded-[2px]" }
                  )
                );
                index = text.toLowerCase().indexOf(normalized, index + normalized.length);
              }
            });
            return { query: String(query), decorations: DecorationSet.create(transaction.doc, decorations) };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state).decorations;
          },
        },
      }),
    ];
  },
});

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  searchExtension,
];

const getTextFromInline = (node: TiptapNode) =>
  (node.content || [])
    .map((child) => child.type === "text" ? child.content || "" : getTextFromInline(child))
    .join("");

const countStats = (document: TiptapDocument) => {
  const text = (document.content || []).map(getTextFromInline).join("\n");
  let bullets = 0;
  let numbered = 0;
  let checklists = 0;
  let completed = 0;
  let textBlocks = 0;
  for (const node of document.content || []) {
    if (node.type === "bulletList") bullets += node.content?.length || 0;
    else if (node.type === "orderedList") numbered += node.content?.length || 0;
    else if (node.type === "taskList") {
      checklists += node.content?.length || 0;
      completed += (node.content || []).filter((item) => item.attrs?.checked).length;
    } else if (getTextFromInline(node).trim()) textBlocks += 1;
  }
  return {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    characters: text.length,
    blocks: (document.content || []).length,
    bullets,
    numbered,
    checklists,
    completed,
    textBlocks,
    links: text.match(/https?:\/\/[^\s]+/gi)?.length || 0,
  };
};

export function NoteEditor({
  note,
  open,
  onClose,
  onSave,
  onDelete,
  tripId,
  onNoteEdited,
  presentation = "drawer",
}: NoteEditorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [pendingLinkUrl, setPendingLinkUrl] = useState("");
  const [linkDialogMode, setLinkDialogMode] = useState<"add" | "open">("add");
  const [documentJson, setDocumentJson] = useState<TiptapDocument>({ type: "doc", content: [] });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnnotifiedEdit = useRef(false);
  const lastSavedRef = useRef({ title: "", blocks: [] as NoteBlock[] });
  const initializedNoteRef = useRef<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const scrollBufferRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content: blocksToHtml(note.blocks || []),
    editable: open,
    onCreate: ({ editor: instance }) => {
      setDocumentJson(instance.getJSON() as TiptapDocument);
    },
    onUpdate: ({ editor: instance }) => {
      setDocumentJson(instance.getJSON() as TiptapDocument);
    },
  }, [note.id]);

  useEffect(() => {
    editor?.setEditable(open);
  }, [editor, open]);

  useEffect(() => {
    if (!open || !editor || initializedNoteRef.current === note.id) return;
    const nextDocument = blocksToHtml(note.blocks || []);
    editor.commands.setContent(nextDocument, { emitUpdate: false });
    setTitle(note.title || "");
    setDocumentJson(editor.getJSON() as TiptapDocument);
    lastSavedRef.current = { title: note.title || "", blocks: normalizeBlocks(note.blocks || []) };
    setSaveState("idle");
    hasUnnotifiedEdit.current = false;
    initializedNoteRef.current = note.id;
  }, [editor, note, open]);

  useEffect(() => {
    if (!open) initializedNoteRef.current = null;
  }, [open]);

  const currentBlocks = useMemo(
    () => normalizeBlocks(documentToBlocks(documentJson)),
    [documentJson]
  );

  const performSave = useCallback(async (silent = true) => {
    const normalizedTitle = title.trim() || "Untitled";
    if (
      normalizedTitle === lastSavedRef.current.title &&
      JSON.stringify(currentBlocks.map(({ id: _id, ...block }) => block)) ===
        JSON.stringify(lastSavedRef.current.blocks.map(({ id: _id, ...block }) => block))
    ) return;
    setSaveState("saving");
    try {
      const updatedNote: TripNoteDB = {
        ...note,
        title: normalizedTitle,
        blocks: currentBlocks,
        trip_id: tripId,
      };
      await onSave(updatedNote, { silent });
      lastSavedRef.current = { title: normalizedTitle, blocks: currentBlocks };
      hasUnnotifiedEdit.current = true;
      setSaveState("saved");
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("idle");
    }
  }, [currentBlocks, note, onSave, title, tripId]);

  useEffect(() => {
    if (!open) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => void performSave(true), 900);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentBlocks, title, open, performSave]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, searchQuery));
    setSearchIndex(0);
  }, [editor, searchQuery]);

  useEffect(() => {
    if (!editor || !open || !scrollBufferRef.current) return;

    const lineHeight =
      Number.parseFloat(
        window.getComputedStyle(editor.view.dom).lineHeight
      ) || 26;

    scrollBufferRef.current.style.height =
      `${lineHeight * EXTRA_SCROLL_LINES}px`;
  }, [editor, open]);

  useEffect(() => {
    if (
      !editor ||
      !open ||
      typeof window === "undefined" ||
      !Capacitor.isNativePlatform() ||
      Capacitor.getPlatform() !== "ios"
    ) {
      return;
    }

    const scrollContainer = contentScrollRef.current;
    const visualViewport = window.visualViewport;
    if (!scrollContainer || !visualViewport) return;

    const originalHeight = scrollContainer.style.height;
    const originalFlex = scrollContainer.style.flex;
    let keyboardVisible = false;
    let frame = 0;

    const revealCaret = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        if (activeElement !== editor.view.dom) return;

        const caret = editor.view.coordsAtPos(editor.state.selection.head);
        const containerRect = scrollContainer.getBoundingClientRect();
        const visibleBottom = Math.min(
          containerRect.bottom,
          visualViewport.height + visualViewport.offsetTop
        ) - 16;

        if (caret.bottom > visibleBottom) {
          scrollContainer.scrollTop += caret.bottom - visibleBottom;
        } else if (caret.top < containerRect.top + 12) {
          scrollContainer.scrollTop += caret.top - containerRect.top - 12;
        }
      });
    };

    const resizeForKeyboard = () => {
      if (!keyboardVisible) return;

      const top = scrollContainer.getBoundingClientRect().top;
      const availableHeight = Math.max(
        160,
        visualViewport.height + visualViewport.offsetTop - top
      );
      const scrollTop = scrollContainer.scrollTop;

      scrollContainer.style.height = `${availableHeight}px`;
      scrollContainer.style.flex = "0 0 auto";
      scrollContainer.scrollTop = scrollTop;
      revealCaret();
    };

    const restoreAfterKeyboard = () => {
      keyboardVisible = false;
      cancelAnimationFrame(frame);
      scrollContainer.style.height = originalHeight;
      scrollContainer.style.flex = originalFlex;
    };

    const keyboardWillShow = () => {
      keyboardVisible = true;
      resizeForKeyboard();
    };

    const keyboardDidShow = () => {
      keyboardVisible = true;
      resizeForKeyboard();
    };

    const keyboardWillHide = () => {
      restoreAfterKeyboard();
    };

    const keyboardDidHide = () => {
      restoreAfterKeyboard();
    };

    const syncViewport = () => {
      if (keyboardVisible) resizeForKeyboard();
    };

    let listeners: Array<{ remove: () => Promise<void> }> = [];
    void Promise.all([
      Keyboard.addListener("keyboardWillShow", keyboardWillShow),
      Keyboard.addListener("keyboardDidShow", keyboardDidShow),
      Keyboard.addListener("keyboardWillHide", keyboardWillHide),
      Keyboard.addListener("keyboardDidHide", keyboardDidHide),
    ]).then((handles) => {
      listeners = handles;
    });

    visualViewport.addEventListener("resize", syncViewport);
    visualViewport.addEventListener("scroll", syncViewport);
    editor.on("selectionUpdate", revealCaret);
    editor.on("update", revealCaret);

    return () => {
      cancelAnimationFrame(frame);
      visualViewport.removeEventListener("resize", syncViewport);
      visualViewport.removeEventListener("scroll", syncViewport);
      editor.off("selectionUpdate", revealCaret);
      editor.off("update", revealCaret);
      scrollContainer.style.height = originalHeight;
      scrollContainer.style.flex = originalFlex;
      for (const listener of listeners) void listener.remove();
    };
  }, [editor, open]);

  const closeEditor = async () => {
    await performSave(true);
    if (hasUnnotifiedEdit.current) {
      hasUnnotifiedEdit.current = false;
      notifyNoteEdited(note.id);
      onNoteEdited?.({ ...note, title: title.trim() || "Untitled", blocks: currentBlocks, trip_id: tripId });
    }
    onClose();
  };

  const addLink = () => {
    setPendingLinkUrl("");
    setLinkDialogMode("add");
    setShowLinkDialog(true);
  };

  const submitLink = () => {
    const url = pendingLinkUrl.trim();
    if (!url || !editor) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      const parsed = new URL(normalized);
      if (!/^https?:$/.test(parsed.protocol)) return;
      if (linkDialogMode === "open") window.open(parsed.toString(), "_blank", "noopener,noreferrer");
      else editor.chain().focus().setLink({ href: parsed.toString() }).run();
      setShowLinkDialog(false);
      setPendingLinkUrl("");
    } catch {
      toast({ title: "Invalid link", description: "Enter a valid website URL." });
    }
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;
    event.preventDefault();
    setPendingLinkUrl(anchor.getAttribute("href") || "");
    setLinkDialogMode("open");
    setShowLinkDialog(true);
  };

  const toggleList = (type: ListType) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (type === "bullet") chain.toggleBulletList().run();
    if (type === "number") chain.toggleOrderedList().run();
    if (type === "checklist") chain.toggleTaskList().run();
  };

  const preserveEditorSelection = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${editor?.getText() || ""}`.trim());
      toast({ title: "Note copied", description: "The note content was copied to your clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "The note could not be copied to your clipboard." });
    }
  };

  const noteStats = useMemo(() => countStats(documentJson), [documentJson]);
  const textContent = editor?.getText() || "";
  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const matches: number[] = [];
    let from = 0;
    while (from < textContent.length) {
      const index = textContent.toLowerCase().indexOf(searchQuery.toLowerCase(), from);
      if (index < 0) break;
      matches.push(index);
      from = index + Math.max(1, searchQuery.length);
    }
    return matches;
  }, [searchQuery, textContent]);

  const goToSearchMatch = (direction: 1 | -1) => {
    if (!editor || !searchMatches.length) return;
    const next = (searchIndex + direction + searchMatches.length) % searchMatches.length;
    setSearchIndex(next);
    const target = searchMatches[next];
    let position = 1;
    let remaining = target;
    editor.state.doc.descendants((node, nodePosition) => {
      if (position !== 1 || !node.isText) return;
      const length = node.text?.length || 0;
      if (remaining <= length) position = nodePosition + remaining;
      else remaining -= length;
    });
    editor.chain().focus().setTextSelection({ from: position, to: position + searchQuery.length }).run();
  };

  const deleteNote = async () => {
    await onDelete(note.id);
    setShowDeleteDialog(false);
  };

  const editorBody = (
    <>
      <div className="shrink-0 border-b border-border/50 bg-background pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-0">
        <div className="relative flex h-14 items-center justify-between px-3">
          <Button variant="ghost" size="sm" onClick={() => void closeEditor()} className="gap-1 px-2"><ChevronLeft className="h-5 w-5" /><span className="text-sm">Back</span></Button>
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-green-500" />Saved</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} className={TOUCH_BUTTON} title="Search"><Search className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShowMoreTools(true)} className={TOUCH_BUTTON} title="More Tools"><MoreHorizontal className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)} className={cn(TOUCH_BUTTON, "text-destructive")} title="Delete"><Trash2 className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border/40 px-3 py-2 scrollbar-none">
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().undo().run()} className={TOUCH_BUTTON} title="Undo"><Undo2 className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().redo().run()} className={TOUCH_BUTTON} title="Redo"><Redo2 className="h-5 w-5" /></Button>
          <div className="mx-1 h-6 w-px shrink-0 bg-border" />
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={() => editor?.chain().focus().toggleBold().run()} className={cn(TOUCH_BUTTON, editor?.isActive("bold") && "bg-accent")} title="Bold"><strong>B</strong></Button>
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={() => editor?.chain().focus().toggleItalic().run()} className={cn(TOUCH_BUTTON, editor?.isActive("italic") && "bg-accent")} title="Italic"><em>I</em></Button>
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={() => editor?.chain().focus().toggleUnderline().run()} className={cn(TOUCH_BUTTON, editor?.isActive("underline") && "bg-accent")} title="Underline"><UnderlineIcon className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={() => toggleList("bullet")} className={cn(TOUCH_BUTTON, editor?.isActive("bulletList") && "bg-accent")} title="Bullet List"><List className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={() => toggleList("number")} className={cn(TOUCH_BUTTON, editor?.isActive("orderedList") && "bg-accent")} title="Numbered List"><ListOrdered className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={() => toggleList("checklist")} className={cn(TOUCH_BUTTON, editor?.isActive("taskList") && "bg-accent")} title="Checklist"><CheckSquare className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onMouseDown={preserveEditorSelection} onClick={addLink} className={TOUCH_BUTTON} title="Link"><LinkIcon className="h-5 w-5" /></Button>
        </div>
      </div>
      <div ref={contentScrollRef} data-disable-keyboard-autoscroll="true" className="note-editor-scroll flex h-full min-h-0 flex-1 flex-col overflow-y-scroll overscroll-contain bg-background">
        <div className="flex min-h-full flex-1 flex-col gap-4 p-4 sm:p-6">
          <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); editor?.commands.focus("start"); } }} placeholder="Title" className="w-full shrink-0 border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/50 sm:text-3xl" />
          <div onClick={handleEditorClick} className="note-tiptap relative min-h-0 flex-1 text-base leading-relaxed sm:text-lg">
            <EditorContent editor={editor} />
          </div>
        </div>
        <div ref={scrollBufferRef} aria-hidden="true" className="note-editor-scroll-buffer shrink-0" />
      </div>
      <Drawer open={showMoreTools} onOpenChange={setShowMoreTools}>
        <DrawerContent data-enable-drag="true" className="max-h-[70vh]"><DrawerHeader><DrawerTitle>Note Tools</DrawerTitle></DrawerHeader><div className="grid grid-cols-3 gap-2 px-5 pb-8">
          <button type="button" onClick={() => { setShowMoreTools(false); setShowSearch(true); }} className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/60 text-sm"><Search className="h-5 w-5" />Search</button>
          <button type="button" onClick={() => { void copyNote(); setShowMoreTools(false); }} className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/60 text-sm"><Copy className="h-5 w-5" />Copy</button>
          <button type="button" onClick={() => { setShowMoreTools(false); setShowStats(true); }} className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/60 text-sm"><Info className="h-5 w-5" />Details</button>
          <button type="button" onClick={() => { setShowMoreTools(false); editor?.chain().focus().selectAll().run(); }} className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/60 text-sm"><span className="text-xl font-semibold">A</span>Select All</button>
          <button type="button" onClick={() => { setShowMoreTools(false); editor?.chain().focus().clearContent().run(); }} className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/60 text-sm text-destructive"><Trash2 className="h-5 w-5" />Delete All</button>
          <button type="button" onClick={() => { setShowMoreTools(false); addLink(); }} className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/60 text-sm"><LinkIcon className="h-5 w-5" />Link</button>
        </div></DrawerContent>
      </Drawer>
      <Drawer open={showSearch} onOpenChange={setShowSearch}>
        <DrawerContent data-enable-drag="true" className="max-h-[42vh]"><DrawerHeader><DrawerTitle>Find in Note</DrawerTitle></DrawerHeader><div className="px-5 pb-7"><div className="flex items-center gap-2 rounded-2xl border bg-muted/30 px-3"><Search className="h-5 w-5 shrink-0 text-muted-foreground" /><input ref={searchInputRef} autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); goToSearchMatch(event.shiftKey ? -1 : 1); } }} placeholder="Search this note..." className="h-12 min-w-0 flex-1 bg-transparent outline-none" />{searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="text-muted-foreground"><X className="h-5 w-5" /></button>}</div><div className="mt-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">{searchMatches.length ? `${searchIndex + 1} of ${searchMatches.length}` : searchQuery ? "No results" : "Type to search"}</span>{searchMatches.length > 0 && <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => goToSearchMatch(-1)}>Previous</Button><Button variant="outline" size="sm" onClick={() => goToSearchMatch(1)}>Next</Button></div>}</div></div></DrawerContent>
      </Drawer>
      <AlertDialog open={showStats} onOpenChange={setShowStats}><AlertDialogContent className="z-[300]"><button type="button" aria-label="Close details" onClick={() => setShowStats(false)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"><X className="h-5 w-5" /></button><AlertDialogHeader><AlertDialogTitle>Note Details</AlertDialogTitle><AlertDialogDescription>{title.trim() || "Untitled note"}</AlertDialogDescription></AlertDialogHeader><div className="grid grid-cols-2 gap-3 py-3">{[["Items", noteStats.blocks], ["Completed", `${noteStats.completed}/${noteStats.checklists}`], ["Words", noteStats.words], ["Characters", noteStats.characters]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/60 p-4"><div className="text-2xl font-semibold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></div>)}</div><AlertDialogAction>Done</AlertDialogAction></AlertDialogContent></AlertDialog>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}><AlertDialogContent className="z-[300]"><AlertDialogHeader><AlertDialogTitle>Delete Note</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{title || "this note"}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void deleteNote()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={showLinkDialog} onOpenChange={setShowLinkDialog}><AlertDialogContent className="z-[300]"><AlertDialogHeader><AlertDialogTitle>{linkDialogMode === "open" ? "Open External Link?" : "Add Link"}</AlertDialogTitle><AlertDialogDescription>{linkDialogMode === "open" ? "You are about to open this link in your browser." : "Enter a website URL to add to this note."}</AlertDialogDescription></AlertDialogHeader><div className="py-2"><input autoFocus type="url" value={pendingLinkUrl} onChange={(event) => setPendingLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitLink(); } }} placeholder="https://example.com" className="h-12 w-full rounded-xl border bg-transparent px-3 outline-none" /></div><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={submitLink}>{linkDialogMode === "open" ? "Open Link" : "Add Link"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );

  const content = presentation === "page" ? <div className="flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden bg-background">{editorBody}</div> : <Drawer open={open} onOpenChange={(isOpen) => { if (!isOpen) void closeEditor(); }}><DrawerContent data-enable-drag="true" className="flex h-screen max-h-screen min-h-screen w-full flex-col overflow-hidden rounded-none border-0 bg-background">{editorBody}</DrawerContent></Drawer>;
  return content;
}
