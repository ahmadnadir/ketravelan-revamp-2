import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { NoteEditor } from "@/components/trip-hub/NoteEditor";
import {
  fetchTripNotes,
  updateTripNote,
  deleteTripNote,
  TripNoteDB,
} from "@/lib/tripNotes.db";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendSystemMessage } from "@/lib/system-messages";

export default function TripNoteEditor() {
  const { tripId = "", noteId = "" } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const [note, setNote] = useState<TripNoteDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadNote = useCallback(async () => {
    if (!tripId || !noteId) return;
    setIsLoading(true);
    try {
      const notes = await fetchTripNotes(tripId);
      setNote(notes.find((item) => item.id === noteId) || null);
    } catch {
      toast({ title: "Failed to load note" });
    } finally {
      setIsLoading(false);
    }
  }, [noteId, toast, tripId]);

  useEffect(() => {
    void loadNote();
  }, [loadNote]);

  const handleSave = async (updatedNote: TripNoteDB) => {
    const saved = await updateTripNote(updatedNote.id, {
      title: updatedNote.title,
      blocks: updatedNote.blocks,
    });
    setNote(saved);
  };

  const handleDelete = async (id: string) => {
    await deleteTripNote(id);
    navigate(`/trip/${tripId}/hub?tab=notes`, { replace: true });
  };

  const handleClose = () => {
    navigate(`/trip/${tripId}/hub?tab=notes`, { replace: true });
  };

  const handleNoteEdited = async (editedNote: TripNoteDB) => {
    setNote(editedNote);
    if (!user || !tripId) return;
    try {
      if (conversationId) {
        await sendSystemMessage({
          conversationId,
          action: "note_edited",
          senderName: profile?.full_name || profile?.username || user.email || "Someone",
          details: editedNote.title || "Untitled",
        });
      }
    } catch {
      // The existing editor save remains authoritative if notification delivery fails.
    }
  };

  if (isLoading) {
    return <div className="min-h-dvh bg-background" aria-label="Loading note" />;
  }

  if (!note) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        Note not found.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <NoteEditor
        note={note}
        open
        onClose={handleClose}
        onSave={handleSave}
        onDelete={handleDelete}
        tripId={tripId}
        onNoteEdited={handleNoteEdited}
        presentation="page"
      />
    </div>
  );
}
