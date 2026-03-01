# Trip Reminder Recalculation Test

## What We Fixed
When trip dates are updated, the scheduled reminders now automatically recalculate to match the new dates. Previously, reminders would stay on the old dates causing incorrect notifications.

## Test Procedure

### Step 1: Create a Test Trip
1. Go to "Create Trip" in the app
2. Fill in trip details:
   - Name: "Reminder Test Trip"
   - Start Date: **Tomorrow** (e.g., if today is Feb 20, set to Feb 21)
   - End Date: **Day after tomorrow** (e.g., Feb 22)
3. Complete the wizard and **Publish** the trip
4. Verify trip is created and published

### Step 2: Check Initial Reminders
In Supabase dashboard, run this query:
```sql
SELECT * FROM trip_reminders_scheduled 
WHERE trip_id = (SELECT id FROM trips WHERE title = 'Reminder Test Trip')
ORDER BY scheduled_date;
```

You should see 4 reminders:
- `7_days`: 7 days before start (old would be: tomorrow - 7 = 8 days ago)
- `3_days`: 3 days before start (old would be: tomorrow - 3 = 4 days ago)  
- `1_day`: 1 day before start (old would be: tomorrow - 1 = today)
- `trip_end`: On end date

**Note:** Since we're creating with tomorrow's date, the 7/3/1 day reminders should all be in the past - that's OK for testing data consistency.

### Step 3: Update Trip Start Date
1. Go to trip details
2. Edit trip
3. Change start date to **5 days from now** (e.g., Feb 25)
4. Save/Publish the trip

### Step 4: Verify Reminders Were Recalculated
Run the same query again:
```sql
SELECT * FROM trip_reminders_scheduled 
WHERE trip_id = (SELECT id FROM trips WHERE title = 'Reminder Test Trip')
ORDER BY scheduled_date;
```

**Expected Results:**
- Old reminders should be **DELETED** (no rows for old dates)
- New reminders should be created with NEW dates:
  - `7_days`: 5 days from now - 7 = 2 days ago (still past)
  - `3_days`: 5 days from now - 3 = 2 days from now
  - `1_day`: 5 days from now - 1 = 4 days from now
  - `trip_end`: Original end date (Feb 22)

All reminders should have **`sent = false`** so they can trigger again.

### Step 5: Test Reminder Trigger (Optional)
To manually trigger the cron job and test if reminders would send:

1. Go to Supabase SQL Editor
2. Run:
```sql
-- Manually invoke the scheduled reminders check
SELECT 
  tr.id,
  tr.trip_id,
  tr.reminder_type,
  tr.scheduled_date,
  tr.sent,
  t.title,
  t.creator_id
FROM trip_reminders_scheduled tr
JOIN trips t ON tr.trip_id = t.id
WHERE tr.sent = false
AND tr.scheduled_date = CURRENT_DATE
ORDER BY tr.scheduled_date DESC;
```

If you have an old test trip with reminders scheduled for today, they should appear here.

## What's Being Tested
✅ Reminders are deleted when trip dates change
✅ New reminders are calculated based on NEW start/end dates
✅ Reminders have `sent = false` flag so they can trigger again
✅ Recalculation only happens for PUBLISHED trips
✅ Recalculation doesn't crash the trip update

## Troubleshooting

**Problem:** Reminders weren't deleted
- Check if trip is actually published (status = 'published')
- Check if start_date or end_date actually changed

**Problem:** New reminders weren't created
- Check browser console for JS errors
- Check Supabase function logs for errors
- Verify `recalculateTripReminders()` was called

**Problem:** Reminders have `sent = true`
- Old reminders might not have been fully deleted
- Try manually deleting old trip from database and creating new one

## Code Changes
- File: `src/lib/trips.ts`
- Function added: `recalculateTripReminders(tripId, startDate, endDate)`
- Integration: Called from `updateTrip()` when dates change on published trip
- Lines: 787-847 (new function), 765-774 (integration call)

## Database Impact
- Table: `trip_reminders_scheduled`
- Operations: DELETE old records, INSERT new records
- No changes to trips table or other tables
- All changes wrapped in try-catch to not block trip updates
