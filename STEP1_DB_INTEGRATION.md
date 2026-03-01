# Step 1: Visibility - Database Integration

## Overview
Step 1 creates a draft trip record **immediately** when the user selects visibility. This ensures the trip exists in the database from the very beginning of the creation flow.

---

## Database Schema

### trips.visibility
- **Type:** text
- **Values:** 'public' | 'private'
- **Default:** 'public'
- **Required:** NOT NULL

### trips.status
- **Type:** trip_status enum
- **Values:** 'draft' | 'published' | 'cancelled' | 'completed'
- **Default:** 'draft'

### trips.creator_id
- **Type:** uuid
- **References:** profiles(id)
- **Required:** NOT NULL
- **Automatic:** Set from auth.uid()

---

## Implementation Files

### 1. `/src/lib/draftTripStep1.ts`
Core database operations for Step 1.

#### `initializeDraftTrip(visibility)`
**When to call:** User selects visibility option and clicks "Next"

**What it does:**
1. Checks if user is authenticated
2. Looks for existing draft trip ID in localStorage
3. If existing draft found → updates its visibility
4. If no draft found → creates new draft trip with minimal data
5. Saves draft trip ID to localStorage
6. Returns trip ID

**Parameters:**
- `visibility`: 'public' | 'private'

**Returns:** `Promise<string>` (trip ID)

**Database operation:**
```typescript
// Creates new trip record
INSERT INTO trips (
  creator_id,      // auth.uid()
  type,            // 'community'
  status,          // 'draft'
  title,           // 'Untitled Trip' (placeholder)
  destination,     // 'TBD' (placeholder)
  visibility       // user's choice
)
```

#### `updateDraftVisibility(tripId, visibility)`
**When to call:** User changes visibility after draft exists

**What it does:**
- Updates only the visibility field
- Ensures user owns the trip
- Updates timestamp

#### `getDraftTripId()`
Returns current draft trip ID from localStorage.

#### `clearDraftTripId()`
Removes draft trip ID from localStorage.

---

### 2. `/src/hooks/useDraftTrip.ts`
React hook for managing draft state.

#### `initializeWithVisibility(visibility)`
**New method** specifically for Step 1.

**Usage in Step 1 component:**
```typescript
const { initializeWithVisibility } = useDraftTrip();

const handleNext = async () => {
  try {
    const tripId = await initializeWithVisibility(selectedVisibility);
    console.log('Draft created:', tripId);
    // Navigate to Step 2
  } catch (error) {
    // Show error toast
  }
};
```

**What it does:**
1. Calls `initializeDraftTrip()` from draftTripStep1.ts
2. Updates React state with new trip ID
3. Sets `hasDraft = true`
4. Updates `lastSaved` timestamp
5. Returns trip ID

---

## Draft Trip ID Persistence

### Storage Strategy

#### localStorage Key: `ketravelan-draft-trip-id`
**Stores:** UUID of current draft trip

**Why both localStorage AND database:**
- **localStorage:** Quick access, survives page refresh
- **Database:** Source of truth, accessible across devices

#### Flow Diagram
```
Step 1: Select Visibility
    ↓
Call initializeWithVisibility('public')
    ↓
Check localStorage for existing draft ID
    ↓
    ├─ Found → Update visibility in DB
    │          Keep same trip ID
    │
    └─ Not Found → Create new trip in DB
                   Store new trip ID in localStorage
    ↓
Trip ID persists in localStorage
    ↓
Steps 2-4 use same trip ID for updates
```

---

## Draft Lifecycle

### Creation (Step 1)
```sql
-- Minimal draft created immediately
INSERT INTO trips (
  id,                    -- auto-generated UUID
  creator_id,            -- from auth.uid()
  type,                  -- 'community'
  status,                -- 'draft'
  title,                 -- 'Untitled Trip'
  destination,           -- 'TBD'
  visibility,            -- user's choice
  created_at,            -- now()
  updated_at             -- now()
)
```

### Updates (Steps 2-4)
```sql
-- Each step updates same record
UPDATE trips
SET
  title = ?,
  description = ?,
  destination = ?,
  -- ... other fields
  updated_at = now()
WHERE
  id = <stored_draft_id>
  AND creator_id = auth.uid()
  AND status = 'draft'
```

### Publishing (Step 4)
```sql
-- Convert draft to published
UPDATE trips
SET
  status = 'published',
  updated_at = now()
WHERE
  id = <stored_draft_id>
  AND creator_id = auth.uid()
  AND status = 'draft'
```

---

## Error Handling

### Scenario 1: User not authenticated
```typescript
// initializeDraftTrip throws
throw new Error('User must be authenticated to create a draft trip');
```
**UI should:** Redirect to login

### Scenario 2: Draft ID exists but trip deleted
```typescript
// initializeDraftTrip detects mismatch
localStorage.removeItem(DRAFT_ID_KEY);
// Creates new draft
```
**UI behavior:** Seamlessly creates new draft

### Scenario 3: Network failure during creation
```typescript
// Supabase throws error
catch (error) {
  console.error('Failed to initialize draft trip:', error);
  throw error; // Propagates to UI
}
```
**UI should:** Show error toast, allow retry

---

## Row Level Security (RLS)

### Relevant Policies

#### trips table - INSERT
```sql
CREATE POLICY "Users can create trips"
ON trips FOR INSERT
WITH CHECK (auth.uid() = creator_id);
```
✅ Allows draft creation

#### trips table - UPDATE
```sql
CREATE POLICY "Users can update own trips"
ON trips FOR UPDATE
USING (auth.uid() = creator_id);
```
✅ Allows draft updates

#### trips table - SELECT
```sql
CREATE POLICY "Published trips viewable by everyone"
ON trips FOR SELECT
USING (status = 'published' OR creator_id = auth.uid());
```
✅ User can see their own drafts

---

## Step 1 UI Integration Guide

### Recommended Component Structure

```typescript
import { useState } from 'react';
import { useDraftTrip } from '@/hooks/useDraftTrip';
import { toast } from 'sonner';

export function Step1Visibility({ onNext }: { onNext: () => void }) {
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isCreating, setIsCreating] = useState(false);
  const { initializeWithVisibility } = useDraftTrip();

  const handleNext = async () => {
    setIsCreating(true);
    try {
      await initializeWithVisibility(visibility);
      onNext(); // Navigate to Step 2
    } catch (error) {
      toast.error('Failed to create draft trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      {/* Public Trip Option */}
      <button
        onClick={() => setVisibility('public')}
        disabled={isCreating}
      >
        Public Trip
      </button>

      {/* Private Trip Option */}
      <button
        onClick={() => setVisibility('private')}
        disabled={isCreating}
      >
        Friends / Private Trip
      </button>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Next'}
      </button>
    </div>
  );
}
```

### Key Points
1. **Disable UI during creation** - Prevent duplicate trips
2. **Show loading state** - UX feedback
3. **Handle errors gracefully** - Allow retry
4. **Navigate only on success** - Don't proceed if creation fails

---

## Testing Checklist

### Happy Path
- ✅ User selects "Public Trip" → draft created with visibility='public'
- ✅ User selects "Private Trip" → draft created with visibility='private'
- ✅ Draft trip ID stored in localStorage
- ✅ Navigation to Step 2 works
- ✅ Step 2 can load and update the draft

### Edge Cases
- ✅ User creates draft, goes to Step 2, comes back → same draft reused
- ✅ User closes browser, returns → draft still exists
- ✅ User logs out and back in → can see their draft
- ✅ Draft ID in localStorage but trip deleted → new draft created
- ✅ Multiple tabs open → all use same draft ID

### Error Cases
- ✅ Not authenticated → clear error message
- ✅ Network failure → retry works
- ✅ Database constraint error → handled gracefully

---

## Database Query Examples

### Check if user has existing drafts
```typescript
const { data: drafts } = await supabase
  .from('trips')
  .select('id, title, visibility, updated_at')
  .eq('creator_id', user.id)
  .eq('status', 'draft')
  .order('updated_at', { ascending: false });
```

### Load specific draft
```typescript
const { data: draft } = await supabase
  .from('trips')
  .select('*')
  .eq('id', draftId)
  .eq('creator_id', user.id)
  .eq('status', 'draft')
  .maybeSingle();
```

### Delete abandoned draft
```typescript
await supabase
  .from('trips')
  .delete()
  .eq('id', draftId)
  .eq('creator_id', user.id)
  .eq('status', 'draft');
```

---

## Summary

**Step 1 creates a draft trip immediately with:**
- ✅ Unique trip ID (UUID)
- ✅ Creator association (auth.uid)
- ✅ Draft status
- ✅ User-selected visibility
- ✅ Placeholder title and destination

**The trip ID persists via:**
- ✅ localStorage (key: 'ketravelan-draft-trip-id')
- ✅ React state (useDraftTrip hook)
- ✅ Database record (source of truth)

**Steps 2-4 use this ID to:**
- ✅ Update the same draft trip record
- ✅ Add more details progressively
- ✅ Eventually publish when complete
