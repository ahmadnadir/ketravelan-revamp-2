ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_features_level text
CHECK (social_features_level IN ('disabled', 'full'));

ALTER TABLE public.profiles
ALTER COLUMN social_features_level SET DEFAULT 'full';

UPDATE public.profiles
SET social_features_level = 'full'
WHERE social_features_level IS NULL;