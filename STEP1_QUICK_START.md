# Step 1 Quick Start Guide

## TL;DR - Copy & Paste Implementation

### Simplest Implementation (Auto-Save Enabled)

```tsx
import { useStep1Draft } from '@/hooks/useStep1Draft';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function Step1Visibility() {
  const navigate = useNavigate();
  const {
    visibility,
    setVisibility,
    isSaving,
    lastSaved,
    draftId,
    error
  } = useStep1Draft();

  const handleNext = () => {
    if (draftId) {
      navigate('/create-trip/step-2');
    } else {
      toast.error('Please wait for draft to save');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        Choose Trip Visibility
      </h1>

      {/* Visibility Options */}
      <div className="space-y-4 mb-6">
        <button
          onClick={() => setVisibility('public')}
          className={`w-full p-4 border rounded-lg ${
            visibility === 'public'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300'
          }`}
        >
          <div className="text-lg font-semibold">Public Trip</div>
          <div className="text-sm text-gray-600">
            Anyone can discover and join
          </div>
        </button>

        <button
          onClick={() => setVisibility('private')}
          className={`w-full p-4 border rounded-lg ${
            visibility === 'private'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300'
          }`}
        >
          <div className="text-lg font-semibold">Friends / Private Trip</div>
          <div className="text-sm text-gray-600">
            Only people with invite link can join
          </div>
        </button>
      </div>

      {/* Status Indicator */}
      <div className="text-sm text-gray-600 mb-4">
        {isSaving && <span>💾 Saving...</span>}
        {!isSaving && lastSaved && (
          <span>✅ Saved at {lastSaved.toLocaleTimeString()}</span>
        )}
        {error && <span className="text-red-600">❌ {error}</span>}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={!draftId || isSaving}
        className="w-full py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Next Step'}
      </button>
    </div>
  );
}
```

---

## Key Features

### ✅ Auto-Save on Every Change
```tsx
// User clicks → State updates → Auto-save triggers after 800ms
<button onClick={() => setVisibility('public')}>
  Public Trip
</button>
```

### ✅ Debouncing Built-In
```
User clicks "Public" → Timer: 800ms
User clicks "Private" → Previous timer cancelled, New timer: 800ms
Wait 800ms → Database saves "Private"
```

### ✅ Visual Feedback
```tsx
{isSaving && <span>💾 Saving...</span>}
{lastSaved && <span>✅ Saved at {lastSaved.toLocaleTimeString()}</span>}
{error && <span>❌ {error}</span>}
```

### ✅ Draft Persistence
```tsx
// Draft ID automatically stored in localStorage
// Available across page refreshes
// Reused if user returns to Step 1
```

---

## Database Flow

### First Click
```
User clicks "Public"
    ↓
State: visibility = 'public'
    ↓
800ms delay
    ↓
DB: INSERT new draft with visibility='public'
    ↓
localStorage: Save draft ID
    ↓
UI: "Saved at 3:45 PM"
```

### Changing Selection
```
User clicks "Private"
    ↓
State: visibility = 'private'
    ↓
800ms delay
    ↓
DB: UPDATE existing draft SET visibility='private'
    ↓
UI: "Saved at 3:46 PM"
```

---

## Common Patterns

### Pattern 1: With Loading State
```tsx
const { visibility, setVisibility, isSaving } = useStep1Draft();

return (
  <>
    <button
      onClick={() => setVisibility('public')}
      disabled={isSaving}
      className={isSaving ? 'opacity-50 cursor-wait' : ''}
    >
      Public Trip
    </button>
  </>
);
```

### Pattern 2: With Toast Notifications
```tsx
import { toast } from 'sonner';

const { setVisibility, error } = useStep1Draft();

useEffect(() => {
  if (error) {
    toast.error(`Failed to save: ${error}`);
  }
}, [error]);
```

### Pattern 3: Immediate Save on Next
```tsx
const { visibility, createDraftNow, draftId } = useStep1Draft();

const handleNext = async () => {
  if (!draftId) {
    await createDraftNow(visibility); // Force immediate save
  }
  navigate('/create-trip/step-2');
};
```

---

## API Reference

### `useStep1Draft()` Hook

Returns:
```typescript
{
  visibility: 'public' | 'private';           // Current selection
  setVisibility: (v: 'public' | 'private') => void;  // Change & auto-save
  createDraftNow: (v: 'public' | 'private') => Promise<string>; // Immediate save
  isSaving: boolean;                          // Currently saving?
  lastSaved: Date | null;                     // Last save timestamp
  draftId: string | null;                     // Draft trip ID
  error: string | null;                       // Error message if any
}
```

---

## Troubleshooting

### Issue: "Not saving to database"
**Check:**
```tsx
// Make sure user is authenticated
const { user } = useAuth();
if (!user) return <Navigate to="/auth" />;

// Use the hook
const { visibility, setVisibility } = useStep1Draft();
```

### Issue: "Multiple drafts created"
**Solution:** Hook automatically prevents this by checking localStorage for existing draft ID.

### Issue: "Save indicator not showing"
**Check:**
```tsx
// Make sure you're using the return values
const { isSaving, lastSaved } = useStep1Draft();

// Display them
{isSaving && <span>Saving...</span>}
{lastSaved && <span>Saved</span>}
```

### Issue: "Draft lost on page refresh"
**Check:** localStorage permissions and ensure draft ID is being saved:
```tsx
// This is automatic, but you can verify:
const draftId = localStorage.getItem('ketravelan-draft-trip-id');
console.log('Draft ID:', draftId);
```

---

## Full Component Example

```tsx
import { useStep1Draft } from '@/hooks/useStep1Draft';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function Step1Visibility() {
  const navigate = useNavigate();
  const {
    visibility,
    setVisibility,
    createDraftNow,
    isSaving,
    lastSaved,
    draftId,
    error
  } = useStep1Draft();

  const handleNext = async () => {
    if (!draftId && !isSaving) {
      try {
        await createDraftNow(visibility);
        toast.success('Draft created successfully');
      } catch (error) {
        toast.error('Failed to create draft');
        return;
      }
    }

    navigate('/create-trip/step-2');
  };

  return (
    <div className="container max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Choose Your Trip Visibility
        </h1>
        <p className="text-gray-600">
          Decide who can see and join your adventure
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            visibility === 'public'
              ? 'border-2 border-blue-500 bg-blue-50'
              : 'border border-gray-200'
          }`}
          onClick={() => setVisibility('public')}
        >
          <h3 className="text-xl font-semibold mb-2">🌍 Public Trip</h3>
          <p className="text-gray-600">
            Your trip will be discoverable by everyone on the platform.
            Perfect for meeting new travel buddies and building a community.
          </p>
        </Card>

        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            visibility === 'private'
              ? 'border-2 border-blue-500 bg-blue-50'
              : 'border border-gray-200'
          }`}
          onClick={() => setVisibility('private')}
        >
          <h3 className="text-xl font-semibold mb-2">🔒 Friends / Private Trip</h3>
          <p className="text-gray-600">
            Only people with your invite link can see and join.
            Great for trips with friends, family, or colleagues.
          </p>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          {isSaving && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-gray-700">Saving changes...</span>
            </>
          )}
          {!isSaving && lastSaved && (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">
                Saved at {lastSaved.toLocaleTimeString()}
              </span>
            </>
          )}
          {error && (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-600">{error}</span>
            </>
          )}
        </div>
        {draftId && (
          <span className="text-xs text-gray-500">
            Draft ID: {draftId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/my-trips')}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={!draftId || isSaving}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Continue to Trip Details'}
        </Button>
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> Your changes are automatically saved.
          You can safely leave this page and come back later to continue.
        </p>
      </div>
    </div>
  );
}
```

---

## Next Steps

1. Copy the example above into your Step 1 component
2. Adjust styling to match your design system
3. Test auto-save by selecting different options
4. Check browser localStorage for draft ID
5. Verify database record in Supabase dashboard

**Related Documentation:**
- Full details: `STEP1_AUTOSAVE_GUIDE.md`
- Database queries: `STEP1_QUERY_REFERENCE.md`
- Integration guide: `STEP1_DB_INTEGRATION.md`
