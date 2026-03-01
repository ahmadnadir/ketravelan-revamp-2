-- Add multi-story-type and travel-style support to stories
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS story_types story_type[] DEFAULT ARRAY[]::story_type[],
ADD COLUMN IF NOT EXISTS travel_styles text[] DEFAULT ARRAY[]::text[];

-- Backfill from existing single story_type where possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'story_type'
  ) THEN
    UPDATE stories
    SET story_types = ARRAY[story_type]::story_type[]
    WHERE story_type IS NOT NULL
      AND (story_types IS NULL OR array_length(story_types, 1) IS NULL);
  END IF;
END $$;
