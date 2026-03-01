# Step 1 Database Query Reference

## Exact Supabase Operations

### Operation 1: Check for Existing Draft

**Location:** `draftTripStep1.ts` → `initializeDraftTrip()`

```typescript
const { data: existingDraft } = await supabase
  .from('trips')
  .select('id, status')
  .eq('id', existingDraftId)
  .eq('creator_id', user.id)
  .eq('status', 'draft')
  .maybeSingle();
```

**SQL equivalent:**
```sql
SELECT id, status
FROM trips
WHERE id = 'existing-draft-uuid'
  AND creator_id = auth.uid()
  AND status = 'draft'
LIMIT 1;
```

**Returns:**
- `null` if no draft found (deleted or doesn't exist)
- Draft object if found

---

### Operation 2A: Update Existing Draft

**When:** Existing draft found in Operation 1

```typescript
await supabase
  .from('trips')
  .update({
    visibility: 'public', // or 'private'
    updated_at: new Date().toISOString()
  })
  .eq('id', existingDraftId)
  .eq('creator_id', user.id);
```

**SQL equivalent:**
```sql
UPDATE trips
SET
  visibility = 'public',
  updated_at = '2026-01-02T12:00:00.000Z'
WHERE id = 'existing-draft-uuid'
  AND creator_id = auth.uid();
```

**Result:** Same trip ID reused

---

### Operation 2B: Create New Draft

**When:** No existing draft found

```typescript
const tripData = {
  type: 'community',
  status: 'draft',
  title: 'Untitled Trip',
  destination: 'TBD',
  visibility: 'public' // or 'private'
};

const { data: trip, error } = await supabase
  .from('trips')
  .insert({
    creator_id: user.id,
    type: tripData.type,
    status: tripData.status,
    title: tripData.title,
    destination: tripData.destination,
    visibility: tripData.visibility,
    tags: [],
    images: [],
  })
  .select()
  .single();
```

**SQL equivalent:**
```sql
INSERT INTO trips (
  id,              -- auto-generated
  creator_id,
  type,
  status,
  title,
  destination,
  visibility,
  tags,
  images,
  cover_image,
  description,
  start_date,
  end_date,
  max_participants,
  current_participants,
  price,
  currency,
  rating_average,
  rating_count,
  created_at,      -- auto-generated
  updated_at       -- auto-generated
) VALUES (
  gen_random_uuid(),
  auth.uid(),
  'community',
  'draft',
  'Untitled Trip',
  'TBD',
  'public',
  ARRAY[]::text[],
  ARRAY[]::text[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  NULL,
  'USD',
  0,
  0,
  now(),
  now()
)
RETURNING *;
```

**Result:** New trip ID generated

---

## Database State After Step 1

### Example Record

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "creator_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "type": "community",
  "status": "draft",
  "title": "Untitled Trip",
  "description": null,
  "destination": "TBD",
  "cover_image": null,
  "images": [],
  "start_date": null,
  "end_date": null,
  "price": null,
  "currency": "MYR",
  "max_participants": null,
  "current_participants": 0,
  "visibility": "public",
  "tags": [],
  "stops": null,
  "budget_mode": null,
  "budget_breakdown": null,
  "itinerary_type": null,
  "itinerary": [],
  "rating_average": 0,
  "rating_count": 0,
  "created_at": "2026-01-02T12:00:00.000Z",
  "updated_at": "2026-01-02T12:00:00.000Z"
}
```

### Field States
| Field | Value | Reason |
|-------|-------|--------|
| `id` | UUID | Auto-generated |
| `creator_id` | User ID | From auth.uid() |
| `type` | 'community' | Default for DIY trips |
| `status` | 'draft' | Not published yet |
| `title` | 'Untitled Trip' | Placeholder (Step 2 fills real value) |
| `destination` | 'TBD' | Placeholder (Step 2 fills real value) |
| `visibility` | User choice | **Only meaningful data from Step 1** |
| All others | null/empty/0 | Will be filled in Steps 2-4 |

---

## localStorage State After Step 1

### Key: `ketravelan-draft-trip-id`
**Value:** `"550e8400-e29b-41d4-a716-446655440000"`

### Key: `ketravelan-draft-trip` (optional)
**Value:** Full draft object as JSON
```json
{
  "draftId": "550e8400-e29b-41d4-a716-446655440000",
  "visibility": "public",
  "title": "",
  "description": "",
  "primaryDestination": "",
  "additionalStops": [],
  "dateType": "flexible",
  "startDate": "",
  "endDate": "",
  "travelStyles": [],
  "groupSizeType": "later",
  "groupSize": 3,
  "galleryImages": [],
  "budgetType": "skip",
  "roughBudgetTotal": 0,
  "roughBudgetCategories": [],
  "detailedBudget": {},
  "itineraryType": "skip",
  "simpleNotes": "",
  "dayByDayPlan": [],
  "expectations": [],
  "lastSaved": 1735824000000
}
```

---

## Query Performance

### Indexes Used

**trips table indexes:**
```sql
CREATE INDEX idx_trips_creator_id ON trips(creator_id);
CREATE INDEX idx_trips_status ON trips(status);
```

**Query Plan:**
```
Index Scan using idx_trips_creator_id on trips
  Filter: ((status = 'draft'::trip_status) AND (id = 'uuid'))
```

**Estimated cost:** < 1ms for single draft lookup

---

## RLS Policy Enforcement

### On INSERT
```sql
-- Policy: "Users can create trips"
WITH CHECK (auth.uid() = creator_id)
```
**Enforced:** User can only create trips for themselves

### On UPDATE
```sql
-- Policy: "Users can update own trips"
USING (auth.uid() = creator_id)
```
**Enforced:** User can only update their own drafts

### On SELECT
```sql
-- Policy: "Published trips viewable by everyone"
USING (status = 'published' OR creator_id = auth.uid())
```
**Enforced:** User can see their own drafts, others can't

---

## Step-by-Step Execution Flow

### User Action: Select "Public Trip" and click Next

#### 1. Frontend calls hook
```typescript
await initializeWithVisibility('public');
```

#### 2. Hook calls library function
```typescript
const tripId = await initializeDraftTrip('public');
```

#### 3. Check auth
```typescript
const { data: { user } } = await supabase.auth.getUser();
// ✅ User authenticated
```

#### 4. Check localStorage
```typescript
const existingDraftId = localStorage.getItem('ketravelan-draft-trip-id');
// Result: null (first time) or UUID (returning)
```

#### 5A. If existing draft ID found
```typescript
// Query DB to verify it exists
const { data } = await supabase
  .from('trips')
  .select('id, status')
  .eq('id', existingDraftId)
  .eq('creator_id', user.id)
  .eq('status', 'draft')
  .maybeSingle();

if (data) {
  // Update visibility only
  await supabase
    .from('trips')
    .update({ visibility: 'public' })
    .eq('id', existingDraftId);

  return existingDraftId; // ✅ Reuse same trip
}
// If not found, proceed to 5B
```

#### 5B. If no existing draft
```typescript
// Create new draft trip
const newTrip = await createTrip({
  type: 'community',
  status: 'draft',
  title: 'Untitled Trip',
  destination: 'TBD',
  visibility: 'public',
});

// Save ID to localStorage
localStorage.setItem('ketravelan-draft-trip-id', newTrip.id);

return newTrip.id; // ✅ New trip created
```

#### 6. Hook updates React state
```typescript
draftIdRef.current = tripId;
setDraft(prev => ({ ...prev, visibility: 'public', draftId: tripId }));
setHasDraft(true);
setLastSaved(new Date());
```

#### 7. Frontend navigates to Step 2
```typescript
onNext(); // Navigate to /create-trip/step-2
```

---

## Data Validation

### Database Constraints
```sql
-- visibility column
visibility text DEFAULT 'public' NOT NULL

-- creator_id foreign key
creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE

-- status check (from enum type)
status trip_status DEFAULT 'draft'
```

### Application-Level Validation
```typescript
// In initializeDraftTrip()
if (!user) {
  throw new Error('User must be authenticated');
}

// Visibility is TypeScript-enforced
type Visibility = 'public' | 'private';
```

---

## Summary

**Step 1 executes:**
1. ✅ 1-2 database queries (check + insert/update)
2. ✅ 1 localStorage write (draft ID)
3. ✅ RLS policies enforced automatically
4. ✅ Trip ID returned and persisted

**Database state:**
- ✅ Minimal draft record created
- ✅ Only visibility field meaningful
- ✅ Creator ownership established
- ✅ Ready for Steps 2-4 to add details
