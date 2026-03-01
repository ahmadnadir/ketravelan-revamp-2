-- Migration: Create Community module schema
-- This migration adds stories, discussions, comments, reactions, reports, and moderation tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- ENUM TYPES
-- =========================
DO $$ BEGIN
  CREATE TYPE story_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE story_visibility AS ENUM ('public', 'private', 'unlisted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE story_type AS ENUM ('trip-recap', 'guide', 'review', 'tips', 'itinerary', 'budget', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discussion_category AS ENUM ('general', 'budget', 'transport', 'visa', 'safety', 'food', 'accommodation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discussion_status AS ENUM ('open', 'closed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discussion_visibility AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reaction_content_type AS ENUM ('story', 'discussion', 'discussion_reply', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reaction_type AS ENUM ('like', 'bookmark');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_content_type AS ENUM ('story', 'story_comment', 'discussion', 'discussion_reply');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM ('spam', 'harassment', 'misinformation', 'inappropriate', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderation_action_type AS ENUM ('hide', 'unhide', 'delete', 'restore', 'lock', 'unlock', 'warn_user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Toggle story reaction (like/bookmark) - trigger handles count update
CREATE OR REPLACE FUNCTION toggle_story_reaction(
  p_story_id UUID,
  p_reaction_type reaction_type,
  p_user_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Check if reaction already exists
  SELECT id INTO v_existing_id
  FROM reactions
  WHERE user_id = p_user_id
    AND content_type = 'story'
    AND content_id = p_story_id
    AND reaction_type = p_reaction_type
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Delete the reaction (unlike/unsave)
    -- The trigger will automatically decrement the count
    DELETE FROM reactions WHERE id = v_existing_id;
    RETURN json_build_object('toggledOn', false, 'success', true);
  ELSE
    -- Insert new reaction (like/save)
    -- The trigger will automatically increment the count
    INSERT INTO reactions (user_id, content_type, content_id, reaction_type)
    VALUES (p_user_id, 'story', p_story_id, p_reaction_type);
    RETURN json_build_object('toggledOn', true, 'success', true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =========================
-- TAGS
-- =========================
DROP TABLE IF EXISTS tags CASCADE;
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- =========================
-- STORIES
-- =========================
DROP TABLE IF EXISTS stories CASCADE;
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover_image_url TEXT,
  content JSONB,
  excerpt TEXT,
  status story_status NOT NULL DEFAULT 'draft',
  visibility story_visibility NOT NULL DEFAULT 'public',
  linked_trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  location_country TEXT,
  location_city TEXT,
  story_type story_type,
  reading_time_minutes INTEGER DEFAULT 0,

  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT,
  hidden_at TIMESTAMPTZ,
  hidden_by UUID REFERENCES profiles(id),

  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_stories_set_updated_at ON stories;
CREATE TRIGGER trg_stories_set_updated_at
BEFORE UPDATE ON stories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_stories_set_published_at ON stories;
CREATE TRIGGER trg_stories_set_published_at
BEFORE INSERT OR UPDATE OF status ON stories
FOR EACH ROW EXECUTE FUNCTION set_published_at();

-- =========================
-- STORY TAGS
-- =========================
DROP TABLE IF EXISTS story_tags CASCADE;
CREATE TABLE story_tags (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, tag_id)
);

-- =========================
-- STORY COMMENTS
-- =========================
DROP TABLE IF EXISTS story_comments CASCADE;
CREATE TABLE story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES story_comments(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
  like_count INTEGER NOT NULL DEFAULT 0,

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT,
  hidden_at TIMESTAMPTZ,
  hidden_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_story_comments_set_updated_at ON story_comments;
CREATE TRIGGER trg_story_comments_set_updated_at
BEFORE UPDATE ON story_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- DISCUSSIONS
-- =========================
DROP TABLE IF EXISTS discussions CASCADE;
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  category discussion_category NOT NULL DEFAULT 'general',
  status discussion_status NOT NULL DEFAULT 'open',
  visibility discussion_visibility NOT NULL DEFAULT 'public',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,

  location_country TEXT,
  location_city TEXT,

  view_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT,
  hidden_at TIMESTAMPTZ,
  hidden_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_discussions_set_updated_at ON discussions;
CREATE TRIGGER trg_discussions_set_updated_at
BEFORE UPDATE ON discussions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- DISCUSSION TAGS
-- =========================
DROP TABLE IF EXISTS discussion_tags CASCADE;
CREATE TABLE discussion_tags (
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (discussion_id, tag_id)
);

-- =========================
-- DISCUSSION REPLIES
-- =========================
DROP TABLE IF EXISTS discussion_replies CASCADE;
CREATE TABLE discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_accepted_answer BOOLEAN NOT NULL DEFAULT FALSE,
  like_count INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason TEXT,
  hidden_at TIMESTAMPTZ,
  hidden_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS trg_discussion_replies_set_updated_at ON discussion_replies;
CREATE TRIGGER trg_discussion_replies_set_updated_at
BEFORE UPDATE ON discussion_replies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- REACTIONS
-- =========================
DROP TABLE IF EXISTS reactions CASCADE;
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type reaction_content_type NOT NULL,
  content_id UUID NOT NULL,
  reaction_type reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id, reaction_type)
);

-- =========================
-- REPORTS
-- =========================
DROP TABLE IF EXISTS reports CASCADE;
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type report_content_type NOT NULL,
  content_id UUID NOT NULL,
  reason report_reason NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- MODERATION ACTIONS
-- =========================
DROP TABLE IF EXISTS moderation_actions CASCADE;
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type report_content_type NOT NULL,
  content_id UUID NOT NULL,
  action_type moderation_action_type NOT NULL,
  reason TEXT,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_status_visibility ON stories(status, visibility);
CREATE INDEX IF NOT EXISTS idx_stories_published_at ON stories(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_deleted_at ON stories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_stories_hidden ON stories(is_hidden);

CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_parent ON story_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_deleted ON story_comments(deleted_at);

CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_status_visibility ON discussions(status, visibility);
CREATE INDEX IF NOT EXISTS idx_discussions_last_activity ON discussions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_deleted ON discussions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_discussions_hidden ON discussions(is_hidden);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent ON discussion_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_deleted ON discussion_replies(deleted_at);

CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_content ON reactions(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_content ON reports(content_type, content_id);

-- =========================
-- COUNTS & ACTIVITY
-- =========================
CREATE OR REPLACE FUNCTION adjust_story_comment_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE stories SET comment_count = comment_count + 1 WHERE id = NEW.story_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE stories SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.story_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE stories SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.story_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE stories SET comment_count = comment_count + 1 WHERE id = NEW.story_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_story_comments_count ON story_comments;
CREATE TRIGGER trg_story_comments_count
AFTER INSERT OR UPDATE OR DELETE ON story_comments
FOR EACH ROW EXECUTE FUNCTION adjust_story_comment_count();

CREATE OR REPLACE FUNCTION adjust_discussion_reply_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE discussions
      SET reply_count = reply_count + 1,
          last_activity_at = now()
      WHERE id = NEW.discussion_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE discussions
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.discussion_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE discussions
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = NEW.discussion_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE discussions
      SET reply_count = reply_count + 1,
          last_activity_at = now()
      WHERE id = NEW.discussion_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_discussion_replies_count ON discussion_replies;
CREATE TRIGGER trg_discussion_replies_count
AFTER INSERT OR UPDATE OR DELETE ON discussion_replies
FOR EACH ROW EXECUTE FUNCTION adjust_discussion_reply_count();

CREATE OR REPLACE FUNCTION adjust_reaction_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  delta INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := 1;
  ELSIF TG_OP = 'DELETE' THEN
    delta := -1;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.reaction_type IN ('like', 'bookmark'))
     OR (TG_OP = 'DELETE' AND OLD.reaction_type IN ('like', 'bookmark')) THEN

    IF (TG_OP = 'INSERT') THEN
      IF NEW.content_type = 'story' THEN
        IF NEW.reaction_type = 'like' THEN
          UPDATE stories SET like_count = GREATEST(like_count + delta, 0) WHERE id = NEW.content_id;
        ELSE
          UPDATE stories SET bookmark_count = GREATEST(bookmark_count + delta, 0) WHERE id = NEW.content_id;
        END IF;
      ELSIF NEW.content_type = 'discussion' THEN
        IF NEW.reaction_type = 'like' THEN
          UPDATE discussions SET like_count = GREATEST(like_count + delta, 0) WHERE id = NEW.content_id;
        ELSE
          UPDATE discussions SET bookmark_count = GREATEST(bookmark_count + delta, 0) WHERE id = NEW.content_id;
        END IF;
      ELSIF NEW.content_type = 'discussion_reply' THEN
        UPDATE discussion_replies SET like_count = GREATEST(like_count + delta, 0) WHERE id = NEW.content_id;
      ELSIF NEW.content_type = 'comment' THEN
        UPDATE story_comments SET like_count = GREATEST(like_count + delta, 0) WHERE id = NEW.content_id;
      END IF;
    ELSE
      IF OLD.content_type = 'story' THEN
        IF OLD.reaction_type = 'like' THEN
          UPDATE stories SET like_count = GREATEST(like_count + delta, 0) WHERE id = OLD.content_id;
        ELSE
          UPDATE stories SET bookmark_count = GREATEST(bookmark_count + delta, 0) WHERE id = OLD.content_id;
        END IF;
      ELSIF OLD.content_type = 'discussion' THEN
        IF OLD.reaction_type = 'like' THEN
          UPDATE discussions SET like_count = GREATEST(like_count + delta, 0) WHERE id = OLD.content_id;
        ELSE
          UPDATE discussions SET bookmark_count = GREATEST(bookmark_count + delta, 0) WHERE id = OLD.content_id;
        END IF;
      ELSIF OLD.content_type = 'discussion_reply' THEN
        UPDATE discussion_replies SET like_count = GREATEST(like_count + delta, 0) WHERE id = OLD.content_id;
      ELSIF OLD.content_type = 'comment' THEN
        UPDATE story_comments SET like_count = GREATEST(like_count + delta, 0) WHERE id = OLD.content_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reactions_count ON reactions;
CREATE TRIGGER trg_reactions_count
AFTER INSERT OR DELETE ON reactions
FOR EACH ROW EXECUTE FUNCTION adjust_reaction_counts();

-- =========================
-- RLS
-- =========================
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stories_select ON stories;
CREATE POLICY stories_select ON stories
FOR SELECT
USING (
  (status = 'published'
   AND visibility IN ('public', 'unlisted')
   AND is_hidden = FALSE
   AND deleted_at IS NULL)
  OR author_id = auth.uid()
  OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS stories_insert ON stories;
CREATE POLICY stories_insert ON stories
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS stories_update ON stories;
CREATE POLICY stories_update ON stories
FOR UPDATE USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS stories_delete ON stories;
CREATE POLICY stories_delete ON stories
FOR DELETE USING (author_id = auth.uid());

DROP POLICY IF EXISTS story_comments_select ON story_comments;
CREATE POLICY story_comments_select ON story_comments
FOR SELECT
USING (
  author_id = auth.uid()
  OR auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM stories s
    WHERE s.id = story_comments.story_id
      AND s.status = 'published'
      AND s.visibility IN ('public', 'unlisted')
      AND s.is_hidden = FALSE
      AND s.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS story_comments_insert ON story_comments;
CREATE POLICY story_comments_insert ON story_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM stories s
    WHERE s.id = story_comments.story_id
      AND s.status = 'published'
      AND s.visibility IN ('public', 'unlisted')
      AND s.is_hidden = FALSE
      AND s.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS story_comments_update ON story_comments;
CREATE POLICY story_comments_update ON story_comments
FOR UPDATE USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS story_comments_delete ON story_comments;
CREATE POLICY story_comments_delete ON story_comments
FOR DELETE USING (author_id = auth.uid());

DROP POLICY IF EXISTS discussions_select ON discussions;
CREATE POLICY discussions_select ON discussions
FOR SELECT
USING (
  (visibility = 'public'
   AND is_hidden = FALSE
   AND deleted_at IS NULL)
  OR author_id = auth.uid()
  OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS discussions_insert ON discussions;
CREATE POLICY discussions_insert ON discussions
FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS discussions_update ON discussions;
CREATE POLICY discussions_update ON discussions
FOR UPDATE USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS discussions_delete ON discussions;
CREATE POLICY discussions_delete ON discussions
FOR DELETE USING (author_id = auth.uid());

DROP POLICY IF EXISTS discussion_replies_select ON discussion_replies;
CREATE POLICY discussion_replies_select ON discussion_replies
FOR SELECT
USING (
  author_id = auth.uid()
  OR auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND d.visibility = 'public'
      AND d.is_hidden = FALSE
      AND d.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS discussion_replies_insert ON discussion_replies;
CREATE POLICY discussion_replies_insert ON discussion_replies
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND d.visibility = 'public'
      AND d.is_hidden = FALSE
      AND d.deleted_at IS NULL
      AND d.is_locked = FALSE
  )
);

DROP POLICY IF EXISTS discussion_replies_update ON discussion_replies;
CREATE POLICY discussion_replies_update ON discussion_replies
FOR UPDATE USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND d.author_id = auth.uid()
  )
)
WITH CHECK (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND d.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS discussion_replies_delete ON discussion_replies;
CREATE POLICY discussion_replies_delete ON discussion_replies
FOR DELETE USING (author_id = auth.uid());

DROP POLICY IF EXISTS reactions_select ON reactions;
CREATE POLICY reactions_select ON reactions
FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS reactions_insert ON reactions;
CREATE POLICY reactions_insert ON reactions
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS reactions_delete ON reactions;
CREATE POLICY reactions_delete ON reactions
FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS reports_select ON reports;
CREATE POLICY reports_select ON reports
FOR SELECT USING (reporter_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS reports_insert ON reports;
CREATE POLICY reports_insert ON reports
FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_update ON reports;
CREATE POLICY reports_update ON reports
FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS moderation_actions_select ON moderation_actions;
CREATE POLICY moderation_actions_select ON moderation_actions
FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS moderation_actions_insert ON moderation_actions;
CREATE POLICY moderation_actions_insert ON moderation_actions
FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS tags_select ON tags;
CREATE POLICY tags_select ON tags FOR SELECT USING (true);

DROP POLICY IF EXISTS tags_insert ON tags;
CREATE POLICY tags_insert ON tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tags_update ON tags;
CREATE POLICY tags_update ON tags 
FOR UPDATE 
USING (true)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS story_tags_select ON story_tags;
CREATE POLICY story_tags_select ON story_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS story_tags_insert ON story_tags;
CREATE POLICY story_tags_insert ON story_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS discussion_tags_select ON discussion_tags;
CREATE POLICY discussion_tags_select ON discussion_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS discussion_tags_insert ON discussion_tags;
CREATE POLICY discussion_tags_insert ON discussion_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
