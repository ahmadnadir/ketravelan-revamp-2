/*
  # Optimize Chat List and Messages Query Performance
  
  This migration adds indexes specifically optimized for the 
  Chat page and message fetching which are critical for performance.
  
  ## Performance Benefits
  - Faster last message lookups per conversation
  - Optimized conversation_participants queries
  - Efficient real-time message polling
  - Improved message ordering and pagination
*/

-- Index for fetching last messages grouped by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
  ON messages(conversation_id, created_at DESC);

-- Index for conversation participants user lookups
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON conversation_participants(user_id, created_at DESC);

-- Composite index for efficient last message queries
CREATE INDEX IF NOT EXISTS idx_messages_last_per_conversation
  ON messages(conversation_id, created_at DESC, id);

-- Index for sender lookups (improves join performance)
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages(sender_id, created_at DESC);

-- Index for client_id deduplication
CREATE INDEX IF NOT EXISTS idx_messages_client_id
  ON messages(client_id)
  WHERE client_id IS NOT NULL;
