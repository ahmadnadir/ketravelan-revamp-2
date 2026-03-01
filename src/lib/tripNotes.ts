export interface TripNote {
  id: string;
  tripId: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "ketravelan-trip-notes";

function getAllNotes(): TripNote[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAllNotes(notes: TripNote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function getNotesByTripId(tripId: string): TripNote[] {
  const notes = getAllNotes().filter((n) => n.tripId === tripId);
  // Sort: pinned first, then by updatedAt desc
  return notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function getNoteById(id: string): TripNote | undefined {
  return getAllNotes().find((n) => n.id === id);
}

export function saveNote(note: TripNote): void {
  const notes = getAllNotes();
  const existingIndex = notes.findIndex((n) => n.id === note.id);
  
  if (existingIndex >= 0) {
    notes[existingIndex] = { ...note, updatedAt: Date.now() };
  } else {
    notes.push(note);
  }
  
  saveAllNotes(notes);
}

export function deleteNote(id: string): void {
  const notes = getAllNotes().filter((n) => n.id !== id);
  saveAllNotes(notes);
}

export function togglePinNote(id: string): TripNote | undefined {
  const notes = getAllNotes();
  const noteIndex = notes.findIndex((n) => n.id === id);
  
  if (noteIndex >= 0) {
    notes[noteIndex].pinned = !notes[noteIndex].pinned;
    notes[noteIndex].updatedAt = Date.now();
    saveAllNotes(notes);
    return notes[noteIndex];
  }
  
  return undefined;
}

export function createNewNote(tripId: string): TripNote {
  const now = Date.now();
  return {
    id: `note-${now}`,
    tripId,
    title: "",
    content: "",
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}
