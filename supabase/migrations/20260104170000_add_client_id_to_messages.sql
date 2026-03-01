-- Add client_id column to messages table for robust client-side message tracking
ALTER TABLE messages ADD COLUMN client_id uuid;

-- Optional: Add an index for faster lookup (recommended)
CREATE INDEX IF NOT EXISTS messages_client_id_idx ON messages(client_id);