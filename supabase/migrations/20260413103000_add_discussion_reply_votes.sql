-- Add persistent discussion reply voting with trigger-maintained counters.

ALTER TABLE public.discussion_replies
ADD COLUMN IF NOT EXISTS vote_count_up INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.discussion_replies
ADD COLUMN IF NOT EXISTS vote_count_down INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.discussion_votes (
  reply_id UUID NOT NULL REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reply_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_user_id
ON public.discussion_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_reply_vote_type
ON public.discussion_votes(reply_id, vote_type);

DROP TRIGGER IF EXISTS trg_discussion_votes_set_updated_at ON public.discussion_votes;
CREATE TRIGGER trg_discussion_votes_set_updated_at
BEFORE UPDATE ON public.discussion_votes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_discussion_reply_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_reply_id UUID;
BEGIN
  target_reply_id := COALESCE(NEW.reply_id, OLD.reply_id);

  UPDATE public.discussion_replies
  SET
    vote_count_up = (
      SELECT COUNT(*)::INTEGER
      FROM public.discussion_votes
      WHERE reply_id = target_reply_id
        AND vote_type = 'up'
    ),
    vote_count_down = (
      SELECT COUNT(*)::INTEGER
      FROM public.discussion_votes
      WHERE reply_id = target_reply_id
        AND vote_type = 'down'
    )
  WHERE id = target_reply_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_discussion_votes_sync_counts ON public.discussion_votes;
CREATE TRIGGER trg_discussion_votes_sync_counts
AFTER INSERT OR UPDATE OR DELETE ON public.discussion_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_discussion_reply_vote_counts();

UPDATE public.discussion_replies dr
SET
  vote_count_up = COALESCE(votes.up_count, 0),
  vote_count_down = COALESCE(votes.down_count, 0)
FROM (
  SELECT
    reply_id,
    COUNT(*) FILTER (WHERE vote_type = 'up')::INTEGER AS up_count,
    COUNT(*) FILTER (WHERE vote_type = 'down')::INTEGER AS down_count
  FROM public.discussion_votes
  GROUP BY reply_id
) AS votes
WHERE dr.id = votes.reply_id;

UPDATE public.discussion_replies
SET vote_count_up = 0,
    vote_count_down = 0
WHERE id NOT IN (
  SELECT DISTINCT reply_id
  FROM public.discussion_votes
);

ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discussion_votes_select ON public.discussion_votes;
CREATE POLICY discussion_votes_select ON public.discussion_votes
FOR SELECT
USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS discussion_votes_insert ON public.discussion_votes;
CREATE POLICY discussion_votes_insert ON public.discussion_votes
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.discussion_replies dr
    JOIN public.discussions d ON d.id = dr.discussion_id
    WHERE dr.id = discussion_votes.reply_id
      AND dr.author_id <> auth.uid()
      AND dr.is_hidden = FALSE
      AND dr.deleted_at IS NULL
      AND d.visibility = 'public'
      AND d.is_hidden = FALSE
      AND d.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS discussion_votes_update ON public.discussion_votes;
CREATE POLICY discussion_votes_update ON public.discussion_votes
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.discussion_replies dr
    JOIN public.discussions d ON d.id = dr.discussion_id
    WHERE dr.id = discussion_votes.reply_id
      AND dr.author_id <> auth.uid()
      AND dr.is_hidden = FALSE
      AND dr.deleted_at IS NULL
      AND d.visibility = 'public'
      AND d.is_hidden = FALSE
      AND d.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS discussion_votes_delete ON public.discussion_votes;
CREATE POLICY discussion_votes_delete ON public.discussion_votes
FOR DELETE
USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';