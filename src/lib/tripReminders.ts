import { supabase } from "./supabase";

/**
 * Send a trip reminder email to the trip creator
 * Checks user preferences before sending
 */
export async function sendTripReminder(tripId: string, dryRun = false): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-trip-reminder-email', {
      body: { tripId, dryRun },
    });

    if (error) {
      console.error('Error sending trip reminder:', error);
      return false;
    }

    console.log('Trip reminder sent:', data);
    return data?.ok || false;
  } catch (error) {
    console.error('Error invoking trip reminder function:', error);
    return false;
  }
}

/**
 * Schedule trip reminders to be sent at 7, 3, and 1 days before trip starts
 * Typically called when a trip is published
 * @param tripId - The ID of the trip
 */
export async function scheduleTripReminder(tripId: string): Promise<void> {
  try {
    // Fetch trip to get start date
    const { data: trip, error } = await supabase
      .from('trips')
      .select('start_date, end_date')
      .eq('id', tripId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching trip for scheduling reminders:', error);
      return;
    }

    if (!trip?.start_date) {
      console.warn('No start date found for trip, skipping reminder scheduling');
      return;
    }

    const startDate = new Date(trip.start_date);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Calculate reminder dates: 7 days, 3 days, and 1 day before
    const remindersToCreate = [
      { type: '7_days', daysBeforeStart: 7 },
      { type: '3_days', daysBeforeStart: 3 },
      { type: '1_day', daysBeforeStart: 1 },
    ].map(({ type, daysBeforeStart }) => {
      const reminderDate = new Date(startDate);
      reminderDate.setDate(reminderDate.getDate() - daysBeforeStart);

      return {
        trip_id: tripId,
        reminder_type: type,
        scheduled_date: formatDate(reminderDate),
        sent: false,
      };
    });

    if (trip?.end_date) {
      const endDate = new Date(trip.end_date);
      remindersToCreate.push({
        trip_id: tripId,
        reminder_type: 'trip_end',
        scheduled_date: formatDate(endDate),
        sent: false,
      });
    }

    // Insert reminders into database
    const { error: insertError } = await supabase
      .from('trip_reminders_scheduled')
      .insert(remindersToCreate);

    if (insertError) {
      console.error('Error scheduling trip reminders:', insertError);
      return;
    }

    console.log(`Scheduled ${remindersToCreate.length} trip reminders for trip ${tripId}`);
  } catch (error) {
    console.error('Error in scheduleTripReminder:', error);
  }
}
