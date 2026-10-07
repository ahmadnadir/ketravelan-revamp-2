ALTER TYPE public.moderation_action_type ADD VALUE IF NOT EXISTS 'report_under_review';
ALTER TYPE public.moderation_action_type ADD VALUE IF NOT EXISTS 'report_resolved';
ALTER TYPE public.moderation_action_type ADD VALUE IF NOT EXISTS 'report_dismissed';

NOTIFY pgrst, 'reload schema';