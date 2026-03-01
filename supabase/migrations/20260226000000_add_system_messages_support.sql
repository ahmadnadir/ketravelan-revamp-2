-- Add type column to messages table to support system messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type varchar(20) DEFAULT 'user' CHECK (type IN ('user', 'system'));

-- Make sender_id nullable for system messages
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;
