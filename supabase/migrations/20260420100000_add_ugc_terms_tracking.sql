-- Migration: Add UGC terms acceptance tracking
-- Purpose: Track when users accept community guidelines before accessing user-generated content
-- App Store Requirement: Guideline 1.2 requires explicit terms acceptance for UGC

-- Add column to profiles table to track UGC terms acceptance
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ugc_terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_profiles_ugc_terms_accepted_at 
ON profiles(ugc_terms_accepted_at);

-- Comment for documentation
COMMENT ON COLUMN profiles.ugc_terms_accepted_at IS 
'Timestamp when user accepted community guidelines for user-generated content. NULL = not yet accepted.';
