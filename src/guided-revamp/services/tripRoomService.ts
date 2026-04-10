import { supabase } from '../lib/supabase';

export interface TripRoom {
  id: string;
  booking_id: string;
  trip_id: string;
  departure_id: string;
  agent_id: string;
  room_name: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface TripRoomMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_type: 'agent' | 'customer';
  message: string;
  created_at: string;
}

export interface TripRoomDocument {
  id: string;
  room_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  category: 'itinerary' | 'packing_list' | 'guidelines' | 'other';
  description: string | null;
  created_at: string;
}

export interface TripRoomMember {
  id: string;
  room_id: string;
  user_id: string | null;
  member_name: string;
  member_email: string;
  member_type: 'agent' | 'customer';
  payment_status: 'completed' | 'partial' | 'pending';
  joined_at: string;
}

export async function getTripRoomByBookingId(bookingId: string): Promise<TripRoom | null> {
  const { data, error } = await supabase
    .from('guided_trip_rooms')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getTripRoomById(roomId: string): Promise<TripRoom | null> {
  const { data, error } = await supabase
    .from('guided_trip_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getRoomMessages(roomId: string): Promise<TripRoomMessage[]> {
  const { data, error } = await supabase
    .from('guided_trip_room_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function sendMessage(
  roomId: string,
  senderName: string,
  senderType: 'agent' | 'customer',
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('guided_trip_room_messages')
      .insert({
        room_id: roomId,
        sender_id: user?.id || null,
        sender_name: senderName,
        sender_type: senderType,
        message,
      });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send message',
    };
  }
}

export async function getRoomDocuments(roomId: string): Promise<TripRoomDocument[]> {
  const { data, error } = await supabase
    .from('guided_trip_room_documents')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function uploadRoomDocument(
  roomId: string,
  file: File,
  category: 'itinerary' | 'packing_list' | 'guidelines' | 'other',
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${roomId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('trip-documents')
      .upload(fileName, file);

    if (uploadError) {
      return {
        success: false,
        error: uploadError.message,
      };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('trip-documents')
      .getPublicUrl(fileName);

    const { error: dbError } = await supabase
      .from('guided_trip_room_documents')
      .insert({
        room_id: roomId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        category,
        description: description || null,
      });

    if (dbError) {
      return {
        success: false,
        error: dbError.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload document',
    };
  }
}

export async function deleteRoomDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: doc } = await supabase
      .from('guided_trip_room_documents')
      .select('file_url')
      .eq('id', documentId)
      .maybeSingle();

    if (doc && doc.file_url) {
      const fileName = doc.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('trip-documents').remove([fileName]);
      }
    }

    const { error } = await supabase
      .from('guided_trip_room_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete document',
    };
  }
}

export async function getRoomMembers(roomId: string): Promise<TripRoomMember[]> {
  const { data, error } = await supabase
    .from('guided_trip_room_members')
    .select('*')
    .eq('room_id', roomId)
    .order('member_type', { ascending: false })
    .order('joined_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function updateMemberPaymentStatus(
  memberId: string,
  paymentStatus: 'completed' | 'partial' | 'pending'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('guided_trip_room_members')
      .update({ payment_status: paymentStatus })
      .eq('id', memberId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update payment status',
    };
  }
}

export interface TripRoomSummary {
  totalParticipants: number;
  totalCollected: number;
  totalOutstanding: number;
  totalTripValue: number;
  paymentCompliance: number;
}

export async function getTripRoomSummary(roomId: string): Promise<TripRoomSummary> {
  const { data: room } = await supabase
    .from('guided_trip_rooms')
    .select(`
      *,
      booking:guided_bookings(
        id,
        num_participants,
        total_amount,
        payment_status
      )
    `)
    .eq('id', roomId)
    .maybeSingle();

  if (!room || !room.booking) {
    return {
      totalParticipants: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalTripValue: 0,
      paymentCompliance: 0,
    };
  }

  const { data: paymentSchedules } = await supabase
    .from('guided_payment_schedules')
    .select('*')
    .eq('booking_id', room.booking.id);

  const totalCollected = paymentSchedules
    ?.filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

  const totalOutstanding = room.booking.total_amount - totalCollected;
  const paymentCompliance = room.booking.total_amount > 0
    ? (totalCollected / room.booking.total_amount) * 100
    : 0;

  return {
    totalParticipants: room.booking.num_participants,
    totalCollected,
    totalOutstanding,
    totalTripValue: room.booking.total_amount,
    paymentCompliance: Math.round(paymentCompliance),
  };
}

export function subscribeToMessages(
  roomId: string,
  callback: (message: TripRoomMessage) => void
) {
  return supabase
    .channel(`room:${roomId}:messages`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'guided_trip_room_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as TripRoomMessage);
      }
    )
    .subscribe();
}
