import { supabase } from './supabase';

export interface NoteBlock {
  id: string;
  type: 'text' | 'checklist' | 'bullet' | 'number';
  content: string;
  checked?: boolean;
}

export interface TripNoteDB {
  id: string;
  trip_id: string;
  author_id: string;
  title: string;
  blocks: NoteBlock[];
  updated_at: string;
}

export async function fetchTripNotes(tripId: string): Promise<TripNoteDB[]> {
  const { data, error } = await supabase
    .from('trip_notes')
    .select('*')
    .eq('trip_id', tripId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTripNote(tripId: string, title: string, blocks: NoteBlock[] = []): Promise<TripNoteDB> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('trip_notes')
    .insert({
      trip_id: tripId,
      author_id: user.id,
      title: title || 'Untitled',
      blocks: blocks,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTripNote(
  noteId: string,
  updates: { title?: string; blocks?: NoteBlock[] }
): Promise<TripNoteDB> {
  const { data, error } = await supabase
    .from('trip_notes')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTripNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_notes')
    .delete()
    .eq('id', noteId);
  
  if (error) throw error;
}
