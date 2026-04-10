import { supabase } from '../lib/supabase';
import { Booking, PaymentPlanSnapshot } from '../types/guided-trip';

export interface CreateBookingInput {
  tripId: string;
  departureId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  numParticipants: number;
  totalAmount: number;
  paymentPlanSnapshot: PaymentPlanSnapshot;
}

export interface BookingCreationResult {
  success: boolean;
  booking?: Booking;
  firstPaymentScheduleId?: string;
  error?: string;
}

export async function createBooking(
  input: CreateBookingInput
): Promise<BookingCreationResult> {
  try {
    const bookingReference = await generateBookingReference();

    const bookingData = {
      booking_reference: bookingReference,
      trip_id: input.tripId,
      departure_id: input.departureId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      num_participants: input.numParticipants,
      total_amount: input.totalAmount,
      payment_mode: input.paymentPlanSnapshot.mode,
      payment_plan_snapshot: input.paymentPlanSnapshot,
      booking_status: 'awaiting_payment',
      payment_status: 'unpaid',
    };

    const { data: booking, error: bookingError } = await supabase
      .from('guided_bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      return {
        success: false,
        error: `Failed to create booking: ${bookingError.message}`,
      };
    }

    const paymentSchedules = input.paymentPlanSnapshot.installments.map(
      (installment) => ({
        booking_id: booking.id,
        installment_number: installment.installmentNumber,
        due_date: installment.dueDate,
        amount: installment.amount,
        payment_status: 'pending',
      })
    );

    const { data: scheduleData, error: scheduleError } = await supabase
      .from('guided_payment_schedules')
      .insert(paymentSchedules)
      .select();

    if (scheduleError || !scheduleData) {
      await supabase.from('guided_bookings').delete().eq('id', booking.id);

      return {
        success: false,
        error: `Failed to create payment schedule: ${scheduleError?.message || 'Unknown error'}`,
      };
    }

    const firstPaymentSchedule = scheduleData.find(s => s.installment_number === 1);

    return {
      success: true,
      booking,
      firstPaymentScheduleId: firstPaymentSchedule?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

async function generateBookingReference(): Promise<string> {
  const { data } = await supabase.rpc('guided_generate_booking_reference');
  return data || `GT-${Date.now()}`;
}

export async function getBookingByReference(
  reference: string
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('guided_bookings')
    .select('*')
    .eq('booking_reference', reference)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getBookingsByEmail(email: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('guided_bookings')
    .select('*')
    .eq('customer_email', email)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getPaymentSchedule(bookingId: string) {
  const { data, error } = await supabase
    .from('guided_payment_schedules')
    .select('*')
    .eq('booking_id', bookingId)
    .order('installment_number', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getFirstPendingPayment(bookingId: string) {
  const { data, error } = await supabase
    .from('guided_payment_schedules')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('payment_status', 'pending')
    .order('installment_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function markPaymentAsPaid(
  paymentScheduleId: string,
  paymentMethod: string,
  transactionReference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('guided_payment_schedules')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        transaction_reference: transactionReference,
      })
      .eq('id', paymentScheduleId);

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
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function cancelBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: bookingError } = await supabase
      .from('guided_bookings')
      .update({
        booking_status: 'cancelled',
      })
      .eq('id', bookingId);

    if (bookingError) {
      return {
        success: false,
        error: bookingError.message,
      };
    }

    const { error: scheduleError } = await supabase
      .from('guided_payment_schedules')
      .update({
        payment_status: 'cancelled',
      })
      .eq('booking_id', bookingId)
      .eq('payment_status', 'pending');

    if (scheduleError) {
      return {
        success: false,
        error: scheduleError.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'awaiting_payment' | 'confirmed' | 'cancelled' | 'completed' | 'payment_failed'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('guided_bookings')
      .update({ booking_status: status })
      .eq('id', bookingId);

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
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function confirmBookingAfterPayment(
  bookingId: string,
  departureId: string,
  numParticipants: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: booking } = await supabase
      .from('guided_bookings')
      .select('booking_status, slots_reserved_at')
      .eq('id', bookingId)
      .maybeSingle();

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
      };
    }

    if (booking.slots_reserved_at) {
      return { success: true };
    }

    const { data: bookingResult, error: bookingError } = await supabase.rpc(
      'guided_book_departure',
      {
        p_departure_id: departureId,
        p_requested_pax: numParticipants,
      }
    );

    if (bookingError) {
      return {
        success: false,
        error: `Failed to update capacity: ${bookingError.message}`,
      };
    }

    const { error: statusError } = await supabase
      .from('guided_bookings')
      .update({
        slots_reserved_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (statusError) {
      return {
        success: false,
        error: `Failed to confirm booking: ${statusError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
