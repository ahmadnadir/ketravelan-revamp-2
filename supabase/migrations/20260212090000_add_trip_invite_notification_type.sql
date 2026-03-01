-- Allow trip_invite notifications
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Ensure metadata column exists for newer notification payloads
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- If legacy data column exists, copy into metadata once
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'data'
  ) THEN
    EXECUTE 'UPDATE public.notifications SET metadata = COALESCE(metadata, data, ''{}''::jsonb) WHERE metadata IS NULL';
  END IF;
END $$;

-- Normalize legacy or unexpected types to a valid value
UPDATE notifications
SET
  type = 'trip_update'
WHERE type NOT IN (
  'join_request',
  'message',
  'expense',
  'trip_update',
  'member_joined',
  'member_left',
  'trip_invite',
  'trip_join_request',
  'trip_join_approved',
  'trip_join_rejected',
  'trip_cancelled',
  'trip_updated',
  'trip_reminder',
  'new_message',
  'new_expense',
  'expense_paid',
  'expense_reminder',
  'new_follower',
  'new_review',
  'new_tip',
  'trip_published',
  'system_announcement',
  'achievement_unlocked',
  'receipt_submitted',
  'receipt_approved',
  'receipt_rejected',
  'trip_settlement_required'
);

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'join_request',
    'message',
    'expense',
    'trip_update',
    'member_joined',
    'member_left',
    'trip_invite',
    'trip_join_request',
    'trip_join_approved',
    'trip_join_rejected',
    'trip_cancelled',
    'trip_updated',
    'trip_reminder',
    'new_message',
    'new_expense',
    'expense_paid',
    'expense_reminder',
    'new_follower',
    'new_review',
    'new_tip',
    'trip_published',
    'system_announcement',
    'achievement_unlocked',
    'receipt_submitted',
    'receipt_approved',
    'receipt_rejected',
    'trip_settlement_required'
  ));
