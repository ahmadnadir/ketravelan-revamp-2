import { supabase } from '../lib/supabase';

export interface DepartureAvailability {
  departureId: string;
  maxCapacity: number;
  bookedPax: number;
  availableSeats: number;
  isAvailable: boolean;
  canBook: boolean;
}

export interface BookingValidationResult {
  isValid: boolean;
  error?: string;
  availability?: DepartureAvailability;
}

export async function validateDepartureAvailability(
  departureId: string,
  requestedPax: number
): Promise<BookingValidationResult> {
  try {
    const { data, error } = await supabase
      .from('guided_trip_departure_dates')
      .select('id, max_capacity, booked_pax, is_available')
      .eq('id', departureId)
      .maybeSingle();

    if (error) {
      return {
        isValid: false,
        error: `Failed to validate departure: ${error.message}`,
      };
    }

    if (!data) {
      return {
        isValid: false,
        error: 'Departure not found',
      };
    }

    const availableSeats = data.max_capacity - data.booked_pax;
    const canBook = data.is_available && availableSeats > 0;

    const availability: DepartureAvailability = {
      departureId: data.id,
      maxCapacity: data.max_capacity,
      bookedPax: data.booked_pax,
      availableSeats,
      isAvailable: data.is_available,
      canBook,
    };

    if (!data.is_available) {
      return {
        isValid: false,
        error: 'This departure is no longer available',
        availability,
      };
    }

    if (availableSeats === 0) {
      return {
        isValid: false,
        error: 'This departure is fully booked',
        availability,
      };
    }

    if (availableSeats < requestedPax) {
      return {
        isValid: false,
        error: `Only ${availableSeats} ${
          availableSeats === 1 ? 'seat' : 'seats'
        } available. Please adjust your selection.`,
        availability,
      };
    }

    if (requestedPax < 1) {
      return {
        isValid: false,
        error: 'At least 1 participant is required',
        availability,
      };
    }

    return {
      isValid: true,
      availability,
    };
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : 'Unknown validation error',
    };
  }
}

export async function bookDeparture(
  departureId: string,
  requestedPax: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase.rpc('guided_book_departure', {
      p_departure_id: departureId,
      p_requested_pax: requestedPax,
    });

    if (error) {
      if (error.message.includes('Insufficient capacity')) {
        return {
          success: false,
          error: 'Sorry, this departure is now fully booked or does not have enough seats.',
        };
      }
      if (error.message.includes('no longer available')) {
        return {
          success: false,
          error: 'This departure is no longer available.',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Booking failed',
    };
  }
}

export async function cancelDepartureBooking(
  departureId: string,
  paxToCancel: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase.rpc('guided_cancel_departure_booking', {
      p_departure_id: departureId,
      p_pax_to_cancel: paxToCancel,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Cancellation failed',
    };
  }
}

export async function getDeparturePrice(
  departureId: string,
  baseTripPrice: number
): Promise<number> {
  const { data } = await supabase
    .from('guided_trip_departure_dates')
    .select('price_per_person')
    .eq('id', departureId)
    .maybeSingle();

  return data?.price_per_person ?? baseTripPrice;
}

export function validateCustomerDetails(
  name: string,
  email: string,
  phone: string
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  const phoneRegex = /^[\d\s+\-()]+$/;
  if (!phone || !phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 8) {
    errors.phone = 'Please enter a valid phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
