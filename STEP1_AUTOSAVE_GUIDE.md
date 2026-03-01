# Step 1 Auto-Save Implementation Guide

## Overview
Step 1 implements intelligent auto-save with debouncing. Every visibility change triggers an auto-save to the database after a short delay (800ms), preventing excessive database calls while ensuring data is never lost.

---

## Auto-Save Behavior

### User Actions → Database Updates

```
User selects "Public Trip"
    ↓
Visibility state changes immediately (instant UI feedback)
    ↓
Auto-save timer starts (800ms delay)
    ↓
User changes to "Private Trip" within 800ms
    ↓
Previous timer cancelled, new timer starts
    ↓
No further changes for 800ms
    ↓
Database update executes
    ↓
Draft saved with latest visibility value
```

### Visual Flow
```
[User clicks Public]
  → UI updates instantly (optimistic)
  → Timer: 800ms countdown starts
  → [User clicks Private before timer ends]
      → Previous timer cancelled
      → UI updates to Private
      → New timer: 800ms countdown starts
  → Timer completes
  → DB UPDATE: visibility = 'private'
  → Success feedback shown
```

---

## Implementation Options

### Option 1: Using `useStep1Draft` Hook (Recommended)

**File:** `/src/hooks/useStep1Draft.ts`

This hook provides complete Step 1 auto-save functionality out of the box.

#### Basic Usage
```typescript
import { useStep1Draft } from '@/hooks/useStep1Draft';

export function Step1Visibility({ onNext }: { onNext: () => void }) {
  const {
    visibility,
    setVisibility,
    createDraftNow,
    isSaving,
    lastSaved,
    draftId,
    error
  } = useStep1Draft();

  return (
    <div>
      {/* Auto-save on every click */}
      <button
        onClick={() => setVisibility('public')}
        className={visibility === 'public' ? 'selected' : ''}
      >
        Public Trip
      </button>

      <button
        onClick={() => setVisibility('private')}
        className={visibility === 'private' ? 'selected' : ''}
      >
        Friends / Private Trip
      </button>

      {/* Saving indicator */}
      {isSaving && <span>Saving...</span>}
      {lastSaved && !isSaving && (
        <span>Saved at {lastSaved.toLocaleTimeString()}</span>
      )}

      {/* Error handling */}
      {error && <div className="error">{error}</div>}

      {/* Next button - can proceed once saved */}
      <button
        onClick={onNext}
        disabled={!draftId || isSaving}
      >
        Next
      </button>
    </div>
  );
}
```

#### Advanced Usage with Immediate Save on Next
```typescript
import { useStep1Draft } from '@/hooks/useStep1Draft';
import { toast } from 'sonner';

export function Step1Visibility({ onNext }: { onNext: () => void }) {
  const {
    visibility,
    setVisibility,
    createDraftNow,
    isSaving,
    draftId,
  } = useStep1Draft();

  const handleNext = async () => {
    if (draftId) {
      onNext();
      return;
    }

    try {
      await createDraftNow(visibility);
      toast.success('Draft created');
      onNext();
    } catch (error) {
      toast.error('Failed to create draft. Please try again.');
    }
  };

  return (
    <div>
      <button onClick={() => setVisibility('public')}>
        Public Trip
      </button>

      <button onClick={() => setVisibility('private')}>
        Friends / Private Trip
      </button>

      {isSaving && <span className="saving-indicator">Saving...</span>}

      <button
        onClick={handleNext}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Next'}
      </button>
    </div>
  );
}
```

---

### Option 2: Using `useDraftTrip` Hook (Existing)

**File:** `/src/hooks/useDraftTrip.ts`

This hook works across all steps and now supports Step 1 auto-save.

#### Usage
```typescript
import { useDraftTrip } from '@/hooks/useDraftTrip';

export function Step1Visibility({ onNext }: { onNext: () => void }) {
  const {
    draft,
    updateDraft,
    initializeWithVisibility,
    isSaving,
    lastSaved,
    draftId
  } = useDraftTrip();

  const handleVisibilityChange = (newVisibility: 'public' | 'private') => {
    updateDraft('visibility', newVisibility);
  };

  const handleNext = async () => {
    if (draftId) {
      onNext();
      return;
    }

    try {
      await initializeWithVisibility(draft.visibility);
      onNext();
    } catch (error) {
      console.error('Failed to create draft:', error);
    }
  };

  return (
    <div>
      <button
        onClick={() => handleVisibilityChange('public')}
        className={draft.visibility === 'public' ? 'selected' : ''}
      >
        Public Trip
      </button>

      <button
        onClick={() => handleVisibilityChange('private')}
        className={draft.visibility === 'private' ? 'selected' : ''}
      >
        Friends / Private Trip
      </button>

      {isSaving && <span>Saving...</span>}

      <button onClick={handleNext} disabled={isSaving}>
        Next
      </button>
    </div>
  );
}
```

---

### Option 3: Low-Level API (Manual Control)

**File:** `/src/lib/draftTripStep1.ts`

For advanced use cases where you need full control.

#### Functions Available

##### `autoSaveVisibility()`
Triggers debounced auto-save for visibility changes.

```typescript
import { autoSaveVisibility } from '@/lib/draftTripStep1';

autoSaveVisibility(
  'public', // visibility value
  () => console.log('Save started'),
  () => console.log('Save completed'),
  (error) => console.error('Save failed:', error)
);
```

##### `initializeDraftTrip()`
Creates or updates draft immediately (no debounce).

```typescript
import { initializeDraftTrip } from '@/lib/draftTripStep1';

const tripId = await initializeDraftTrip('public');
console.log('Draft created:', tripId);
```

##### `updateDraftVisibility()`
Updates existing draft visibility immediately.

```typescript
import { updateDraftVisibility } from '@/lib/draftTripStep1';

await updateDraftVisibility('trip-uuid', 'private');
```

##### `cancelAutoSave()`
Cancels pending auto-save timer.

```typescript
import { cancelAutoSave } from '@/lib/draftTripStep1';

useEffect(() => {
  return () => {
    cancelAutoSave(); // Cleanup on unmount
  };
}, []);
```

---

## Auto-Save Configuration

### Delay Timing
**Current:** 800ms
**Location:** `/src/lib/draftTripStep1.ts`

```typescript
const AUTO_SAVE_DELAY = 800; // milliseconds
```

**Why 800ms?**
- Fast enough for responsive UX
- Long enough to batch rapid changes
- Industry standard for auto-save

**Adjusting:**
```typescript
const AUTO_SAVE_DELAY = 1000; // 1 second
const AUTO_SAVE_DELAY = 500;  // 0.5 seconds
```

---

## Database Operations

### First Visibility Selection
```sql
-- Creates new draft if none exists
INSERT INTO trips (
  id,              -- auto-generated UUID
  creator_id,      -- auth.uid()
  type,            -- 'community'
  status,          -- 'draft'
  title,           -- 'Untitled Trip'
  destination,     -- 'TBD'
  visibility,      -- 'public' or 'private'
  created_at,      -- now()
  updated_at       -- now()
) VALUES (...);
```

### Subsequent Changes
```sql
-- Updates existing draft
UPDATE trips
SET
  visibility = 'private',
  updated_at = now()
WHERE
  id = 'draft-uuid'
  AND creator_id = auth.uid()
  AND status = 'draft';
```

---

## Debounce Logic Deep Dive

### Code Flow

```typescript
let autoSaveTimeout: NodeJS.Timeout | null = null;

export function autoSaveVisibility(visibility, onStart, onComplete, onError) {
  // Cancel previous timer if exists
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  // Start new timer
  autoSaveTimeout = setTimeout(async () => {
    try {
      onStart(); // UI shows "Saving..."

      const draftId = getDraftTripId();

      if (draftId) {
        // Update existing draft
        await updateDraftVisibility(draftId, visibility);
      } else {
        // Create new draft
        await initializeDraftTrip(visibility);
      }

      onComplete(); // UI shows "Saved"
    } catch (error) {
      onError(error); // UI shows error
    }
  }, 800); // Wait 800ms
}
```

### Example Timeline

```
Time    | User Action           | Timer State           | Database
--------|----------------------|-----------------------|------------------
0ms     | Clicks "Public"      | Timer starts (800ms)  | No change yet
200ms   | Clicks "Private"     | Timer resets (800ms)  | No change yet
600ms   | Clicks "Public"      | Timer resets (800ms)  | No change yet
1400ms  | [No action]          | Timer completes       | UPDATE visibility='public'
1450ms  | [No action]          | No timer              | Update complete
```

**Result:** Only 1 database call despite 3 user clicks

---

## UI States

### State Management

```typescript
interface Step1State {
  visibility: 'public' | 'private';  // Current selection
  isSaving: boolean;                  // Show spinner
  lastSaved: Date | null;             // Show "Saved at..."
  draftId: string | null;             // Draft exists?
  error: string | null;               // Show error message
}
```

### UI Feedback Patterns

#### Pattern 1: Inline Status
```tsx
<div className="status">
  {isSaving && (
    <>
      <Spinner size="sm" />
      <span>Saving changes...</span>
    </>
  )}
  {!isSaving && lastSaved && (
    <>
      <CheckIcon />
      <span>Saved at {lastSaved.toLocaleTimeString()}</span>
    </>
  )}
  {error && (
    <>
      <ErrorIcon />
      <span className="error">{error}</span>
    </>
  )}
</div>
```

#### Pattern 2: Toast Notifications
```tsx
import { toast } from 'sonner';

const { setVisibility } = useStep1Draft();

const handleChange = (v: 'public' | 'private') => {
  setVisibility(v);
  toast.success('Draft will be saved', { duration: 1000 });
};
```

#### Pattern 3: Button State
```tsx
<button
  onClick={handleNext}
  disabled={!draftId || isSaving}
  className={isSaving ? 'loading' : ''}
>
  {isSaving ? 'Saving...' : 'Next Step'}
</button>
```

---

## Error Handling

### Network Failure
```typescript
try {
  await initializeDraftTrip('public');
} catch (error) {
  if (error.message.includes('network')) {
    toast.error('Check your internet connection');
  } else {
    toast.error('Failed to save. Please try again.');
  }
}
```

### Not Authenticated
```typescript
// Auto-handled by initializeDraftTrip()
// Throws: "User must be authenticated to create a draft trip"

// Handle in UI:
if (error?.includes('authenticated')) {
  navigate('/auth');
}
```

### Draft Deleted Externally
```typescript
// Auto-handled: Creates new draft if old one is missing
// User experience: Seamless, no error shown
```

---

## Performance Considerations

### Database Load
- **Without debounce:** 1 query per click (could be 10+ queries)
- **With debounce (800ms):** 1 query per pause (typically 1-2 queries)
- **Savings:** ~80-90% reduction in database calls

### User Experience
- **Instant UI feedback:** 0ms delay
- **Perceived save time:** 800ms feels instant
- **Actual save time:** 800ms + network latency (~900ms total)

### localStorage Sync
```typescript
// Draft ID stored immediately on first save
localStorage.setItem('ketravelan-draft-trip-id', tripId);

// Available instantly on page refresh
const draftId = localStorage.getItem('ketravelan-draft-trip-id');
```

---

## Testing

### Manual Test Cases

#### Test 1: First Time User
1. Open Step 1
2. Click "Public Trip"
3. Wait 1 second
4. **Expected:** "Saved" indicator shows, draft created

#### Test 2: Rapid Changes
1. Click "Public"
2. Immediately click "Private"
3. Immediately click "Public"
4. Wait 1 second
5. **Expected:** Only 1 database call, final value saved

#### Test 3: Page Refresh
1. Select "Private" and wait for save
2. Refresh browser
3. **Expected:** "Private" still selected, draft ID preserved

#### Test 4: Network Offline
1. Disable network
2. Click "Public"
3. **Expected:** Error shown after 800ms

#### Test 5: Click Next Before Auto-Save
1. Click "Private"
2. Immediately click "Next" (within 800ms)
3. **Expected:** Draft created immediately, navigation successful

### Automated Test Example

```typescript
describe('Step 1 Auto-Save', () => {
  it('should debounce multiple changes', async () => {
    const { setVisibility } = useStep1Draft();
    const updateSpy = jest.spyOn(supabase, 'from');

    setVisibility('public');
    setVisibility('private');
    setVisibility('public');

    await new Promise(r => setTimeout(r, 1000));

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'public' })
    );
  });
});
```

---

## Migration from Non-Auto-Save

### Before (Manual Save)
```typescript
const [visibility, setVisibility] = useState('public');

const handleNext = async () => {
  await createDraft({ visibility }); // Saved on Next click
  onNext();
};
```

### After (Auto-Save)
```typescript
const { visibility, setVisibility, draftId } = useStep1Draft();

const handleNext = () => {
  if (draftId) {
    onNext(); // Already saved
  } else {
    // Fallback: will save immediately
    createDraftNow(visibility).then(onNext);
  }
};
```

**Benefits:**
- No data loss if user closes browser
- Better UX with instant feedback
- Draft available for continuation later

---

## Best Practices

### 1. Always Show Save Status
```tsx
{isSaving && <Spinner />}
{!isSaving && lastSaved && <CheckIcon />}
```

### 2. Don't Block Navigation
```tsx
// ❌ Bad: Forces user to wait
<button disabled={isSaving}>Next</button>

// ✅ Good: Allow proceeding, save completes in background
<button disabled={!draftId && !isSaving}>Next</button>
```

### 3. Cleanup Timers on Unmount
```tsx
useEffect(() => {
  return () => cancelAutoSave();
}, []);
```

### 4. Handle Errors Gracefully
```tsx
if (error) {
  return (
    <div>
      <p>Failed to save: {error}</p>
      <button onClick={retry}>Try Again</button>
    </div>
  );
}
```

---

## Summary

**Auto-Save Features:**
- ✅ 800ms debounce prevents excessive DB calls
- ✅ Instant UI feedback for perceived performance
- ✅ Automatic retry on existing draft detection
- ✅ localStorage persistence for page refreshes
- ✅ Error handling with user-friendly messages
- ✅ Cleanup on component unmount

**Developer Experience:**
- ✅ Simple hook API: `useStep1Draft()`
- ✅ Works with existing `useDraftTrip()` hook
- ✅ Low-level API for advanced use cases
- ✅ Configurable delay timing
- ✅ TypeScript support throughout

**User Experience:**
- ✅ Never lose data
- ✅ No loading delays
- ✅ Clear save status indicators
- ✅ Continue drafts across sessions
