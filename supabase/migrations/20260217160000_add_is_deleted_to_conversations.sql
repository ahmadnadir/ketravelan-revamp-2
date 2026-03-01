-- Add is_deleted column to conversations table for soft deletes

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_is_deleted 
ON public.conversations(is_deleted);

-- Create index for direct conversations that aren't deleted
CREATE INDEX IF NOT EXISTS idx_conversations_direct_active
ON public.conversations(conversation_type, is_deleted)
WHERE conversation_type = 'direct' AND is_deleted = false;
