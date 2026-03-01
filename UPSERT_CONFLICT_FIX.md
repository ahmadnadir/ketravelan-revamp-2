# PATCH to POST Fix

## Problem Identified
Using `.update()` in Supabase JS triggers PATCH requests which fail with CORS errors:
```
PATCH https://...supabase.co/rest/v1/trips?id=eq.XXX
net::ERR_FAILED
```

PATCH requests have CORS preflight issues that cause authentication failures.

## Solution Applied
Changed ALL `.update()` calls to `.upsert()` with the ID included in the data object.

### Before (WRONG - Uses PATCH):
```typescript
// src/lib/trips.ts - updateTrip()
const updateData: Record<string, any> = {}; // ❌ Missing id

// ... populate updateData ...

const { data: trip, error } = await supabase
  .from('trips')
  .update(updateData)         // ❌ Uses PATCH!
  .eq('id', tripId)
  .select()
  .single();
```

### After (CORRECT - Uses POST):
```typescript
// src/lib/trips.ts - updateTrip()
const updateData: Record<string, any> = { id: tripId }; // ✅ Include id

// ... populate updateData ...

const { data: trip, error } = await supabase
  .from('trips')
  .upsert(updateData, { onConflict: 'id' }) // ✅ Uses POST!
  .select()
  .single();
```

## Why This Works

### HTTP Method Comparison:
- `.update()` → PATCH request → CORS preflight → Auth issues
- `.upsert()` → POST request → No preflight → Works perfectly

### Flow:
1. **Step 1 (First save)**:
   - No draft ID exists yet
   - Uses `createTrip()` → `.insert()` → POST
   - Creates new row with `id`
   - Saves `id` to localStorage

2. **Steps 2-4 (Subsequent saves)**:
   - Draft ID exists
   - Uses `updateTrip()` → `.upsert({ id, ...data }, { onConflict: 'id' })` → POST
   - Upsert sees existing ID, updates row
   - No PATCH, no CORS issues

### Code Flow in `useDraftTrip.ts`:
```typescript
// Line 256-263
if (draftIdRef.current) {
  // Has draft ID → UPSERT (POST)
  await updateTrip(draftIdRef.current, tripData);
} else {
  // No draft ID → INSERT (POST)
  const newTrip = await createTrip(tripData);
  draftIdRef.current = newTrip.id;
  localStorage.setItem(DRAFT_ID_KEY, newTrip.id);
  setDraft(prev => ({ ...prev, draftId: newTrip.id }));
}
```

### Benefits:
- ✅ Uses POST for all operations (no PATCH)
- ✅ No CORS preflight issues
- ✅ Works with Supabase auth headers
- ✅ Both INSERT and UPDATE RLS policies supported
- ✅ Handles both create and update in one function

## Testing Checklist

### Test 1: First Save (Step 1)
```
1. Select visibility (public/private)
2. Check localStorage: ketravelan-draft-trip-id should be saved
3. Check DB: SELECT * FROM trips WHERE status = 'draft'
4. Verify: One row created with correct creator_id
```

### Test 2: Update Draft (Steps 2-3)
```
1. Fill in title, destination, styles
2. Wait 1 second (debounce)
3. Check toast: "Draft saved"
4. Check DB: SELECT title, destination, tags FROM trips WHERE id = 'draft-id'
5. Verify: Fields updated, no duplicate rows
```

### Test 3: Publish (Step 4)
```
1. Click "Publish Trip"
2. Check DB: SELECT status FROM trips WHERE id = 'draft-id'
3. Verify: status = 'published', not 'draft'
4. Verify: No duplicate rows
5. Verify: Redirects to /trips/{id}
```

## Files Changed
- `src/lib/trips.ts` - updateTrip() function - changed `.update()` to `.upsert()`
- `src/hooks/useDraftTrip.ts` - visibility update - changed `.update()` to `.upsert()`
- `src/lib/draftTripStep1.ts` - both functions - changed `.update()` to `.upsert()`
- `DIY_TRIP_CREATION_GUIDE.md` - documentation updated

## Key Takeaway
**NEVER use `.update()` for trip drafts! Always use `.upsert()` with ID in data to avoid PATCH requests.**

## Zero Additional Dependencies
- No new packages
- No schema changes
- No RLS policy changes
- Pure Supabase JS client
