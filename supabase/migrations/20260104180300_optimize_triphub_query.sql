-- Migration: Optimize TripHub conversation and trip fetching
-- This migration adds indexes to improve performance for TripHub page queries

-- Index for conversation lookup by ID (primary key already exists, but ensure it's optimal)
-- Index for conversation_participants by conversation_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
ON conversation_participants(conversation_id);

-- Index for conversation_participants by user_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
ON conversation_participants(user_id);

-- Index for trips by ID (usually already exists as primary key)
-- Composite index for conversations filtering by trip_id and type
CREATE INDEX IF NOT EXISTS idx_conversations_trip_type 
ON conversations(trip_id, conversation_type) 
WHERE trip_id IS NOT NULL;

-- Index for messages by conversation_id and created_at (likely already exists from previous migration)
-- But adding it here for completeness if not present
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
ON messages(conversation_id, created_at DESC);

-- Comment on indexes
COMMENT ON INDEX idx_conversation_participants_conversation_id IS 'Optimize fetching participants for a conversation';
COMMENT ON INDEX idx_conversation_participants_user_id IS 'Optimize fetching conversations for a user';
COMMENT ON INDEX idx_conversations_trip_type IS 'Optimize fetching conversation by trip and type';
