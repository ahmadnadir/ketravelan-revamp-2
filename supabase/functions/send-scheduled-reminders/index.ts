// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface ReminderRecord {
  id: string;
  trip_id: string;
  reminder_type: string;
  scheduled_date: string;
  sent: boolean;
}

interface TripData {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  creator_id: string;
  slug: string;
}

async function areTripExpensesSettled(tripId: string): Promise<boolean> {
  const { data: expenses, error: expensesError } = await admin
    .from("trip_expenses")
    .select("id")
    .eq("trip_id", tripId)
    .eq("is_deleted", false);

  if (expensesError) throw expensesError;
  if (!expenses || expenses.length === 0) return false;

  const expenseIds = expenses.map((expense) => expense.id);
  const { data: unpaidParticipants, error: unpaidError } = await admin
    .from("expense_participants")
    .select("id")
    .in("expense_id", expenseIds)
    .eq("is_paid", false);

  if (unpaidError) throw unpaidError;

  return (unpaidParticipants || []).length === 0;
}

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[send-scheduled-reminders] Checking for reminders due on ${today}`);

    // Fetch all unsent reminders scheduled for today
    const { data: dueTodayReminders, error: fetchError } = await admin
      .from("trip_reminders_scheduled")
      .select("id, trip_id, reminder_type, scheduled_date, sent")
      .eq("sent", false)
      .eq("scheduled_date", today);

    if (fetchError) {
      console.error("[send-scheduled-reminders] Error fetching reminders:", fetchError);
      throw fetchError;
    }

    if (!dueTodayReminders || dueTodayReminders.length === 0) {
      console.log("[send-scheduled-reminders] No reminders due today");
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No reminders due today",
          count: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-scheduled-reminders] Found ${dueTodayReminders.length} reminders to send`);

    let sentCount = 0;
    let failedCount = 0;

    // Process each reminder
    for (const reminder of dueTodayReminders as ReminderRecord[]) {
      try {
        // Fetch trip details
        const { data: trip, error: tripError } = await admin
          .from("trips")
          .select("id, title, destination, start_date, creator_id, slug")
          .eq("id", reminder.trip_id)
          .maybeSingle();

        if (tripError || !trip) {
          console.error(`[send-scheduled-reminders] Error fetching trip ${reminder.trip_id}:`, tripError);
          failedCount++;
          continue;
        }

        let functionName = "send-trip-reminder-email";

        if (reminder.reminder_type === "trip_end") {
          const expensesSettled = await areTripExpensesSettled(trip.id);
          functionName = expensesSettled
            ? "send-trip-ended-expenses-complete"
            : "send-trip-ended";
        }

        const sendResult = await admin.functions.invoke(functionName, {
          body: { tripId: trip.id },
        });

        if (sendResult.error) {
          console.error(`[send-scheduled-reminders] Error sending reminder for trip ${trip.id}:`, sendResult.error);
          failedCount++;
          continue;
        }

        // Mark reminder as sent
        const { error: updateError } = await admin
          .from("trip_reminders_scheduled")
          .update({
            sent: true,
            sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        if (updateError) {
          console.error(`[send-scheduled-reminders] Error marking reminder as sent:`, updateError);
          failedCount++;
          continue;
        }

        console.log(`[send-scheduled-reminders] Sent ${reminder.reminder_type} reminder for trip ${trip.id} (${trip.destination})`);
        sentCount++;
      } catch (err) {
        console.error("[send-scheduled-reminders] Error processing reminder:", err);
        failedCount++;
      }
    }

    const response = {
      ok: true,
      message: `Processed ${sentCount} reminders, ${failedCount} failed`,
      sentCount,
      failedCount,
      totalChecked: dueTodayReminders.length,
      date: today,
    };

    console.log("[send-scheduled-reminders] Completed:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[send-scheduled-reminders] Fatal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
