import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, MoreVertical, FileText, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { fetchTripNotes, createTripNote, updateTripNote, deleteTripNote, TripNoteDB, NoteBlock } from "@/lib/tripNotes.db";
import { NoteEditor } from "./NoteEditor";
import { useToast } from "@/hooks/use-toast";

interface TripNotesProps {
  tripId: string;
}

export function TripNotes({ tripId }: TripNotesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState<TripNoteDB[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`trip-notes-pinned-${tripId}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });
  const [selectedNote, setSelectedNote] = useState<TripNoteDB | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<TripNoteDB | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load notes from DB
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTripNotes(tripId);
      setNotes(data || []);
    } catch (error) {
      console.error("Failed to load notes:", error);
      setNotes([]);
      toast({ title: "Failed to load notes" });
    } finally {
      setIsLoading(false);
    }
  }, [tripId, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const filteredNotes = notes.filter(
    (note) => {
      const blockContent = note.blocks
        .map((b) => b.content)
        .join(" ")
        .toLowerCase();
      return (
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blockContent.includes(searchQuery.toLowerCase())
      );
    }
  ).sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 0 : 1;
    const bPinned = pinnedIds.has(b.id) ? 0 : 1;
    return aPinned - bPinned;
  });

  const pinJustHappened = useRef(false);

  const handleTogglePin = (note: TripNoteDB, e: Event) => {
    e.stopPropagation();
    pinJustHappened.current = true;
    setTimeout(() => { pinJustHappened.current = false; }, 300);
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(note.id)) {
        next.delete(note.id);
      } else {
        next.add(note.id);
      }
      try {
        localStorage.setItem(`trip-notes-pinned-${tripId}`, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  };

  const handleNewNote = async () => {
    try {
      const newNote = await createTripNote(tripId, "Untitled", []);
      setSelectedNote(newNote);
      setEditorOpen(true);
    } catch (error) {
      console.error("Failed to create note:", error);
      toast({ title: "Failed to create note" });
    }
  };

  const handleOpenNote = (note: TripNoteDB) => {
    if (pinJustHappened.current) return;
    setSelectedNote(note);
    setEditorOpen(true);
  };

  const handleSaveNote = async (updatedNote: TripNoteDB) => {
    try {
      await updateTripNote(updatedNote.id, {
        title: updatedNote.title,
        blocks: updatedNote.blocks,
      });
      await loadNotes();
      toast({
        title: "Note saved",
      });
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({ title: "Failed to save note" });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteTripNote(id);
      await loadNotes();
      toast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({ title: "Failed to delete note" });
    }
  };

  const handleDeleteFromCard = (note: TripNoteDB, e: Event) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await handleDeleteNote(noteToDelete.id);
      setNoteToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatRelativeDate = (iso: string) => {
    const timestamp = new Date(iso).getTime();
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 space-y-4 sm:space-y-6">
        {/* Search & Add */}
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-secondary border-0 text-sm sm:text-base h-9 sm:h-10"
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleNewNote} disabled={isLoading} className="rounded-xl text-sm sm:text-base shrink-0">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">New Note</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16 sm:py-20">
            <p className="text-muted-foreground">Loading notes...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notes.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/80 flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No notes yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first note to get started
            </p>
            <Button onClick={handleNewNote} variant="outline" className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        )}

        {/* Notes List */}
        {!isLoading && filteredNotes.length > 0 && (() => {
          const pinned = filteredNotes.filter((n) => pinnedIds.has(n.id));
          const unpinned = filteredNotes.filter((n) => !pinnedIds.has(n.id));
          return (
            <div className="space-y-4 sm:space-y-5">
              {pinned.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 px-0.5">
                    <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pinned</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {pinned.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isPinned={true}
                        onClick={() => handleOpenNote(note)}
                        onDelete={(e) => handleDeleteFromCard(note, e)}
                        onTogglePin={(e) => handleTogglePin(note, e)}
                        formatDate={formatRelativeDate}
                      />
                    ))}
                  </div>
                </div>
              )}
              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2 px-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All Notes</span>
                    </div>
                  )}
                  <div className="space-y-2 sm:space-y-3">
                    {unpinned.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isPinned={false}
                        onClick={() => handleOpenNote(note)}
                        onDelete={(e) => handleDeleteFromCard(note, e)}
                        onTogglePin={(e) => handleTogglePin(note, e)}
                        formatDate={formatRelativeDate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Search No Results */}
        {!isLoading && notes.length > 0 && filteredNotes.length === 0 && (
          <div className="text-center py-10 sm:py-12">
            <p className="text-muted-foreground text-sm sm:text-base">No notes found</p>
          </div>
        )}
      </div>

      {/* Note Editor */}
      {selectedNote && (
        <NoteEditor
          note={selectedNote}
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setSelectedNote(null);
          }}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          tripId={tripId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title || "this note"}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

interface NoteCardProps {
  note: TripNoteDB;
  isPinned: boolean;
  onClick: () => void;
  onDelete: (e: Event) => void;
  onTogglePin: (e: Event) => void;
  formatDate: (iso: string) => string;
}

function NoteCard({ note, isPinned, onClick, onDelete, onTogglePin, formatDate }: NoteCardProps) {
  // Get content preview from blocks
  const contentPreview = note.blocks
    .map((b) => b.content)
    .join(" ")
    .substring(0, 100)
    .trim();

  return (
    <Card
      className={cn(
        "p-3 sm:p-4 border-border/50 hover:border-primary/30 transition-all cursor-pointer active:scale-[0.99] hover:shadow-sm",
        isPinned && "border-primary/20 bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
            <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">
              {note.title || "Untitled"}
            </h4>
          </div>
          {contentPreview && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5 sm:mt-1">
              {contentPreview}
            </p>
          )}
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1.5 sm:mt-2">
            {formatDate(note.updated_at)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onSelect={(e) => onTogglePin(e)}>
              {isPinned ? (
                <><PinOff className="h-4 w-4 mr-2" />Unpin</>
              ) : (
                <><Pin className="h-4 w-4 mr-2" />Pin to top</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => onDelete(e)} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
