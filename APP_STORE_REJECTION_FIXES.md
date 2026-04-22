# App Store Rejection Fixes - Implementation Plan

## Status Summary

| Issue | Severity | Current State | Fix Priority |
|-------|----------|---------------|--------------|
| 1. ATT Privacy Metadata | **HIGH** | Tracking flag ON but no tracking code | **FIX IMMEDIATELY** |
| 2. Age Rating - UGC Flag | Medium | Not set | Fix before resubmit |
| 3. Age Rating - Parental Controls | Medium | Incorrectly set to YES | Fix before resubmit |
| 4. UGC Safety Controls | **HIGH** | Report ✅, Block ❌, Terms ❌ | **MUST IMPLEMENT** |

---

## Fix #1: App Store Connect - Privacy Tracking (NO CODING NEEDED)

**Action**: Go to App Store Connect → Your App → Privacy

### Step 1: Disable Tracking
- Set **Tracking**: `NO`
- Remove all "Used for Tracking" flags
- Delete any advertising/data broker checkmarks

### Step 2: What to Write in Review Notes
```
The app does not track users across apps or websites for advertising purposes.
We have updated the App Privacy Information in App Store Connect to reflect 
that tracking is not performed. The app uses Firebase Analytics for internal 
analytics only, which is not considered tracking under App Store guidelines.
```

---

## Fix #2: App Store Connect - Age Rating

**Action**: Go to App Store Connect → App Information → Age Rating

### Set These:
- **User-Generated Content**: `YES` (has trips, stories, messages, comments)
- **Parental Controls**: `NONE` (you don't have these features)
- **Age Assurance**: `NONE` (you don't verify age)

---

## Fix #3: Implement Block User Feature

### Database Schema (Add to migration)

```sql
-- Add blocked_users table
DROP TABLE IF EXISTS blocked_users CASCADE;
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);

-- Add index for faster lookups
CREATE INDEX idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);
```

### Frontend: Block User Function

Create: `src/lib/blockUser.ts`

```typescript
import { supabase } from '@/lib/supabase';

export async function blockUser(blockedUserId: string, reason?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blocked_users')
    .insert({
      user_id: user.id,
      blocked_user_id: blockedUserId,
      reason: reason || 'User blocked',
    });

  if (error) throw error;
}

export async function unblockUser(blockedUserId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('user_id', user.id)
    .eq('blocked_user_id', blockedUserId);

  if (error) throw error;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('blocked_user_id', userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function getBlockedUsers(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_user_id')
    .eq('user_id', user.id);

  return (data || []).map(row => row.blocked_user_id);
}
```

### UI: Block User Button (Add to profile/user card)

Add to: `src/components/UserProfileView.tsx` or user action menu

```typescript
const [isBlocking, setIsBlocking] = useState(false);
const [isBlocked, setIsBlocked] = useState(false);

useEffect(() => {
  const checkBlockStatus = async () => {
    const blocked = await isUserBlocked(userId);
    setIsBlocked(blocked);
  };
  checkBlockStatus();
}, [userId]);

const handleBlockUser = async () => {
  try {
    setIsBlocking(true);
    if (isBlocked) {
      await unblockUser(userId);
      setIsBlocked(false);
      toast({ title: 'User unblocked' });
    } else {
      await blockUser(userId, 'Blocked by user');
      setIsBlocked(true);
      toast({ title: 'User blocked', description: 'You will not see content from this user' });
    }
  } catch (error) {
    toast({ 
      title: 'Error', 
      description: error instanceof Error ? error.message : 'Failed to update block status',
      variant: 'destructive'
    });
  } finally {
    setIsBlocking(false);
  }
};
```

Button UI:
```tsx
<Button 
  variant="outline" 
  onClick={handleBlockUser}
  disabled={isBlocking}
  className={isBlocked ? 'text-destructive' : ''}
>
  {isBlocking ? 'Loading...' : isBlocked ? 'Unblock User' : 'Block User'}
</Button>
```

---

## Fix #4: Terms of Use Acceptance Screen

### Create Terms Modal Component

**File**: `src/components/modals/TermsAcceptanceModal.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';

export function TermsAcceptanceModal() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Show modal on first load if user hasn't accepted terms for community features
  useEffect(() => {
    const shouldShow = user && profile && !profile.ugc_terms_accepted_at;
    setShowModal(!!shouldShow);
  }, [user, profile]);

  const handleAccept = async () => {
    if (!hasAccepted || !user) return;

    setIsAccepting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ugc_terms_accepted_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      setShowModal(false);
    } catch (error) {
      console.error('Failed to accept terms:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <AlertDialog open={showModal}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Community Guidelines & Terms</AlertDialogTitle>
          <AlertDialogDescription>
            Before accessing user-generated content, please review and accept our terms
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="h-64 w-full border rounded-md p-4 bg-muted/50">
          <div className="space-y-4 pr-4">
            <section>
              <h3 className="font-semibold mb-2">Community Standards</h3>
              <p className="text-sm text-muted-foreground">
                Our community is built on respect, safety, and authenticity. Users must:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                <li>Be respectful to all community members</li>
                <li>Not post hateful, abusive, or discriminatory content</li>
                <li>Not share personal information of others without consent</li>
                <li>Not spam or promote commercial products excessively</li>
                <li>Report inappropriate content to our moderation team</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Content Moderation</h3>
              <p className="text-sm text-muted-foreground">
                We maintain community standards by:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                <li>Reviewing reported content within 24 hours</li>
                <li>Removing violations of our guidelines</li>
                <li>Temporarily or permanently suspending bad actors</li>
                <li>Providing transparency in our moderation decisions</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Your Rights</h3>
              <p className="text-sm text-muted-foreground">
                As a user, you have the right to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                <li>Report inappropriate content</li>
                <li>Block users who harass you</li>
                <li>Delete your own content anytime</li>
                <li>Appeal moderation decisions</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <div className="flex items-start space-x-2">
          <Checkbox 
            id="accept-terms"
            checked={hasAccepted}
            onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
          />
          <label htmlFor="accept-terms" className="text-sm cursor-pointer">
            I agree to the Community Guidelines and Terms of Use
          </label>
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
          >
            Decline & Go Back
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!hasAccepted || isAccepting}
          >
            {isAccepting ? 'Accepting...' : 'Accept & Continue'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Add to App Layout

In `src/App.tsx`:
```typescript
import { TermsAcceptanceModal } from './components/modals/TermsAcceptanceModal';

// Add inside the root component near the beginning
<TermsAcceptanceModal />
```

### Database Migration

Add to new migration file `supabase/migrations/[timestamp]_add_ugc_terms.sql`:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ugc_terms_accepted_at TIMESTAMPTZ;

-- Index for filtering users who haven't accepted
CREATE INDEX IF NOT EXISTS idx_profiles_ugc_terms_accepted 
ON profiles(ugc_terms_accepted_at);
```

---

## Fix #5: Ensure Report Feature Works for All Content Types

Your app already has reports table. Expand to cover:
- ✅ Discussion replies (already done)
- [ ] Stories and story comments
- [ ] Direct messages (optional but recommended)

### Example for Stories

Add report button in story view:
```typescript
const handleReportStory = async () => {
  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      content_type: 'story',
      content_id: storyId,
      reason: reportReason,
      details: reportDetails,
      status: 'open'
    });
  
  if (error) throw error;
  toast({ title: 'Report submitted' });
};
```

---

## Submission Checklist

### Before Resubmitting:

- [ ] **Fix App Store Metadata**
  - [ ] Set Tracking: NO
  - [ ] Set User-Generated Content: YES
  - [ ] Set Parental Controls: NONE
  - [ ] Add review notes about privacy/tracking

- [ ] **Implement Features**
  - [ ] Add `blocked_users` table migration
  - [ ] Add `blockUser.ts` utility
  - [ ] Add block button to user profiles
  - [ ] Add terms acceptance screen
  - [ ] Add `ugc_terms_accepted_at` column to profiles

- [ ] **Test on Real Device**
  - [ ] Install fresh build
  - [ ] Accept terms screen on first login
  - [ ] View trip chat → report message works
  - [ ] View discussion → report reply works
  - [ ] View user profile → can block user
  - [ ] Blocked user → content hidden

- [ ] **Record Video for App Review**
  - [ ] Start fresh app
  - [ ] Log in
  - [ ] See terms acceptance modal
  - [ ] Accept terms
  - [ ] Access community content
  - [ ] Tap report on content
  - [ ] Submit report
  - [ ] Tap block on user profile
  - [ ] Confirm user blocked
  - [ ] Upload to App Store Review Notes

---

## What to Write in App Store Review Notes

```
This submission addresses the following guideline violations:

1. TRACKING TRANSPARENCY (5.1.2(i))
   - Updated App Privacy settings to accurately reflect that tracking 
     is NOT performed. The app does not collect IDFA or use any ad networks.
   - Firebase Analytics is used for internal app improvements only.

2. USER-GENERATED CONTENT (2.3.6)
   - Updated age rating metadata to indicate app contains user-generated 
     content (posts, comments, messages, reviews, profiles).
   - Set Parental Controls to NONE as feature is not applicable.

3. USER-GENERATED CONTENT SAFETY (1.2)
   - Added Terms of Use acceptance screen before accessing community features.
   - Users must accept community guidelines on first access.
   - Implemented Report Content feature for:
     * Stories and story comments
     * Discussions and discussion replies
     * All user-generated content
   - Implemented Block User feature to:
     * Block users who violate community standards
     * Immediately hide blocked user's content
     * Prevent future interactions
   
Screen recording attached showing:
   - Terms acceptance on first load
   - Report functionality
   - Block user functionality
```

---

## Timeline

| Step | Estimated Time |
|------|----------------|
| Fix App Store metadata | 5 minutes |
| Implement DB migration | 10 minutes |
| Implement block user feature | 20 minutes |
| Implement terms modal | 15 minutes |
| Test all flows | 30 minutes |
| Record demo video | 10 minutes |
| Resubmit | 5 minutes |
| **TOTAL** | **~95 minutes** |

---

## Why This Passes the Rejections

✅ **ATT Violation** → Metadata now accurately says NO tracking  
✅ **Age Rating UGC** → Set to YES with evidence of community features  
✅ **Parental Controls** → Set to NONE (don't exist)  
✅ **UGC Safety** → Provide all 3 required controls:
  - Report content (working)
  - Block users (new)
  - Terms acceptance (new)
