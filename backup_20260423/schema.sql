


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."discussion_category" AS ENUM (
    'general',
    'budget',
    'transport',
    'visa',
    'safety',
    'food',
    'accommodation'
);


ALTER TYPE "public"."discussion_category" OWNER TO "postgres";


CREATE TYPE "public"."discussion_status" AS ENUM (
    'open',
    'closed',
    'resolved'
);


ALTER TYPE "public"."discussion_status" OWNER TO "postgres";


CREATE TYPE "public"."discussion_visibility" AS ENUM (
    'public',
    'private'
);


ALTER TYPE "public"."discussion_visibility" OWNER TO "postgres";


CREATE TYPE "public"."expense_category" AS ENUM (
    'accommodation',
    'transportation',
    'food',
    'activities',
    'shopping',
    'other'
);


ALTER TYPE "public"."expense_category" OWNER TO "postgres";


CREATE TYPE "public"."guided_booking_status" AS ENUM (
    'pending',
    'awaiting_payment',
    'confirmed',
    'cancelled',
    'completed',
    'payment_failed',
    'partially_paid'
);


ALTER TYPE "public"."guided_booking_status" OWNER TO "postgres";


CREATE TYPE "public"."guided_payment_status" AS ENUM (
    'unpaid',
    'partial',
    'paid',
    'refunded'
);


ALTER TYPE "public"."guided_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."guided_record_payment_status" AS ENUM (
    'pending',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."guided_record_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."guided_schedule_payment_status" AS ENUM (
    'pending',
    'paid',
    'overdue',
    'cancelled'
);


ALTER TYPE "public"."guided_schedule_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."join_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'left'
);


ALTER TYPE "public"."join_request_status" OWNER TO "postgres";


CREATE TYPE "public"."moderation_action_type" AS ENUM (
    'hide',
    'unhide',
    'delete',
    'restore',
    'lock',
    'unlock',
    'warn_user'
);


ALTER TYPE "public"."moderation_action_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'trip_invite',
    'trip_join_request',
    'trip_join_approved',
    'trip_join_rejected',
    'trip_cancelled',
    'trip_updated',
    'trip_reminder',
    'new_message',
    'new_expense',
    'expense_paid',
    'expense_reminder',
    'new_follower',
    'new_review',
    'new_tip',
    'trip_published',
    'system_announcement',
    'achievement_unlocked',
    'receipt_submitted',
    'receipt_approved',
    'receipt_rejected',
    'trip_settlement_required'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."reaction_content_type" AS ENUM (
    'story',
    'discussion',
    'discussion_reply',
    'comment'
);


ALTER TYPE "public"."reaction_content_type" OWNER TO "postgres";


CREATE TYPE "public"."reaction_type" AS ENUM (
    'like',
    'bookmark'
);


ALTER TYPE "public"."reaction_type" OWNER TO "postgres";


CREATE TYPE "public"."receipt_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."receipt_status" OWNER TO "postgres";


CREATE TYPE "public"."report_content_type" AS ENUM (
    'story',
    'story_comment',
    'discussion',
    'discussion_reply',
    'trip',
    'trip_chat_message',
    'direct_chat_message',
    'user_profile'
);


ALTER TYPE "public"."report_content_type" OWNER TO "postgres";


CREATE TYPE "public"."report_reason" AS ENUM (
    'spam',
    'harassment',
    'misinformation',
    'inappropriate',
    'other',
    'hate_speech',
    'scam_or_fraud',
    'violence'
);


ALTER TYPE "public"."report_reason" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'open',
    'under_review',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."story_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."story_status" OWNER TO "postgres";


CREATE TYPE "public"."story_type" AS ENUM (
    'trip-recap',
    'guide',
    'review',
    'tips',
    'itinerary',
    'budget',
    'other'
);


ALTER TYPE "public"."story_type" OWNER TO "postgres";


CREATE TYPE "public"."story_visibility" AS ENUM (
    'public',
    'private',
    'unlisted'
);


ALTER TYPE "public"."story_visibility" OWNER TO "postgres";


CREATE TYPE "public"."trip_invite_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'cancelled'
);


ALTER TYPE "public"."trip_invite_status" OWNER TO "postgres";


CREATE TYPE "public"."trip_status" AS ENUM (
    'draft',
    'published',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."trip_status" OWNER TO "postgres";


CREATE TYPE "public"."trip_type" AS ENUM (
    'community',
    'guided'
);


ALTER TYPE "public"."trip_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'traveler',
    'agent'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_creator_as_member"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'organizer', now())
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_creator_as_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_member_to_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id uuid;
  v_trip_status text;
BEGIN
  IF NEW.left_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.trip_id = NEW.trip_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, NEW.user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  SELECT t.status INTO v_trip_status
  FROM public.trips t
  WHERE t.id = NEW.trip_id;

  IF v_trip_status IS DISTINCT FROM 'draft' THEN
    INSERT INTO public.conversations (
      name,
      is_group,
      created_by,
      trip_id,
      conversation_type,
      metadata
    )
    SELECT
      COALESCE(t.title, 'Trip') || ' - Group Chat',
      true,
      t.creator_id,
      t.id,
      'trip_group',
      jsonb_build_object(
        'type', 'trip_group',
        'trip_id', t.id,
        'trip_type', t.type
      )
    FROM public.trips t
    WHERE t.id = NEW.trip_id
    RETURNING id INTO v_conversation_id;

    IF v_conversation_id IS NOT NULL THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conversation_id, NEW.user_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_member_to_conversation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_member_to_conversation"() IS 'Adds trip members to conversations, but only for published trips (not drafts)';



CREATE OR REPLACE FUNCTION "public"."add_trip_member_to_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
  v_trip_status TEXT;
BEGIN
  -- Check trip status first
  SELECT status INTO v_trip_status
  FROM trips
  WHERE id = NEW.trip_id;

  -- Only proceed if trip is not a draft
  IF v_trip_status IS DISTINCT FROM 'draft' THEN
    -- Get the conversation for this trip
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE trip_id = NEW.trip_id;

    -- If conversation exists, add the member as participant
    IF v_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (v_conversation_id, NEW.user_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_trip_member_to_conversation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_trip_member_to_conversation"() IS 'Adds trip members to conversations, but only for published trips (not drafts)';



CREATE OR REPLACE FUNCTION "public"."add_trip_member_with_rejoin"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text" DEFAULT 'member'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_existing_member RECORD;
BEGIN
    -- Check if member record already exists
    SELECT * INTO v_existing_member
    FROM trip_members
    WHERE trip_id = p_trip_id 
    AND user_id = p_user_id;
    
    IF v_existing_member.id IS NOT NULL THEN
        -- Member exists, update the record to rejoin
        UPDATE trip_members
        SET 
            left_at = NULL,
            role = p_role,
            joined_at = NOW()
        WHERE trip_id = p_trip_id 
        AND user_id = p_user_id;
    ELSE
        -- Member doesn't exist, insert new record
        INSERT INTO trip_members (trip_id, user_id, role, joined_at)
        VALUES (p_trip_id, p_user_id, p_role, NOW());
    END IF;
END;
$$;


ALTER FUNCTION "public"."add_trip_member_with_rejoin"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_trip_member_with_rejoin"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") IS 'Safely adds a trip member, handling cases where the user previously left and is rejoining';



CREATE OR REPLACE FUNCTION "public"."adjust_discussion_reply_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."adjust_discussion_reply_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_reaction_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."adjust_reaction_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_story_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."adjust_story_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_expense_receipt"("p_receipt_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense_id uuid;
  v_participant_id uuid;
  v_status receipt_status;
BEGIN
  -- Get receipt details
  SELECT expense_id, participant_id, status
  INTO v_expense_id, v_participant_id, v_status
  FROM expense_receipts
  WHERE id = p_receipt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;
  
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Receipt has already been reviewed';
  END IF;
  
  -- Verify the reviewer is the expense payer
  IF NOT EXISTS (
    SELECT 1 FROM expense_payments
    WHERE expense_id = v_expense_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only expense payers can approve receipts';
  END IF;
  
  -- Update receipt status
  UPDATE expense_receipts
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_receipt_id;
  
  -- Mark the expense as paid for the participant
  PERFORM mark_expense_as_paid_with_settlement(v_expense_id, v_participant_id);
END;
$$;


ALTER FUNCTION "public"."approve_expense_receipt"("p_receipt_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_expense_receipt"("p_receipt_id" "uuid") IS 'Approves a receipt and automatically marks the expense as paid for the participant';



CREATE OR REPLACE FUNCTION "public"."approve_join_request"("request_id" "uuid") RETURNS TABLE("approved_trip_id" "uuid", "approved_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_trip_id   uuid;
  v_user_id   uuid;
  v_creator_id uuid;
  v_status    text;
BEGIN
  SELECT jr.trip_id, jr.user_id, t.creator_id, jr.status::text
  INTO v_trip_id, v_user_id, v_creator_id, v_status
  FROM public.join_requests jr
  JOIN public.trips t ON t.id = jr.trip_id
  WHERE jr.id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF v_creator_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed to approve this request' USING ERRCODE = '42501';
  END IF;

  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Join request already processed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.join_requests
  SET
    status      = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at  = now()
  WHERE id = request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- current_participants is incremented by +1 on the client side after this
  -- function returns, so we do NOT touch it here.

  RETURN QUERY SELECT v_trip_id AS approved_trip_id, v_user_id AS approved_user_id;
END;
$$;


ALTER FUNCTION "public"."approve_join_request"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_join_request_safe"("p_request_id" "uuid", "p_reviewer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_request RECORD;
  v_trip RECORD;
BEGIN
  -- Get request details with trip info
  SELECT 
    jr.*,
    t.creator_id,
    t.title as trip_title
  INTO v_request
  FROM join_requests jr
  JOIN trips t ON t.id = jr.trip_id
  WHERE jr.id = p_request_id;
  
  -- Check if request exists
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found';
  END IF;
  
  -- Verify the reviewer is the trip creator or has permission
  IF v_request.creator_id != p_reviewer_id THEN
    -- Check if reviewer is an admin/co-organizer
    PERFORM 1 FROM trip_members
    WHERE trip_id = v_request.trip_id 
    AND user_id = p_reviewer_id
    AND role IN ('organizer', 'co-organizer')
    AND left_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Only trip organizers can approve join requests';
    END IF;
  END IF;
  
  -- Check current status
  IF v_request.status = 'approved' THEN
    RAISE EXCEPTION 'This request has already been approved';
  END IF;
  
  IF v_request.status NOT IN ('pending', 'left') THEN
    RAISE EXCEPTION 'Can only approve pending requests or re-approve after leaving';
  END IF;
  
  -- Update join request status
  UPDATE join_requests
  SET 
    status = 'approved',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;
  
  -- Safely add member (handles both new members and rejoining members)
  PERFORM safe_add_trip_member(v_request.trip_id, v_request.user_id, 'member');
  
  -- Add to conversation if exists
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT c.id, v_request.user_id
  FROM conversations c
  WHERE c.trip_id = v_request.trip_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RAISE NOTICE 'Successfully approved join request % for user % in trip %', 
    p_request_id, v_request.user_id, v_request.trip_id;
END;
$$;


ALTER FUNCTION "public"."approve_join_request_safe"("p_request_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_join_request_safe"("p_request_id" "uuid", "p_reviewer_id" "uuid") IS 'Approves a join request and adds the member to the trip, properly handling rejoin scenarios';



CREATE OR REPLACE FUNCTION "public"."approve_join_request_with_rejoin"("p_request_id" "uuid", "p_reviewer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- Get request details
    SELECT jr.*, t.creator_id
    INTO v_request
    FROM join_requests jr
    JOIN trips t ON t.id = jr.trip_id
    WHERE jr.id = p_request_id;
    
    -- Verify the reviewer is the trip creator
    IF v_request.creator_id != p_reviewer_id THEN
        RAISE EXCEPTION 'Only trip creator can approve join requests';
    END IF;
    
    -- Update join request status
    UPDATE join_requests
    SET 
        status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW()
    WHERE id = p_request_id;
    
    -- Add member using the new function that handles rejoins
    PERFORM add_trip_member_with_rejoin(
        v_request.trip_id,
        v_request.user_id,
        'member'
    );
END;
$$;


ALTER FUNCTION "public"."approve_join_request_with_rejoin"("p_request_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_join_request_with_rejoin"("p_request_id" "uuid", "p_reviewer_id" "uuid") IS 'Approves a join request and adds the member, handling rejoin cases';



CREATE OR REPLACE FUNCTION "public"."auto_complete_trips"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.trips
  SET status = 'completed'
  WHERE status = 'in_progress'
  AND end_date < CURRENT_DATE;
END;
$$;


ALTER FUNCTION "public"."auto_complete_trips"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_trip_expense_balances"("p_trip_id" "uuid") RETURNS TABLE("expense_id" "uuid", "user_id" "uuid", "amount" numeric)
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    ep.expense_id,
    ep.user_id,
    ep.amount_owed
  from public.expense_participants ep
  join public.trip_expenses te
    on te.id = ep.expense_id
  where te.trip_id = p_trip_id;
$$;


ALTER FUNCTION "public"."calculate_trip_expense_balances"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_trip_members"("p_trip_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = p_trip_id
      AND t.creator_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = p_user_id
      AND tm.is_admin = true
      AND tm.left_at IS NULL
  );
$$;


ALTER FUNCTION "public"."can_manage_trip_members"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_review_trip"("p_trip_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members tm
    JOIN public.trips t ON t.id = tm.trip_id
    WHERE tm.trip_id = p_trip_id
    AND tm.user_id = p_user_id
    AND t.end_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_reviews
      WHERE trip_id = p_trip_id AND user_id = p_user_id
    )
  );
END;
$$;


ALTER FUNCTION "public"."can_review_trip"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_rejoin_trip"("p_trip_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_join_status TEXT;
  v_is_banned BOOLEAN;
BEGIN
  -- Check join request status
  SELECT status INTO v_join_status
  FROM join_requests
  WHERE trip_id = p_trip_id AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- User can rejoin if they left or have no request
  RETURN (v_join_status = 'left' OR v_join_status IS NULL);
END;
$$;


ALTER FUNCTION "public"."can_user_rejoin_trip"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_receipt_status_constraint"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only check for approved status
  IF NEW.status = 'approved' THEN
    -- Check if there's already an approved receipt for this expense/participant
    IF EXISTS (
      SELECT 1 FROM expense_receipts
      WHERE expense_id = NEW.expense_id
      AND participant_id = NEW.participant_id
      AND status = 'approved'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'An approved receipt already exists for this expense and participant';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_receipt_status_constraint"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_all_orphaned_data"() RETURNS TABLE("orphaned_conversations_cleaned" integer, "orphaned_messages_cleaned" integer, "orphaned_participants_cleaned" integer, "empty_conversations_cleaned" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  orph_conv INTEGER;
  orph_msg INTEGER;
  orph_participant INTEGER;
  empty_conv INTEGER;
BEGIN
  -- Clean up orphaned conversations (from deleted trips)
  SELECT * INTO orph_conv, orph_msg, orph_participant 
  FROM cleanup_orphaned_conversations();

  -- Clean up empty conversations (no messages)
  SELECT cleanup_empty_conversations() INTO empty_conv;

  RETURN QUERY SELECT orph_conv, orph_msg, orph_participant, empty_conv;
END;
$$;


ALTER FUNCTION "public"."cleanup_all_orphaned_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_all_orphaned_data"() IS 'Comprehensive cleanup of all orphaned conversation data. Run periodically for database maintenance.';



CREATE OR REPLACE FUNCTION "public"."cleanup_empty_conversations"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.conversations
  WHERE id NOT IN (
    SELECT DISTINCT conversation_id 
    FROM public.messages
    WHERE conversation_id IS NOT NULL
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_empty_conversations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_empty_conversations"() IS 'Removes conversations that have no associated messages. Returns the number of deleted conversations.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_analytics"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Delete analytics events older than 90 days
  DELETE FROM public.analytics_events
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  -- Archive trip analytics older than 1 year
  DELETE FROM public.trip_analytics
  WHERE date < CURRENT_DATE - INTERVAL '1 year';
  
  -- Archive user engagement older than 6 months
  DELETE FROM public.user_engagement
  WHERE date < CURRENT_DATE - INTERVAL '6 months';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_orphaned_conversations"() RETURNS TABLE("deleted_conversations" integer, "deleted_messages" integer, "deleted_participants" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  conv_count INTEGER;
  msg_count INTEGER;
  participant_count INTEGER;
BEGIN
  -- Delete conversation participants for orphaned conversations
  DELETE FROM public.conversation_participants cm
  WHERE cm.conversation_id IN (
    SELECT c.id 
    FROM public.conversations c
    WHERE c.trip_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = c.trip_id
      )
  );
  GET DIAGNOSTICS participant_count = ROW_COUNT;

  -- Delete messages for orphaned conversations
  DELETE FROM public.messages m
  WHERE m.conversation_id IN (
    SELECT c.id 
    FROM public.conversations c
    WHERE c.trip_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trips t 
        WHERE t.id = c.trip_id
      )
  );
  GET DIAGNOSTICS msg_count = ROW_COUNT;

  -- Delete the orphaned conversations
  DELETE FROM public.conversations c
  WHERE c.trip_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.trips t 
      WHERE t.id = c.trip_id
    );
  GET DIAGNOSTICS conv_count = ROW_COUNT;

  RETURN QUERY SELECT conv_count, msg_count, participant_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphaned_conversations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_orphaned_conversations"() IS 'Removes conversations and all related data for trips that no longer exist. Returns count of deleted conversations, messages, and participants.';



CREATE OR REPLACE FUNCTION "public"."create_direct_conversation_participants"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- For direct conversations, automatically add both users as participants
  IF NEW.conversation_type = 'direct' AND NEW.user1_id IS NOT NULL AND NEW.user2_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (NEW.id, NEW.user1_id),
      (NEW.id, NEW.user2_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_direct_conversation_participants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trip_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Create conversation for ALL trip types (both community and guided)
  -- Check if conversation already exists for this trip
  IF NOT EXISTS (SELECT 1 FROM conversations WHERE trip_id = NEW.id) THEN
    -- Create the conversation
    INSERT INTO conversations (name, is_group, created_by, trip_id, metadata)
    VALUES (
      NEW.title || ' - Group Chat',
      true,
      NEW.creator_id,
      NEW.id,
      jsonb_build_object(
        'type', 'trip_group', 
        'trip_id', NEW.id,
        'trip_type', NEW.type
      )
    )
    RETURNING id INTO v_conversation_id;
    
    -- Add creator as participant
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, NEW.creator_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_trip_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trip_conversation_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Only create conversations for published trips (not drafts)
  IF NEW.status IS DISTINCT FROM 'draft' THEN
    -- Check if conversation already exists for this trip
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE trip_id = NEW.id;

    -- If conversation doesn't exist, create it
    IF v_conversation_id IS NULL THEN
      -- Create the conversation for the new trip with proper conversation_type
      INSERT INTO conversations (
        name,
        is_group,
        created_by,
        trip_id,
        conversation_type,
        metadata
      )
      VALUES (
        NEW.title || ' - Group Chat',
        true,
        NEW.creator_id,
        NEW.id,
        'trip_group',
        jsonb_build_object(
          'type', 'trip_group',
          'trip_id', NEW.id,
          'trip_type', NEW.type
        )
      )
      RETURNING id INTO v_conversation_id;

      -- Add creator as the first participant
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (v_conversation_id, NEW.creator_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail trip creation
    RAISE WARNING 'Failed to create conversation for trip %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_trip_conversation_on_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_trip_conversation_on_insert"() IS 'Creates group conversations only for published trips, not drafts';



CREATE OR REPLACE FUNCTION "public"."create_trip_conversation_on_publish"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Only act when status changes from draft to published
  IF OLD.status = 'draft' AND NEW.status != 'draft' THEN
    -- Check if conversation already exists for this trip
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE trip_id = NEW.id;

    -- If conversation doesn't exist, create it
    IF v_conversation_id IS NULL THEN
      -- Create the conversation for the newly published trip
      INSERT INTO conversations (
        name,
        is_group,
        created_by,
        trip_id,
        conversation_type,
        metadata
      )
      VALUES (
        NEW.title || ' - Group Chat',
        true,
        NEW.creator_id,
        NEW.id,
        'trip_group',
        jsonb_build_object(
          'type', 'trip_group',
          'trip_id', NEW.id,
          'trip_type', NEW.type
        )
      )
      RETURNING id INTO v_conversation_id;

      -- Add creator as the first participant
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (v_conversation_id, NEW.creator_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;

      -- Add all existing trip members as participants
      INSERT INTO conversation_participants (conversation_id, user_id)
      SELECT v_conversation_id, user_id
      FROM trip_members
      WHERE trip_id = NEW.id AND left_at IS NULL
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail trip update
    RAISE WARNING 'Failed to create conversation for published trip %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_trip_conversation_on_publish"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_trip_conversation_on_publish"() IS 'Creates group conversation when a draft trip is published';



CREATE OR REPLACE FUNCTION "public"."current_user_is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = TRUE
  );
$$;


ALTER FUNCTION "public"."current_user_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_trip_access"("p_trip_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("trip_exists" boolean, "is_member" boolean, "is_creator" boolean, "trip_status" "text", "trip_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id) as trip_exists,
    EXISTS(SELECT 1 FROM trip_members WHERE trip_id = p_trip_id AND user_id = p_user_id) as is_member,
    EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id AND creator_id = p_user_id) as is_creator,
    (SELECT status FROM trips WHERE id = p_trip_id LIMIT 1) as trip_status,
    (SELECT type FROM trips WHERE id = p_trip_id LIMIT 1) as trip_type;
END;
$$;


ALTER FUNCTION "public"."debug_trip_access"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_user_profile"("p_user_id" "uuid") RETURNS TABLE("user_exists" boolean, "profile_exists" boolean, "bio_value" "text", "bio_is_null" boolean, "full_profile" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) as user_exists,
    EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) as profile_exists,
    p.bio as bio_value,
    p.bio IS NULL as bio_is_null,
    jsonb_build_object(
      'user_id', p.id,
      'username', p.username,
      'full_name', p.full_name,
      'bio', p.bio,
      'location', p.location,
      'avatar_url', p.avatar_url
    ) as full_profile
  FROM profiles p
  WHERE p.id = p_user_id;
  
  -- If no profile found, still return diagnostic info
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) as user_exists,
      false as profile_exists,
      NULL::TEXT as bio_value,
      true as bio_is_null,
      NULL::JSONB as full_profile;
  END IF;
END;
$$;


ALTER FUNCTION "public"."debug_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."debug_user_profile"("p_user_id" "uuid") IS 'Debug function to check user profile data including bio field';



CREATE OR REPLACE FUNCTION "public"."delete_push_token"("p_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM user_push_tokens
  WHERE token = p_token
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."delete_push_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_payer_marked_as_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- When a new expense payment is created, mark the payer's participation as paid
  IF TG_OP = 'INSERT' THEN
    UPDATE expense_participants
    SET 
      is_paid = true,
      paid_at = COALESCE(paid_at, now())
    WHERE 
      expense_id = NEW.expense_id
      AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_payer_marked_as_paid"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_payer_marked_as_paid"() IS 'Automatically marks a payer''s own participation as paid when they pay for an expense,
since they have already paid the full amount upfront.';



CREATE OR REPLACE FUNCTION "public"."ensure_single_default_payment_method"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- If setting this as default, unset all other defaults for this trip
  IF NEW.is_default = TRUE THEN
    UPDATE trip_payment_methods 
    SET is_default = FALSE 
    WHERE trip_id = NEW.trip_id 
    AND id != NEW.id 
    AND is_default = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_payment_method"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_trip_conversation"("p_trip_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
  v_trip RECORD;
BEGIN
  -- Get trip details
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  
  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;
  
  -- Check if conversation exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE trip_id = p_trip_id
    AND conversation_type = 'trip_group';
  
  -- Create if not exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      trip_id,
      conversation_type,
      is_group,
      name,
      created_by
    ) VALUES (
      p_trip_id,
      'trip_group',
      true,
      v_trip.title || ' - Group Chat',
      v_trip.creator_id
    )
    RETURNING id INTO v_conversation_id;
    
    -- Add creator as participant
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, v_trip.creator_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION "public"."ensure_trip_conversation"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_trip_has_conversation"("p_trip_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
  v_trip RECORD;
BEGIN
  -- Get trip details
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  
  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;
  
  -- Check if conversation exists
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE trip_id = p_trip_id;
  
  IF v_conversation_id IS NULL THEN
    -- Create conversation
    INSERT INTO conversations (name, is_group, created_by, trip_id, metadata)
    VALUES (
      v_trip.title || ' - Group Chat',
      true,
      v_trip.creator_id,
      v_trip.id,
      jsonb_build_object(
        'type', 'trip_group', 
        'trip_id', v_trip.id,
        'trip_type', v_trip.type
      )
    )
    RETURNING id INTO v_conversation_id;
    
    -- Add creator as participant
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, v_trip.creator_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    -- Add all trip members as participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT v_conversation_id, tm.user_id
    FROM trip_members tm
    WHERE tm.trip_id = p_trip_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION "public"."ensure_trip_has_conversation"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_trip_members_in_conversation"("p_trip_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT c.id, tm.user_id
  FROM conversations c
  JOIN trip_members tm ON tm.trip_id = c.trip_id
  WHERE c.trip_id = p_trip_id
    AND tm.role IN ('member', 'organizer', 'admin')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."ensure_trip_members_in_conversation"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_all_participant_counts"() RETURNS TABLE("trip_id" "uuid", "trip_title" "text", "old_count" integer, "new_count" integer, "fixed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_trip RECORD;
    v_actual_count INTEGER;
    v_updated BOOLEAN;
BEGIN
    FOR v_trip IN 
        SELECT t.id, t.title, t.current_participants
        FROM trips t
        WHERE t.type = 'community'
    LOOP
        -- Calculate actual count of active members (where left_at IS NULL)
        SELECT COUNT(*) INTO v_actual_count
        FROM trip_members tm
        WHERE tm.trip_id = v_trip.id
        AND tm.left_at IS NULL;
        
        -- Update if different
        v_updated := false;
        IF v_trip.current_participants IS DISTINCT FROM v_actual_count THEN
            UPDATE trips 
            SET current_participants = v_actual_count
            WHERE id = v_trip.id;
            v_updated := true;
        END IF;
        
        -- Return result
        trip_id := v_trip.id;
        trip_title := v_trip.title;
        old_count := v_trip.current_participants;
        new_count := v_actual_count;
        fixed := v_updated;
        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."fix_all_participant_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fix_all_participant_counts"() IS 'Recalculates and fixes participant counts for all community trips';



CREATE OR REPLACE FUNCTION "public"."generate_notification_action_url"("p_type" "text", "p_trip_id" "uuid" DEFAULT NULL::"uuid", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  CASE p_type
    WHEN 'trip_join_request' THEN
      -- For trip creators, redirect to manage trip page
      RETURN '/trips/' || p_trip_id::text || '/manage';
    WHEN 'trip_join_approved' THEN
      -- For approved members, redirect to trip details
      RETURN '/trips/' || p_trip_id::text;
    WHEN 'trip_join_rejected' THEN
      -- For rejected users, redirect to trip details
      RETURN '/trips/' || p_trip_id::text;
    WHEN 'new_message' THEN
      -- For messages, redirect to trip chat
      RETURN '/trips/' || p_trip_id::text || '/chat';
    WHEN 'trip_updated' THEN
      -- For trip updates, redirect to trip details
      RETURN '/trips/' || p_trip_id::text;
    WHEN 'trip_cancelled' THEN
      -- For cancelled trips, redirect to my trips
      RETURN '/my-trips';
    ELSE
      -- Default to trips page
      RETURN '/trips';
  END CASE;
END;
$$;


ALTER FUNCTION "public"."generate_notification_action_url"("p_type" "text", "p_trip_id" "uuid", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_sample_itinerary"("days" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    itinerary JSONB := '[]'::JSONB;
    day_data JSONB;
    i INTEGER;
BEGIN
    FOR i IN 1..days LOOP
        day_data := jsonb_build_object(
            'day', i,
            'title', 'Day ' || i || ' Activities',
            'activities', jsonb_build_array(
                jsonb_build_object(
                    'time', '09:00',
                    'activity', 'Morning activity',
                    'description', 'Start your day with an exciting experience'
                ),
                jsonb_build_object(
                    'time', '12:00',
                    'activity', 'Lunch break',
                    'description', 'Enjoy local cuisine'
                ),
                jsonb_build_object(
                    'time', '14:00',
                    'activity', 'Afternoon exploration',
                    'description', 'Discover hidden gems'
                ),
                jsonb_build_object(
                    'time', '19:00',
                    'activity', 'Dinner and evening activity',
                    'description', 'End your day with memorable experiences'
                )
            )
        );
        itinerary := itinerary || day_data;
    END LOOP;
    RETURN itinerary;
END;
$$;


ALTER FUNCTION "public"."generate_sample_itinerary"("days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_unique_slug"("title" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Convert title to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(trim(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g')));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and add number suffix if needed
  WHILE EXISTS (SELECT 1 FROM trips WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;


ALTER FUNCTION "public"."generate_unique_slug"("title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_block_related_user_ids"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT related_id
  FROM (
    SELECT blocked_user_id AS related_id
    FROM public.blocked_users
    WHERE user_id = p_user_id

    UNION

    SELECT user_id AS related_id
    FROM public.blocked_users
    WHERE blocked_user_id = p_user_id
  ) relationships;
$$;


ALTER FUNCTION "public"."get_block_related_user_ids"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid",
    "is_group" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "user1_id" "uuid",
    "user2_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "name" "text",
    "created_by" "uuid",
    "conversation_type" "text",
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "conversations_direct_different_users" CHECK ((("conversation_type" <> 'direct'::"text") OR ("user1_id" <> "user2_id"))),
    CONSTRAINT "conversations_direct_user_order" CHECK ((("conversation_type" <> 'direct'::"text") OR ("user1_id" < "user2_id"))),
    CONSTRAINT "conversations_type_check" CHECK (((("conversation_type" = 'direct'::"text") AND ("user1_id" IS NOT NULL) AND ("user2_id" IS NOT NULL) AND ("trip_id" IS NULL)) OR (("conversation_type" = 'trip_group'::"text") AND ("trip_id" IS NOT NULL) AND ("user1_id" IS NULL) AND ("user2_id" IS NULL))))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS 'Stores trip chat conversations. Empty conversations (without messages) should be periodically cleaned up.';



COMMENT ON COLUMN "public"."conversations"."trip_id" IS 'Associated trip for group conversations';



COMMENT ON COLUMN "public"."conversations"."user1_id" IS 'First user in direct message (smaller UUID)';



COMMENT ON COLUMN "public"."conversations"."user2_id" IS 'Second user in direct message (larger UUID)';



COMMENT ON COLUMN "public"."conversations"."name" IS 'Display name for group conversations';



COMMENT ON COLUMN "public"."conversations"."created_by" IS 'Creator of group conversation';



COMMENT ON COLUMN "public"."conversations"."conversation_type" IS 'Type of conversation: direct or trip_group';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'traveler'::"public"."user_role" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "location" "text",
    "phone" "text",
    "date_of_birth" "date",
    "passport_number" "text",
    "emergency_contact" "jsonb",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "accepts_tips" boolean DEFAULT true,
    "tip_message" "text",
    "cover_image" "text",
    "website" "text",
    "instagram" "text",
    "twitter" "text",
    "interests" "text"[],
    "languages" "text"[],
    "countries_visited" integer DEFAULT 0,
    "trips_organized" integer DEFAULT 0,
    "trips_joined" integer DEFAULT 0,
    "verified_at" timestamp with time zone,
    "last_active_at" timestamp with time zone DEFAULT "now"(),
    "profile_views" integer DEFAULT 0,
    "is_public" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "facebook" "text",
    "threads" "text",
    "youtube" "text",
    "tiktok" "text",
    "linkedin" "text",
    "onboarding_completed" boolean DEFAULT false,
    "onboarding_goal" "text",
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "is_admin" boolean DEFAULT false,
    "budget_min" integer,
    "budget_max" integer,
    "social_links" "jsonb",
    "travel_styles" "text"[],
    "gender" "text",
    "city" "text",
    "country" "text",
    "home_currency" "text",
    "trip_reminders" boolean DEFAULT true,
    "show_trips_publicly" boolean DEFAULT false,
    "ugc_terms_accepted_at" timestamp with time zone,
    CONSTRAINT "check_facebook_url" CHECK ((("facebook" IS NULL) OR ("facebook" = ''::"text") OR ("facebook" ~ '^https?://'::"text"))),
    CONSTRAINT "check_instagram_url" CHECK ((("instagram" IS NULL) OR ("instagram" = ''::"text") OR ("instagram" ~ '^https?://'::"text"))),
    CONSTRAINT "check_linkedin_url" CHECK ((("linkedin" IS NULL) OR ("linkedin" = ''::"text") OR ("linkedin" ~ '^https?://'::"text"))),
    CONSTRAINT "check_threads_url" CHECK ((("threads" IS NULL) OR ("threads" = ''::"text") OR ("threads" ~ '^https?://'::"text"))),
    CONSTRAINT "check_tiktok_url" CHECK ((("tiktok" IS NULL) OR ("tiktok" = ''::"text") OR ("tiktok" ~ '^https?://'::"text"))),
    CONSTRAINT "check_twitter_url" CHECK ((("twitter" IS NULL) OR ("twitter" = ''::"text") OR ("twitter" ~ '^https?://'::"text"))),
    CONSTRAINT "check_website_url" CHECK ((("website" IS NULL) OR ("website" = ''::"text") OR ("website" ~ '^https?://'::"text"))),
    CONSTRAINT "check_youtube_url" CHECK ((("youtube" IS NULL) OR ("youtube" = ''::"text") OR ("youtube" ~ '^https?://'::"text")))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."is_public" IS 'User profile is visible to others';



COMMENT ON COLUMN "public"."profiles"."email_notifications" IS 'User receives email notifications';



COMMENT ON COLUMN "public"."profiles"."push_notifications" IS 'User receives push notifications';



COMMENT ON COLUMN "public"."profiles"."is_admin" IS 'Flag to identify admin users who can access admin features';



COMMENT ON COLUMN "public"."profiles"."trip_reminders" IS 'User receives reminders before their trips';



COMMENT ON COLUMN "public"."profiles"."show_trips_publicly" IS 'User trips are displayed on their public profile';



COMMENT ON COLUMN "public"."profiles"."ugc_terms_accepted_at" IS 'Timestamp when user accepted community guidelines for user-generated content. NULL = not yet accepted.';



CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "type" "public"."trip_type" NOT NULL,
    "status" "public"."trip_status" DEFAULT 'draft'::"public"."trip_status",
    "title" "text" NOT NULL,
    "description" "text",
    "destination" "text" NOT NULL,
    "cover_image" "text",
    "images" "text"[],
    "start_date" "date",
    "end_date" "date",
    "price" numeric(10,2),
    "currency" "text" DEFAULT 'USD'::"text",
    "max_participants" integer,
    "current_participants" integer DEFAULT 0,
    "itinerary" "jsonb",
    "included_items" "text"[],
    "excluded_items" "text"[],
    "requirements" "text"[],
    "cancellation_policy" "text",
    "tags" "text"[],
    "is_featured" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "meeting_point" "text",
    "difficulty_level" "text",
    "payment_terms" "text",
    "faqs" "jsonb" DEFAULT '[]'::"jsonb",
    "rating_average" numeric(3,2) DEFAULT 0,
    "rating_count" integer DEFAULT 0,
    "rating_distribution" "jsonb" DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::"jsonb",
    "psa" "text",
    "tip_services" "text"[],
    "payment_qr_code" "text",
    "budget_breakdown" "jsonb",
    "slug" "text",
    "budget_mode" "text",
    "itinerary_type" "text",
    "stops" "jsonb",
    "visibility" "text",
    "travel_styles" "text"[] DEFAULT ARRAY[]::"text"[],
    "currency_settings" "jsonb" DEFAULT "jsonb_build_object"('travel_currencies', ARRAY[]::"text"[]) NOT NULL,
    "trip_settings" "jsonb" DEFAULT '{"permissions": {"can_add_expenses": "everyone", "can_edit_trip_details": "organizer"}, "notifications": {"chat_activity": false, "expense_updates": true, "new_members_join": true}}'::"jsonb",
    CONSTRAINT "trips_difficulty_level_check" CHECK (("difficulty_level" = ANY (ARRAY['easy'::"text", 'moderate'::"text", 'challenging'::"text", 'difficult'::"text"])))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trips"."psa" IS 'Public Service Announcement - important information or updates for trip participants';



COMMENT ON COLUMN "public"."trips"."tip_services" IS 'Services for which the trip organizer accepts tips (e.g., organizing meals, handling bookings)';



COMMENT ON COLUMN "public"."trips"."payment_qr_code" IS 'Base64 encoded QR code image for payment/tips';



COMMENT ON COLUMN "public"."trips"."budget_breakdown" IS 'JSON object containing budget breakdown with categories, amounts, and descriptions';



COMMENT ON COLUMN "public"."trips"."currency_settings" IS 'JSON settings: {"travel_currencies": ["USD", ...], "home_currency": "MYR" (optional)}';



CREATE OR REPLACE VIEW "public"."conversation_details" AS
 SELECT "c"."id",
    "c"."conversation_type",
    "c"."created_at",
    "c"."updated_at",
    "c"."metadata",
    "c"."user1_id",
    "c"."user2_id",
    "p1"."username" AS "user1_username",
    "p1"."full_name" AS "user1_name",
    "p1"."avatar_url" AS "user1_avatar",
    "p2"."username" AS "user2_username",
    "p2"."full_name" AS "user2_name",
    "p2"."avatar_url" AS "user2_avatar",
    "c"."trip_id",
    "c"."is_group",
    "c"."name",
    "c"."created_by",
    "t"."title" AS "trip_title",
    "t"."type" AS "trip_type",
    "t"."status" AS "trip_status",
    "creator"."username" AS "creator_username",
    "creator"."full_name" AS "creator_name"
   FROM (((("public"."conversations" "c"
     LEFT JOIN "public"."profiles" "p1" ON (("c"."user1_id" = "p1"."id")))
     LEFT JOIN "public"."profiles" "p2" ON (("c"."user2_id" = "p2"."id")))
     LEFT JOIN "public"."trips" "t" ON (("c"."trip_id" = "t"."id")))
     LEFT JOIN "public"."profiles" "creator" ON (("c"."created_by" = "creator"."id")));


ALTER VIEW "public"."conversation_details" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversation_details"() RETURNS SETOF "public"."conversation_details"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT * FROM public.conversation_details; -- Ensure inner sources are RLS-safe or add checks
$$;


ALTER FUNCTION "public"."get_conversation_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversation_members"("p_conversation_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "full_name" "text", "avatar_url" "text", "role" "text", "is_admin" boolean, "joined_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cpd.user_id,
    cpd.username,
    cpd.full_name,
    cpd.avatar_url,
    cpd.role,
    cpd.is_admin,
    cpd.joined_at
  FROM conversation_participants_detailed cpd
  WHERE cpd.conversation_id = p_conversation_id
  ORDER BY 
    CASE cpd.role 
      WHEN 'organizer' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'member' THEN 3
      ELSE 4
    END,
    cpd.full_name;
END;
$$;


ALTER FUNCTION "public"."get_conversation_members"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversation_messages"("conversation_id_param" "uuid", "limit_param" integer DEFAULT 50, "before_timestamp" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("id" "uuid", "conversation_id" "uuid", "sender_id" "uuid", "sender_name" "text", "sender_avatar" "text", "content" "text", "attachments" "jsonb", "is_edited" boolean, "edited_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        p.full_name AS sender_name,
        p.avatar_url AS sender_avatar,
        m.content,
        m.attachments,
        m.is_edited,
        m.edited_at,
        m.created_at
    FROM public.messages m
    JOIN public.profiles p ON m.sender_id = p.id
    WHERE m.conversation_id = conversation_id_param
        AND (before_timestamp IS NULL OR m.created_at < before_timestamp)
    ORDER BY m.created_at DESC
    LIMIT limit_param;
END;
$$;


ALTER FUNCTION "public"."get_conversation_messages"("conversation_id_param" "uuid", "limit_param" integer, "before_timestamp" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversations_with_unread"("p_user_id" "uuid") RETURNS TABLE("conversation_id" "uuid", "trip_id" "uuid", "is_group" boolean, "conversation_updated_at" timestamp with time zone, "last_read_at" timestamp with time zone, "unread_count" bigint, "last_message_id" "uuid", "last_message_content" "text", "last_message_created_at" timestamp with time zone, "last_message_sender_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  WITH unread_counts AS (
    SELECT * FROM get_unread_counts(p_user_id)
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.id as message_id,
      m.content,
      m.created_at,
      m.sender_id
    FROM messages m
    INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = p_user_id
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT 
    c.id as conversation_id,
    c.trip_id,
    c.is_group,
    c.updated_at as conversation_updated_at,
    cp.last_read_at,
    COALESCE(uc.unread_count, 0) as unread_count,
    lm.message_id as last_message_id,
    lm.content as last_message_content,
    lm.created_at as last_message_created_at,
    lm.sender_id as last_message_sender_id
  FROM conversations c
  INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
  LEFT JOIN unread_counts uc ON uc.conversation_id = c.id
  LEFT JOIN last_messages lm ON lm.conversation_id = c.id
  WHERE cp.user_id = p_user_id
  ORDER BY COALESCE(lm.created_at, c.updated_at) DESC;
END;
$$;


ALTER FUNCTION "public"."get_conversations_with_unread"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_conversations_with_unread"("p_user_id" "uuid") IS 'Get all conversations with unread counts and last message details';



CREATE OR REPLACE FUNCTION "public"."get_join_request_with_emails"("request_id" "uuid") RETURNS TABLE("trip_id" "uuid", "user_id" "uuid", "creator_id" "uuid", "user_email" "text", "creator_email" "text", "user_full_name" "text", "creator_full_name" "text", "user_bio" "text", "user_username" "text", "trip_title" "text", "trip_destination" "text", "trip_start_date" "date", "trip_end_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jr.trip_id,
    jr.user_id,
    t.creator_id,
    au_user.email::TEXT as user_email,
    au_creator.email::TEXT as creator_email,
    p_user.full_name as user_full_name,
    p_creator.full_name as creator_full_name,
    p_user.bio as user_bio,
    p_user.username as user_username,
    t.title as trip_title,
    t.destination as trip_destination,
    t.start_date as trip_start_date,
    t.end_date as trip_end_date
  FROM join_requests jr
  JOIN trips t ON jr.trip_id = t.id
  JOIN auth.users au_user ON jr.user_id = au_user.id
  JOIN auth.users au_creator ON t.creator_id = au_creator.id
  LEFT JOIN profiles p_user ON jr.user_id = p_user.id
  LEFT JOIN profiles p_creator ON t.creator_id = p_creator.id
  WHERE jr.id = request_id;
END;
$$;


ALTER FUNCTION "public"."get_join_request_with_emails"("request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_join_request_with_emails"("request_id" "uuid") IS 'Retrieves join request details including email addresses and user bio from auth.users and profiles tables';



CREATE OR REPLACE FUNCTION "public"."get_notification_counts"("_user_id" "uuid") RETURNS TABLE("type" "text", "cnt" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  -- Replace this SELECT with the exact logic from your original view,
  -- but parameterize it to use _user_id (e.g., WHERE user_id = _user_id)
  SELECT n.type, COUNT(*)::bigint
  FROM public.notifications n
  WHERE n.user_id = _user_id
  GROUP BY n.type
$$;


ALTER FUNCTION "public"."get_notification_counts"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_conversation"("user1_uuid" "uuid", "user2_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  conversation_uuid uuid;
  normalized_user1 uuid;
  normalized_user2 uuid;
BEGIN
  -- Normalize user order (smaller UUID first)
  IF user1_uuid < user2_uuid THEN
    normalized_user1 := user1_uuid;
    normalized_user2 := user2_uuid;
  ELSE
    normalized_user1 := user2_uuid;
    normalized_user2 := user1_uuid;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO conversation_uuid
  FROM public.conversations
  WHERE user1_id = normalized_user1 AND user2_id = normalized_user2;
  
  -- Create new conversation if it doesn't exist
  IF conversation_uuid IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (normalized_user1, normalized_user2)
    RETURNING id INTO conversation_uuid;
  END IF;
  
  RETURN conversation_uuid;
END;
$$;


ALTER FUNCTION "public"."get_or_create_conversation"("user1_uuid" "uuid", "user2_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_unread_count"("p_user_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0)
  INTO total_count
  FROM get_unread_counts(p_user_id);
  
  RETURN total_count;
END;
$$;


ALTER FUNCTION "public"."get_total_unread_count"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_total_unread_count"("p_user_id" "uuid") IS 'Get total unread message count across all conversations for a user';



CREATE OR REPLACE FUNCTION "public"."get_trip_analytics"("p_trip_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("date" "date", "views" integer, "unique_visitors" integer, "join_requests" integer, "conversions" integer, "shares" integer, "saves" integer, "conversion_rate" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.date,
    ta.views,
    ta.unique_visitors,
    ta.join_requests,
    ta.conversions,
    ta.shares,
    ta.saves,
    CASE 
      WHEN ta.views > 0 
      THEN ROUND((ta.conversions::decimal / ta.views * 100), 2)
      ELSE 0 
    END as conversion_rate
  FROM public.trip_analytics ta
  WHERE ta.trip_id = p_trip_id
  AND ta.date BETWEEN p_start_date AND p_end_date
  ORDER BY ta.date;
END;
$$;


ALTER FUNCTION "public"."get_trip_analytics"("p_trip_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_average_rating"("p_trip_id" "uuid") RETURNS TABLE("average_rating" numeric, "total_reviews" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating), 2) as average_rating,
    COUNT(*)::INTEGER as total_reviews
  FROM trip_feedback
  WHERE trip_id = p_trip_id;
END;
$$;


ALTER FUNCTION "public"."get_trip_average_rating"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_member_stats"("p_trip_id" "uuid") RETURNS TABLE("total_members" bigint, "active_members" bigint, "left_members" bigint, "has_unsettled_balances" boolean)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE left_at IS NULL) as active_members,
    COUNT(*) FILTER (WHERE left_at IS NOT NULL) as left_members,
    EXISTS (
      SELECT 1 
      FROM trip_financial_summary 
      WHERE trip_id = p_trip_id 
        AND balance != 0
        AND user_left_at IS NOT NULL
    ) as has_unsettled_balances
  FROM trip_members
  WHERE trip_id = p_trip_id;
END;
$$;


ALTER FUNCTION "public"."get_trip_member_stats"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_payment_methods"("p_trip_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "user_name" "text", "user_avatar" "text", "name" "text", "description" "text", "qr_code_url" "text", "is_default" boolean, "is_active" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tpm.id,
    tpm.user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    tpm.name,
    tpm.description,
    tpm.qr_code_url,
    tpm.is_default,
    tpm.is_active
  FROM trip_payment_methods tpm
  JOIN profiles p ON p.id = tpm.user_id
  WHERE tpm.trip_id = p_trip_id
    AND tpm.is_active = true
    AND (tpm.user_id = p_user_id OR p_user_id IS NULL)
  ORDER BY tpm.is_default DESC, tpm.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_trip_payment_methods"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_trip_payment_methods"("p_trip_id" "uuid", "p_user_id" "uuid") IS 'Returns payment methods (QR codes) for trip members to facilitate payments';



CREATE OR REPLACE FUNCTION "public"."get_trip_pending_requests_count"("p_trip_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM join_requests
    WHERE trip_id = p_trip_id
    AND status = 'pending'
  );
END;
$$;


ALTER FUNCTION "public"."get_trip_pending_requests_count"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trip_with_creator_email"("p_trip_id" "uuid") RETURNS TABLE("trip_id" "uuid", "creator_id" "uuid", "creator_email" "text", "creator_full_name" "text", "trip_title" "text", "trip_destination" "text", "trip_start_date" "date", "trip_end_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trip_id,
    t.creator_id,
    au.email::TEXT as creator_email,
    p.full_name as creator_full_name,
    t.title as trip_title,
    t.destination as trip_destination,
    t.start_date as trip_start_date,
    t.end_date as trip_end_date
  FROM trips t
  JOIN auth.users au ON t.creator_id = au.id
  LEFT JOIN profiles p ON t.creator_id = p.id
  WHERE t.id = p_trip_id;
END;
$$;


ALTER FUNCTION "public"."get_trip_with_creator_email"("p_trip_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_trip_with_creator_email"("p_trip_id" "uuid") IS 'Securely retrieves trip details with creator email for sending join request notifications';



CREATE OR REPLACE FUNCTION "public"."get_unread_counts"("p_user_id" "uuid") RETURNS TABLE("conversation_id" "uuid", "unread_count" bigint, "last_message_time" timestamp with time zone, "last_read_time" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.conversation_id,
    COUNT(m.id)::BIGINT as unread_count,
    MAX(m.created_at) as last_message_time,
    cp.last_read_at as last_read_time
  FROM conversation_participants cp
  LEFT JOIN messages m ON m.conversation_id = cp.conversation_id
    AND m.sender_id != p_user_id  -- Exclude user's own messages
    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)  -- Only messages after last read
  WHERE cp.user_id = p_user_id
  GROUP BY cp.conversation_id, cp.last_read_at;
END;
$$;


ALTER FUNCTION "public"."get_unread_counts"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_unread_counts"("p_user_id" "uuid") IS 'Get unread message counts for all conversations of a user';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND read = false;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_conversations"("user_uuid" "uuid") RETURNS TABLE("conversation_id" "uuid", "other_user_id" "uuid", "other_user_name" "text", "other_user_username" "text", "other_user_avatar" "text", "last_message" "text", "last_message_time" timestamp with time zone, "last_message_sender_id" "uuid", "unread_count" bigint, "other_user_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  WITH conversation_data AS (
    SELECT 
      c.id as conv_id,
      CASE 
        WHEN c.user1_id = user_uuid THEN c.user2_id 
        ELSE c.user1_id 
      END as other_user,
      c.updated_at as conv_updated_at
    FROM public.conversations c
    WHERE c.user1_id = user_uuid OR c.user2_id = user_uuid
  ),
  last_messages AS (
    SELECT DISTINCT ON (dm.conversation_id)
      dm.conversation_id,
      dm.content as last_msg,
      dm.created_at as last_msg_time,
      dm.sender_id as last_msg_sender
    FROM public.direct_messages dm
    INNER JOIN conversation_data cd ON dm.conversation_id = cd.conv_id
    ORDER BY dm.conversation_id, dm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      dm.conversation_id,
      COUNT(*) as unread_count
    FROM public.direct_messages dm
    INNER JOIN conversation_data cd ON dm.conversation_id = cd.conv_id
    LEFT JOIN public.message_read_status mrs ON dm.id = mrs.message_id AND mrs.user_id = user_uuid
    WHERE dm.sender_id != user_uuid AND mrs.id IS NULL
    GROUP BY dm.conversation_id
  )
  SELECT 
    cd.conv_id,
    cd.other_user,
    p.full_name,
    p.username,
    p.avatar_url,
    COALESCE(lm.last_msg, '') as last_message,
    COALESCE(lm.last_msg_time, cd.conv_updated_at) as last_message_time,
    lm.last_msg_sender,
    COALESCE(uc.unread_count, 0) as unread_count,
    p.updated_at
  FROM conversation_data cd
  LEFT JOIN public.profiles p ON cd.other_user = p.id
  LEFT JOIN last_messages lm ON cd.conv_id = lm.conversation_id
  LEFT JOIN unread_counts uc ON cd.conv_id = uc.conversation_id
  ORDER BY COALESCE(lm.last_msg_time, cd.conv_updated_at) DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_conversations"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_email"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;
  
  RETURN v_email;
END;
$$;


ALTER FUNCTION "public"."get_user_email"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_email"("p_user_id" "uuid") IS 'Securely retrieves a user email address by user_id from auth.users table';



CREATE OR REPLACE FUNCTION "public"."get_user_engagement_metrics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("date" "date", "login_count" integer, "trips_viewed" integer, "messages_sent" integer, "trips_created" integer, "trips_joined" integer, "total_session_duration" integer, "engagement_score" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ue.date,
    ue.login_count,
    ue.trips_viewed,
    ue.messages_sent,
    ue.trips_created,
    ue.trips_joined,
    ue.total_session_duration,
    -- Calculate engagement score
    (
      ue.login_count * 10 +
      ue.trips_viewed * 5 +
      ue.messages_sent * 3 +
      ue.trips_created * 50 +
      ue.trips_joined * 30 +
      (ue.total_session_duration / 60) -- minutes
    ) as engagement_score
  FROM public.user_engagement ue
  WHERE ue.user_id = p_user_id
  AND ue.date BETWEEN p_start_date AND p_end_date
  ORDER BY ue.date;
END;
$$;


ALTER FUNCTION "public"."get_user_engagement_metrics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile_with_bio"("p_user_id" "uuid") RETURNS TABLE("user_email" "text", "full_name" "text", "username" "text", "bio" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Log for debugging (can be removed in production)
  RAISE NOTICE 'get_user_profile_with_bio called with user_id: %', p_user_id;
  
  RETURN QUERY
  SELECT 
    au.email::TEXT as user_email,
    COALESCE(p.full_name, '')::TEXT as full_name,
    COALESCE(p.username, '')::TEXT as username,
    COALESCE(p.bio, '')::TEXT as bio  -- Ensure bio returns empty string instead of NULL
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE au.id = p_user_id
  LIMIT 1;  -- Ensure single row
  
  -- If no rows found, return a row with empty values
  IF NOT FOUND THEN
    RAISE NOTICE 'No user found with id: %', p_user_id;
    RETURN QUERY
    SELECT 
      ''::TEXT as user_email,
      ''::TEXT as full_name,
      ''::TEXT as username,
      ''::TEXT as bio;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_profile_with_bio"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_profile_with_bio"("p_user_id" "uuid") IS 'Retrieves user profile including bio, returns empty strings for NULL values';



CREATE OR REPLACE FUNCTION "public"."get_user_tip_stats"("p_user_id" "uuid") RETURNS TABLE("total_tips_received" integer, "total_tips_given" integer, "total_amount_received" numeric, "total_amount_given" numeric, "average_tip_received" numeric, "average_tip_given" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT CASE WHEN to_user_id = p_user_id THEN id END)::integer as total_tips_received,
    COUNT(DISTINCT CASE WHEN from_user_id = p_user_id THEN id END)::integer as total_tips_given,
    COALESCE(SUM(CASE WHEN to_user_id = p_user_id AND payment_status = 'completed' THEN amount END), 0) as total_amount_received,
    COALESCE(SUM(CASE WHEN from_user_id = p_user_id AND payment_status = 'completed' THEN amount END), 0) as total_amount_given,
    AVG(CASE WHEN to_user_id = p_user_id AND payment_status = 'completed' THEN amount END) as average_tip_received,
    AVG(CASE WHEN from_user_id = p_user_id AND payment_status = 'completed' THEN amount END) as average_tip_given
  FROM public.tips
  WHERE to_user_id = p_user_id OR from_user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_tip_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_with_emails"("user_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "full_name" "text", "email" "text", "username" "text", "avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    au.email::TEXT as email,
    p.username,
    p.avatar_url
  FROM profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.id = ANY(user_ids);
END;
$$;


ALTER FUNCTION "public"."get_users_with_emails"("user_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_users_with_emails"("user_ids" "uuid"[]) IS 'Securely retrieves multiple user profiles with email addresses for expense notifications';



CREATE OR REPLACE FUNCTION "public"."get_who_owes_who"("p_trip_id" "uuid") RETURNS TABLE("debtor_id" "uuid", "debtor_name" "text", "debtor_avatar" "text", "creditor_id" "uuid", "creditor_name" "text", "creditor_avatar" "text", "amount" numeric)
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH te AS (
  SELECT id
  FROM public.trip_expenses
  WHERE trip_id = p_trip_id
    AND is_deleted = false
),
payers AS (
  SELECT ep.expense_id,
         ep.user_id AS payer_id,
         COALESCE(ep.amount_paid, 0) AS amount_paid
  FROM public.expense_payments ep
  JOIN te ON te.id = ep.expense_id
),
expense_pay_totals AS (
  SELECT expense_id,
         COALESCE(SUM(amount_paid), 0) AS total_paid
  FROM payers
  GROUP BY expense_id
),
participant_shares AS (
  SELECT epart.expense_id,
         epart.user_id AS debtor_id,
         COALESCE(epart.amount_owed, 0) AS amount_owed
  FROM public.expense_participants epart
  JOIN te ON te.id = epart.expense_id
  WHERE epart.is_paid = false
),
owed_edges AS (
  SELECT ps.debtor_id,
         p.payer_id AS creditor_id,
         SUM(
           CASE WHEN ept.total_paid IS NULL OR ept.total_paid = 0
                THEN ps.amount_owed
                ELSE ps.amount_owed * (p.amount_paid / ept.total_paid)
           END
         ) AS amount
  FROM participant_shares ps
  JOIN payers p ON p.expense_id = ps.expense_id
  LEFT JOIN expense_pay_totals ept ON ept.expense_id = p.expense_id
  GROUP BY ps.debtor_id, p.payer_id
),
pairwise_net AS (
  SELECT
    COALESCE(a.debtor_id,   b.creditor_id) AS debtor_id,
    COALESCE(a.creditor_id, b.debtor_id)   AS creditor_id,
    COALESCE(a.amount, 0) - COALESCE(b.amount, 0) AS net_amount
  FROM owed_edges a
  FULL OUTER JOIN owed_edges b
    ON  a.debtor_id   = b.creditor_id
    AND a.creditor_id = b.debtor_id
),
positive_pairs AS (
  SELECT debtor_id, creditor_id, net_amount AS amount
  FROM pairwise_net
  WHERE net_amount > 0
)
SELECT
  pp.debtor_id,
  d.full_name  AS debtor_name,
  d.avatar_url AS debtor_avatar,
  pp.creditor_id,
  c.full_name  AS creditor_name,
  c.avatar_url AS creditor_avatar,
  pp.amount
FROM positive_pairs pp
JOIN public.profiles d ON d.id = pp.debtor_id
JOIN public.profiles c ON c.id = pp.creditor_id
ORDER BY pp.amount DESC;
$$;


ALTER FUNCTION "public"."get_who_owes_who"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guided_book_departure"("p_departure_id" "uuid", "p_requested_pax" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_departure public.guided_trip_departure_dates%ROWTYPE;
BEGIN
  IF p_requested_pax IS NULL OR p_requested_pax <= 0 THEN
    RAISE EXCEPTION 'Requested pax must be greater than 0';
  END IF;

  SELECT * INTO v_departure
  FROM public.guided_trip_departure_dates
  WHERE id = p_departure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;

  IF NOT v_departure.is_available THEN
    RAISE EXCEPTION 'Departure is no longer available';
  END IF;

  IF (v_departure.booked_pax + p_requested_pax) > v_departure.max_capacity THEN
    RAISE EXCEPTION 'Insufficient capacity';
  END IF;

  UPDATE public.guided_trip_departure_dates
  SET booked_pax = booked_pax + p_requested_pax,
      is_available = CASE
        WHEN (booked_pax + p_requested_pax) >= max_capacity THEN false
        ELSE is_available
      END,
      updated_at = now()
  WHERE id = p_departure_id
  RETURNING * INTO v_departure;

  RETURN jsonb_build_object(
    'departure_id', v_departure.id,
    'booked_pax', v_departure.booked_pax,
    'max_capacity', v_departure.max_capacity,
    'is_available', v_departure.is_available
  );
END;
$$;


ALTER FUNCTION "public"."guided_book_departure"("p_departure_id" "uuid", "p_requested_pax" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guided_cancel_departure_booking"("p_departure_id" "uuid", "p_pax_to_cancel" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_departure public.guided_trip_departure_dates%ROWTYPE;
BEGIN
  IF p_pax_to_cancel IS NULL OR p_pax_to_cancel <= 0 THEN
    RAISE EXCEPTION 'Pax to cancel must be greater than 0';
  END IF;

  SELECT * INTO v_departure
  FROM public.guided_trip_departure_dates
  WHERE id = p_departure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;

  UPDATE public.guided_trip_departure_dates
  SET booked_pax = GREATEST(booked_pax - p_pax_to_cancel, 0),
      is_available = true,
      updated_at = now()
  WHERE id = p_departure_id
  RETURNING * INTO v_departure;

  RETURN jsonb_build_object(
    'departure_id', v_departure.id,
    'booked_pax', v_departure.booked_pax,
    'max_capacity', v_departure.max_capacity,
    'is_available', v_departure.is_available
  );
END;
$$;


ALTER FUNCTION "public"."guided_cancel_departure_booking"("p_departure_id" "uuid", "p_pax_to_cancel" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guided_generate_booking_reference"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_year text;
  v_sequence text;
  v_reference text;
BEGIN
  v_year := to_char(now(), 'YYYY');

  LOOP
    v_sequence := lpad(floor(random() * 1000000)::text, 6, '0');
    v_reference := 'GDT-' || v_year || '-' || v_sequence;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.guided_bookings b WHERE b.booking_reference = v_reference
    );
  END LOOP;

  RETURN v_reference;
END;
$$;


ALTER FUNCTION "public"."guided_generate_booking_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  parsed_role user_role;
BEGIN
  parsed_role := CASE
    WHEN NULLIF(new.raw_user_meta_data->>'role', '') IN ('traveler', 'agent')
      THEN (new.raw_user_meta_data->>'role')::user_role
    ELSE 'traveler'::user_role
  END;

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    email_notifications,
    push_notifications,
    is_public,
    is_verified,
    is_admin,
    onboarding_completed
  )
  VALUES (
    new.id,
    parsed_role,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    true,
    true,
    true,
    false,
    false,
    false
  );

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_leaving_trip"("p_trip_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_conversation_id UUID;
  v_has_unsettled_balance BOOLEAN;
  v_balance_amount NUMERIC;
BEGIN
  -- Check for unsettled balances
  SELECT
    COALESCE(SUM(ep.amount_owed), 0) - COALESCE(SUM(epay.amount_paid), 0)
  INTO v_balance_amount
  FROM trip_expenses te
  LEFT JOIN expense_participants ep ON ep.expense_id = te.id AND ep.user_id = p_user_id
  LEFT JOIN expense_payments epay ON epay.expense_id = te.id AND epay.user_id = p_user_id
  WHERE te.trip_id = p_trip_id AND te.is_deleted = false;

  v_has_unsettled_balance := (v_balance_amount != 0);

  IF v_has_unsettled_balance THEN
    RAISE WARNING 'User % leaving trip % with unsettled balance: %',
      p_user_id, p_trip_id, v_balance_amount;
  END IF;

  -- Get conversation ID
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE trip_id = p_trip_id;

  -- === REMOVE ACCESS PERMISSIONS (But Preserve History) ===

  -- 1. Remove from conversation participants (removes chat access)
  IF v_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_participants
    WHERE conversation_id = v_conversation_id AND user_id = p_user_id;
  END IF;

  -- 2. Remove saved trip preference
  DELETE FROM saved_trips
  WHERE trip_id = p_trip_id AND user_id = p_user_id;

  -- 3. Clear message read status (they can't see messages anymore)
  DELETE FROM message_read_status
  WHERE user_id = p_user_id
    AND message_id IN (
      SELECT id FROM group_messages WHERE trip_id = p_trip_id
    );

  -- 4. Clear unread counts (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'unread_message_counts'
    AND table_type = 'BASE TABLE'
  ) THEN
    DELETE FROM unread_message_counts
    WHERE trip_id = p_trip_id AND user_id = p_user_id;
  END IF;

  -- === PRESERVE THESE FOR HISTORY & FINANCIAL INTEGRITY ===
  -- ✅ expense_participants (who was part of splits)
  -- ✅ expense_payments (who paid what)
  -- ✅ balance_settlements (settlement history)
  -- ✅ messages sent (conversation history)
  -- ✅ trip_photos uploaded (trip memories)
  -- ✅ trip_feedback (reviews)

  -- === UPDATE STATUS TRACKING ===

  -- Update join_requests to 'left' status
  UPDATE join_requests
  SET status = 'left'::join_request_status,
      updated_at = NOW()
  WHERE trip_id = p_trip_id
    AND user_id = p_user_id
    AND status = 'approved'::join_request_status;

  RAISE NOTICE 'User % left trip % - Access removed, history preserved', p_user_id, p_trip_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error handling user % leaving trip %: %', p_user_id, p_trip_id, SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."handle_user_leaving_trip"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_user_leaving_trip"("p_trip_id" "uuid", "p_user_id" "uuid") IS 'Removes user access while preserving financial and conversation history';



CREATE OR REPLACE FUNCTION "public"."increment"("table_name" "text", "row_id" "uuid", "column_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    table_name,
    column_name,
    column_name
  ) USING row_id;
END;
$_$;


ALTER FUNCTION "public"."increment"("table_name" "text", "row_id" "uuid", "column_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_trip_analytics"("p_trip_id" "uuid", "p_metric" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.trip_analytics (trip_id, date, views, join_requests, conversions, shares, saves)
  VALUES (p_trip_id, CURRENT_DATE, 
    CASE WHEN p_metric = 'views' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'join_requests' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'conversions' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'shares' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'saves' THEN 1 ELSE 0 END
  )
  ON CONFLICT (trip_id, date) DO UPDATE
  SET 
    views = trip_analytics.views + CASE WHEN p_metric = 'views' THEN 1 ELSE 0 END,
    join_requests = trip_analytics.join_requests + CASE WHEN p_metric = 'join_requests' THEN 1 ELSE 0 END,
    conversions = trip_analytics.conversions + CASE WHEN p_metric = 'conversions' THEN 1 ELSE 0 END,
    shares = trip_analytics.shares + CASE WHEN p_metric = 'shares' THEN 1 ELSE 0 END,
    saves = trip_analytics.saves + CASE WHEN p_metric = 'saves' THEN 1 ELSE 0 END,
    updated_at = now();
  
  -- Also track unique visitors for views
  IF p_metric = 'views' AND auth.uid() IS NOT NULL THEN
    UPDATE public.trip_analytics
    SET unique_visitors = unique_visitors + 1
    WHERE trip_id = p_trip_id 
    AND date = CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.analytics_events
      WHERE user_id = auth.uid()
      AND event_name = 'trip_view'
      AND (event_data->>'trip_id')::uuid = p_trip_id
      AND DATE(created_at) = CURRENT_DATE
      AND created_at < now() - INTERVAL '1 minute'
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_trip_analytics"("p_trip_id" "uuid", "p_metric" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_blocked"("user1_id" "uuid", "user2_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
       OR (blocker_id = user2_id AND blocked_id = user1_id)
  );
END;
$$;


ALTER FUNCTION "public"."is_blocked"("user1_id" "uuid", "user2_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_conversation_participant"("p_user_id" "uuid", "p_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."is_conversation_participant"("p_user_id" "uuid", "p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_following"("follower_id" "uuid", "following_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE user_follows.follower_id = is_following.follower_id
    AND user_follows.following_id = is_following.following_id
  );
END;
$$;


ALTER FUNCTION "public"."is_following"("follower_id" "uuid", "following_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_blocked"("p_blocker_id" "uuid", "p_blocked_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE user_id = p_blocker_id 
    AND blocked_user_id = p_blocked_id
  );
END;
$$;


ALTER FUNCTION "public"."is_user_blocked"("p_blocker_id" "uuid", "p_blocked_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_trip"("p_trip_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_member_role TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get member role
  SELECT role INTO v_member_role
  FROM trip_members
  WHERE trip_id = p_trip_id 
    AND user_id = v_user_id 
    AND left_at IS NULL;
  
  IF v_member_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this trip';
  END IF;
  
  IF v_member_role = 'organizer' THEN
    RAISE EXCEPTION 'Trip organizers cannot leave their own trip. Please cancel the trip instead.';
  END IF;
  
  -- Soft delete: mark as left
  UPDATE trip_members
  SET left_at = NOW()
  WHERE trip_id = p_trip_id
    AND user_id = v_user_id
    AND left_at IS NULL;
  
  -- The trigger will handle the cleanup automatically
END;
$$;


ALTER FUNCTION "public"."leave_trip"("p_trip_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."leave_trip"("p_trip_id" "uuid") IS 'Allows a member to leave a trip (soft delete with data preservation)';



CREATE OR REPLACE FUNCTION "public"."leave_trip_member"("p_force_cancel" boolean DEFAULT false, "p_trip_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("did_leave" boolean, "did_cancel_trip" boolean, "trip_already_cancelled" boolean, "organizers_before_leave" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_status text;
  v_is_admin boolean := false;
  v_organizer_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF p_trip_id IS NULL THEN
    RAISE EXCEPTION 'Trip id is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT t.status::text
  INTO v_trip_status
  FROM public.trips t
  WHERE t.id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.trip_members tm
  WHERE tm.trip_id = p_trip_id
    AND tm.left_at IS NULL
  FOR UPDATE;

  SELECT tm.is_admin
  INTO v_is_admin
  FROM public.trip_members tm
  WHERE tm.trip_id = p_trip_id
    AND tm.user_id = v_user_id
    AND tm.left_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not an active member of this trip'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_organizer_count
  FROM public.trip_members tm
  WHERE tm.trip_id = p_trip_id
    AND tm.is_admin = true
    AND tm.left_at IS NULL;

  UPDATE public.trip_members
  SET left_at = now()
  WHERE trip_id = p_trip_id
    AND user_id = v_user_id
    AND left_at IS NULL;

  did_leave := FOUND;
  did_cancel_trip := false;
  trip_already_cancelled := (v_trip_status = 'cancelled');
  organizers_before_leave := v_organizer_count;

  IF did_leave AND v_is_admin AND v_organizer_count = 1 THEN
    IF v_trip_status <> 'cancelled' THEN
      UPDATE public.trips
      SET status = 'cancelled'
      WHERE id = p_trip_id;

      did_cancel_trip := true;
    END IF;

    -- Remove trip group chat when last organizer leaves/cancels.
    DELETE FROM public.conversations
    WHERE trip_id = p_trip_id
      AND conversation_type = 'trip_group';
  END IF;

  PERFORM p_force_cancel;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."leave_trip_member"("p_force_cancel" boolean, "p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("p_trip_id" "uuid", "p_action_type" "text", "p_action_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO admin_actions (trip_id, admin_id, action_type, action_data)
  VALUES (p_trip_id, auth.uid(), p_action_type, p_action_data);
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("p_trip_id" "uuid", "p_action_type" "text", "p_action_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = auth.uid()
    AND read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("success" boolean, "read_timestamp" timestamp with time zone, "previous_unread_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_timestamp TIMESTAMPTZ;
  v_previous_count BIGINT;
  v_latest_message_time TIMESTAMPTZ;
BEGIN
  -- Get the latest message timestamp
  SELECT MAX(created_at)
  INTO v_latest_message_time
  FROM messages
  WHERE conversation_id = p_conversation_id;
  
  -- Set timestamp to be after the latest message
  v_timestamp := GREATEST(
    NOW(),
    COALESCE(v_latest_message_time + INTERVAL '1 millisecond', NOW())
  );
  
  -- Get previous unread count before updating
  SELECT COUNT(*)
  INTO v_previous_count
  FROM messages m
  INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz);
  
  -- Update last_read_at
  UPDATE conversation_participants
  SET last_read_at = v_timestamp
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
  
  -- Return result
  RETURN QUERY
  SELECT 
    FOUND AS success,
    v_timestamp AS timestamp,
    v_previous_count AS previous_unread_count;
END;
$$;


ALTER FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") IS 'Mark a conversation as read and return previous unread count';



CREATE OR REPLACE FUNCTION "public"."mark_expense_as_paid_with_settlement"("p_expense_id" "uuid", "p_participant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_trip_id uuid;
  v_payer_id uuid;
  v_amount decimal;
  v_currency varchar;
  v_expense_description text;
  v_is_already_paid boolean;
BEGIN
  -- Check if already paid
  SELECT ep.is_paid
  INTO v_is_already_paid
  FROM public.expense_participants ep
  WHERE ep.expense_id = p_expense_id
    AND ep.user_id = p_participant_id;

  IF v_is_already_paid = true THEN
    RETURN;
  END IF;

  -- Get expense details and the payer
  SELECT
    te.trip_id,
    te.description,
    ep.amount_owed,
    COALESCE(te.currency, 'USD'),
    epay.user_id
  INTO
    v_trip_id,
    v_expense_description,
    v_amount,
    v_currency,
    v_payer_id
  FROM public.trip_expenses te
  JOIN public.expense_participants ep
    ON ep.expense_id = te.id
  JOIN public.expense_payments epay
    ON epay.expense_id = te.id
  WHERE te.id = p_expense_id
    AND ep.user_id = p_participant_id
  LIMIT 1;

  -- If participant is also the payer, just mark as paid
  IF v_payer_id = p_participant_id THEN
    UPDATE public.expense_participants
    SET is_paid = true,
        paid_at = now()
    WHERE expense_id = p_expense_id
      AND user_id = p_participant_id;
    RETURN;
  END IF;

  -- Mark participant as paid
  UPDATE public.expense_participants
  SET is_paid = true,
      paid_at = now()
  WHERE expense_id = p_expense_id
    AND user_id = p_participant_id;

  -- Create settlement record
  INSERT INTO public.balance_settlements (
    trip_id,
    payer_id,
    payee_id,
    amount,
    currency,
    description,
    created_by
  ) VALUES (
    v_trip_id,
    p_participant_id,
    v_payer_id,
    v_amount,
    v_currency,
    COALESCE('Payment for: ' || v_expense_description, 'Expense payment'),
    auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."mark_expense_as_paid_with_settlement"("p_expense_id" "uuid", "p_participant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_expense_as_paid_with_settlement"("p_expense_id" "uuid", "p_participant_id" "uuid") IS 'Marks an expense participant as paid and creates a settlement record for audit trail.
This ensures consistency between individual expense payments and bulk settlements.
If the participant is also the payer (self-payment), no settlement record is created.';



CREATE OR REPLACE FUNCTION "public"."mark_messages_as_read"("conversation_uuid" "uuid", "user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Insert read status for all unread messages in the conversation
  INSERT INTO public.message_read_status (message_id, user_id)
  SELECT dm.id, user_uuid
  FROM public.direct_messages dm
  LEFT JOIN public.message_read_status mrs ON dm.id = mrs.message_id AND mrs.user_id = user_uuid
  WHERE dm.conversation_id = conversation_uuid 
    AND dm.sender_id != user_uuid 
    AND mrs.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."mark_messages_as_read"("conversation_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_community_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_owner_id uuid;
  v_title text;
  v_slug text;
  v_actor_name text;
  v_notification_type text;
  v_notification_title text;
  v_action_url text;
  v_metadata jsonb;
BEGIN
  IF NEW.reaction_type <> 'like' THEN
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'story' THEN
    SELECT s.author_id, s.title, s.slug
    INTO v_owner_id, v_title, v_slug
    FROM public.stories s
    WHERE s.id = NEW.content_id;

    v_notification_type := 'story_like';
    v_notification_title := 'Someone liked your story';
    v_action_url := '/community/stories/' || v_slug;
    v_metadata := jsonb_build_object(
      'story_id', NEW.content_id,
      'story_slug', v_slug
    );
  ELSIF NEW.content_type = 'discussion' THEN
    SELECT d.author_id, d.title
    INTO v_owner_id, v_title
    FROM public.discussions d
    WHERE d.id = NEW.content_id;

    v_notification_type := 'discussion_like';
    v_notification_title := 'Someone liked your discussion';
    v_action_url := '/community/discussions/' || NEW.content_id;
    v_metadata := jsonb_build_object(
      'discussion_id', NEW.content_id
    );
  ELSE
    RETURN NEW;
  END IF;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    sender_id,
    metadata
  ) VALUES (
    v_owner_id,
    v_notification_type,
    v_notification_title,
    v_actor_name || ' liked "' || COALESCE(v_title, 'your post') || '"',
    v_action_url,
    NEW.user_id,
    v_metadata
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_community_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_discussion_answer_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_discussion_title text;
  v_discussion_author_id uuid;
BEGIN
  IF NOT NEW.is_accepted_answer OR COALESCE(OLD.is_accepted_answer, false) = NEW.is_accepted_answer THEN
    RETURN NEW;
  END IF;

  SELECT d.title, d.author_id
  INTO v_discussion_title, v_discussion_author_id
  FROM public.discussions d
  WHERE d.id = NEW.discussion_id;

  IF NEW.author_id IS NOT NULL AND NEW.author_id <> v_discussion_author_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      sender_id,
      metadata
    ) VALUES (
      NEW.author_id,
      'discussion_answer_accepted',
      'Your reply was accepted',
      'Your reply in "' || COALESCE(v_discussion_title, 'a discussion') || '" was marked as the accepted answer',
      '/community/discussions/' || NEW.discussion_id || '?reply=' || NEW.id,
      v_discussion_author_id,
      jsonb_build_object(
        'discussion_id', NEW.discussion_id,
        'reply_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_discussion_answer_accepted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_discussion_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_discussion_author_id uuid;
  v_discussion_title text;
  v_actor_name text;
  v_parent_author_id uuid;
  v_reply_url text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.is_hidden THEN
    RETURN NEW;
  END IF;

  SELECT d.author_id, d.title
  INTO v_discussion_author_id, v_discussion_title
  FROM public.discussions d
  WHERE d.id = NEW.discussion_id;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  v_reply_url := '/community/discussions/' || NEW.discussion_id || '?reply=' || NEW.id;

  IF v_discussion_author_id IS NOT NULL AND v_discussion_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      sender_id,
      metadata
    ) VALUES (
      v_discussion_author_id,
      'discussion_reply',
      'New reply to your discussion',
      v_actor_name || ' replied to "' || COALESCE(v_discussion_title, 'your discussion') || '"',
      v_reply_url,
      NEW.author_id,
      jsonb_build_object(
        'discussion_id', NEW.discussion_id,
        'reply_id', NEW.id
      )
    );
  END IF;

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT dr.author_id
    INTO v_parent_author_id
    FROM public.discussion_replies dr
    WHERE dr.id = NEW.parent_reply_id;

    IF v_parent_author_id IS NOT NULL
      AND v_parent_author_id <> NEW.author_id
      AND v_parent_author_id <> v_discussion_author_id THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        sender_id,
        metadata
      ) VALUES (
        v_parent_author_id,
        'discussion_reply_to_you',
        'New reply to your comment',
        v_actor_name || ' replied to your comment in "' || COALESCE(v_discussion_title, 'a discussion') || '"',
        v_reply_url,
        NEW.author_id,
        jsonb_build_object(
          'discussion_id', NEW.discussion_id,
          'reply_id', NEW.id,
          'parent_reply_id', NEW.parent_reply_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_discussion_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_join_request_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_trip_title text;
  v_organizer_name text;
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT t.title, p.full_name
  INTO v_trip_title, v_organizer_name
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.id = t.creator_id
  WHERE t.id = NEW.trip_id;

  IF NEW.status = 'approved' THEN
    v_notification_type := 'trip_join_approved';
    v_notification_title := 'Join Request Approved!';
    v_notification_message := 'Your request to join "' || COALESCE(v_trip_title, 'trip') || '" has been approved.';
  ELSIF NEW.status = 'rejected' THEN
    v_notification_type := 'trip_join_rejected';
    v_notification_title := 'Join Request Declined';
    v_notification_message := 'Your request to join "' || COALESCE(v_trip_title, 'trip') || '" was declined.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data,
    action_url,
    sender_id,
    related_trip_id
  ) VALUES (
    NEW.user_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'request_id', NEW.id,
      'trip_title', v_trip_title,
      'organizer_name', v_organizer_name,
      'status', NEW.status
    ),
    '/approvals',
    NEW.reviewed_by,
    NEW.trip_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_join_request_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_follower"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_follower_name text;
BEGIN
  SELECT full_name INTO v_follower_name
  FROM public.profiles
  WHERE id = NEW.follower_id;
  
  PERFORM public.send_notification(
    NEW.following_id,
    'new_follower',
    'New Follower',
    COALESCE(v_follower_name, 'Someone') || ' started following you',
    jsonb_build_object('follower_id', NEW.follower_id),
    '/profile/' || NEW.follower_id,
    NEW.follower_id
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_follower"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_review"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_reviewer_name text;
  v_trip_title text;
  v_creator_id uuid;
BEGIN
  -- Get reviewer name
  SELECT full_name INTO v_reviewer_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get trip info
  SELECT title, creator_id INTO v_trip_title, v_creator_id
  FROM public.trips
  WHERE id = NEW.trip_id;
  
  -- Don't notify if creator is reviewing their own trip
  IF v_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Send notification
  PERFORM public.send_notification(
    v_creator_id,
    'new_review',
    'New Review',
    v_reviewer_name || ' left a ' || NEW.rating || '-star review for "' || v_trip_title || '"',
    jsonb_build_object(
      'review_id', NEW.id,
      'rating', NEW.rating,
      'trip_id', NEW.trip_id
    ),
    '/trips/' || NEW.trip_id || '#reviews',
    NEW.user_id,
    NEW.trip_id
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_receipt_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense record;
  v_reviewer_name text;
BEGIN
  -- Only notify on status change to approved
  IF OLD.status = NEW.status OR NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get expense details
  SELECT * INTO v_expense
  FROM trip_expenses
  WHERE id = NEW.expense_id;

  -- Get reviewer name
  SELECT full_name INTO v_reviewer_name
  FROM profiles
  WHERE id = NEW.reviewed_by;

  -- Notify the receipt submitter
  PERFORM send_notification(
    p_user_id := NEW.uploaded_by,
    p_type := 'receipt_approved',
    p_title := 'Payment Confirmed',
    p_message := format('Your payment for "%s" was confirmed by %s', 
                       v_expense.description, v_reviewer_name),
    p_data := jsonb_build_object(
      'receipt_id', NEW.id,
      'expense_id', NEW.expense_id,
      'trip_id', v_expense.trip_id,
      'reviewed_at', NEW.reviewed_at
    ),
    -- Updated URL format - navigate to chat page with expenses tab
    p_action_url := format('/trips/%s/chat?tab=expenses&expense=%s', 
                          v_expense.trip_id, NEW.expense_id),
    p_sender_id := NEW.reviewed_by,
    p_related_trip_id := v_expense.trip_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_receipt_approved"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_receipt_approved"() IS 'Notifies the receipt submitter when their payment is confirmed';



CREATE OR REPLACE FUNCTION "public"."notify_receipt_rejected"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense record;
  v_reviewer_name text;
BEGIN
  -- Only notify on status change to rejected
  IF OLD.status = NEW.status OR NEW.status != 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Get expense details
  SELECT * INTO v_expense
  FROM trip_expenses
  WHERE id = NEW.expense_id;

  -- Get reviewer name
  SELECT full_name INTO v_reviewer_name
  FROM profiles
  WHERE id = NEW.reviewed_by;

  -- Notify the receipt submitter
  PERFORM send_notification(
    p_user_id := NEW.uploaded_by,
    p_type := 'receipt_rejected',
    p_title := 'Receipt Rejected - Action Required',
    p_message := format('Your receipt for "%s" was rejected. Reason: %s', 
                       v_expense.description, 
                       COALESCE(NEW.rejection_reason, 'No reason provided')),
    p_data := jsonb_build_object(
      'receipt_id', NEW.id,
      'expense_id', NEW.expense_id,
      'trip_id', v_expense.trip_id,
      'rejection_reason', NEW.rejection_reason,
      'reviewed_at', NEW.reviewed_at
    ),
    -- Updated URL format - navigate to chat page with expenses tab
    p_action_url := format('/trips/%s/chat?tab=expenses&expense=%s', 
                          v_expense.trip_id, NEW.expense_id),
    p_sender_id := NEW.reviewed_by,
    p_related_trip_id := v_expense.trip_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_receipt_rejected"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_receipt_rejected"() IS 'Notifies the receipt submitter when their receipt is rejected and needs resubmission';



CREATE OR REPLACE FUNCTION "public"."notify_receipt_submitted"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense record;
  v_submitter_name text;
  v_payer_id uuid;
BEGIN
  -- Only notify on new receipt submissions
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get expense details including payers
  SELECT 
    te.*,
    array_agg(DISTINCT epay.user_id) as payer_ids
  INTO v_expense
  FROM trip_expenses te
  JOIN expense_payments epay ON epay.expense_id = te.id
  WHERE te.id = NEW.expense_id
  GROUP BY te.id, te.trip_id, te.created_by, te.description, te.amount, 
           te.currency, te.category, te.expense_date, te.created_at, 
           te.updated_at, te.is_deleted, te.receipt_url, te.notes;

  -- Get submitter name
  SELECT full_name INTO v_submitter_name
  FROM profiles
  WHERE id = NEW.uploaded_by;

  -- Notify all payers (they need to review the receipt)
  FOREACH v_payer_id IN ARRAY v_expense.payer_ids
  LOOP
    -- Don't notify the submitter themselves
    IF v_payer_id != NEW.uploaded_by THEN
      PERFORM send_notification(
        p_user_id := v_payer_id,
        p_type := 'receipt_submitted',
        p_title := 'Receipt Submitted for Review',
        p_message := format('%s submitted a payment receipt for "%s"', 
                           v_submitter_name, v_expense.description),
        p_data := jsonb_build_object(
          'receipt_id', NEW.id,
          'expense_id', NEW.expense_id,
          'participant_id', NEW.participant_id,
          'trip_id', v_expense.trip_id,
          'amount', (
            SELECT amount_owed 
            FROM expense_participants 
            WHERE expense_id = NEW.expense_id 
            AND user_id = NEW.participant_id
          )
        ),
        -- Updated URL format to match routing - navigate to chat page with expenses tab
        p_action_url := format('/trips/%s/chat?tab=expenses&expense=%s', 
                              v_expense.trip_id, NEW.expense_id),
        p_sender_id := NEW.uploaded_by,
        p_related_trip_id := v_expense.trip_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_receipt_submitted"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_receipt_submitted"() IS 'Notifies expense payers when a participant submits a payment receipt for review';



CREATE OR REPLACE FUNCTION "public"."notify_story_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_story_author_id uuid;
  v_story_title text;
  v_story_slug text;
  v_actor_name text;
  v_parent_author_id uuid;
  v_comment_url text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.is_hidden THEN
    RETURN NEW;
  END IF;

  SELECT s.author_id, s.title, s.slug
  INTO v_story_author_id, v_story_title, v_story_slug
  FROM public.stories s
  WHERE s.id = NEW.story_id;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  v_comment_url := '/community/stories/' || v_story_slug || '?comment=' || NEW.id;

  IF v_story_author_id IS NOT NULL AND v_story_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      sender_id,
      metadata
    ) VALUES (
      v_story_author_id,
      'story_comment',
      'New comment on your story',
      v_actor_name || ' commented on "' || COALESCE(v_story_title, 'your story') || '"',
      v_comment_url,
      NEW.author_id,
      jsonb_build_object(
        'story_id', NEW.story_id,
        'story_slug', v_story_slug,
        'comment_id', NEW.id,
        'parent_comment_id', NEW.parent_comment_id
      )
    );
  END IF;

  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT sc.author_id
    INTO v_parent_author_id
    FROM public.story_comments sc
    WHERE sc.id = NEW.parent_comment_id;

    IF v_parent_author_id IS NOT NULL
      AND v_parent_author_id <> NEW.author_id
      AND v_parent_author_id <> v_story_author_id THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        sender_id,
        metadata
      ) VALUES (
        v_parent_author_id,
        'story_comment',
        'New reply to your comment',
        v_actor_name || ' replied to your comment on "' || COALESCE(v_story_title, 'a story') || '"',
        v_comment_url,
        NEW.author_id,
        jsonb_build_object(
          'story_id', NEW.story_id,
          'story_slug', v_story_slug,
          'comment_id', NEW.id,
          'parent_comment_id', NEW.parent_comment_id,
          'is_reply_notification', true
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_story_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_trip_creator_on_join_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_trip_id,
    action_url
  )
  SELECT
    t.creator_id,
    'join_request',
    'New Join Request',
    COALESCE(p.full_name, p.username, 'Someone') || ' wants to join ' || COALESCE(t.title, 'your trip'),
    NEW.trip_id,
    '/approvals'
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE t.id = NEW.trip_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_trip_creator_on_join_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_trip_join_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_trip_title text;
  v_notification_type notification_type;
  v_message text;
BEGIN
  -- Only notify on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get trip title
  SELECT title INTO v_trip_title
  FROM public.trips
  WHERE id = NEW.trip_id;
  
  -- Determine notification type and message
  IF NEW.status = 'approved' THEN
    v_notification_type := 'trip_join_approved';
    v_message := 'Your request to join "' || v_trip_title || '" was approved!';
  ELSIF NEW.status = 'rejected' THEN
    v_notification_type := 'trip_join_rejected';
    v_message := 'Your request to join "' || v_trip_title || '" was declined.';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Send notification
  PERFORM public.send_notification(
    NEW.user_id,
    v_notification_type,
    CASE 
      WHEN NEW.status = 'approved' THEN 'Join Request Approved'
      ELSE 'Join Request Declined'
    END,
    v_message,
    jsonb_build_object(
      'request_id', NEW.id,
      'trip_id', NEW.trip_id,
      'status', NEW.status
    ),
    '/trips/' || NEW.trip_id,
    NULL,
    NEW.trip_id
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_trip_join_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_trip_settlement_required"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$DECLARE
  v_member record;
  v_total_owed_by_user numeric := 0;
  v_total_owed_to_user numeric := 0;
  v_net_balance numeric := 0;
  v_expense record;
  v_participant record;
  v_payer record;
BEGIN
  -- Only notify when trip status changes to completed
  IF OLD.status = NEW.status OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get all members with expenses
  FOR v_member IN 
    SELECT DISTINCT tm.user_id, p.full_name
    FROM trip_members tm
    JOIN profiles p ON p.id = tm.user_id
    WHERE tm.trip_id = NEW.id
  LOOP
    -- Reset balances for each user
    v_total_owed_by_user := 0;
    v_total_owed_to_user := 0;
    
    -- Calculate balance using frontend logic
    FOR v_expense IN
      SELECT id, description, amount
      FROM trip_expenses 
      WHERE trip_id = NEW.id AND is_deleted = false
    LOOP
      -- Check if current user paid for this expense
      SELECT * INTO v_payer
      FROM expense_payments ep
      WHERE ep.expense_id = v_expense.id 
      AND ep.user_id = v_member.user_id;
      
      -- Check if current user is a participant
      SELECT * INTO v_participant
      FROM expense_participants ep
      WHERE ep.expense_id = v_expense.id 
      AND ep.user_id = v_member.user_id;
      
      IF FOUND AND v_payer.user_id IS NOT NULL THEN
        -- User paid for this expense - calculate what others owe to them
        FOR v_participant IN
          SELECT amount_owed, is_paid, user_id
          FROM expense_participants
          WHERE expense_id = v_expense.id 
          AND user_id != v_member.user_id -- Others, not the payer themselves
          AND is_paid = false -- Only unpaid debts
        LOOP
          v_total_owed_to_user := v_total_owed_to_user + v_participant.amount_owed;
        END LOOP;
        
      ELSIF FOUND AND v_participant.user_id IS NOT NULL AND v_participant.is_paid = false THEN
        -- User is a participant but not payer, and hasn't paid their share
        v_total_owed_by_user := v_total_owed_by_user + v_participant.amount_owed;
      END IF;
    END LOOP;
    
    -- Calculate net balance (what others owe to me - what I owe to others)
    v_net_balance := v_total_owed_to_user - v_total_owed_by_user;
    
    -- Only notify if user has outstanding balance
    IF v_net_balance != 0 THEN
      PERFORM send_notification(
        p_user_id := v_member.user_id,
        p_type := 'trip_settlement_required',
        p_title := 'Trip Ended - Settlement Required',
        p_message := format('Trip "%s" has ended. %s', 
                           NEW.title,
                           CASE 
                             WHEN v_net_balance > 0 THEN 
                               format('You are owed %s %s', NEW.currency, abs(v_net_balance))
                             ELSE 
                               format('You owe %s %s', NEW.currency, abs(v_net_balance))
                           END),
        p_data := jsonb_build_object(
          'trip_id', NEW.id,
          'net_balance', v_net_balance,
          'total_owed_to_user', v_total_owed_to_user,
          'total_owed_by_user', v_total_owed_by_user
        ),
        p_action_url := format('/trips/%s/chat?tab=expenses', NEW.id),
        p_sender_id := NULL,
        p_related_trip_id := NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."notify_trip_settlement_required"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_trip_settlement_required"() IS 'Notifies trip members with outstanding balances when a trip is marked as completed';



CREATE OR REPLACE FUNCTION "public"."on_trip_member_joined_update_countries"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.recalculate_user_countries_visited_v2(NEW.user_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_trip_member_joined_update_countries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_trip_member_left_update_countries"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    PERFORM public.recalculate_user_countries_visited_v2(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_trip_member_left_update_countries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_payer_unpaid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Check if this user is a payer for this expense
  IF EXISTS (
    SELECT 1 FROM expense_payments
    WHERE expense_id = NEW.expense_id
    AND user_id = NEW.user_id
  ) THEN
    -- Force is_paid to true for payers
    NEW.is_paid := true;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_payer_unpaid"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_payer_unpaid"() IS 'Prevents payers from being marked as unpaid in expense_participants,
since they have already paid the full amount upfront.';



CREATE OR REPLACE FUNCTION "public"."push_community_notification_to_mobile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Only community notification types inserted by DB community triggers.
  IF NEW.type NOT IN (
    'story_like',
    'story_comment',
    'discussion_like',
    'discussion_reply',
    'discussion_reply_to_you',
    'discussion_answer_accepted'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT value INTO v_supabase_url FROM app.settings WHERE key = 'supabase_url';
    SELECT value INTO v_service_role_key FROM app.settings WHERE key = 'service_role_key';

    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      RAISE WARNING 'Missing app.settings.supabase_url';
      RETURN NEW;
    END IF;

    IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
      RAISE WARNING 'Missing app.settings.service_role_key';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := (v_supabase_url || '/functions/v1/send-system-push')::text,
      body := jsonb_build_object(
        'userIds', jsonb_build_array(NEW.user_id),
        'type', NEW.type,
        'title', NEW.title,
        'body', COALESCE(NULLIF(NEW.message, ''), NEW.title),
        'actionUrl', COALESCE(NEW.action_url, ''),
        'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
        -- Avoid duplicate notifications: row already inserted in this trigger context.
        'skipInsert', true
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send community push for notification %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."push_community_notification_to_mobile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_trip_participants"("p_trip_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    participant_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO participant_count
    FROM trip_members
    WHERE trip_id = p_trip_id;
    
    UPDATE trips
    SET current_participants = COALESCE(participant_count, 0)
    WHERE id = p_trip_id;
    
    RETURN participant_count;
END;
$$;


ALTER FUNCTION "public"."recalculate_trip_participants"("p_trip_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recalculate_trip_participants"("p_trip_id" "uuid") IS 'Recalculates and updates the current_participants count for a specific trip';



CREATE OR REPLACE FUNCTION "public"."recalculate_user_countries_visited_v2"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_country_count integer;
BEGIN
  SELECT COUNT(DISTINCT d.destination)
  INTO v_country_count
  FROM (
    SELECT t.destination
    FROM public.trips t
    WHERE t.creator_id = p_user_id
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination <> ''

    UNION ALL

    SELECT t.destination
    FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id
    WHERE tm.user_id = p_user_id
      AND tm.left_at IS NULL
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination <> ''
  ) AS d;

  UPDATE public.profiles
  SET countries_visited = COALESCE(v_country_count, 0),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_user_countries_visited_v2"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_balance_settlement"("p_trip_id" "uuid", "p_payer_id" "uuid", "p_payee_id" "uuid", "p_amount" numeric, "p_currency" character varying, "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_settlement_id uuid;
  v_expense record;
  v_remaining_amount decimal;
BEGIN
  -- Insert the settlement record
  INSERT INTO public.balance_settlements (
    trip_id,
    payer_id,
    payee_id,
    amount,
    currency,
    description,
    created_by
  ) VALUES (
    p_trip_id,
    p_payer_id,
    p_payee_id,
    p_amount,
    p_currency,
    COALESCE(p_description, 'Balance settlement'),
    auth.uid()
  )
  RETURNING id INTO v_settlement_id;

  -- Auto-mark relevant expense participants as paid
  -- This finds expenses where the payer owes money to the payee
  v_remaining_amount := p_amount;
  
  FOR v_expense IN
    SELECT 
      ep.expense_id,
      ep.amount_owed,
      ep.user_id as participant_id
    FROM expense_participants ep
    JOIN trip_expenses te ON te.id = ep.expense_id
    JOIN expense_payments epay ON epay.expense_id = te.id
    WHERE te.trip_id = p_trip_id
      AND ep.user_id = p_payer_id
      AND epay.user_id = p_payee_id
      AND ep.is_paid = false
      AND v_remaining_amount > 0
    ORDER BY te.expense_date ASC
  LOOP
    -- Mark this expense participant as paid
    UPDATE expense_participants
    SET is_paid = true,
        paid_at = now()
    WHERE expense_id = v_expense.expense_id
      AND user_id = v_expense.participant_id;
    
    -- Deduct from remaining amount
    v_remaining_amount := v_remaining_amount - v_expense.amount_owed;
  END LOOP;

  RETURN v_settlement_id;
END;
$$;


ALTER FUNCTION "public"."record_balance_settlement"("p_trip_id" "uuid", "p_payer_id" "uuid", "p_payee_id" "uuid", "p_amount" numeric, "p_currency" character varying, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_profile_view"("p_profile_id" "uuid", "p_viewer_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Don't record if viewer is viewing their own profile
  IF p_viewer_id IS NOT NULL AND p_viewer_id = p_profile_id THEN
    RETURN;
  END IF;
  
  -- Insert profile view
  INSERT INTO public.profile_views (profile_id, viewer_id, ip_address, user_agent)
  VALUES (p_profile_id, p_viewer_id, p_ip_address, p_user_agent);
  
  -- Update profile views count
  UPDATE public.profiles
  SET profile_views = profile_views + 1
  WHERE id = p_profile_id;
END;
$$;


ALTER FUNCTION "public"."record_profile_view"("p_profile_id" "uuid", "p_viewer_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_expense_receipt"("p_receipt_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expense_id uuid;
  v_status receipt_status;
BEGIN
  -- Get receipt details
  SELECT expense_id, status
  INTO v_expense_id, v_status
  FROM expense_receipts
  WHERE id = p_receipt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;
  
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Receipt has already been reviewed';
  END IF;
  
  -- Verify the reviewer is the expense payer
  IF NOT EXISTS (
    SELECT 1 FROM expense_payments
    WHERE expense_id = v_expense_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only expense payers can reject receipts';
  END IF;
  
  -- Update receipt status
  UPDATE expense_receipts
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_receipt_id;
END;
$$;


ALTER FUNCTION "public"."reject_expense_receipt"("p_receipt_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reject_expense_receipt"("p_receipt_id" "uuid", "p_reason" "text") IS 'Rejects a receipt with a reason, allowing the participant to upload a new one';



CREATE OR REPLACE FUNCTION "public"."remove_saved_trips_on_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- If trip status changed to cancelled or completed
  IF NEW.status IN ('cancelled', 'completed') AND OLD.status NOT IN ('cancelled', 'completed') THEN
    -- Delete all saved trip entries for this trip
    DELETE FROM saved_trips WHERE trip_id = NEW.id;
    
    -- Optionally, notify users about the removal
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT 
      st.user_id,
      'saved_trip_removed',
      'Saved trip removed',
      CASE 
        WHEN NEW.status = 'cancelled' THEN 'The trip "' || NEW.title || '" has been cancelled and removed from your favorites.'
        WHEN NEW.status = 'completed' THEN 'The trip "' || NEW.title || '" has been completed and removed from your favorites.'
      END,
      jsonb_build_object(
        'trip_id', NEW.id,
        'trip_title', NEW.title,
        'trip_status', NEW.status
      )
    FROM saved_trips st
    WHERE st.trip_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."remove_saved_trips_on_status_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_saved_trips_on_status_change"() IS 'Automatically removes trips from all users saved lists when the trip is cancelled or completed';



CREATE OR REPLACE FUNCTION "public"."request_to_join_trip"("p_trip_id" "uuid", "p_user_id" "uuid", "p_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_request_id uuid;
  v_latest_request RECORD;
  v_member_check RECORD;
BEGIN
  -- First check if user is currently an active member in trip_members table
  SELECT * INTO v_member_check
  FROM trip_members
  WHERE trip_id = p_trip_id 
  AND user_id = p_user_id
  AND left_at IS NULL
  LIMIT 1;
  
  -- If user is an active member, throw error
  IF v_member_check.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already a member of this trip';
  END IF;
  
  -- Get the LATEST join request for this user and trip
  SELECT * INTO v_latest_request
  FROM join_requests
  WHERE trip_id = p_trip_id 
  AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check the status of the latest request
  IF v_latest_request.status = 'pending' THEN
    -- Return existing pending request
    RETURN v_latest_request.id;
  END IF;
  
  -- If the latest request is approved but user is not in trip_members
  -- (this means they left after being approved)
  IF v_latest_request.status = 'approved' THEN
    -- Update the existing approved request to pending
    UPDATE join_requests
    SET status = 'pending',
        message = p_message,
        created_at = NOW(),
        reviewed_at = NULL,
        reviewed_by = NULL
    WHERE id = v_latest_request.id
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
  END IF;
  
  -- If latest request is 'left', update it to pending
  IF v_latest_request.status = 'left' THEN
    UPDATE join_requests
    SET status = 'pending',
        message = p_message,
        created_at = NOW(),
        reviewed_at = NULL,
        reviewed_by = NULL
    WHERE id = v_latest_request.id
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
  END IF;
  
  -- If latest request is 'rejected', create a new request
  IF v_latest_request.status = 'rejected' THEN
    INSERT INTO join_requests (trip_id, user_id, message, status)
    VALUES (p_trip_id, p_user_id, p_message, 'pending')
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
  END IF;
  
  -- No existing request, create new one
  INSERT INTO join_requests (trip_id, user_id, message, status)
  VALUES (p_trip_id, p_user_id, p_message, 'pending')
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;


ALTER FUNCTION "public"."request_to_join_trip"("p_trip_id" "uuid", "p_user_id" "uuid", "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."request_to_join_trip"("p_trip_id" "uuid", "p_user_id" "uuid", "p_message" "text") IS 'Request to join a trip. Updates existing requests when rejoining after leaving.';



CREATE OR REPLACE FUNCTION "public"."reserve_guided_departure_slots_for_paid_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_booking public.guided_bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.guided_bookings
  WHERE id = NEW.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Idempotency guard: already reserved, nothing to do.
  IF v_booking.slots_reserved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Reserve the departure slots. If this fails for any reason (capacity,
  -- missing departure, etc.) we log a warning and allow the payment record
  -- update to commit anyway.
  BEGIN
    PERFORM public.guided_book_departure(
      v_booking.departure_id,
      v_booking.num_participants
    );

    UPDATE public.guided_bookings
    SET slots_reserved_at = now(),
        confirmed_at      = COALESCE(confirmed_at, now()),
        updated_at        = now()
    WHERE id = v_booking.id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING
      'reserve_guided_departure_slots: could not reserve slots for booking % (departure %, pax %): %',
      v_booking.id,
      v_booking.departure_id,
      v_booking.num_participants,
      SQLERRM;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reserve_guided_departure_slots_for_paid_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_add_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text" DEFAULT 'member'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_existing_member RECORD;
BEGIN
  -- Check if a trip_members record already exists for this user/trip
  SELECT * INTO v_existing_member
  FROM trip_members
  WHERE trip_id = p_trip_id 
  AND user_id = p_user_id
  LIMIT 1;
  
  IF v_existing_member.id IS NOT NULL THEN
    -- Member record exists (user previously left), update it to rejoin
    UPDATE trip_members
    SET 
      left_at = NULL,  -- Clear the left timestamp
      role = COALESCE(p_role, v_existing_member.role),  -- Update role if provided
      joined_at = COALESCE(v_existing_member.joined_at, NOW())  -- Keep original join date
    WHERE trip_id = p_trip_id 
    AND user_id = p_user_id;
    
    RAISE NOTICE 'Updated existing trip member record for user % in trip % (rejoin)', p_user_id, p_trip_id;
  ELSE
    -- No existing record, insert new member
    INSERT INTO trip_members (trip_id, user_id, role, joined_at)
    VALUES (p_trip_id, p_user_id, p_role, NOW());
    
    RAISE NOTICE 'Created new trip member record for user % in trip %', p_user_id, p_trip_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."safe_add_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."safe_add_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") IS 'Safely adds or updates a trip member record, handling rejoin cases where the user previously left';



CREATE OR REPLACE FUNCTION "public"."send_chat_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  BEGIN
    SELECT value INTO v_supabase_url FROM app.settings WHERE key = 'supabase_url';
    SELECT value INTO v_service_role_key FROM app.settings WHERE key = 'service_role_key';

    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      RAISE WARNING 'Missing app.settings.supabase_url';
      RETURN NEW;
    END IF;

    IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
      RAISE WARNING 'Missing app.settings.service_role_key';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := (v_supabase_url || '/functions/v1/send-chat-push')::text,
      body := jsonb_build_object('messageId', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send chat push for message %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_chat_push"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text" DEFAULT NULL::"text", "p_action_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text" DEFAULT NULL::"text", "p_action_url" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_action_url" "text" DEFAULT NULL::"text", "p_sender_id" "uuid" DEFAULT NULL::"uuid", "p_related_trip_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_notification_id uuid;
  v_email_enabled boolean;
  v_push_enabled boolean;
  v_user_email text;
BEGIN
  -- Insert notification
  INSERT INTO public.notifications (
    user_id, type, title, message, data, action_url, sender_id, related_trip_id
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_data, p_action_url, p_sender_id, p_related_trip_id
  ) RETURNING id INTO v_notification_id;
  
  -- Check user preferences
  SELECT 
    COALESCE(np.email_enabled, true),
    COALESCE(np.push_enabled, true)
  INTO v_email_enabled, v_push_enabled
  FROM public.notification_preferences np
  WHERE np.user_id = p_user_id AND np.notification_type = p_type;
  
  -- If no preferences found, use defaults from profile
  IF NOT FOUND THEN
    SELECT 
      COALESCE(p.email_notifications, true),
      COALESCE(p.push_notifications, true),
      au.email
    INTO v_email_enabled, v_push_enabled, v_user_email
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE p.id = p_user_id;
  ELSE
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;
  END IF;
  
  -- Queue email if enabled
  IF v_email_enabled AND v_user_email IS NOT NULL THEN
    INSERT INTO public.email_queue (
      user_id, to_email, subject, template, template_data
    ) VALUES (
      p_user_id, v_user_email, p_title, p_type::text, 
      jsonb_build_object(
        'title', p_title,
        'message', p_message,
        'action_url', p_action_url,
        'data', p_data
      )
    );
  END IF;
  
  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_action_url" "text", "p_sender_id" "uuid", "p_related_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_notification_email"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_email_enabled BOOLEAN;
BEGIN
  -- Get user email and preferences
  SELECT email, COALESCE(full_name, username), 
         COALESCE((preferences->>'email_notifications')::boolean, true)
  INTO v_user_email, v_user_name, v_email_enabled
  FROM profiles
  WHERE id = p_user_id;
  
  -- Only send if user has email notifications enabled
  IF v_email_enabled AND v_user_email IS NOT NULL THEN
    -- Call edge function using pg_net extension
    PERFORM
      net.http_post(
        url := 'https://sspvqhleqlycsiniywkg.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'token'
        ),
        body := jsonb_build_object(
          'email', v_user_email,
          'userName', v_user_name,
          'notificationTitle', p_title,
          'notificationMessage', p_message,
          'actionUrl', p_action_url
        )
      );
  END IF;
END;
$$;


ALTER FUNCTION "public"."send_notification_email"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_notification_email_via_edge"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user email and name from auth.users and profiles
  SELECT u.email, COALESCE(p.full_name, p.username, 'User')
  INTO v_user_email, v_user_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = p_user_id;
  
  -- Only send if user has email
  IF v_user_email IS NOT NULL THEN
    -- Call edge function
    PERFORM net.http_post(
      url := 'https://sspvqhleqlycsiniywkg.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcHZxaGxlcWx5Y3Npbml5d2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDU4NjEsImV4cCI6MjA4Mjk4MTg2MX0.yMDAvpxbvfhcCXNtiPnMg8z5DL-yNixNND4naGPZBXw'
      ),
      body := jsonb_build_object(
        'email', v_user_email,
        'userName', v_user_name,
        'notificationTitle', p_title,
        'notificationMessage', p_message,
        'actionUrl', p_action_url
      )
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send email: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."send_notification_email_via_edge"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_trip_created_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_supabase_url TEXT := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-trip-created-email';
  v_service_key TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
  -- Only send email when trip status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Fire the email function asynchronously using pg_net if available, else http
    BEGIN
      PERFORM http(
        'POST',
        v_supabase_url,
        jsonb_build_object('tripId', NEW.id)::text,
        'application/json',
        jsonb_build_object('Authorization', 'Bearer ' || v_service_key)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Failed to send trip created email: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_trip_created_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_welcome_email_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get email from auth.users (this is where Supabase stores emails)
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Get name from the new profile
  v_user_name := COALESCE(NEW.full_name, NEW.username, 'Traveler');
  
  -- Only send if we found an email
  IF v_user_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://sspvqhleqlycsiniywkg.supabase.co/functions/v1/send-welcome-email',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'email', v_user_email,
        'userName', v_user_name
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block signup if email fails
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_welcome_email_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_trip_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only generate slug if it's not provided or title changed
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := generate_unique_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_trip_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_discussion_reply_vote_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_discussion_reply_vote_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_guided_booking_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_booking_id uuid;
  v_all_paid boolean;
  v_any_paid boolean;
  v_new_payment_status public.guided_payment_status;
  v_new_booking_status public.guided_booking_status;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COUNT(*) FILTER (WHERE payment_status = 'paid') = COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
  INTO v_all_paid, v_any_paid
  FROM public.guided_payment_schedules
  WHERE booking_id = v_booking_id;

  IF v_all_paid THEN
    v_new_payment_status := 'paid';
    v_new_booking_status := 'confirmed';
  ELSIF v_any_paid THEN
    v_new_payment_status := 'partial';
    v_new_booking_status := 'confirmed';
  ELSE
    v_new_payment_status := 'unpaid';
    v_new_booking_status := 'awaiting_payment';
  END IF;

  UPDATE public.guided_bookings
  SET
    payment_status = v_new_payment_status,
    booking_status = CASE
      WHEN booking_status IN ('cancelled', 'completed') THEN booking_status
      ELSE v_new_booking_status
    END,
    confirmed_at = CASE
      WHEN v_any_paid AND confirmed_at IS NULL THEN now()
      ELSE confirmed_at
    END,
    updated_at = now()
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_guided_booking_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_guided_schedule_from_payment_record"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_schedule_id uuid;
  v_all_paid boolean;
  v_any_paid boolean;
BEGIN
  IF NEW.payment_status <> 'completed'::public.guided_record_payment_status THEN
    RETURN NEW;
  END IF;

  v_schedule_id := NEW.payment_schedule_id;

  IF v_schedule_id IS NULL THEN
    SELECT gps.id
    INTO v_schedule_id
    FROM public.guided_payment_schedules gps
    WHERE gps.booking_id = NEW.booking_id
      AND gps.payment_status = 'pending'::public.guided_schedule_payment_status
    ORDER BY gps.installment_number
    LIMIT 1;
  END IF;

  IF v_schedule_id IS NOT NULL THEN
    UPDATE public.guided_payment_schedules
    SET payment_status = 'paid'::public.guided_schedule_payment_status,
        paid_at = COALESCE(NEW.paid_at, now()),
        payment_method = COALESCE(payment_method, 'card'),
        transaction_reference = COALESCE(NEW.transaction_reference, transaction_reference)
    WHERE id = v_schedule_id;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE payment_status = 'paid'::public.guided_schedule_payment_status) = COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid'::public.guided_schedule_payment_status) > 0
  INTO v_all_paid, v_any_paid
  FROM public.guided_payment_schedules
  WHERE booking_id = NEW.booking_id;

  UPDATE public.guided_bookings gb
  SET booking_status = CASE
                         WHEN gb.booking_status IN ('cancelled', 'completed') THEN gb.booking_status
                         WHEN v_any_paid THEN 'confirmed'::public.guided_booking_status
                         ELSE 'awaiting_payment'::public.guided_booking_status
                       END,
      payment_status = CASE
                         WHEN v_all_paid THEN 'paid'::public.guided_payment_status
                         WHEN v_any_paid THEN 'partial'::public.guided_payment_status
                         ELSE 'unpaid'::public.guided_payment_status
                       END,
      confirmed_at = CASE
                       WHEN v_any_paid THEN COALESCE(gb.confirmed_at, now())
                       ELSE gb.confirmed_at
                     END,
      updated_at = now()
  WHERE gb.id = NEW.booking_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_guided_schedule_from_payment_record"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_guided_trip_current_participants"("p_trip_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_trip_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.guided_trips gt
  SET current_participants = COALESCE(s.total_booked, 0)
  FROM (
    SELECT d.trip_id, COALESCE(SUM(d.booked_pax), 0)::integer AS total_booked
    FROM public.guided_trip_departure_dates d
    WHERE d.trip_id = p_trip_id
    GROUP BY d.trip_id
  ) s
  WHERE gt.id = p_trip_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.guided_trip_departure_dates d
    WHERE d.trip_id = p_trip_id
  ) THEN
    UPDATE public.guided_trips
    SET current_participants = 0
    WHERE id = p_trip_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."sync_guided_trip_current_participants"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_guided_trips_owner_ids"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.agent_id := COALESCE(NEW.agent_id, NEW.creator_id, auth.uid());
  NEW.creator_id := COALESCE(NEW.creator_id, NEW.agent_id, auth.uid());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_guided_trips_owner_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_trip_member_to_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.trip_id = NEW.trip_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_trip_member_to_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_storage_auth"() RETURNS TABLE("user_id" "uuid", "bucket_accessible" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as user_id,
        EXISTS (
            SELECT 1 FROM storage.buckets 
            WHERE id = 'expense-receipts' 
            AND public = true
        ) as bucket_accessible;
END;
$$;


ALTER FUNCTION "public"."test_storage_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_review_helpful"("p_review_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if already marked as helpful
  SELECT EXISTS(
    SELECT 1 FROM public.review_helpful
    WHERE review_id = p_review_id AND user_id = auth.uid()
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove helpful mark
    DELETE FROM public.review_helpful
    WHERE review_id = p_review_id AND user_id = auth.uid();
    
    -- Update count
    UPDATE public.trip_reviews
    SET helpful_count = GREATEST(helpful_count - 1, 0)
    WHERE id = p_review_id;
    
    RETURN false;
  ELSE
    -- Add helpful mark
    INSERT INTO public.review_helpful (review_id, user_id)
    VALUES (p_review_id, auth.uid());
    
    -- Update count
    UPDATE public.trip_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = p_review_id;
    
    RETURN true;
  END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_review_helpful"("p_review_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_story_reaction"("p_story_id" "uuid", "p_reaction_type" "public"."reaction_type", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."toggle_story_reaction"("p_story_id" "uuid", "p_reaction_type" "public"."reaction_type", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_guided_trips_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_guided_trips_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_event"("p_event_name" "text", "p_event_category" "text", "p_event_data" "jsonb" DEFAULT '{}'::"jsonb", "p_session_id" "text" DEFAULT NULL::"text", "p_page_url" "text" DEFAULT NULL::"text", "p_referrer_url" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_ip_address" "inet" DEFAULT NULL::"inet") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.analytics_events (
    user_id, session_id, event_name, event_category, 
    event_data, page_url, referrer_url, user_agent, ip_address
  ) VALUES (
    auth.uid(), p_session_id, p_event_name, p_event_category,
    p_event_data, p_page_url, p_referrer_url, p_user_agent, p_ip_address
  ) RETURNING id INTO v_event_id;
  
  -- Update relevant analytics based on event
  CASE p_event_name
    WHEN 'trip_view' THEN
      PERFORM public.increment_trip_analytics(
        (p_event_data->>'trip_id')::uuid, 
        'views'
      );
    WHEN 'trip_join_request' THEN
      PERFORM public.increment_trip_analytics(
        (p_event_data->>'trip_id')::uuid, 
        'join_requests'
      );
    WHEN 'trip_joined' THEN
      PERFORM public.increment_trip_analytics(
        (p_event_data->>'trip_id')::uuid, 
        'conversions'
      );
    WHEN 'trip_share' THEN
      PERFORM public.increment_trip_analytics(
        (p_event_data->>'trip_id')::uuid, 
        'shares'
      );
    WHEN 'trip_save' THEN
      PERFORM public.increment_trip_analytics(
        (p_event_data->>'trip_id')::uuid, 
        'saves'
      );
    ELSE
      -- Do nothing for other events
  END CASE;
  
  RETURN v_event_id;
END;
$$;


ALTER FUNCTION "public"."track_event"("p_event_name" "text", "p_event_category" "text", "p_event_data" "jsonb", "p_session_id" "text", "p_page_url" "text", "p_referrer_url" "text", "p_user_agent" "text", "p_ip_address" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sync_guided_trip_current_participants"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_guided_trip_current_participants(NEW.trip_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.sync_guided_trip_current_participants(NEW.trip_id);
    IF OLD.trip_id IS DISTINCT FROM NEW.trip_id THEN
      PERFORM public.sync_guided_trip_current_participants(OLD.trip_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.sync_guided_trip_current_participants(OLD.trip_id);
    RETURN OLD;
  END IF;
END;
$$;


ALTER FUNCTION "public"."trg_sync_guided_trip_current_participants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_trip_conversations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Delete conversation participants first
  DELETE FROM public.conversation_participants cm
  WHERE cm.conversation_id IN (
    SELECT c.id 
    FROM public.conversations c
    WHERE c.trip_id = OLD.id
  );

  -- Delete messages
  DELETE FROM public.messages m
  WHERE m.conversation_id IN (
    SELECT c.id 
    FROM public.conversations c
    WHERE c.trip_id = OLD.id
  );

  -- Delete conversations
  DELETE FROM public.conversations c
  WHERE c.trip_id = OLD.id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_trip_conversations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_handle_member_leaving"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only handle if user is newly marked as left
  IF OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
    -- Prevent organizer from leaving by checking the OLD role
    IF OLD.role = 'organizer' THEN
      RAISE EXCEPTION 'Trip organizers cannot leave their own trip. Please cancel the trip instead.';
    END IF;
    
    -- For non-organizers, proceed with the leave process
    PERFORM handle_user_leaving_trip(NEW.trip_id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_handle_member_leaving"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_handle_member_leaving"() IS 'Handles when trip members leave, prevents organizers from leaving';



CREATE OR REPLACE FUNCTION "public"."update_agent_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    new_rating DECIMAL(3,2);
    review_count INTEGER;
    target_agent_id UUID;
BEGIN
    -- Determine which agent_id to use based on operation
    IF TG_OP = 'DELETE' THEN
        target_agent_id := OLD.agent_id;
    ELSE
        target_agent_id := NEW.agent_id;
    END IF;
    
    -- Skip if no agent_id
    IF target_agent_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate new rating
    SELECT AVG(rating), COUNT(*)
    INTO new_rating, review_count
    FROM public.reviews
    WHERE agent_id = target_agent_id;
    
    -- Update agent profile
    UPDATE public.agent_profiles
    SET rating = COALESCE(new_rating, 0),
        total_reviews = review_count
    WHERE id = target_agent_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_agent_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_messages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contact_messages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_help_articles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_help_articles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_active_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_active_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_statistics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Update trips organized count
  IF TG_TABLE_NAME = 'trips' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.profiles 
      SET trips_organized = trips_organized + 1 
      WHERE id = NEW.creator_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.profiles 
      SET trips_organized = GREATEST(trips_organized - 1, 0) 
      WHERE id = OLD.creator_id;
    END IF;
  END IF;
  
  -- Update trips joined count
  IF TG_TABLE_NAME = 'trip_members' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.profiles 
      SET trips_joined = trips_joined + 1 
      WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.profiles 
      SET trips_joined = GREATEST(trips_joined - 1, 0) 
      WHERE id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_profile_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tip_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tip_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trip_participants"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.trips 
        SET current_participants = COALESCE(current_participants, 0) + 1
        WHERE id = NEW.trip_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.trips 
        SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
        WHERE id = OLD.trip_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_trip_participants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trip_participants_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_old_trip_id UUID;
    v_new_trip_id UUID;
    v_old_left_at TIMESTAMP WITH TIME ZONE;
    v_new_left_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the relevant trip IDs and left_at values
    IF TG_OP = 'DELETE' THEN
        v_old_trip_id := OLD.trip_id;
        v_old_left_at := OLD.left_at;
    ELSIF TG_OP = 'INSERT' THEN
        v_new_trip_id := NEW.trip_id;
        v_new_left_at := NEW.left_at;
    ELSE -- UPDATE
        v_old_trip_id := OLD.trip_id;
        v_new_trip_id := NEW.trip_id;
        v_old_left_at := OLD.left_at;
        v_new_left_at := NEW.left_at;
    END IF;

    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        -- Only increment if the new member is active (left_at is NULL)
        IF v_new_left_at IS NULL THEN
            UPDATE public.trips 
            SET current_participants = COALESCE(current_participants, 0) + 1
            WHERE id = v_new_trip_id;
            
            RAISE NOTICE 'Incremented participant count for trip % (INSERT)', v_new_trip_id;
        END IF;
        
    -- Handle DELETE
    ELSIF TG_OP = 'DELETE' THEN
        -- Only decrement if the deleted member was active
        IF v_old_left_at IS NULL THEN
            UPDATE public.trips 
            SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
            WHERE id = v_old_trip_id;
            
            RAISE NOTICE 'Decremented participant count for trip % (DELETE)', v_old_trip_id;
        END IF;
        
    -- Handle UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if left_at status changed
        IF (v_old_left_at IS NULL AND v_new_left_at IS NOT NULL) THEN
            -- Member is leaving (left_at changed from NULL to timestamp)
            UPDATE public.trips 
            SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
            WHERE id = v_new_trip_id;
            
            RAISE NOTICE 'Decremented participant count for trip % (member left)', v_new_trip_id;
            
        ELSIF (v_old_left_at IS NOT NULL AND v_new_left_at IS NULL) THEN
            -- Member is rejoining (left_at changed from timestamp to NULL)
            UPDATE public.trips 
            SET current_participants = COALESCE(current_participants, 0) + 1
            WHERE id = v_new_trip_id;
            
            RAISE NOTICE 'Incremented participant count for trip % (member rejoined)', v_new_trip_id;
        END IF;
        
        -- Handle trip_id change (shouldn't normally happen, but just in case)
        IF v_old_trip_id != v_new_trip_id THEN
            IF v_old_left_at IS NULL THEN
                -- Decrement old trip
                UPDATE public.trips 
                SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
                WHERE id = v_old_trip_id;
            END IF;
            
            IF v_new_left_at IS NULL THEN
                -- Increment new trip
                UPDATE public.trips 
                SET current_participants = COALESCE(current_participants, 0) + 1
                WHERE id = v_new_trip_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_trip_participants_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_trip_participants_v2"() IS 'Updates trip participant count, handling soft deletes (left_at) and rejoining';



CREATE OR REPLACE FUNCTION "public"."update_trip_payment_methods_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_trip_payment_methods_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trip_rating_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_avg_rating decimal(3,2);
  v_count integer;
  v_distribution jsonb;
BEGIN
  -- Calculate new statistics
  SELECT 
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*),
    jsonb_object_agg(rating::text, count) 
  INTO v_avg_rating, v_count, v_distribution
  FROM (
    SELECT rating, COUNT(*) as count
    FROM public.trip_reviews
    WHERE trip_id = COALESCE(NEW.trip_id, OLD.trip_id)
    GROUP BY rating
  ) r;
  
  -- Update trip statistics
  UPDATE public.trips
  SET 
    rating_average = COALESCE(v_avg_rating, 0),
    rating_count = COALESCE(v_count, 0),
    rating_distribution = COALESCE(v_distribution, '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb)
  WHERE id = COALESCE(NEW.trip_id, OLD.trip_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_trip_rating_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upload_expense_receipt"("p_file_name" "text", "p_file_data" "bytea", "p_content_type" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_result json;
BEGIN
    -- This function can be called by authenticated users
    -- It bypasses some RLS restrictions
    
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;
    
    -- Return success (actual upload would need to be handled differently)
    RETURN json_build_object(
        'success', true,
        'message', 'Function created successfully',
        'user_id', auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."upload_expense_receipt"("p_file_name" "text", "p_file_data" "bytea", "p_content_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_device_id" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO user_push_tokens (user_id, token, platform, device_id)
  VALUES (auth.uid(), p_token, p_platform, p_device_id)
  ON CONFLICT (token)
  DO UPDATE SET
    user_id = auth.uid(),
    platform = EXCLUDED.platform,
    device_id = EXCLUDED.device_id,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_device_id" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "app"."settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "app"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_admin" boolean DEFAULT false,
    "left_at" timestamp with time zone
);


ALTER TABLE "public"."trip_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."trip_members" IS 'refresh-trip-members';



COMMENT ON COLUMN "public"."trip_members"."left_at" IS 'Timestamp when member left the trip - NULL if still active';



CREATE OR REPLACE VIEW "public"."active_trip_members" AS
 SELECT "id",
    "trip_id",
    "user_id",
    "role",
    "joined_at",
    "is_admin",
    "left_at"
   FROM "public"."trip_members"
  WHERE ("left_at" IS NULL);


ALTER VIEW "public"."active_trip_members" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_trip_members" IS 'Shows only active trip members (excludes those who left)';



CREATE TABLE IF NOT EXISTS "public"."admin_actions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_profiles" (
    "id" "uuid" NOT NULL,
    "business_name" "text",
    "license_number" "text",
    "tax_id" "text",
    "bank_account" "jsonb",
    "commission_rate" numeric(5,2) DEFAULT 15.00,
    "specializations" "text"[],
    "languages" "text"[],
    "years_experience" integer,
    "rating" numeric(3,2) DEFAULT 0.00,
    "total_reviews" integer DEFAULT 0,
    "stripe_account_id" "text",
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."agent_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_id" "uuid",
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "payment_method" "text",
    "stripe_payment_intent_id" "text",
    "stripe_charge_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_revenue" AS
 SELECT "p"."agent_id",
    "date_trunc"('month'::"text", "p"."created_at") AS "month",
    "count"(DISTINCT "p"."id") AS "transaction_count",
    "sum"("p"."amount") AS "gross_revenue",
    "sum"(("p"."amount" * ((1)::numeric - (COALESCE("ap"."commission_rate", (15)::numeric) / (100)::numeric)))) AS "net_revenue",
    "count"(DISTINCT "p"."user_id") AS "unique_customers"
   FROM ("public"."payments" "p"
     JOIN "public"."agent_profiles" "ap" ON (("p"."agent_id" = "ap"."id")))
  WHERE ("p"."status" = 'completed'::"public"."payment_status")
  GROUP BY "p"."agent_id", ("date_trunc"('month'::"text", "p"."created_at"));


ALTER VIEW "public"."agent_revenue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "event_name" "text" NOT NULL,
    "event_category" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "page_url" "text",
    "referrer_url" "text",
    "user_agent" "text",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "payer_id" "uuid" NOT NULL,
    "payee_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "description" "text",
    "settlement_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "balance_settlements_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "balance_settlements_check" CHECK (("payer_id" <> "payee_id"))
);


ALTER TABLE "public"."balance_settlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."balance_settlements" IS 'Records direct payments between users to settle expense balances';



CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "blocked_user_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "blocked_users_check" CHECK (("user_id" <> "blocked_user_id"))
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."booking_status" DEFAULT 'pending'::"public"."booking_status",
    "participants" integer DEFAULT 1,
    "total_price" numeric(10,2) NOT NULL,
    "special_requests" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'unread'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contact_messages_status_check" CHECK (("status" = ANY (ARRAY['unread'::"text", 'read'::"text", 'replied'::"text"])))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."contact_messages" IS 'Contact form submissions - RLS disabled, publicly writable, admin read/update controlled at app level';



CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone,
    "is_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversation_participants" IS 'Participants in conversations with non-recursive RLS policies';



CREATE OR REPLACE VIEW "public"."conversation_participants_detailed" AS
 SELECT "cp"."conversation_id",
    "cp"."user_id",
    "p"."username",
    "p"."full_name",
    "p"."avatar_url",
        CASE
            WHEN ("t"."creator_id" = "cp"."user_id") THEN 'organizer'::"text"
            WHEN ("tm"."role" IS NOT NULL) THEN "tm"."role"
            ELSE 'participant'::"text"
        END AS "role",
    COALESCE("tm"."is_admin", false) AS "is_admin",
    "cp"."created_at" AS "joined_at"
   FROM (((("public"."conversation_participants" "cp"
     JOIN "public"."profiles" "p" ON (("p"."id" = "cp"."user_id")))
     LEFT JOIN "public"."conversations" "c" ON (("c"."id" = "cp"."conversation_id")))
     LEFT JOIN "public"."trips" "t" ON (("c"."trip_id" = "t"."id")))
     LEFT JOIN "public"."trip_members" "tm" ON ((("tm"."trip_id" = "t"."id") AND ("tm"."user_id" = "cp"."user_id"))));


ALTER VIEW "public"."conversation_participants_detailed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."destinations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "popular_activities" "text"[],
    "best_time_to_visit" "text",
    "average_temperature" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."destinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."direct_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "direct_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'file'::"text"])))
);


ALTER TABLE "public"."direct_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discussion_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_reply_id" "uuid",
    "body" "text" NOT NULL,
    "is_accepted_answer" boolean DEFAULT false NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "depth" integer DEFAULT 0 NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "hidden_reason" "text",
    "hidden_at" timestamp with time zone,
    "hidden_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "vote_count_up" integer DEFAULT 0,
    "vote_count_down" integer DEFAULT 0,
    CONSTRAINT "discussion_replies_depth_check" CHECK (("depth" >= 0))
);


ALTER TABLE "public"."discussion_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_tags" (
    "discussion_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."discussion_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reply_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vote_type" character varying(4) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discussion_votes_vote_type_check" CHECK ((("vote_type")::"text" = ANY ((ARRAY['up'::character varying, 'down'::character varying])::"text"[])))
);


ALTER TABLE "public"."discussion_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "category" "public"."discussion_category" DEFAULT 'general'::"public"."discussion_category" NOT NULL,
    "status" "public"."discussion_status" DEFAULT 'open'::"public"."discussion_status" NOT NULL,
    "visibility" "public"."discussion_visibility" DEFAULT 'public'::"public"."discussion_visibility" NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "location_country" "text",
    "location_city" "text",
    "view_count" integer DEFAULT 0 NOT NULL,
    "reply_count" integer DEFAULT 0 NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "bookmark_count" integer DEFAULT 0 NOT NULL,
    "last_activity_at" timestamp with time zone,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "hidden_reason" "text",
    "hidden_at" timestamp with time zone,
    "hidden_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "to_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "template" "text" NOT NULL,
    "template_data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "sent_at" timestamp with time zone,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emote_presets" (
    "id" integer NOT NULL,
    "emote" "text" NOT NULL,
    "label" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text"
);


ALTER TABLE "public"."emote_presets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."emote_presets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."emote_presets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."emote_presets_id_seq" OWNED BY "public"."emote_presets"."id";



CREATE TABLE IF NOT EXISTS "public"."expense_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_owed" numeric(10,2) NOT NULL,
    "is_paid" boolean DEFAULT false,
    "paid_at" timestamp with time zone,
    CONSTRAINT "expense_participants_amount_owed_check" CHECK (("amount_owed" >= (0)::numeric))
);


ALTER TABLE "public"."expense_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_paid" numeric(10,2) NOT NULL,
    CONSTRAINT "expense_payments_amount_paid_check" CHECK (("amount_paid" > (0)::numeric))
);


ALTER TABLE "public"."expense_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."expense_payments" IS 'refresh-expense-payments';



CREATE TABLE IF NOT EXISTS "public"."expense_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "receipt_url" "text" NOT NULL,
    "description" "text",
    "status" "public"."receipt_status" DEFAULT 'pending'::"public"."receipt_status",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."group_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."group_messages_with_profiles" WITH ("security_invoker"='true') AS
 SELECT "gm"."id",
    "gm"."trip_id",
    "gm"."user_id",
    "gm"."message",
    "gm"."created_at",
    "p"."username",
    "p"."avatar_url"
   FROM ("public"."group_messages" "gm"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "gm"."user_id")));


ALTER VIEW "public"."group_messages_with_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_reference" "text" NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "departure_id" "uuid" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "num_participants" integer NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "payment_mode" "text" NOT NULL,
    "payment_plan_snapshot" "jsonb" NOT NULL,
    "booking_status" "public"."guided_booking_status" DEFAULT 'awaiting_payment'::"public"."guided_booking_status" NOT NULL,
    "payment_status" "public"."guided_payment_status" DEFAULT 'unpaid'::"public"."guided_payment_status" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slots_reserved_at" timestamp with time zone,
    CONSTRAINT "guided_bookings_num_participants_check" CHECK (("num_participants" > 0)),
    CONSTRAINT "guided_bookings_payment_mode_check" CHECK (("payment_mode" = ANY (ARRAY['full'::"text", 'deposit_installments'::"text", 'deposit_final'::"text"]))),
    CONSTRAINT "guided_bookings_total_amount_check" CHECK (("total_amount" > (0)::numeric))
);


ALTER TABLE "public"."guided_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_payment_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "payment_schedule_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "payment_intent_id" "text" NOT NULL,
    "payment_status" "public"."guided_record_payment_status" DEFAULT 'pending'::"public"."guided_record_payment_status" NOT NULL,
    "transaction_reference" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guided_payment_records_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."guided_payment_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_payment_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "installment_number" integer NOT NULL,
    "due_date" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_status" "public"."guided_schedule_payment_status" DEFAULT 'pending'::"public"."guided_schedule_payment_status" NOT NULL,
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "transaction_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guided_payment_schedules_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "guided_payment_schedules_installment_number_check" CHECK (("installment_number" > 0))
);


ALTER TABLE "public"."guided_payment_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trip_departure_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "max_capacity" integer DEFAULT 20 NOT NULL,
    "booked_pax" integer DEFAULT 0 NOT NULL,
    "price_per_person" numeric(10,2),
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guided_trip_departure_dates_booked_pax_check" CHECK (("booked_pax" >= 0)),
    CONSTRAINT "guided_trip_departure_dates_date_range_chk" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "guided_trip_departure_dates_max_capacity_check" CHECK (("max_capacity" > 0))
);


ALTER TABLE "public"."guided_trip_departure_dates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trip_exclusions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guided_trip_exclusions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trip_gallery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guided_trip_gallery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trip_inclusions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guided_trip_inclusions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trip_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "place_name" "text" NOT NULL,
    "formatted_address" "text" NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "country" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guided_trip_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trip_qr_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "qr_code_url" "text" NOT NULL,
    "payment_method" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guided_trip_qr_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guided_trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid",
    "agent_id" "uuid",
    "title" "text",
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "duration" integer,
    "trip_duration_days" integer,
    "base_price" numeric,
    "deposit_percentage" integer,
    "max_participants" integer,
    "payment_schedule" "text",
    "booking_terms" "text",
    "refund_policy" "text",
    "min_booking_period" integer,
    "minimum_booking_days" integer,
    "cover_image_url" "text",
    "cover_photo_url" "text",
    "itinerary_text" "text",
    "itinerary_summary" "text",
    "itinerary_file_url" "text",
    "itinerary_document_url" "text",
    "max_installments" integer DEFAULT 6 NOT NULL,
    "allow_installments" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_participants" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "guided_trips_current_participants_check" CHECK (("current_participants" >= 0)),
    CONSTRAINT "guided_trips_max_installments_check" CHECK (("max_installments" > 0))
);


ALTER TABLE "public"."guided_trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."help_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" character varying(255) NOT NULL,
    "category" character varying(100) NOT NULL,
    "title" character varying(255) NOT NULL,
    "content_html" "text" NOT NULL,
    "excerpt" "text",
    "search_keywords" "text",
    "view_count" integer DEFAULT 0,
    "is_published" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."help_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."join_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."join_request_status" DEFAULT 'pending'::"public"."join_request_status",
    "message" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "message_type" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "message_reactions_message_type_check" CHECK (("message_type" = ANY (ARRAY['group_message'::"text", 'announcement'::"text", 'feedback'::"text"])))
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_read_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_read_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "client_id" "uuid",
    "type" character varying(20) DEFAULT 'user'::character varying,
    CONSTRAINT "messages_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['user'::character varying, 'system'::character varying])::"text"[])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moderation_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "moderator_id" "uuid" NOT NULL,
    "content_type" "public"."report_content_type" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "action_type" "public"."moderation_action_type" NOT NULL,
    "reason" "text",
    "report_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."moderation_actions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."notification_counts" AS
 SELECT "type",
    "cnt"
   FROM "public"."get_notification_counts"(( SELECT "auth"."uid"() AS "uid")) "get_notification_counts"("type", "cnt");


ALTER VIEW "public"."notification_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "public"."notification_type" NOT NULL,
    "email_enabled" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT true,
    "in_app_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "title_template" "text" NOT NULL,
    "message_template" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "read" boolean DEFAULT false,
    "action_url" "text",
    "sender_id" "uuid",
    "related_trip_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['join_request'::"text", 'message'::"text", 'expense'::"text", 'trip_update'::"text", 'member_joined'::"text", 'member_left'::"text", 'trip_invite'::"text", 'trip_join_request'::"text", 'trip_join_approved'::"text", 'trip_join_rejected'::"text", 'trip_cancelled'::"text", 'trip_updated'::"text", 'trip_reminder'::"text", 'new_message'::"text", 'new_expense'::"text", 'expense_paid'::"text", 'expense_reminder'::"text", 'new_follower'::"text", 'new_review'::"text", 'new_tip'::"text", 'trip_published'::"text", 'system_announcement'::"text", 'achievement_unlocked'::"text", 'receipt_submitted'::"text", 'receipt_approved'::"text", 'receipt_rejected'::"text", 'trip_settlement_required'::"text", 'story_like'::"text", 'story_comment'::"text", 'discussion_like'::"text", 'discussion_reply'::"text", 'discussion_reply_to_you'::"text", 'discussion_answer_accepted'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "payer_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'MYR'::character varying NOT NULL,
    "message" "text",
    "channels" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_reminders_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."payment_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "title" "text",
    "comment" "text" NOT NULL,
    "pros" "text"[],
    "cons" "text"[],
    "photos" "text"[],
    "is_verified_booking" boolean DEFAULT false,
    "trip_date" "date",
    "helpful_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trip_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."trip_reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."platform_statistics" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."profiles") AS "total_users",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."created_at" >= (CURRENT_DATE - '30 days'::interval))) AS "new_users_30d",
    ( SELECT "count"(*) AS "count"
           FROM "public"."trips"
          WHERE ("trips"."status" = 'published'::"public"."trip_status")) AS "active_trips",
    ( SELECT "count"(*) AS "count"
           FROM "public"."trips"
          WHERE ("trips"."created_at" >= (CURRENT_DATE - '30 days'::interval))) AS "new_trips_30d",
    ( SELECT "sum"(("revenue"."price" * ("revenue"."member_count")::numeric)) AS "sum"
           FROM ( SELECT "t"."price",
                    "count"("tm"."id") AS "member_count"
                   FROM ("public"."trips" "t"
                     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "t"."id")))
                  WHERE ("t"."status" = 'published'::"public"."trip_status")
                  GROUP BY "t"."id", "t"."price") "revenue") AS "total_revenue_potential",
    ( SELECT "count"(*) AS "count"
           FROM "public"."group_messages"
          WHERE ("group_messages"."created_at" >= (CURRENT_DATE - '7 days'::interval))) AS "messages_7d",
    ( SELECT "avg"("trips"."rating_average") AS "avg"
           FROM "public"."trips"
          WHERE ("trips"."rating_count" > 0)) AS "platform_avg_rating",
    ( SELECT "count"(*) AS "count"
           FROM "public"."trip_reviews") AS "total_reviews",
    ( SELECT "json_build_object"('community', "count"(*) FILTER (WHERE ("trips"."type" = 'community'::"public"."trip_type")), 'guided', "count"(*) FILTER (WHERE ("trips"."type" = 'guided'::"public"."trip_type"))) AS "json_build_object"
           FROM "public"."trips"
          WHERE ("trips"."status" = 'published'::"public"."trip_status")) AS "trips_by_type",
    ( SELECT "json_build_object"('traveler', "count"(*) FILTER (WHERE ("profiles"."role" = 'traveler'::"public"."user_role")), 'agent', "count"(*) FILTER (WHERE ("profiles"."role" = 'agent'::"public"."user_role"))) AS "json_build_object"
           FROM "public"."profiles") AS "users_by_role";


ALTER VIEW "public"."platform_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text",
    "content_html" "text",
    "last_updated" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "viewer_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."profile_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_type" "public"."reaction_content_type" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reaction_type" "public"."reaction_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "content_type" "public"."report_content_type" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reason" "public"."report_reason" NOT NULL,
    "details" "text",
    "status" "public"."report_status" DEFAULT 'open'::"public"."report_status" NOT NULL,
    "resolution_notes" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reported_user_id" "uuid",
    "description" "text",
    "reported_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_helpful" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_helpful" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_reports" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."review_statistics" AS
 SELECT "tr"."id" AS "review_id",
    "tr"."trip_id",
    "tr"."user_id",
    "tr"."rating",
    "tr"."created_at",
    "p"."full_name" AS "reviewer_name",
    "p"."avatar_url" AS "reviewer_avatar",
    "t"."title" AS "trip_title",
    "t"."destination" AS "trip_destination",
    "tr"."helpful_count",
    (EXISTS ( SELECT 1
           FROM "public"."review_helpful" "rh"
          WHERE (("rh"."review_id" = "tr"."id") AND ("rh"."user_id" = "auth"."uid"())))) AS "is_helpful_by_me",
    (EXISTS ( SELECT 1
           FROM "public"."trip_members" "tm"
          WHERE (("tm"."trip_id" = "tr"."trip_id") AND ("tm"."user_id" = "tr"."user_id")))) AS "is_verified_member"
   FROM (("public"."trip_reviews" "tr"
     JOIN "public"."profiles" "p" ON (("p"."id" = "tr"."user_id")))
     JOIN "public"."trips" "t" ON (("t"."id" = "tr"."trip_id")));


ALTER VIEW "public"."review_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "agent_id" "uuid",
    "rating" integer NOT NULL,
    "comment" "text",
    "photos" "text"[],
    "is_verified_booking" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_trips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."saved_trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "cover_image_url" "text",
    "content" "jsonb",
    "excerpt" "text",
    "status" "public"."story_status" DEFAULT 'draft'::"public"."story_status" NOT NULL,
    "visibility" "public"."story_visibility" DEFAULT 'public'::"public"."story_visibility" NOT NULL,
    "linked_trip_id" "uuid",
    "location_country" "text",
    "location_city" "text",
    "reading_time_minutes" integer DEFAULT 0,
    "view_count" integer DEFAULT 0 NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "bookmark_count" integer DEFAULT 0 NOT NULL,
    "comment_count" integer DEFAULT 0 NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "hidden_reason" "text",
    "hidden_at" timestamp with time zone,
    "hidden_by" "uuid",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "story_types" "public"."story_type"[] DEFAULT ARRAY[]::"public"."story_type"[],
    "travel_styles" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."story_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "body" "text" NOT NULL,
    "depth" integer DEFAULT 0 NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "is_hidden" boolean DEFAULT false NOT NULL,
    "hidden_reason" "text",
    "hidden_at" timestamp with time zone,
    "hidden_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "story_comments_depth_check" CHECK (("depth" >= 0))
);


ALTER TABLE "public"."story_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."story_tags" (
    "story_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."story_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "message" "text",
    "payment_intent_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "tips_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."tips" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."tip_analytics" AS
 SELECT "t"."to_user_id" AS "user_id",
    "p"."full_name",
    "p"."avatar_url",
    "count"(DISTINCT "t"."id") AS "total_tips_received",
    "count"(DISTINCT "t"."from_user_id") AS "unique_tippers",
    "count"(DISTINCT "t"."trip_id") AS "trips_with_tips",
    "sum"(
        CASE
            WHEN ("t"."payment_status" = 'completed'::"text") THEN "t"."amount"
            ELSE (0)::numeric
        END) AS "total_amount_received",
    "avg"(
        CASE
            WHEN ("t"."payment_status" = 'completed'::"text") THEN "t"."amount"
            ELSE NULL::numeric
        END) AS "average_tip_amount",
    "max"("t"."created_at") AS "last_tip_received"
   FROM ("public"."tips" "t"
     JOIN "public"."profiles" "p" ON (("p"."id" = "t"."to_user_id")))
  WHERE ("t"."payment_status" = 'completed'::"text")
  GROUP BY "t"."to_user_id", "p"."full_name", "p"."avatar_url";


ALTER VIEW "public"."tip_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tip_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "is_enabled" boolean DEFAULT true,
    "suggested_amounts" numeric(10,2)[] DEFAULT ARRAY[5.00, 10.00, 20.00],
    "custom_message" "text",
    "stripe_account_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tip_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "views" integer DEFAULT 0,
    "unique_visitors" integer DEFAULT 0,
    "join_requests" integer DEFAULT 0,
    "conversions" integer DEFAULT 0,
    "shares" integer DEFAULT 0,
    "saves" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_announcements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "emote" "text",
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."trip_announcements" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trip_announcements_with_reactions" AS
 WITH "reaction_summary" AS (
         SELECT "mr"."message_id",
            "mr"."reaction",
            "count"(*) AS "reaction_count",
            "jsonb_agg"("jsonb_build_object"('user_id', "u"."id", 'username', "u"."username", 'full_name', "u"."full_name")) AS "users"
           FROM ("public"."message_reactions" "mr"
             JOIN "public"."profiles" "u" ON (("u"."id" = "mr"."user_id")))
          WHERE ("mr"."message_type" = 'announcement'::"text")
          GROUP BY "mr"."message_id", "mr"."reaction"
        )
 SELECT "ta"."id",
    "ta"."trip_id",
    "ta"."user_id",
    "ta"."message",
    "ta"."emote",
    "ta"."is_pinned",
    "ta"."created_at",
    "p"."username",
    "p"."full_name",
    "p"."avatar_url",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('reaction', "rs"."reaction", 'count', "rs"."reaction_count", 'users', "rs"."users")) AS "jsonb_agg"
           FROM "reaction_summary" "rs"
          WHERE ("rs"."message_id" = "ta"."id")), '[]'::"jsonb") AS "reactions"
   FROM ("public"."trip_announcements" "ta"
     JOIN "public"."profiles" "p" ON (("p"."id" = "ta"."user_id")));


ALTER VIEW "public"."trip_announcements_with_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."trip_categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trip_details" AS
 SELECT "t"."id",
    "t"."creator_id",
    "t"."type",
    "t"."status",
    "t"."title",
    "t"."description",
    "t"."destination",
    "t"."cover_image",
    "t"."images",
    "t"."start_date",
    "t"."end_date",
    "t"."price",
    "t"."currency",
    "t"."max_participants",
    "t"."current_participants",
    "t"."itinerary",
    "t"."included_items",
    "t"."excluded_items",
    "t"."requirements",
    "t"."cancellation_policy",
    "t"."tags",
    "t"."is_featured",
    "t"."view_count",
    "t"."created_at",
    "t"."updated_at",
    "t"."meeting_point",
    "t"."difficulty_level",
    "t"."payment_terms",
    "t"."faqs",
    "t"."rating_average",
    "t"."rating_count",
    "t"."rating_distribution",
    "t"."psa",
    "t"."tip_services",
    "t"."payment_qr_code",
    "t"."budget_breakdown",
    "p"."username" AS "creator_username",
    "p"."full_name" AS "creator_name",
    "p"."avatar_url" AS "creator_avatar",
    "p"."role" AS "creator_role",
    "ap"."business_name",
    "ap"."rating" AS "agent_rating",
    "ap"."total_reviews" AS "agent_reviews",
    COALESCE("tm"."member_count", (0)::bigint) AS "member_count",
    COALESCE("tr"."review_count", (0)::bigint) AS "review_count",
    COALESCE("tr"."average_rating", (0)::numeric) AS "average_rating",
    "c"."id" AS "conversation_id"
   FROM ((((("public"."trips" "t"
     LEFT JOIN "public"."profiles" "p" ON (("t"."creator_id" = "p"."id")))
     LEFT JOIN "public"."agent_profiles" "ap" ON ((("ap"."id" = "p"."id") AND ("t"."type" = 'guided'::"public"."trip_type"))))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "member_count"
           FROM "public"."trip_members"
          WHERE ("trip_members"."trip_id" = "t"."id")) "tm" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "review_count",
            "avg"("trip_reviews"."rating") AS "average_rating"
           FROM "public"."trip_reviews"
          WHERE ("trip_reviews"."trip_id" = "t"."id")) "tr" ON (true))
     LEFT JOIN "public"."conversations" "c" ON (("c"."trip_id" = "t"."id")));


ALTER VIEW "public"."trip_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "category" character varying(50) NOT NULL,
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "receipt_url" "text",
    "notes" "text",
    "original_currency" character varying(3),
    "fx_rate_to_home" numeric(12,6),
    "converted_amount_home" numeric(10,2),
    "home_currency" character varying(3),
    CONSTRAINT "trip_expenses_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."trip_expenses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trip_expenses"."original_currency" IS 'Currency used when expense was created (e.g., USD, EUR, IDR)';



COMMENT ON COLUMN "public"."trip_expenses"."fx_rate_to_home" IS 'Exchange rate from original_currency to home_currency at time of creation';



COMMENT ON COLUMN "public"."trip_expenses"."converted_amount_home" IS 'Expense amount converted to home currency for tracking';



COMMENT ON COLUMN "public"."trip_expenses"."home_currency" IS 'User home currency at time of expense creation (for settlement calculations)';



CREATE OR REPLACE VIEW "public"."trip_expenses_detailed" AS
 SELECT "te"."id",
    "te"."trip_id",
    "te"."created_by",
    "te"."description",
    "te"."amount",
    "te"."currency",
    "te"."category",
    "te"."expense_date",
    "te"."created_at",
    "te"."updated_at",
    "te"."is_deleted",
    "te"."receipt_url",
    "te"."notes",
    "te"."original_currency",
    "te"."fx_rate_to_home",
    "te"."converted_amount_home",
    "te"."home_currency",
    "p"."full_name" AS "creator_name",
    "p"."avatar_url" AS "creator_avatar",
    "p"."username" AS "creator_username",
    ( SELECT "json_agg"("json_build_object"('user_id', "ep"."user_id", 'amount_owed', "ep"."amount_owed", 'is_paid', "ep"."is_paid", 'paid_at', "ep"."paid_at", 'user_name', "pr"."full_name", 'user_avatar', "pr"."avatar_url")) AS "json_agg"
           FROM ("public"."expense_participants" "ep"
             JOIN "public"."profiles" "pr" ON (("pr"."id" = "ep"."user_id")))
          WHERE ("ep"."expense_id" = "te"."id")) AS "participants",
    ( SELECT "json_agg"("json_build_object"('user_id', "epay"."user_id", 'amount_paid', "epay"."amount_paid", 'user_name', "pr"."full_name", 'user_avatar', "pr"."avatar_url")) AS "json_agg"
           FROM ("public"."expense_payments" "epay"
             JOIN "public"."profiles" "pr" ON (("pr"."id" = "epay"."user_id")))
          WHERE ("epay"."expense_id" = "te"."id")) AS "payers"
   FROM ("public"."trip_expenses" "te"
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "te"."created_by")))
  WHERE ("te"."is_deleted" = false);


ALTER VIEW "public"."trip_expenses_detailed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer,
    "feedback" "text",
    "highlights" "text"[],
    "improvements" "text"[],
    "would_recommend" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "trip_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."trip_feedback" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trip_feedback_with_users" AS
 SELECT "tf"."id",
    "tf"."trip_id",
    "tf"."user_id",
    "tf"."rating",
    "tf"."feedback",
    "tf"."highlights",
    "tf"."improvements",
    "tf"."would_recommend",
    "tf"."created_at",
    "tf"."updated_at",
    "p"."username",
    "p"."full_name",
    "p"."avatar_url"
   FROM ("public"."trip_feedback" "tf"
     JOIN "public"."profiles" "p" ON (("p"."id" = "tf"."user_id")));


ALTER VIEW "public"."trip_feedback_with_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "invitee_user_id" "uuid",
    "status" "public"."trip_invite_status" DEFAULT 'pending'::"public"."trip_invite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone
);


ALTER TABLE "public"."trip_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" DEFAULT '''''::text'::"text" NOT NULL,
    "blocks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "qr_code_url" "text",
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_payment_methods" OWNER TO "postgres";


COMMENT ON TABLE "public"."trip_payment_methods" IS 'Stores payment methods and QR codes for trip expense collection. Each trip member can add their own payment methods.';



CREATE OR REPLACE VIEW "public"."trip_performance_overview" AS
SELECT
    NULL::"uuid" AS "trip_id",
    NULL::"text" AS "title",
    NULL::"text" AS "destination",
    NULL::"public"."trip_status" AS "status",
    NULL::"date" AS "start_date",
    NULL::"date" AS "end_date",
    NULL::"uuid" AS "creator_id",
    NULL::integer AS "max_participants",
    NULL::numeric(10,2) AS "price",
    NULL::numeric(3,2) AS "rating_average",
    NULL::integer AS "rating_count",
    NULL::bigint AS "total_views",
    NULL::bigint AS "total_unique_visitors",
    NULL::bigint AS "total_join_requests",
    NULL::bigint AS "total_conversions",
    NULL::bigint AS "total_shares",
    NULL::bigint AS "total_saves",
    NULL::numeric AS "conversion_rate",
    NULL::bigint AS "current_participants",
    NULL::numeric AS "occupancy_rate";


ALTER VIEW "public"."trip_performance_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_photos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "caption" "text",
    "is_featured" boolean DEFAULT false,
    "uploaded_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."trip_photos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trip_photos_with_users" AS
 SELECT "tp"."id",
    "tp"."trip_id",
    "tp"."user_id",
    "tp"."photo_url",
    "tp"."caption",
    "tp"."is_featured",
    "tp"."uploaded_at",
    "p"."username",
    "p"."full_name",
    "p"."avatar_url"
   FROM ("public"."trip_photos" "tp"
     JOIN "public"."profiles" "p" ON (("p"."id" = "tp"."user_id")));


ALTER VIEW "public"."trip_photos_with_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_reminders_scheduled" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "sent" boolean DEFAULT false,
    "sent_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "trip_reminders_scheduled_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['7_days'::"text", '3_days'::"text", '1_day'::"text", 'trip_end'::"text"])))
);


ALTER TABLE "public"."trip_reminders_scheduled" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trip_tip_summary" AS
 SELECT "t"."id" AS "trip_id",
    "t"."title" AS "trip_title",
    "t"."creator_id",
    "count"(DISTINCT "tips"."id") AS "total_tips",
    "count"(DISTINCT "tips"."from_user_id") AS "unique_tippers",
    "sum"(
        CASE
            WHEN ("tips"."payment_status" = 'completed'::"text") THEN "tips"."amount"
            ELSE (0)::numeric
        END) AS "total_amount",
    "max"("tips"."created_at") AS "last_tip_date"
   FROM ("public"."trips" "t"
     LEFT JOIN "public"."tips" ON (("tips"."trip_id" = "t"."id")))
  GROUP BY "t"."id", "t"."title", "t"."creator_id";


ALTER VIEW "public"."trip_tip_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."unread_message_counts" AS
 SELECT "cp"."user_id",
    "cp"."conversation_id",
    "c"."trip_id",
    "count"("m"."id") FILTER (WHERE ("m"."created_at" > COALESCE("cp"."last_read_at", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone))) AS "unread_count"
   FROM (("public"."conversation_participants" "cp"
     JOIN "public"."conversations" "c" ON (("c"."id" = "cp"."conversation_id")))
     LEFT JOIN "public"."messages" "m" ON ((("m"."conversation_id" = "cp"."conversation_id") AND ("m"."sender_id" <> "cp"."user_id") AND ("m"."created_at" > COALESCE("cp"."last_read_at", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone)))))
  GROUP BY "cp"."user_id", "cp"."conversation_id", "c"."trip_id";


ALTER VIEW "public"."unread_message_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_cancelled_trips" AS
 SELECT "t"."id",
    "t"."creator_id",
    "t"."type",
    "t"."status",
    "t"."title",
    "t"."description",
    "t"."destination",
    "t"."cover_image",
    "t"."images",
    "t"."start_date",
    "t"."end_date",
    "t"."price",
    "t"."currency",
    "t"."max_participants",
    "t"."current_participants",
    "t"."itinerary",
    "t"."included_items",
    "t"."excluded_items",
    "t"."requirements",
    "t"."cancellation_policy",
    "t"."tags",
    "t"."is_featured",
    "t"."view_count",
    "t"."created_at",
    "t"."updated_at",
    "t"."meeting_point",
    "t"."difficulty_level",
    "t"."payment_terms",
    "t"."faqs",
    "t"."rating_average",
    "t"."rating_count",
    "t"."rating_distribution",
    "t"."psa",
    "t"."tip_services",
    "t"."payment_qr_code",
        CASE
            WHEN ("t"."creator_id" = "auth"."uid"()) THEN 'creator'::"text"
            WHEN ("tm"."user_id" = "auth"."uid"()) THEN 'member'::"text"
            WHEN ("b"."user_id" = "auth"."uid"()) THEN 'booked'::"text"
            ELSE NULL::"text"
        END AS "user_role",
    "tm"."joined_at",
    "b"."status" AS "booking_status",
    "b"."participants" AS "booked_participants",
    "c"."id" AS "conversation_id",
    "t"."updated_at" AS "cancelled_at"
   FROM ((("public"."trips" "t"
     LEFT JOIN "public"."trip_members" "tm" ON ((("t"."id" = "tm"."trip_id") AND ("tm"."user_id" = "auth"."uid"()))))
     LEFT JOIN "public"."bookings" "b" ON ((("t"."id" = "b"."trip_id") AND ("b"."user_id" = "auth"."uid"()))))
     LEFT JOIN "public"."conversations" "c" ON (("t"."id" = "c"."trip_id")))
  WHERE ((("t"."creator_id" = "auth"."uid"()) OR ("tm"."user_id" = "auth"."uid"()) OR ("b"."user_id" = "auth"."uid"())) AND ("t"."status" = 'cancelled'::"public"."trip_status"))
  ORDER BY "t"."updated_at" DESC;


ALTER VIEW "public"."user_cancelled_trips" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_cancelled_trips" IS 'Shows only cancelled trips for the current user (as creator, member, or with booking)';



CREATE TABLE IF NOT EXISTS "public"."user_destinations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(255) NOT NULL,
    "country" character varying(255) NOT NULL,
    "image" "text" NOT NULL,
    "description" "text" NOT NULL,
    "long_description" "text",
    "rating" numeric(2,1) DEFAULT 0,
    "popular_activities" "text"[],
    "best_time_to_visit" character varying(255),
    "featured" boolean DEFAULT false,
    "continent" character varying(50),
    "climate" character varying(100),
    "language" character varying(255),
    "currency" character varying(255),
    "time_zone" character varying(50),
    "top_attractions" "text"[],
    "local_cuisine" "text"[],
    "travel_tips" "text"[],
    "photos" "text"[],
    "is_user_generated" boolean DEFAULT true,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "moderation_notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "approved_at" timestamp without time zone,
    "approved_by" "uuid"
);


ALTER TABLE "public"."user_destinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_engagement" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "login_count" integer DEFAULT 0,
    "trips_viewed" integer DEFAULT 0,
    "messages_sent" integer DEFAULT 0,
    "trips_created" integer DEFAULT 0,
    "trips_joined" integer DEFAULT 0,
    "total_session_duration" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_engagement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_follows_check" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_inspirations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" character varying(255) NOT NULL,
    "country" character varying(255) NOT NULL,
    "image" "text" NOT NULL,
    "description" "text" NOT NULL,
    "long_description" "text",
    "rating" numeric(2,1) DEFAULT 0,
    "popular_activities" "text"[],
    "best_time_to_visit" character varying(255),
    "featured" boolean DEFAULT false,
    "continent" character varying(50),
    "climate" character varying(100),
    "language" character varying(255),
    "currency" character varying(255),
    "time_zone" character varying(50),
    "top_attractions" "text"[],
    "local_cuisine" "text"[],
    "travel_tips" "text"[],
    "photos" "text"[],
    "is_user_generated" boolean DEFAULT true,
    "status" character varying(50) DEFAULT 'approved'::character varying,
    "moderation_notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "approved_at" timestamp without time zone,
    "approved_by" "uuid"
);


ALTER TABLE "public"."user_inspirations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_inspirations_with_user" AS
 SELECT "ui"."id",
    "ui"."user_id",
    "ui"."name",
    "ui"."country",
    "ui"."image",
    "ui"."description",
    "ui"."long_description",
    "ui"."rating",
    "ui"."popular_activities",
    "ui"."best_time_to_visit",
    "ui"."featured",
    "ui"."continent",
    "ui"."climate",
    "ui"."language",
    "ui"."currency",
    "ui"."time_zone",
    "ui"."top_attractions",
    "ui"."local_cuisine",
    "ui"."travel_tips",
    "ui"."photos",
    "ui"."is_user_generated",
    "ui"."status",
    "ui"."moderation_notes",
    "ui"."created_at",
    "ui"."updated_at",
    "ui"."approved_at",
    "ui"."approved_by",
    "p"."username",
    "p"."avatar_url"
   FROM ("public"."user_inspirations" "ui"
     LEFT JOIN "public"."profiles" "p" ON (("ui"."user_id" = "p"."id")));


ALTER VIEW "public"."user_inspirations_with_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "device_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_statistics" AS
 SELECT "id" AS "user_id",
    "full_name",
    "username",
    "avatar_url",
    "is_verified",
    "countries_visited",
    "trips_organized",
    "trips_joined",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_follows"
          WHERE ("user_follows"."following_id" = "p"."id")) AS "followers_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_follows"
          WHERE ("user_follows"."follower_id" = "p"."id")) AS "following_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."trips"
          WHERE (("trips"."creator_id" = "p"."id") AND ("trips"."status" = 'published'::"public"."trip_status"))) AS "published_trips_count",
    ( SELECT "count"(DISTINCT "trip_members"."trip_id") AS "count"
           FROM "public"."trip_members"
          WHERE ("trip_members"."user_id" = "p"."id")) AS "total_trips_count",
    (0)::numeric AS "average_rating",
    (0)::bigint AS "total_reviews"
   FROM "public"."profiles" "p"
  WHERE (("is_deleted" = false) OR ("is_deleted" IS NULL));


ALTER VIEW "public"."user_statistics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_trip_join_status" AS
 SELECT DISTINCT ON ("user_id", "trip_id") "user_id",
    "trip_id",
    "id" AS "request_id",
    "status",
    "message",
    "created_at",
    "reviewed_at",
    "reviewed_by"
   FROM "public"."join_requests"
  ORDER BY "user_id", "trip_id", "created_at" DESC;


ALTER VIEW "public"."user_trip_join_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_trip_join_status" IS 'Shows the most recent join request status for each user/trip combination';



CREATE OR REPLACE VIEW "public"."user_trips" AS
 SELECT "t"."id",
    "t"."creator_id",
    "t"."type",
    "t"."status",
    "t"."title",
    "t"."description",
    "t"."destination",
    "t"."cover_image",
    "t"."images",
    "t"."start_date",
    "t"."end_date",
    "t"."price",
    "t"."currency",
    "t"."max_participants",
    "t"."current_participants",
    "t"."itinerary",
    "t"."included_items",
    "t"."excluded_items",
    "t"."requirements",
    "t"."cancellation_policy",
    "t"."tags",
    "t"."is_featured",
    "t"."view_count",
    "t"."created_at",
    "t"."updated_at",
    "t"."meeting_point",
    "t"."difficulty_level",
    "t"."payment_terms",
    "t"."faqs",
    "t"."rating_average",
    "t"."rating_count",
    "t"."rating_distribution",
    "t"."psa",
    "t"."tip_services",
    "t"."payment_qr_code",
        CASE
            WHEN ("t"."creator_id" = "auth"."uid"()) THEN 'creator'::"text"
            WHEN ("tm"."user_id" = "auth"."uid"()) THEN 'member'::"text"
            WHEN ("b"."user_id" = "auth"."uid"()) THEN 'booked'::"text"
            ELSE NULL::"text"
        END AS "user_role",
    "tm"."joined_at",
    "b"."status" AS "booking_status",
    "b"."participants" AS "booked_participants",
    "c"."id" AS "conversation_id"
   FROM ((("public"."trips" "t"
     LEFT JOIN "public"."trip_members" "tm" ON ((("t"."id" = "tm"."trip_id") AND ("tm"."user_id" = "auth"."uid"()))))
     LEFT JOIN "public"."bookings" "b" ON ((("t"."id" = "b"."trip_id") AND ("b"."user_id" = "auth"."uid"()))))
     LEFT JOIN "public"."conversations" "c" ON (("t"."id" = "c"."trip_id")))
  WHERE ((("t"."creator_id" = "auth"."uid"()) OR ("tm"."user_id" = "auth"."uid"()) OR ("b"."user_id" = "auth"."uid"())) AND ("t"."status" <> 'cancelled'::"public"."trip_status"));


ALTER VIEW "public"."user_trips" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_trips" IS 'Shows trips for the current user (as creator, member, or with booking), excluding cancelled trips';



ALTER TABLE ONLY "public"."emote_presets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."emote_presets_id_seq"'::"regclass");



ALTER TABLE ONLY "app"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_settlements"
    ADD CONSTRAINT "balance_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_user_id_blocked_user_id_key" UNIQUE ("user_id", "blocked_user_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."destinations"
    ADD CONSTRAINT "destinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_tags"
    ADD CONSTRAINT "discussion_tags_pkey" PRIMARY KEY ("discussion_id", "tag_id");



ALTER TABLE ONLY "public"."discussion_votes"
    ADD CONSTRAINT "discussion_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_votes"
    ADD CONSTRAINT "discussion_votes_reply_id_user_id_key" UNIQUE ("reply_id", "user_id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emote_presets"
    ADD CONSTRAINT "emote_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_expense_id_user_id_key" UNIQUE ("expense_id", "user_id");



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_payments"
    ADD CONSTRAINT "expense_payments_expense_id_user_id_key" UNIQUE ("expense_id", "user_id");



ALTER TABLE ONLY "public"."expense_payments"
    ADD CONSTRAINT "expense_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_receipts"
    ADD CONSTRAINT "expense_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_messages"
    ADD CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_bookings"
    ADD CONSTRAINT "guided_bookings_booking_reference_key" UNIQUE ("booking_reference");



ALTER TABLE ONLY "public"."guided_bookings"
    ADD CONSTRAINT "guided_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_payment_records"
    ADD CONSTRAINT "guided_payment_records_payment_intent_id_key" UNIQUE ("payment_intent_id");



ALTER TABLE ONLY "public"."guided_payment_records"
    ADD CONSTRAINT "guided_payment_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_payment_schedules"
    ADD CONSTRAINT "guided_payment_schedules_booking_id_installment_number_key" UNIQUE ("booking_id", "installment_number");



ALTER TABLE ONLY "public"."guided_payment_schedules"
    ADD CONSTRAINT "guided_payment_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trip_departure_dates"
    ADD CONSTRAINT "guided_trip_departure_dates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trip_exclusions"
    ADD CONSTRAINT "guided_trip_exclusions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trip_gallery"
    ADD CONSTRAINT "guided_trip_gallery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trip_inclusions"
    ADD CONSTRAINT "guided_trip_inclusions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trip_locations"
    ADD CONSTRAINT "guided_trip_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trip_qr_codes"
    ADD CONSTRAINT "guided_trip_qr_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guided_trips"
    ADD CONSTRAINT "guided_trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_articles"
    ADD CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."help_articles"
    ADD CONSTRAINT "help_articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_message_type_user_id_reaction_key" UNIQUE ("message_id", "message_type", "user_id", "reaction");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_read_status"
    ADD CONSTRAINT "message_read_status_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_read_status"
    ADD CONSTRAINT "message_read_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moderation_actions"
    ADD CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_type_key" UNIQUE ("type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_user_id_content_type_content_id_reaction_type_key" UNIQUE ("user_id", "content_type", "content_id", "reaction_type");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_helpful"
    ADD CONSTRAINT "review_helpful_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_helpful"
    ADD CONSTRAINT "review_helpful_review_id_user_id_key" UNIQUE ("review_id", "user_id");



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_review_id_reporter_id_key" UNIQUE ("review_id", "reporter_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_trip_id_reviewer_id_key" UNIQUE ("trip_id", "reviewer_id");



ALTER TABLE ONLY "public"."saved_trips"
    ADD CONSTRAINT "saved_trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_trips"
    ADD CONSTRAINT "saved_trips_user_id_trip_id_key" UNIQUE ("user_id", "trip_id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."story_comments"
    ADD CONSTRAINT "story_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_tags"
    ADD CONSTRAINT "story_tags_pkey" PRIMARY KEY ("story_id", "tag_id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tip_settings"
    ADD CONSTRAINT "tip_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tip_settings"
    ADD CONSTRAINT "tip_settings_user_id_trip_id_key" UNIQUE ("user_id", "trip_id");



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_analytics"
    ADD CONSTRAINT "trip_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_analytics"
    ADD CONSTRAINT "trip_analytics_trip_id_date_key" UNIQUE ("trip_id", "date");



ALTER TABLE ONLY "public"."trip_announcements"
    ADD CONSTRAINT "trip_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_categories"
    ADD CONSTRAINT "trip_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."trip_categories"
    ADD CONSTRAINT "trip_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_expenses"
    ADD CONSTRAINT "trip_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_feedback"
    ADD CONSTRAINT "trip_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_feedback"
    ADD CONSTRAINT "trip_feedback_trip_id_user_id_key" UNIQUE ("trip_id", "user_id");



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_trip_id_user_id_key" UNIQUE ("trip_id", "user_id");



ALTER TABLE ONLY "public"."trip_notes"
    ADD CONSTRAINT "trip_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_payment_methods"
    ADD CONSTRAINT "trip_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_reminders_scheduled"
    ADD CONSTRAINT "trip_reminders_scheduled_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_trip_id_user_id_key" UNIQUE ("trip_id", "user_id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."trip_payment_methods"
    ADD CONSTRAINT "unique_default_per_trip" EXCLUDE USING "btree" ("trip_id" WITH =) WHERE (("is_default" = true));



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_destinations"
    ADD CONSTRAINT "user_destinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_engagement"
    ADD CONSTRAINT "user_engagement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_engagement"
    ADD CONSTRAINT "user_engagement_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_inspirations"
    ADD CONSTRAINT "user_inspirations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_token_key" UNIQUE ("token");



CREATE INDEX "conversation_participants_conversation_id_user_id_idx" ON "public"."conversation_participants" USING "btree" ("conversation_id", "user_id");



CREATE INDEX "idx_admin_actions_trip_id" ON "public"."admin_actions" USING "btree" ("trip_id");



CREATE INDEX "idx_analytics_events_created_at" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_events_event_name" ON "public"."analytics_events" USING "btree" ("event_name");



CREATE INDEX "idx_analytics_events_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_balance_settlements_payee_id" ON "public"."balance_settlements" USING "btree" ("payee_id");



CREATE INDEX "idx_balance_settlements_payer_id" ON "public"."balance_settlements" USING "btree" ("payer_id");



CREATE INDEX "idx_balance_settlements_trip_id" ON "public"."balance_settlements" USING "btree" ("trip_id");



CREATE INDEX "idx_blocked_users_blocked_user_id" ON "public"."blocked_users" USING "btree" ("blocked_user_id");



CREATE INDEX "idx_blocked_users_created_at" ON "public"."blocked_users" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_blocked_users_user_id" ON "public"."blocked_users" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_bookings_trip_id" ON "public"."bookings" USING "btree" ("trip_id");



CREATE INDEX "idx_bookings_user_id" ON "public"."bookings" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_user_id_trip_id" ON "public"."bookings" USING "btree" ("user_id", "trip_id");



CREATE INDEX "idx_bookings_user_status" ON "public"."bookings" USING "btree" ("user_id", "status");



CREATE INDEX "idx_contact_messages_created_at" ON "public"."contact_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contact_messages_status" ON "public"."contact_messages" USING "btree" ("status");



CREATE INDEX "idx_conversation_participants_conversation_id" ON "public"."conversation_participants" USING "btree" ("conversation_id");



COMMENT ON INDEX "public"."idx_conversation_participants_conversation_id" IS 'Optimize fetching participants for a conversation';



CREATE INDEX "idx_conversation_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_conversation_participants_user_conversation" ON "public"."conversation_participants" USING "btree" ("user_id", "conversation_id");



CREATE INDEX "idx_conversation_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");



COMMENT ON INDEX "public"."idx_conversation_participants_user_id" IS 'Optimize fetching conversations for a user';



CREATE INDEX "idx_conversation_participants_user_last_read" ON "public"."conversation_participants" USING "btree" ("user_id", "conversation_id", "last_read_at");



COMMENT ON INDEX "public"."idx_conversation_participants_user_last_read" IS 'Optimizes last read timestamp queries';



CREATE INDEX "idx_conversations_direct_active" ON "public"."conversations" USING "btree" ("conversation_type", "is_deleted") WHERE (("conversation_type" = 'direct'::"text") AND ("is_deleted" = false));



CREATE INDEX "idx_conversations_direct_users" ON "public"."conversations" USING "btree" ("user1_id", "user2_id") WHERE ("conversation_type" = 'direct'::"text");



CREATE INDEX "idx_conversations_is_deleted" ON "public"."conversations" USING "btree" ("is_deleted");



CREATE INDEX "idx_conversations_metadata" ON "public"."conversations" USING "gin" ("metadata");



CREATE INDEX "idx_conversations_trip" ON "public"."conversations" USING "btree" ("trip_id");



CREATE INDEX "idx_conversations_trip_id" ON "public"."conversations" USING "btree" ("trip_id") WHERE ("trip_id" IS NOT NULL);



CREATE INDEX "idx_conversations_trip_type" ON "public"."conversations" USING "btree" ("trip_id", "conversation_type") WHERE ("trip_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_conversations_trip_type" IS 'Optimize fetching conversation by trip and type';



CREATE INDEX "idx_conversations_type" ON "public"."conversations" USING "btree" ("conversation_type");



CREATE INDEX "idx_conversations_type_trip" ON "public"."conversations" USING "btree" ("conversation_type", "trip_id") WHERE ("conversation_type" = 'trip_group'::"text");



CREATE INDEX "idx_conversations_updated_at" ON "public"."conversations" USING "btree" ("updated_at");



CREATE INDEX "idx_conversations_user1_user2" ON "public"."conversations" USING "btree" ("user1_id", "user2_id");



CREATE INDEX "idx_direct_messages_conversation_id" ON "public"."direct_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_direct_messages_created_at" ON "public"."direct_messages" USING "btree" ("created_at");



CREATE INDEX "idx_direct_messages_sender_id" ON "public"."direct_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_discussion_replies_deleted" ON "public"."discussion_replies" USING "btree" ("deleted_at");



CREATE INDEX "idx_discussion_replies_discussion" ON "public"."discussion_replies" USING "btree" ("discussion_id");



CREATE INDEX "idx_discussion_replies_parent" ON "public"."discussion_replies" USING "btree" ("parent_reply_id");



CREATE INDEX "idx_discussion_votes_reply_id" ON "public"."discussion_votes" USING "btree" ("reply_id");



CREATE INDEX "idx_discussion_votes_reply_vote_type" ON "public"."discussion_votes" USING "btree" ("reply_id", "vote_type");



CREATE INDEX "idx_discussion_votes_user_id" ON "public"."discussion_votes" USING "btree" ("user_id");



CREATE INDEX "idx_discussions_author" ON "public"."discussions" USING "btree" ("author_id");



CREATE INDEX "idx_discussions_deleted" ON "public"."discussions" USING "btree" ("deleted_at");



CREATE INDEX "idx_discussions_hidden" ON "public"."discussions" USING "btree" ("is_hidden");



CREATE INDEX "idx_discussions_last_activity" ON "public"."discussions" USING "btree" ("last_activity_at" DESC);



CREATE INDEX "idx_discussions_status_visibility" ON "public"."discussions" USING "btree" ("status", "visibility");



CREATE INDEX "idx_email_queue_created_at" ON "public"."email_queue" USING "btree" ("created_at");



CREATE INDEX "idx_email_queue_status" ON "public"."email_queue" USING "btree" ("status");



CREATE INDEX "idx_expense_payments_expense_id" ON "public"."expense_payments" USING "btree" ("expense_id");



CREATE INDEX "idx_expense_payments_user" ON "public"."expense_payments" USING "btree" ("user_id");



CREATE INDEX "idx_group_messages_created_at" ON "public"."group_messages" USING "btree" ("created_at");



CREATE INDEX "idx_group_messages_trip_id" ON "public"."group_messages" USING "btree" ("trip_id");



CREATE INDEX "idx_group_messages_user_id" ON "public"."group_messages" USING "btree" ("user_id");



CREATE INDEX "idx_guided_bookings_departure_id" ON "public"."guided_bookings" USING "btree" ("departure_id");



CREATE INDEX "idx_guided_bookings_email" ON "public"."guided_bookings" USING "btree" ("customer_email");



CREATE INDEX "idx_guided_bookings_reference" ON "public"."guided_bookings" USING "btree" ("booking_reference");



CREATE INDEX "idx_guided_bookings_trip_id" ON "public"."guided_bookings" USING "btree" ("trip_id");



CREATE INDEX "idx_guided_payment_records_booking_id" ON "public"."guided_payment_records" USING "btree" ("booking_id");



CREATE INDEX "idx_guided_payment_records_intent_id" ON "public"."guided_payment_records" USING "btree" ("payment_intent_id");



CREATE INDEX "idx_guided_payment_schedules_booking_id" ON "public"."guided_payment_schedules" USING "btree" ("booking_id");



CREATE INDEX "idx_guided_trips_agent_id" ON "public"."guided_trips" USING "btree" ("agent_id");



CREATE INDEX "idx_guided_trips_status" ON "public"."guided_trips" USING "btree" ("status");



CREATE INDEX "idx_help_articles_category" ON "public"."help_articles" USING "btree" ("category");



CREATE INDEX "idx_help_articles_search" ON "public"."help_articles" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((("title")::"text" || ' '::"text") || COALESCE("excerpt", ''::"text")) || ' '::"text") || COALESCE("search_keywords", ''::"text"))));



CREATE INDEX "idx_help_articles_slug" ON "public"."help_articles" USING "btree" ("slug");



CREATE INDEX "idx_join_requests_status" ON "public"."join_requests" USING "btree" ("status");



CREATE INDEX "idx_join_requests_trip_id" ON "public"."join_requests" USING "btree" ("trip_id");



CREATE INDEX "idx_join_requests_trip_user" ON "public"."join_requests" USING "btree" ("trip_id", "user_id");



CREATE INDEX "idx_join_requests_trip_user_status" ON "public"."join_requests" USING "btree" ("trip_id", "user_id", "status");



CREATE INDEX "idx_join_requests_user_id" ON "public"."join_requests" USING "btree" ("user_id");



CREATE INDEX "idx_join_requests_user_status" ON "public"."join_requests" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_message_reactions_message" ON "public"."message_reactions" USING "btree" ("message_id", "message_type");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id", "message_type");



CREATE INDEX "idx_message_read_status_message_id" ON "public"."message_read_status" USING "btree" ("message_id");



CREATE INDEX "idx_message_read_status_user_id" ON "public"."message_read_status" USING "btree" ("user_id");



CREATE INDEX "idx_messages_client_id" ON "public"."messages" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_messages_conversation_created_at" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_conversation_id_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_sender_created" ON "public"."messages" USING "btree" ("conversation_id", "sender_id", "created_at");



COMMENT ON INDEX "public"."idx_messages_conversation_sender_created" IS 'Critical for unread message counting performance';



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_last_per_conversation" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC, "id");



CREATE INDEX "idx_messages_sender_created" ON "public"."messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_user_type_read" ON "public"."notifications" USING "btree" ("user_id", "type", "read", "created_at");



COMMENT ON INDEX "public"."idx_notifications_user_type_read" IS 'Improves notification filtering and pagination';



CREATE INDEX "idx_payment_reminders_payer_id" ON "public"."payment_reminders" USING "btree" ("payer_id");



CREATE INDEX "idx_payment_reminders_recipient_id" ON "public"."payment_reminders" USING "btree" ("recipient_id");



CREATE INDEX "idx_payment_reminders_trip_id" ON "public"."payment_reminders" USING "btree" ("trip_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_trip_id" ON "public"."payments" USING "btree" ("trip_id");



CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_profile_views_profile_id" ON "public"."profile_views" USING "btree" ("profile_id");



CREATE INDEX "idx_profile_views_viewed_at" ON "public"."profile_views" USING "btree" ("viewed_at" DESC);



CREATE INDEX "idx_profiles_deleted_at" ON "public"."profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_profiles_email_prefs" ON "public"."profiles" USING "btree" ((("preferences" ->> 'email_notifications'::"text")));



CREATE INDEX "idx_profiles_has_social_media" ON "public"."profiles" USING "btree" ("id") WHERE (("facebook" IS NOT NULL) OR ("threads" IS NOT NULL) OR ("instagram" IS NOT NULL) OR ("twitter" IS NOT NULL) OR ("youtube" IS NOT NULL) OR ("tiktok" IS NOT NULL) OR ("linkedin" IS NOT NULL));



CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");



CREATE INDEX "idx_profiles_interests" ON "public"."profiles" USING "gin" ("interests");



CREATE INDEX "idx_profiles_is_admin" ON "public"."profiles" USING "btree" ("is_admin") WHERE ("is_admin" = true);



CREATE INDEX "idx_profiles_is_deleted" ON "public"."profiles" USING "btree" ("is_deleted");



CREATE INDEX "idx_profiles_is_public" ON "public"."profiles" USING "btree" ("is_public");



CREATE INDEX "idx_profiles_languages" ON "public"."profiles" USING "gin" ("languages");



CREATE INDEX "idx_profiles_last_active_at" ON "public"."profiles" USING "btree" ("last_active_at" DESC);



CREATE INDEX "idx_profiles_onboarding_completed" ON "public"."profiles" USING "btree" ("onboarding_completed");



CREATE INDEX "idx_profiles_ugc_terms_accepted_at" ON "public"."profiles" USING "btree" ("ugc_terms_accepted_at");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_reactions_content" ON "public"."reactions" USING "btree" ("content_type", "content_id");



CREATE INDEX "idx_reactions_user" ON "public"."reactions" USING "btree" ("user_id");



CREATE INDEX "idx_reports_content" ON "public"."reports" USING "btree" ("content_type", "content_id");



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_reported_user_id" ON "public"."reports" USING "btree" ("reported_user_id");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_review_helpful_review_id" ON "public"."review_helpful" USING "btree" ("review_id");



CREATE INDEX "idx_review_reports_status" ON "public"."review_reports" USING "btree" ("status");



CREATE INDEX "idx_reviews_agent_id" ON "public"."reviews" USING "btree" ("agent_id");



CREATE INDEX "idx_reviews_reviewer_id" ON "public"."reviews" USING "btree" ("reviewer_id");



CREATE INDEX "idx_reviews_trip_id" ON "public"."reviews" USING "btree" ("trip_id");



CREATE INDEX "idx_reviews_trip_id_rating" ON "public"."reviews" USING "btree" ("trip_id", "rating");



CREATE INDEX "idx_saved_trips_trip_id" ON "public"."saved_trips" USING "btree" ("trip_id");



CREATE INDEX "idx_saved_trips_user_id" ON "public"."saved_trips" USING "btree" ("user_id");



CREATE INDEX "idx_stories_author" ON "public"."stories" USING "btree" ("author_id");



CREATE INDEX "idx_stories_deleted_at" ON "public"."stories" USING "btree" ("deleted_at");



CREATE INDEX "idx_stories_hidden" ON "public"."stories" USING "btree" ("is_hidden");



CREATE INDEX "idx_stories_published_at" ON "public"."stories" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_stories_status_visibility" ON "public"."stories" USING "btree" ("status", "visibility");



CREATE INDEX "idx_story_comments_deleted" ON "public"."story_comments" USING "btree" ("deleted_at");



CREATE INDEX "idx_story_comments_parent" ON "public"."story_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_story_comments_story" ON "public"."story_comments" USING "btree" ("story_id");



CREATE INDEX "idx_tip_settings_trip_id" ON "public"."tip_settings" USING "btree" ("trip_id");



CREATE INDEX "idx_tip_settings_user_id" ON "public"."tip_settings" USING "btree" ("user_id");



CREATE INDEX "idx_tips_from_user_id" ON "public"."tips" USING "btree" ("from_user_id");



CREATE INDEX "idx_tips_payment_status" ON "public"."tips" USING "btree" ("payment_status");



CREATE INDEX "idx_tips_to_user_id" ON "public"."tips" USING "btree" ("to_user_id");



CREATE INDEX "idx_tips_trip_id" ON "public"."tips" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_analytics_date" ON "public"."trip_analytics" USING "btree" ("date" DESC);



CREATE INDEX "idx_trip_analytics_trip_id" ON "public"."trip_analytics" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_announcements_trip_id" ON "public"."trip_announcements" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_expenses_created_by" ON "public"."trip_expenses" USING "btree" ("created_by");



CREATE INDEX "idx_trip_expenses_expense_date" ON "public"."trip_expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_trip_expenses_trip_id" ON "public"."trip_expenses" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_feedback_trip_id" ON "public"."trip_feedback" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_feedback_user_id" ON "public"."trip_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_trip_invites_invitee" ON "public"."trip_invites" USING "btree" ("invitee_user_id", "status", "created_at" DESC);



CREATE INDEX "idx_trip_invites_trip" ON "public"."trip_invites" USING "btree" ("trip_id", "status");



CREATE INDEX "idx_trip_members_active" ON "public"."trip_members" USING "btree" ("trip_id", "user_id") WHERE ("left_at" IS NULL);



CREATE INDEX "idx_trip_members_trip_id" ON "public"."trip_members" USING "btree" ("trip_id");



COMMENT ON INDEX "public"."idx_trip_members_trip_id" IS 'Essential for trip membership queries and aggregations';



CREATE INDEX "idx_trip_members_trip_user" ON "public"."trip_members" USING "btree" ("trip_id", "user_id");



CREATE INDEX "idx_trip_members_user_active" ON "public"."trip_members" USING "btree" ("user_id", "trip_id") WHERE ("left_at" IS NULL);



COMMENT ON INDEX "public"."idx_trip_members_user_active" IS 'Optimize active membership lookups';



CREATE INDEX "idx_trip_members_user_id" ON "public"."trip_members" USING "btree" ("user_id");



COMMENT ON INDEX "public"."idx_trip_members_user_id" IS 'Optimize fetching trips where user is a member';



CREATE INDEX "idx_trip_members_user_id_trip_id" ON "public"."trip_members" USING "btree" ("user_id", "trip_id");



COMMENT ON INDEX "public"."idx_trip_members_user_id_trip_id" IS 'Optimizes user membership lookups for user_trips view';



CREATE INDEX "idx_trip_members_user_role" ON "public"."trip_members" USING "btree" ("user_id", "role");



CREATE INDEX "idx_trip_members_user_trip" ON "public"."trip_members" USING "btree" ("user_id", "trip_id");



COMMENT ON INDEX "public"."idx_trip_members_user_trip" IS 'Optimizes RLS policy checks for trip group conversations';



CREATE INDEX "idx_trip_notes_trip_id" ON "public"."trip_notes" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_payment_methods_active" ON "public"."trip_payment_methods" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_trip_payment_methods_trip_id" ON "public"."trip_payment_methods" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_payment_methods_user_id" ON "public"."trip_payment_methods" USING "btree" ("user_id");



CREATE INDEX "idx_trip_photos_trip_id" ON "public"."trip_photos" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_photos_user_id" ON "public"."trip_photos" USING "btree" ("user_id");



CREATE INDEX "idx_trip_reminders_scheduled_date_sent" ON "public"."trip_reminders_scheduled" USING "btree" ("scheduled_date", "sent");



CREATE INDEX "idx_trip_reminders_scheduled_trip_id" ON "public"."trip_reminders_scheduled" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_reviews_created_at" ON "public"."trip_reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_trip_reviews_rating" ON "public"."trip_reviews" USING "btree" ("rating");



CREATE INDEX "idx_trip_reviews_trip_id" ON "public"."trip_reviews" USING "btree" ("trip_id");



CREATE INDEX "idx_trip_reviews_user_id" ON "public"."trip_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_trips_creator" ON "public"."trips" USING "btree" ("creator_id");



CREATE INDEX "idx_trips_creator_id" ON "public"."trips" USING "btree" ("creator_id");



COMMENT ON INDEX "public"."idx_trips_creator_id" IS 'Optimize fetching trips created by a user';



CREATE INDEX "idx_trips_creator_id_created_at" ON "public"."trips" USING "btree" ("creator_id", "created_at" DESC);



COMMENT ON INDEX "public"."idx_trips_creator_id_created_at" IS 'Critical index for user trips page - creator trips ordered by date';



CREATE INDEX "idx_trips_creator_status_created" ON "public"."trips" USING "btree" ("creator_id", "status", "created_at" DESC);



CREATE INDEX "idx_trips_dates" ON "public"."trips" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_trips_destination" ON "public"."trips" USING "btree" ("destination");



CREATE INDEX "idx_trips_destination_gin" ON "public"."trips" USING "gin" ("to_tsvector"('"english"'::"regconfig", "destination"));



COMMENT ON INDEX "public"."idx_trips_destination_gin" IS 'Enables fast full-text search on trip destinations';



CREATE INDEX "idx_trips_difficulty" ON "public"."trips" USING "btree" ("difficulty_level");



CREATE INDEX "idx_trips_id_status" ON "public"."trips" USING "btree" ("id", "status");



CREATE INDEX "idx_trips_price_currency" ON "public"."trips" USING "btree" ("price", "currency") WHERE ("status" = 'published'::"public"."trip_status");



CREATE INDEX "idx_trips_published_created_at_price" ON "public"."trips" USING "btree" ("status", "created_at" DESC, "price") WHERE ("status" = 'published'::"public"."trip_status");



CREATE INDEX "idx_trips_published_destination" ON "public"."trips" USING "btree" ("status", "destination") WHERE ("status" = 'published'::"public"."trip_status");



CREATE INDEX "idx_trips_published_start_date" ON "public"."trips" USING "btree" ("status", "start_date") WHERE ("status" = 'published'::"public"."trip_status");



CREATE INDEX "idx_trips_rating_average" ON "public"."trips" USING "btree" ("rating_average" DESC);



CREATE INDEX "idx_trips_slug" ON "public"."trips" USING "btree" ("slug");



CREATE INDEX "idx_trips_start_date" ON "public"."trips" USING "btree" ("start_date") WHERE ("status" = 'published'::"public"."trip_status");



CREATE INDEX "idx_trips_status" ON "public"."trips" USING "btree" ("status");



CREATE INDEX "idx_trips_tags_gin" ON "public"."trips" USING "gin" ("tags");



COMMENT ON INDEX "public"."idx_trips_tags_gin" IS 'Optimizes tag-based filtering for travel styles';



CREATE INDEX "idx_trips_type" ON "public"."trips" USING "btree" ("type");



CREATE INDEX "idx_trips_type_status" ON "public"."trips" USING "btree" ("type", "status");



CREATE INDEX "idx_user_blocks_blocked_id" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker_id" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_destinations_continent" ON "public"."user_destinations" USING "btree" ("continent");



CREATE INDEX "idx_user_destinations_status" ON "public"."user_destinations" USING "btree" ("status");



CREATE INDEX "idx_user_destinations_user_id" ON "public"."user_destinations" USING "btree" ("user_id");



CREATE INDEX "idx_user_engagement_date" ON "public"."user_engagement" USING "btree" ("date" DESC);



CREATE INDEX "idx_user_engagement_user_id" ON "public"."user_engagement" USING "btree" ("user_id");



CREATE INDEX "idx_user_follows_follower_id" ON "public"."user_follows" USING "btree" ("follower_id");



CREATE INDEX "idx_user_follows_following_id" ON "public"."user_follows" USING "btree" ("following_id");



CREATE INDEX "idx_user_inspirations_continent" ON "public"."user_inspirations" USING "btree" ("continent");



CREATE INDEX "idx_user_inspirations_status" ON "public"."user_inspirations" USING "btree" ("status");



CREATE INDEX "idx_user_inspirations_user_id" ON "public"."user_inspirations" USING "btree" ("user_id");



CREATE INDEX "idx_user_push_tokens_user_id" ON "public"."user_push_tokens" USING "btree" ("user_id");



CREATE INDEX "messages_client_id_idx" ON "public"."messages" USING "btree" ("client_id");



CREATE INDEX "messages_conversation_id_created_at_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_created_at_idx" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "trip_members_trip_id_left_at_idx" ON "public"."trip_members" USING "btree" ("trip_id", "left_at");



CREATE INDEX "trip_notes_trip_id_updated_at_idx" ON "public"."trip_notes" USING "btree" ("trip_id", "updated_at" DESC);



CREATE UNIQUE INDEX "unique_active_join_request" ON "public"."join_requests" USING "btree" ("trip_id", "user_id") WHERE ("status" = ANY (ARRAY['pending'::"public"."join_request_status", 'approved'::"public"."join_request_status"]));



COMMENT ON INDEX "public"."unique_active_join_request" IS 'Ensures only one active (pending/approved) join request per user per trip. Rejected and left requests can be resubmitted.';



CREATE OR REPLACE VIEW "public"."trip_performance_overview" AS
 SELECT "t"."id" AS "trip_id",
    "t"."title",
    "t"."destination",
    "t"."status",
    "t"."start_date",
    "t"."end_date",
    "t"."creator_id",
    "t"."max_participants",
    "t"."price",
    "t"."rating_average",
    "t"."rating_count",
    COALESCE("sum"("ta"."views"), (0)::bigint) AS "total_views",
    COALESCE("sum"("ta"."unique_visitors"), (0)::bigint) AS "total_unique_visitors",
    COALESCE("sum"("ta"."join_requests"), (0)::bigint) AS "total_join_requests",
    COALESCE("sum"("ta"."conversions"), (0)::bigint) AS "total_conversions",
    COALESCE("sum"("ta"."shares"), (0)::bigint) AS "total_shares",
    COALESCE("sum"("ta"."saves"), (0)::bigint) AS "total_saves",
        CASE
            WHEN (COALESCE("sum"("ta"."views"), (0)::bigint) > 0) THEN "round"((((COALESCE("sum"("ta"."conversions"), (0)::bigint))::numeric / ("sum"("ta"."views"))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "conversion_rate",
    "count"(DISTINCT "tm"."user_id") AS "current_participants",
    "round"(((("count"(DISTINCT "tm"."user_id"))::numeric / ("t"."max_participants")::numeric) * (100)::numeric), 2) AS "occupancy_rate"
   FROM (("public"."trips" "t"
     LEFT JOIN "public"."trip_analytics" "ta" ON (("ta"."trip_id" = "t"."id")))
     LEFT JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "t"."id")))
  GROUP BY "t"."id";



CREATE OR REPLACE TRIGGER "add_creator_as_member_trigger" AFTER INSERT ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."add_creator_as_member"();



CREATE OR REPLACE TRIGGER "add_trip_member_to_conversation" AFTER INSERT OR UPDATE ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."add_member_to_conversation"();



CREATE OR REPLACE TRIGGER "add_trip_member_to_conversation_trigger" AFTER INSERT ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."add_trip_member_to_conversation"();



CREATE OR REPLACE TRIGGER "cleanup_trip_conversations_trigger" BEFORE DELETE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_cleanup_trip_conversations"();



COMMENT ON TRIGGER "cleanup_trip_conversations_trigger" ON "public"."trips" IS 'Automatically removes all conversations and related data when a trip is deleted';



CREATE OR REPLACE TRIGGER "create_trip_conversation_on_insert" AFTER INSERT ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."create_trip_conversation_on_insert"();



CREATE OR REPLACE TRIGGER "create_trip_conversation_on_publish_trigger" AFTER UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."create_trip_conversation_on_publish"();



CREATE OR REPLACE TRIGGER "ensure_payer_paid_trigger" AFTER INSERT ON "public"."expense_payments" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_payer_marked_as_paid"();



CREATE OR REPLACE TRIGGER "ensure_single_default_payment_method" BEFORE INSERT OR UPDATE ON "public"."trip_payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_payment_method"();



CREATE OR REPLACE TRIGGER "handle_agent_profiles_updated_at" BEFORE UPDATE ON "public"."agent_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_join_requests_updated_at" BEFORE UPDATE ON "public"."join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_trip_member_leave" AFTER UPDATE ON "public"."trip_members" FOR EACH ROW WHEN ((("old"."left_at" IS NULL) AND ("new"."left_at" IS NOT NULL))) EXECUTE FUNCTION "public"."trigger_handle_member_leaving"();



CREATE OR REPLACE TRIGGER "handle_trips_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "join_request_status_notification_trigger" AFTER UPDATE OF "status" ON "public"."join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_join_request_status_change"();



CREATE OR REPLACE TRIGGER "messages_push_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."send_chat_push"();



CREATE OR REPLACE TRIGGER "remove_saved_trips_on_status_change_trigger" AFTER UPDATE OF "status" ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."remove_saved_trips_on_status_change"();



CREATE OR REPLACE TRIGGER "set_help_articles_updated_at" BEFORE UPDATE ON "public"."help_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_help_articles_updated_at"();



CREATE OR REPLACE TRIGGER "sync_trip_member_to_conversation_trigger" AFTER INSERT ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_trip_member_to_conversation"();



CREATE OR REPLACE TRIGGER "trg_discussion_answer_accepted_notify" AFTER UPDATE OF "is_accepted_answer" ON "public"."discussion_replies" FOR EACH ROW EXECUTE FUNCTION "public"."notify_discussion_answer_accepted"();



CREATE OR REPLACE TRIGGER "trg_discussion_replies_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."discussion_replies" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_discussion_reply_count"();



CREATE OR REPLACE TRIGGER "trg_discussion_replies_notify" AFTER INSERT ON "public"."discussion_replies" FOR EACH ROW EXECUTE FUNCTION "public"."notify_discussion_reply"();



CREATE OR REPLACE TRIGGER "trg_discussion_replies_set_updated_at" BEFORE UPDATE ON "public"."discussion_replies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_discussion_votes_set_updated_at" BEFORE UPDATE ON "public"."discussion_votes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_discussion_votes_sync_counts" AFTER INSERT OR DELETE OR UPDATE ON "public"."discussion_votes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_discussion_reply_vote_counts"();



CREATE OR REPLACE TRIGGER "trg_discussions_set_updated_at" BEFORE UPDATE ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notifications_push_community_mobile" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."push_community_notification_to_mobile"();



CREATE OR REPLACE TRIGGER "trg_reactions_count" AFTER INSERT OR DELETE ON "public"."reactions" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_reaction_counts"();



CREATE OR REPLACE TRIGGER "trg_reactions_notify_community" AFTER INSERT ON "public"."reactions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_community_like"();



CREATE OR REPLACE TRIGGER "trg_reserve_guided_slots_on_payment_completed" AFTER UPDATE OF "payment_status" ON "public"."guided_payment_records" FOR EACH ROW WHEN ((("old"."payment_status" IS DISTINCT FROM "new"."payment_status") AND ("new"."payment_status" = 'completed'::"public"."guided_record_payment_status"))) EXECUTE FUNCTION "public"."reserve_guided_departure_slots_for_paid_booking"();



CREATE OR REPLACE TRIGGER "trg_stories_set_published_at" BEFORE INSERT OR UPDATE OF "status" ON "public"."stories" FOR EACH ROW EXECUTE FUNCTION "public"."set_published_at"();



CREATE OR REPLACE TRIGGER "trg_stories_set_updated_at" BEFORE UPDATE ON "public"."stories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_story_comments_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."story_comments" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_story_comment_count"();



CREATE OR REPLACE TRIGGER "trg_story_comments_notify" AFTER INSERT ON "public"."story_comments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_story_comment"();



CREATE OR REPLACE TRIGGER "trg_story_comments_set_updated_at" BEFORE UPDATE ON "public"."story_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_guided_schedule_from_payment_record" AFTER UPDATE OF "payment_status" ON "public"."guided_payment_records" FOR EACH ROW WHEN ((("old"."payment_status" IS DISTINCT FROM "new"."payment_status") AND ("new"."payment_status" = 'completed'::"public"."guided_record_payment_status"))) EXECUTE FUNCTION "public"."sync_guided_schedule_from_payment_record"();



CREATE OR REPLACE TRIGGER "trg_sync_guided_trip_current_participants" AFTER INSERT OR DELETE OR UPDATE ON "public"."guided_trip_departure_dates" FOR EACH ROW EXECUTE FUNCTION "public"."trg_sync_guided_trip_current_participants"();



CREATE OR REPLACE TRIGGER "trg_sync_guided_trips_owner_ids" BEFORE INSERT OR UPDATE ON "public"."guided_trips" FOR EACH ROW EXECUTE FUNCTION "public"."sync_guided_trips_owner_ids"();



CREATE OR REPLACE TRIGGER "trg_touch_guided_trips_updated_at" BEFORE UPDATE ON "public"."guided_trips" FOR EACH ROW EXECUTE FUNCTION "public"."touch_guided_trips_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_create_direct_conversation_participants" AFTER INSERT ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."create_direct_conversation_participants"();



CREATE OR REPLACE TRIGGER "trigger_notify_on_join_request" AFTER INSERT ON "public"."join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_trip_creator_on_join_request"();



CREATE OR REPLACE TRIGGER "trigger_notify_trip_settlement_required" AFTER UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."notify_trip_settlement_required"();



CREATE OR REPLACE TRIGGER "trigger_send_welcome_email" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."send_welcome_email_on_signup"();



CREATE OR REPLACE TRIGGER "trigger_set_trip_slug" BEFORE INSERT OR UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."set_trip_slug"();



CREATE OR REPLACE TRIGGER "trigger_sync_trip_member_to_conversation" AFTER INSERT ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_trip_member_to_conversation"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_timestamp" AFTER INSERT ON "public"."direct_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_trip_rating_stats" AFTER INSERT OR DELETE OR UPDATE ON "public"."trip_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_trip_rating_stats"();



CREATE OR REPLACE TRIGGER "trip_created_email_trigger" AFTER INSERT OR UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."send_trip_created_email"();



CREATE OR REPLACE TRIGGER "update_contact_messages_updated_at" BEFORE UPDATE ON "public"."contact_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_contact_messages_updated_at"();



CREATE OR REPLACE TRIGGER "update_tip_settings_updated_at" BEFORE UPDATE ON "public"."tip_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_tip_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_trip_participants_count_v2" AFTER INSERT OR DELETE OR UPDATE ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_trip_participants_v2"();



COMMENT ON TRIGGER "update_trip_participants_count_v2" ON "public"."trip_members" IS 'Maintains accurate participant count including soft delete handling';



CREATE OR REPLACE TRIGGER "update_trip_payment_methods_updated_at" BEFORE UPDATE ON "public"."trip_payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_trip_payment_methods_updated_at"();



CREATE OR REPLACE TRIGGER "update_trips_joined_count" AFTER INSERT OR DELETE ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_statistics"();



CREATE OR REPLACE TRIGGER "update_trips_organized_count" AFTER INSERT OR DELETE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_statistics"();



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_settlements"
    ADD CONSTRAINT "balance_settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balance_settlements"
    ADD CONSTRAINT "balance_settlements_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balance_settlements"
    ADD CONSTRAINT "balance_settlements_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balance_settlements"
    ADD CONSTRAINT "balance_settlements_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."direct_messages"
    ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "public"."discussion_replies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discussion_tags"
    ADD CONSTRAINT "discussion_tags_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_tags"
    ADD CONSTRAINT "discussion_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_votes"
    ADD CONSTRAINT "discussion_votes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."discussion_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_votes"
    ADD CONSTRAINT "discussion_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."trip_expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_payments"
    ADD CONSTRAINT "expense_payments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."trip_expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_payments"
    ADD CONSTRAINT "expense_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_receipts"
    ADD CONSTRAINT "expense_receipts_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."trip_expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_receipts"
    ADD CONSTRAINT "expense_receipts_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_receipts"
    ADD CONSTRAINT "expense_receipts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."expense_receipts"
    ADD CONSTRAINT "expense_receipts_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_messages"
    ADD CONSTRAINT "group_messages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_messages"
    ADD CONSTRAINT "group_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_bookings"
    ADD CONSTRAINT "guided_bookings_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "public"."guided_trip_departure_dates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."guided_bookings"
    ADD CONSTRAINT "guided_bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."guided_payment_records"
    ADD CONSTRAINT "guided_payment_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."guided_bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_payment_records"
    ADD CONSTRAINT "guided_payment_records_payment_schedule_id_fkey" FOREIGN KEY ("payment_schedule_id") REFERENCES "public"."guided_payment_schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guided_payment_schedules"
    ADD CONSTRAINT "guided_payment_schedules_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."guided_bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trip_departure_dates"
    ADD CONSTRAINT "guided_trip_departure_dates_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trip_exclusions"
    ADD CONSTRAINT "guided_trip_exclusions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trip_gallery"
    ADD CONSTRAINT "guided_trip_gallery_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trip_inclusions"
    ADD CONSTRAINT "guided_trip_inclusions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trip_locations"
    ADD CONSTRAINT "guided_trip_locations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trip_qr_codes"
    ADD CONSTRAINT "guided_trip_qr_codes_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."guided_trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trips"
    ADD CONSTRAINT "guided_trips_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guided_trips"
    ADD CONSTRAINT "guided_trips_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."join_requests"
    ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_status"
    ADD CONSTRAINT "message_read_status_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."direct_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_read_status"
    ADD CONSTRAINT "message_read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moderation_actions"
    ADD CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moderation_actions"
    ADD CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_trip_id_fkey" FOREIGN KEY ("related_trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."review_helpful"
    ADD CONSTRAINT "review_helpful_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."trip_reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_helpful"
    ADD CONSTRAINT "review_helpful_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."trip_reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_trips"
    ADD CONSTRAINT "saved_trips_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_trips"
    ADD CONSTRAINT "saved_trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_linked_trip_id_fkey" FOREIGN KEY ("linked_trip_id") REFERENCES "public"."trips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."story_comments"
    ADD CONSTRAINT "story_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_comments"
    ADD CONSTRAINT "story_comments_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."story_comments"
    ADD CONSTRAINT "story_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."story_comments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."story_comments"
    ADD CONSTRAINT "story_comments_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_tags"
    ADD CONSTRAINT "story_tags_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."story_tags"
    ADD CONSTRAINT "story_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tip_settings"
    ADD CONSTRAINT "tip_settings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tip_settings"
    ADD CONSTRAINT "tip_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tips"
    ADD CONSTRAINT "tips_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_analytics"
    ADD CONSTRAINT "trip_analytics_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_announcements"
    ADD CONSTRAINT "trip_announcements_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_announcements"
    ADD CONSTRAINT "trip_announcements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_expenses"
    ADD CONSTRAINT "trip_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_expenses"
    ADD CONSTRAINT "trip_expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_feedback"
    ADD CONSTRAINT "trip_feedback_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_feedback"
    ADD CONSTRAINT "trip_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_invites"
    ADD CONSTRAINT "trip_invites_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_notes"
    ADD CONSTRAINT "trip_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_notes"
    ADD CONSTRAINT "trip_notes_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_payment_methods"
    ADD CONSTRAINT "trip_payment_methods_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_payment_methods"
    ADD CONSTRAINT "trip_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_photos"
    ADD CONSTRAINT "trip_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_reminders_scheduled"
    ADD CONSTRAINT "trip_reminders_scheduled_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_reviews"
    ADD CONSTRAINT "trip_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_destinations"
    ADD CONSTRAINT "user_destinations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_destinations"
    ADD CONSTRAINT "user_destinations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_engagement"
    ADD CONSTRAINT "user_engagement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_inspirations"
    ADD CONSTRAINT "user_inspirations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_inspirations"
    ADD CONSTRAINT "user_inspirations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "app"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Add your own payment methods to trips" ON "public"."trip_payment_methods" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_payment_methods"."trip_id") AND ("tm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_payment_methods"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))))));



CREATE POLICY "Admins can create announcements" ON "public"."trip_announcements" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true))))));



CREATE POLICY "Admins can delete announcements" ON "public"."trip_announcements" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true)))));



CREATE POLICY "Admins can delete any inspiration" ON "public"."user_inspirations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can log actions" ON "public"."admin_actions" FOR INSERT WITH CHECK ((("auth"."uid"() = "admin_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "admin_actions"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true))))));



CREATE POLICY "Admins can update announcements" ON "public"."trip_announcements" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true)))));



CREATE POLICY "Admins can update any inspiration" ON "public"."user_inspirations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update trip members" ON "public"."trip_members" FOR UPDATE TO "authenticated" USING ("public"."can_manage_trip_members"("trip_id", "auth"."uid"())) WITH CHECK ("public"."can_manage_trip_members"("trip_id", "auth"."uid"()));



CREATE POLICY "Admins can view actions" ON "public"."admin_actions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "admin_actions"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true)))));



CREATE POLICY "Agent profiles are viewable by everyone" ON "public"."agent_profiles" FOR SELECT USING (true);



CREATE POLICY "Agents can insert own agent profile" ON "public"."agent_profiles" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'agent'::"public"."user_role"))))));



CREATE POLICY "Agents can update own agent profile" ON "public"."agent_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow authenticated users to insert their own votes" ON "public"."discussion_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow insert for authenticated users" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow insert if created_by matches auth.uid()" ON "public"."conversations" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Allow public to increment view_count" ON "public"."discussions" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow users to delete their own votes" ON "public"."discussion_votes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to read votes" ON "public"."discussion_votes" FOR SELECT USING (true);



CREATE POLICY "Allow users to update their own votes" ON "public"."discussion_votes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Anyone can view inspirations" ON "public"."user_inspirations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view public profile views count" ON "public"."profile_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "profile_views"."profile_id") AND ("profiles"."is_public" = true)))));



CREATE POLICY "Anyone can view published trip reviews" ON "public"."trip_reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_reviews"."trip_id") AND ("trips"."status" = 'published'::"public"."trip_status")))));



CREATE POLICY "Auth users can create inspirations" ON "public"."user_inspirations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Delete your own payment methods" ON "public"."trip_payment_methods" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Destinations are viewable by everyone" ON "public"."destinations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Guided bookings insert by authenticated" ON "public"."guided_bookings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Guided bookings update by owners" ON "public"."guided_bookings" FOR UPDATE TO "authenticated" USING ((("auth"."role"() = 'service_role'::"text") OR ("lower"("customer_email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))) OR (EXISTS ( SELECT 1
   FROM "public"."guided_trips" "gt"
  WHERE (("gt"."id" = "guided_bookings"."trip_id") AND (COALESCE("gt"."creator_id", "gt"."agent_id") = "auth"."uid"())))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("lower"("customer_email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))) OR (EXISTS ( SELECT 1
   FROM "public"."guided_trips" "gt"
  WHERE (("gt"."id" = "guided_bookings"."trip_id") AND (COALESCE("gt"."creator_id", "gt"."agent_id") = "auth"."uid"()))))));



CREATE POLICY "Guided bookings visible to owners" ON "public"."guided_bookings" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR ("customer_email" = ("auth"."jwt"() ->> 'email'::"text")) OR (EXISTS ( SELECT 1
   FROM "public"."guided_trips" "gt"
  WHERE (("gt"."id" = "guided_bookings"."trip_id") AND (COALESCE("gt"."creator_id", "gt"."agent_id") = "auth"."uid"()))))));



CREATE POLICY "Guided payment records customer update" ON "public"."guided_payment_records" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."guided_bookings" "gb"
  WHERE (("gb"."id" = "guided_payment_records"."booking_id") AND ("lower"("gb"."customer_email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."guided_bookings" "gb"
  WHERE (("gb"."id" = "guided_payment_records"."booking_id") AND ("lower"("gb"."customer_email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "Guided payment records manage by authenticated" ON "public"."guided_payment_records" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Guided payment records visible by booking owners" ON "public"."guided_payment_records" FOR SELECT TO "authenticated", "anon" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."guided_bookings" "gb"
  WHERE (("gb"."id" = "guided_payment_records"."booking_id") AND (("gb"."customer_email" = ("auth"."jwt"() ->> 'email'::"text")) OR (EXISTS ( SELECT 1
           FROM "public"."guided_trips" "gt"
          WHERE (("gt"."id" = "gb"."trip_id") AND (COALESCE("gt"."creator_id", "gt"."agent_id") = "auth"."uid"()))))))))));



CREATE POLICY "Guided payment schedules manage by authenticated" ON "public"."guided_payment_schedules" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Guided payment schedules visible by booking owners" ON "public"."guided_payment_schedules" FOR SELECT TO "authenticated", "anon" USING ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."guided_bookings" "gb"
  WHERE (("gb"."id" = "guided_payment_schedules"."booking_id") AND (("gb"."customer_email" = ("auth"."jwt"() ->> 'email'::"text")) OR (EXISTS ( SELECT 1
           FROM "public"."guided_trips" "gt"
          WHERE (("gt"."id" = "gb"."trip_id") AND (COALESCE("gt"."creator_id", "gt"."agent_id") = "auth"."uid"()))))))))));



CREATE POLICY "Guided trips are viewable by everyone" ON "public"."guided_trips" FOR SELECT USING (true);



CREATE POLICY "Guided trips delete by owner" ON "public"."guided_trips" FOR DELETE TO "authenticated" USING ((COALESCE("agent_id", "creator_id") = "auth"."uid"()));



CREATE POLICY "Guided trips insert by authenticated" ON "public"."guided_trips" FOR INSERT TO "authenticated" WITH CHECK ((COALESCE("agent_id", "creator_id", "auth"."uid"()) = "auth"."uid"()));



CREATE POLICY "Guided trips update by owner" ON "public"."guided_trips" FOR UPDATE TO "authenticated" USING ((COALESCE("agent_id", "creator_id") = "auth"."uid"())) WITH CHECK ((COALESCE("agent_id", "creator_id") = "auth"."uid"()));



CREATE POLICY "Help articles are viewable by everyone" ON "public"."help_articles" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Invitees can update status" ON "public"."trip_invites" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "invitee_user_id")) WITH CHECK (("auth"."uid"() = "invitee_user_id"));



CREATE POLICY "Invitees can view invites" ON "public"."trip_invites" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "invitee_user_id"));



CREATE POLICY "Inviters can cancel invites" ON "public"."trip_invites" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "inviter_id")) WITH CHECK (("auth"."uid"() = "inviter_id"));



CREATE POLICY "Inviters can view invites" ON "public"."trip_invites" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "inviter_id"));



CREATE POLICY "Members can view trip members" ON "public"."trip_members" FOR SELECT USING ((("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."creator_id" = "auth"."uid"()))) OR ("trip_id" IN ( SELECT "join_requests"."trip_id"
   FROM "public"."join_requests"
  WHERE (("join_requests"."user_id" = "auth"."uid"()) AND ("join_requests"."status" = 'approved'::"public"."join_request_status")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Policies are viewable by everyone" ON "public"."policies" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view trip members" ON "public"."trip_members" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING ((("is_public" = true) AND (("is_deleted" = false) OR ("is_deleted" IS NULL))));



CREATE POLICY "Public profiles viewable by everyone" ON "public"."profiles" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Published trips are viewable by everyone" ON "public"."trips" FOR SELECT USING ((("status" = 'published'::"public"."trip_status") OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "Published trips viewable by everyone" ON "public"."trips" FOR SELECT USING ((("status" = 'published'::"public"."trip_status") OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "Remove trip members" ON "public"."trip_members" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_members"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Reviews are viewable by everyone" ON "public"."reviews" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Service role can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage trip reminders" ON "public"."trip_reminders_scheduled" USING (true) WITH CHECK (true);



CREATE POLICY "System can add trip members" ON "public"."trip_members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can create conversation participants" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert analytics events" ON "public"."analytics_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert payment reminders" ON "public"."payment_reminders" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("payer_id" = "auth"."uid"())));



CREATE POLICY "System can insert profile views" ON "public"."profile_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage trip analytics" ON "public"."trip_analytics" USING (false) WITH CHECK (false);



CREATE POLICY "System can manage user engagement" ON "public"."user_engagement" USING (false) WITH CHECK (false);



CREATE POLICY "System can update tips" ON "public"."tips" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "System settings are viewable by everyone" ON "public"."system_settings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Trip admins can create announcements" ON "public"."trip_announcements" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true) AND ("trip_members"."left_at" IS NULL))))));



CREATE POLICY "Trip admins can delete announcements" ON "public"."trip_announcements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Trip admins can update announcements" ON "public"."trip_announcements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true) AND ("trip_members"."left_at" IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."is_admin" = true) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Trip categories are viewable by everyone" ON "public"."trip_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Trip creators can add members" ON "public"."trip_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_members"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Trip creators can invite" ON "public"."trip_invites" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "inviter_id") AND (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_invites"."trip_id") AND ("trips"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Trip creators can manage members" ON "public"."trip_members" USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_members"."trip_id") AND ("trips"."creator_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_members"."trip_id") AND ("trips"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Trip creators can update members" ON "public"."trip_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_members"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Trip creators can view their trip analytics" ON "public"."trip_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_analytics"."trip_id") AND ("trips"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Trip members can add payment methods" ON "public"."trip_payment_methods" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_payment_methods"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL))))));



CREATE POLICY "Trip members can create expenses" ON "public"."trip_expenses" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_expenses"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Trip members can create notes" ON "public"."trip_notes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "author_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_notes"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL))))));



CREATE POLICY "Trip members can submit feedback" ON "public"."trip_feedback" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_feedback"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Trip members can upload photos" ON "public"."trip_photos" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_photos"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL))))));



CREATE POLICY "Trip organizers can update join requests" ON "public"."join_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "join_requests"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Trip photos are viewable by everyone" ON "public"."trip_photos" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Unpublished articles viewable by authenticated users" ON "public"."help_articles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Update your own payment methods" ON "public"."trip_payment_methods" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can add reactions" ON "public"."message_reactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create bookings" ON "public"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create notifications for their trips" ON "public"."notifications" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("related_trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."creator_id" = "auth"."uid"()))) OR ("sender_id" = "auth"."uid"()) OR ("user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create reviews for trips they joined" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "reviewer_id") AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "reviews"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create reviews for trips they joined" ON "public"."trip_reviews" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM ("public"."trip_members" "tm"
     JOIN "public"."trips" "t" ON (("t"."id" = "tm"."trip_id")))
  WHERE (("tm"."trip_id" = "trip_reviews"."trip_id") AND ("tm"."user_id" = "auth"."uid"()) AND (("t"."status" = 'completed'::"public"."trip_status") OR ("t"."end_date" < CURRENT_DATE))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."trip_reviews" "existing"
  WHERE (("existing"."trip_id" = "trip_reviews"."trip_id") AND ("existing"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can create reviews for trips they've booked" ON "public"."reviews" FOR INSERT WITH CHECK ((("auth"."uid"() = "reviewer_id") AND (EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."trip_id" = "reviews"."trip_id") AND ("b"."user_id" = "auth"."uid"()) AND ("b"."status" = 'confirmed'::"public"."booking_status"))))));



CREATE POLICY "Users can create their own blocks" ON "public"."blocked_users" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own destinations" ON "public"."user_destinations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create tips" ON "public"."tips" FOR INSERT WITH CHECK ((("auth"."uid"() = "from_user_id") AND ("to_user_id" IN ( SELECT "trips"."creator_id"
   FROM "public"."trips"
  WHERE ("trips"."id" = "tips"."trip_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "tips"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create trips" ON "public"."trips" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "Users can delete own inspirations" ON "public"."user_inspirations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own push tokens" ON "public"."user_push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own trips" ON "public"."trips" FOR DELETE USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Users can delete their own blocks" ON "public"."blocked_users" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own expenses" ON "public"."trip_expenses" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own feedback" ON "public"."trip_feedback" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own messages" ON "public"."messages" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "sender_id") AND ("created_at" >= ("now"() - '00:01:00'::interval))));



CREATE POLICY "Users can delete their own payment methods" ON "public"."trip_payment_methods" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pending destinations" ON "public"."user_destinations" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND (("status")::"text" = 'pending'::"text")));



CREATE POLICY "Users can delete their own photos" ON "public"."trip_photos" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reviews" ON "public"."reviews" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can delete their own reviews" ON "public"."trip_reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their participation" ON "public"."conversation_participants" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can edit their own messages" ON "public"."direct_messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "messages"."conversation_id") AND ("conversation_participants"."user_id" = "auth"."uid"()))))) OR (("sender_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "messages"."conversation_id") AND ("conversation_participants"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own push tokens" ON "public"."user_push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join trips" ON "public"."trip_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave trip feedback" ON "public"."trip_feedback" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_feedback"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_feedback"."trip_id") AND ("trips"."creator_id" = "auth"."uid"())))))));



CREATE POLICY "Users can leave trips" ON "public"."trip_members" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own tip settings" ON "public"."tip_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage review helpful" ON "public"."review_helpful" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their blocks" ON "public"."user_blocks" USING (("auth"."uid"() = "blocker_id")) WITH CHECK (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can manage their follows" ON "public"."user_follows" USING (("auth"."uid"() = "follower_id")) WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can manage their notification preferences" ON "public"."notification_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their push subscriptions" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can mark messages as read" ON "public"."message_read_status" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can remove reactions" ON "public"."message_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can remove their own reactions" ON "public"."message_reactions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can report reviews" ON "public"."review_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can save trips" ON "public"."saved_trips" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages to their conversations" ON "public"."direct_messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND ("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("conversations"."user1_id" = "auth"."uid"()) OR ("conversations"."user2_id" = "auth"."uid"()))))));



CREATE POLICY "Users can send messages to their trips" ON "public"."group_messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "group_messages"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "group_messages"."trip_id") AND ("trips"."creator_id" = "auth"."uid"())))))));



CREATE POLICY "Users can soft-delete their direct conversations" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ((("conversation_type" = 'direct'::"text") AND (("user1_id" = "auth"."uid"()) OR ("user2_id" = "auth"."uid"())))) WITH CHECK ((("conversation_type" = 'direct'::"text") AND (("user1_id" = "auth"."uid"()) OR ("user2_id" = "auth"."uid"()))));



CREATE POLICY "Users can unsave trips" ON "public"."saved_trips" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update notes in their trips" ON "public"."trip_notes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_notes"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_notes"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Users can update notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own inspirations" ON "public"."user_inspirations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own push tokens" ON "public"."user_push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can update own trip member row" ON "public"."trip_members" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own trips" ON "public"."trips" FOR UPDATE USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own bookings" ON "public"."bookings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own expenses" ON "public"."trip_expenses" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own feedback" ON "public"."trip_feedback" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own membership" ON "public"."trip_members" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own messages" ON "public"."direct_messages" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "sender_id")) WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update their own messages" ON "public"."group_messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "sender_id") AND ("created_at" >= ("now"() - '00:01:00'::interval)))) WITH CHECK ((("auth"."uid"() = "sender_id") AND ("created_at" >= ("now"() - '00:01:00'::interval))));



CREATE POLICY "Users can update their own payment methods" ON "public"."trip_payment_methods" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pending destinations" ON "public"."user_destinations" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND (("status")::"text" = 'pending'::"text")));



CREATE POLICY "Users can update their own photos" ON "public"."trip_photos" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reviews" ON "public"."reviews" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "reviewer_id")) WITH CHECK (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can update their own reviews" ON "public"."trip_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their participation records" ON "public"."conversation_participants" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view and edit their own profile" ON "public"."profiles" USING ((("auth"."uid"() = "id") AND (("is_deleted" = false) OR ("is_deleted" IS NULL))));



CREATE POLICY "Users can view announcements from their trips" ON "public"."trip_announcements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Users can view approved destinations" ON "public"."user_destinations" FOR SELECT USING (((("status")::"text" = 'approved'::"text") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view expenses for their trips" ON "public"."trip_expenses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_expenses"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view feedback for their trips" ON "public"."trip_feedback" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_feedback"."trip_id") AND ("trips"."creator_id" = "auth"."uid"())))) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can view follows" ON "public"."user_follows" FOR SELECT USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."user_blocks"
  WHERE ((("user_blocks"."blocker_id" = "auth"."uid"()) AND ("user_blocks"."blocked_id" = "user_follows"."follower_id")) OR (("user_blocks"."blocker_id" = "user_follows"."follower_id") AND ("user_blocks"."blocked_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view messages for their trips" ON "public"."group_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "group_messages"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "group_messages"."trip_id") AND ("trips"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view messages from their conversations" ON "public"."direct_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "direct_messages"."conversation_id") AND ("conversation_participants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages from their trips" ON "public"."group_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "group_messages"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Users can view messages in conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "messages"."conversation_id") AND ("conversation_participants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in conversations they participate in" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants"
  WHERE (("conversation_participants"."conversation_id" = "messages"."conversation_id") AND ("conversation_participants"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."direct_messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("conversations"."user1_id" = "auth"."uid"()) OR ("conversations"."user2_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view notes from their trips" ON "public"."trip_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_notes"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Users can view notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own bookings" ON "public"."bookings" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "bookings"."trip_id") AND ("t"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own payments" ON "public"."payments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("agent_id" = "auth"."uid"())));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own push tokens" ON "public"."user_push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own saved trips" ON "public"."saved_trips" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view payment methods from their trips" ON "public"."trip_payment_methods" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_payment_methods"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL)))));



CREATE POLICY "Users can view reactions on messages they can see" ON "public"."message_reactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view read status for their messages" ON "public"."message_read_status" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("message_id" IN ( SELECT "direct_messages"."id"
   FROM "public"."direct_messages"
  WHERE ("direct_messages"."sender_id" = "auth"."uid"())))));



CREATE POLICY "Users can view relevant tip settings" ON "public"."tip_settings" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (("trip_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "tip_settings"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"()))))) OR (("trip_id" IS NULL) AND ("user_id" IN ( SELECT DISTINCT "t"."creator_id"
   FROM ("public"."trips" "t"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "t"."id")))
  WHERE ("tm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their blocks" ON "public"."user_blocks" FOR SELECT USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can view their conversation participations" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("is_deleted" = false) AND ((("conversation_type" = 'direct'::"text") AND (("user1_id" = "auth"."uid"()) OR ("user2_id" = "auth"."uid"()))) OR (("conversation_type" = 'trip_group'::"text") AND ("trip_id" IN ( SELECT "trip_members"."trip_id"
   FROM "public"."trip_members"
  WHERE (("trip_members"."user_id" = "auth"."uid"()) AND ("trip_members"."left_at" IS NULL))))))));



CREATE POLICY "Users can view their email queue" ON "public"."email_queue" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their engagement metrics" ON "public"."user_engagement" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own analytics events" ON "public"."analytics_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own blocks" ON "public"."blocked_users" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "agent_id")));



CREATE POLICY "Users can view their own read status" ON "public"."message_read_status" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own saved trips" ON "public"."saved_trips" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their payment reminders" ON "public"."payment_reminders" FOR SELECT TO "authenticated" USING ((("payer_id" = "auth"."uid"()) OR ("recipient_id" = "auth"."uid"())));



CREATE POLICY "Users can view their reports" ON "public"."review_reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view their tips" ON "public"."tips" FOR SELECT USING ((("auth"."uid"() = "from_user_id") OR ("auth"."uid"() = "to_user_id") OR ("auth"."uid"() IN ( SELECT "trips"."creator_id"
   FROM "public"."trips"
  WHERE ("trips"."id" = "tips"."trip_id")))));



CREATE POLICY "Users can view trip feedback" ON "public"."trip_feedback" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_feedback"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_feedback"."trip_id") AND ("trips"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view trip members" ON "public"."trip_members" FOR SELECT TO "authenticated" USING ((("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."status" = 'published'::"public"."trip_status"))) OR ("trip_id" IN ( SELECT "trips"."id"
   FROM "public"."trips"
  WHERE ("trips"."creator_id" = "auth"."uid"()))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view who viewed their profile" ON "public"."profile_views" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "View payment methods for your trips" ON "public"."trip_payment_methods" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_payment_methods"."trip_id") AND ("tm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_payment_methods"."trip_id") AND ("t"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "View reactions" ON "public"."message_reactions" FOR SELECT USING (true);



CREATE POLICY "View trip announcements" ON "public"."trip_announcements" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."trip_members"
  WHERE (("trip_members"."trip_id" = "trip_announcements"."trip_id") AND ("trip_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "trip_announcements"."trip_id") AND ("trips"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "View trip members" ON "public"."trip_members" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_members"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))) OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."admin_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_users_can_insert_messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));



ALTER TABLE "public"."balance_settlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "balance_settlements_insert" ON "public"."balance_settlements" FOR INSERT TO "authenticated" WITH CHECK ((("payer_id" = "auth"."uid"()) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "balance_settlements_select" ON "public"."balance_settlements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "balance_settlements"."trip_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT WITH CHECK (((("conversation_type" = 'direct'::"text") AND (("auth"."uid"() = "user1_id") OR ("auth"."uid"() = "user2_id"))) OR (("conversation_type" = 'trip_group'::"text") AND (("created_by" = "auth"."uid"()) OR (CURRENT_USER = 'postgres'::"name") OR ("current_setting"('role'::"text", true) = 'service_role'::"text")))));



CREATE POLICY "conversations_select" ON "public"."conversations" FOR SELECT USING (((("conversation_type" = 'direct'::"text") AND (("user1_id" = "auth"."uid"()) OR ("user2_id" = "auth"."uid"()))) OR (("conversation_type" = 'trip_group'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "conversations"."trip_id") AND (("t"."creator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."trip_members" "tm"
          WHERE (("tm"."trip_id" = "t"."id") AND ("tm"."user_id" = "auth"."uid"()))))))))) OR (("trip_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "conversations"."trip_id") AND (("t"."creator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."trip_members" "tm"
          WHERE (("tm"."trip_id" = "t"."id") AND ("tm"."user_id" = "auth"."uid"())))))))))));



CREATE POLICY "delete_trip_photos" ON "public"."trip_photos" FOR DELETE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."destinations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."direct_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussion_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussion_replies_delete" ON "public"."discussion_replies" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "discussion_replies_insert" ON "public"."discussion_replies" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE (("d"."id" = "discussion_replies"."discussion_id") AND ("d"."visibility" = 'public'::"public"."discussion_visibility") AND ("d"."is_hidden" = false) AND ("d"."deleted_at" IS NULL) AND ("d"."is_locked" = false))))));



CREATE POLICY "discussion_replies_select" ON "public"."discussion_replies" FOR SELECT USING ((("author_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE (("d"."id" = "discussion_replies"."discussion_id") AND ("d"."visibility" = 'public'::"public"."discussion_visibility") AND ("d"."is_hidden" = false) AND ("d"."deleted_at" IS NULL))))));



CREATE POLICY "discussion_replies_update" ON "public"."discussion_replies" FOR UPDATE USING ((("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE (("d"."id" = "discussion_replies"."discussion_id") AND ("d"."author_id" = "auth"."uid"())))))) WITH CHECK ((("author_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."discussions" "d"
  WHERE (("d"."id" = "discussion_replies"."discussion_id") AND ("d"."author_id" = "auth"."uid"()))))));



ALTER TABLE "public"."discussion_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussion_tags_insert" ON "public"."discussion_tags" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "discussion_tags_select" ON "public"."discussion_tags" FOR SELECT USING (true);



ALTER TABLE "public"."discussion_votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussion_votes_delete" ON "public"."discussion_votes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "discussion_votes_insert" ON "public"."discussion_votes" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."discussion_replies" "dr"
     JOIN "public"."discussions" "d" ON (("d"."id" = "dr"."discussion_id")))
  WHERE (("dr"."id" = "discussion_votes"."reply_id") AND ("dr"."author_id" <> "auth"."uid"()) AND ("dr"."is_hidden" = false) AND ("dr"."deleted_at" IS NULL) AND ("d"."visibility" = 'public'::"public"."discussion_visibility") AND ("d"."is_hidden" = false) AND ("d"."deleted_at" IS NULL))))));



CREATE POLICY "discussion_votes_select" ON "public"."discussion_votes" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "discussion_votes_update" ON "public"."discussion_votes" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."discussion_replies" "dr"
     JOIN "public"."discussions" "d" ON (("d"."id" = "dr"."discussion_id")))
  WHERE (("dr"."id" = "discussion_votes"."reply_id") AND ("dr"."author_id" <> "auth"."uid"()) AND ("dr"."is_hidden" = false) AND ("dr"."deleted_at" IS NULL) AND ("d"."visibility" = 'public'::"public"."discussion_visibility") AND ("d"."is_hidden" = false) AND ("d"."deleted_at" IS NULL))))));



ALTER TABLE "public"."discussions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussions_delete" ON "public"."discussions" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "discussions_insert" ON "public"."discussions" FOR INSERT WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "discussions_select" ON "public"."discussions" FOR SELECT USING (((("visibility" = 'public'::"public"."discussion_visibility") AND ("is_hidden" = false) AND ("deleted_at" IS NULL)) OR ("author_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "discussions_update" ON "public"."discussions" FOR UPDATE USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emote_presets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expense_participants_delete" ON "public"."expense_participants" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_participants"."expense_id") AND ("te"."created_by" = "auth"."uid"()))))));



CREATE POLICY "expense_participants_insert" ON "public"."expense_participants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."trip_expenses" "te"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "te"."trip_id")))
  WHERE (("te"."id" = "expense_participants"."expense_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



CREATE POLICY "expense_participants_select" ON "public"."expense_participants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."trip_expenses" "te"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "te"."trip_id")))
  WHERE (("te"."id" = "expense_participants"."expense_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



CREATE POLICY "expense_participants_update" ON "public"."expense_participants" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_participants"."expense_id") AND ("te"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."expense_payments" "ep"
  WHERE (("ep"."expense_id" = "expense_participants"."expense_id") AND ("ep"."user_id" = "auth"."uid"())))))) WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_participants"."expense_id") AND ("te"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."expense_payments" "ep"
  WHERE (("ep"."expense_id" = "expense_participants"."expense_id") AND ("ep"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."expense_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expense_payments_delete" ON "public"."expense_payments" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_payments"."expense_id") AND ("te"."created_by" = "auth"."uid"()))))));



CREATE POLICY "expense_payments_insert" ON "public"."expense_payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."trip_expenses" "te"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "te"."trip_id")))
  WHERE (("te"."id" = "expense_payments"."expense_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



CREATE POLICY "expense_payments_select" ON "public"."expense_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."trip_expenses" "te"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "te"."trip_id")))
  WHERE (("te"."id" = "expense_payments"."expense_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



CREATE POLICY "expense_payments_update" ON "public"."expense_payments" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_payments"."expense_id") AND ("te"."created_by" = "auth"."uid"())))))) WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_payments"."expense_id") AND ("te"."created_by" = "auth"."uid"()))))));



ALTER TABLE "public"."expense_receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expense_receipts_insert" ON "public"."expense_receipts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."trip_expenses" "te"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "te"."trip_id")))
  WHERE (("te"."id" = "expense_receipts"."expense_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



CREATE POLICY "expense_receipts_select" ON "public"."expense_receipts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."trip_expenses" "te"
     JOIN "public"."trip_members" "tm" ON (("tm"."trip_id" = "te"."trip_id")))
  WHERE (("te"."id" = "expense_receipts"."expense_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."left_at" IS NULL)))));



CREATE POLICY "expense_receipts_update" ON "public"."expense_receipts" FOR UPDATE TO "authenticated" USING ((("uploaded_by" = "auth"."uid"()) OR ("participant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_receipts"."expense_id") AND ("te"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."expense_payments" "ep"
  WHERE (("ep"."expense_id" = "expense_receipts"."expense_id") AND ("ep"."user_id" = "auth"."uid"())))))) WITH CHECK ((("uploaded_by" = "auth"."uid"()) OR ("participant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trip_expenses" "te"
  WHERE (("te"."id" = "expense_receipts"."expense_id") AND ("te"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."expense_payments" "ep"
  WHERE (("ep"."expense_id" = "expense_receipts"."expense_id") AND ("ep"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."group_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guided_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guided_payment_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guided_payment_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guided_trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."help_articles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_trip_photos" ON "public"."trip_photos" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_photos"."trip_id") AND ("tm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_photos"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))))));



ALTER TABLE "public"."join_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "join_requests_auth_insert" ON "public"."join_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "join_requests_auth_select" ON "public"."join_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "join_requests_auth_update" ON "public"."join_requests" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_read_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_delete" ON "public"."messages" FOR DELETE USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "messages_select" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "messages_update" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));



ALTER TABLE "public"."moderation_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "moderation_actions_insert" ON "public"."moderation_actions" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "moderation_actions_select" ON "public"."moderation_actions" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participants_delete" ON "public"."conversation_participants" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."conversations" "c"
     JOIN "public"."trips" "t" ON (("c"."trip_id" = "t"."id")))
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ("t"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "participants_insert" ON "public"."conversation_participants" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ((("c"."conversation_type" = 'direct'::"text") AND (("auth"."uid"() = "c"."user1_id") OR ("auth"."uid"() = "c"."user2_id"))) OR (("c"."trip_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."trips" "t"
          WHERE (("t"."id" = "c"."trip_id") AND ("t"."creator_id" = "auth"."uid"()))))))))));



CREATE POLICY "participants_select" ON "public"."conversation_participants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ((("c"."conversation_type" = 'direct'::"text") AND (("c"."user1_id" = "auth"."uid"()) OR ("c"."user2_id" = "auth"."uid"()))) OR (("c"."trip_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."trips" "t"
          WHERE (("t"."id" = "c"."trip_id") AND (("t"."creator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
                   FROM "public"."trip_members" "tm"
                  WHERE (("tm"."trip_id" = "t"."id") AND ("tm"."user_id" = "auth"."uid"()))))))))))))));



CREATE POLICY "participants_update" ON "public"."conversation_participants" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."conversations" "c"
     JOIN "public"."trips" "t" ON (("c"."trip_id" = "t"."id")))
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ("t"."creator_id" = "auth"."uid"())))));



ALTER TABLE "public"."payment_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policies_read_all_authd" ON "public"."policies" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reactions_delete" ON "public"."reactions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reactions_insert" ON "public"."reactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reactions_select" ON "public"."reactions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert" ON "public"."reports" FOR INSERT WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "reports_select" ON "public"."reports" FOR SELECT USING ((("reporter_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text") OR "public"."current_user_is_admin"()));



CREATE POLICY "reports_update" ON "public"."reports" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR "public"."current_user_is_admin"())) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."current_user_is_admin"()));



ALTER TABLE "public"."review_helpful" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_trips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_admin_delete" ON "public"."system_settings" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "settings_admin_update" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "settings_admin_write" ON "public"."system_settings" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "settings_read_all" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stories_delete" ON "public"."stories" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "stories_insert" ON "public"."stories" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("author_id" = "auth"."uid"())));



CREATE POLICY "stories_select" ON "public"."stories" FOR SELECT USING (((("status" = 'published'::"public"."story_status") AND ("visibility" = ANY (ARRAY['public'::"public"."story_visibility", 'unlisted'::"public"."story_visibility"])) AND ("is_hidden" = false) AND ("deleted_at" IS NULL)) OR ("author_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "stories_update" ON "public"."stories" FOR UPDATE USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."story_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "story_comments_delete" ON "public"."story_comments" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "story_comments_insert" ON "public"."story_comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_comments"."story_id") AND ("s"."status" = 'published'::"public"."story_status") AND ("s"."visibility" = ANY (ARRAY['public'::"public"."story_visibility", 'unlisted'::"public"."story_visibility"])) AND ("s"."is_hidden" = false) AND ("s"."deleted_at" IS NULL))))));



CREATE POLICY "story_comments_select" ON "public"."story_comments" FOR SELECT USING ((("author_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."stories" "s"
  WHERE (("s"."id" = "story_comments"."story_id") AND ("s"."status" = 'published'::"public"."story_status") AND ("s"."visibility" = ANY (ARRAY['public'::"public"."story_visibility", 'unlisted'::"public"."story_visibility"])) AND ("s"."is_hidden" = false) AND ("s"."deleted_at" IS NULL))))));



CREATE POLICY "story_comments_update" ON "public"."story_comments" FOR UPDATE USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."story_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "story_tags_insert" ON "public"."story_tags" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "story_tags_select" ON "public"."story_tags" FOR SELECT USING (true);



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_settings_read" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_insert" ON "public"."tags" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "tags_select" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "tags_update" ON "public"."tags" FOR UPDATE USING (true) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "templates_read_authenticated" ON "public"."notification_templates" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."tip_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_categories_public_read" ON "public"."trip_categories" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."trip_expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_members_update_currency_settings" ON "public"."trips" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trips"."id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trips"."id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_admin" = true)))));



ALTER TABLE "public"."trip_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_reminders_scheduled" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_trip_photos" ON "public"."trip_photos" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_destinations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_engagement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_inspirations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view_trip_photos" ON "public"."trip_photos" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_photos"."trip_id") AND ("tm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_photos"."trip_id") AND ("t"."creator_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."trips" "t"
  WHERE (("t"."id" = "trip_photos"."trip_id") AND ("t"."status" = 'completed'::"public"."trip_status") AND ("t"."type" = 'community'::"public"."trip_type"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."direct_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expense_payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."group_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_read_status";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trip_expenses";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."add_creator_as_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_creator_as_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_creator_as_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_member_to_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_member_to_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_member_to_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_trip_member_to_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_trip_member_to_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_trip_member_to_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_trip_member_with_rejoin"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_trip_member_with_rejoin"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_trip_member_with_rejoin"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_discussion_reply_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_discussion_reply_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_discussion_reply_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_reaction_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_reaction_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_reaction_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_story_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_story_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_story_comment_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_expense_receipt"("p_receipt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_expense_receipt"("p_receipt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_expense_receipt"("p_receipt_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_join_request"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_join_request"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_join_request"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_join_request_safe"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_join_request_safe"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_join_request_safe"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_join_request_with_rejoin"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_join_request_with_rejoin"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_join_request_with_rejoin"("p_request_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_complete_trips"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_complete_trips"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_complete_trips"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_trip_expense_balances"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_trip_expense_balances"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_trip_expense_balances"("p_trip_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_trip_members"("p_trip_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_trip_members"("p_trip_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_trip_members"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_trip_members"("p_trip_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_review_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_review_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_review_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_rejoin_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_rejoin_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_rejoin_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_receipt_status_constraint"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_receipt_status_constraint"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_receipt_status_constraint"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_all_orphaned_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_all_orphaned_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_all_orphaned_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_empty_conversations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_empty_conversations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_empty_conversations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_orphaned_conversations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_conversations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_conversations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_direct_conversation_participants"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_direct_conversation_participants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_direct_conversation_participants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_trip_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_trip_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_trip_conversation_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_trip_conversation_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_conversation_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_trip_conversation_on_publish"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_trip_conversation_on_publish"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_conversation_on_publish"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_trip_access"("p_trip_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_trip_access"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_trip_access"("p_trip_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_push_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_push_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_push_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_payer_marked_as_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_payer_marked_as_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_payer_marked_as_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_payment_method"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_payment_method"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_payment_method"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_trip_conversation"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_trip_conversation"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_trip_conversation"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_trip_has_conversation"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_trip_has_conversation"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_trip_has_conversation"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_trip_members_in_conversation"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_trip_members_in_conversation"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_trip_members_in_conversation"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_all_participant_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_all_participant_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_all_participant_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_notification_action_url"("p_type" "text", "p_trip_id" "uuid", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_notification_action_url"("p_type" "text", "p_trip_id" "uuid", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_notification_action_url"("p_type" "text", "p_trip_id" "uuid", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sample_itinerary"("days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sample_itinerary"("days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sample_itinerary"("days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_slug"("title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_slug"("title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_slug"("title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_block_related_user_ids"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_block_related_user_ids"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_block_related_user_ids"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_details" TO "anon";
GRANT ALL ON TABLE "public"."conversation_details" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_details" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_conversation_details"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_conversation_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversation_members"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_members"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_members"("p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversation_messages"("conversation_id_param" "uuid", "limit_param" integer, "before_timestamp" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_messages"("conversation_id_param" "uuid", "limit_param" integer, "before_timestamp" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_messages"("conversation_id_param" "uuid", "limit_param" integer, "before_timestamp" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversations_with_unread"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversations_with_unread"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversations_with_unread"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_join_request_with_emails"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_join_request_with_emails"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_join_request_with_emails"("request_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_notification_counts"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_notification_counts"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_notification_counts"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_notification_counts"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("user1_uuid" "uuid", "user2_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("user1_uuid" "uuid", "user2_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("user1_uuid" "uuid", "user2_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_unread_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_unread_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_unread_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_analytics"("p_trip_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_analytics"("p_trip_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_analytics"("p_trip_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_average_rating"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_average_rating"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_average_rating"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_member_stats"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_member_stats"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_member_stats"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_payment_methods"("p_trip_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_payment_methods"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_payment_methods"("p_trip_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_pending_requests_count"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_pending_requests_count"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_pending_requests_count"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trip_with_creator_email"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_trip_with_creator_email"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trip_with_creator_email"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_counts"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_counts"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_counts"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_conversations"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_conversations"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_conversations"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_email"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_email"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_email"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_engagement_metrics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_engagement_metrics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_engagement_metrics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile_with_bio"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_with_bio"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_with_bio"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tip_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tip_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tip_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_emails"("user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_emails"("user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_emails"("user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_who_owes_who"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_who_owes_who"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_who_owes_who"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."guided_book_departure"("p_departure_id" "uuid", "p_requested_pax" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."guided_book_departure"("p_departure_id" "uuid", "p_requested_pax" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."guided_cancel_departure_booking"("p_departure_id" "uuid", "p_pax_to_cancel" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."guided_cancel_departure_booking"("p_departure_id" "uuid", "p_pax_to_cancel" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."guided_generate_booking_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."guided_generate_booking_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guided_generate_booking_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_leaving_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_leaving_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_leaving_trip"("p_trip_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment"("table_name" "text", "row_id" "uuid", "column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment"("table_name" "text", "row_id" "uuid", "column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment"("table_name" "text", "row_id" "uuid", "column_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_trip_analytics"("p_trip_id" "uuid", "p_metric" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_trip_analytics"("p_trip_id" "uuid", "p_metric" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_trip_analytics"("p_trip_id" "uuid", "p_metric" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_blocked"("user1_id" "uuid", "user2_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_blocked"("user1_id" "uuid", "user2_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_blocked"("user1_id" "uuid", "user2_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_conversation_participant"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_conversation_participant"("p_user_id" "uuid", "p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_following"("follower_id" "uuid", "following_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_following"("follower_id" "uuid", "following_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_following"("follower_id" "uuid", "following_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_blocked"("p_blocker_id" "uuid", "p_blocked_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("p_blocker_id" "uuid", "p_blocked_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("p_blocker_id" "uuid", "p_blocked_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_trip"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_trip"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_trip"("p_trip_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."leave_trip_member"("p_force_cancel" boolean, "p_trip_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_trip_member"("p_force_cancel" boolean, "p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_trip_member"("p_force_cancel" boolean, "p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_trip_member"("p_force_cancel" boolean, "p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("p_trip_id" "uuid", "p_action_type" "text", "p_action_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_trip_id" "uuid", "p_action_type" "text", "p_action_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_trip_id" "uuid", "p_action_type" "text", "p_action_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_conversation_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_expense_as_paid_with_settlement"("p_expense_id" "uuid", "p_participant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_expense_as_paid_with_settlement"("p_expense_id" "uuid", "p_participant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_expense_as_paid_with_settlement"("p_expense_id" "uuid", "p_participant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("conversation_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("conversation_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("conversation_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_community_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_community_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_community_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_discussion_answer_accepted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_discussion_answer_accepted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_discussion_answer_accepted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_discussion_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_discussion_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_discussion_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_join_request_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_join_request_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_join_request_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_follower"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_follower"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_follower"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_review"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_review"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_review"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_receipt_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_receipt_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_receipt_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_receipt_rejected"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_receipt_rejected"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_receipt_rejected"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_receipt_submitted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_receipt_submitted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_receipt_submitted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_story_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_story_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_story_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_trip_creator_on_join_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_trip_creator_on_join_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_trip_creator_on_join_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_trip_join_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_trip_join_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_trip_join_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_trip_settlement_required"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_trip_settlement_required"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_trip_settlement_required"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_trip_member_joined_update_countries"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_trip_member_joined_update_countries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_trip_member_joined_update_countries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_trip_member_left_update_countries"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_trip_member_left_update_countries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_trip_member_left_update_countries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_payer_unpaid"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_payer_unpaid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_payer_unpaid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."push_community_notification_to_mobile"() TO "anon";
GRANT ALL ON FUNCTION "public"."push_community_notification_to_mobile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."push_community_notification_to_mobile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_trip_participants"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_trip_participants"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_trip_participants"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_user_countries_visited_v2"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_user_countries_visited_v2"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_user_countries_visited_v2"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_balance_settlement"("p_trip_id" "uuid", "p_payer_id" "uuid", "p_payee_id" "uuid", "p_amount" numeric, "p_currency" character varying, "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_balance_settlement"("p_trip_id" "uuid", "p_payer_id" "uuid", "p_payee_id" "uuid", "p_amount" numeric, "p_currency" character varying, "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_balance_settlement"("p_trip_id" "uuid", "p_payer_id" "uuid", "p_payee_id" "uuid", "p_amount" numeric, "p_currency" character varying, "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_profile_view"("p_profile_id" "uuid", "p_viewer_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_profile_view"("p_profile_id" "uuid", "p_viewer_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_profile_view"("p_profile_id" "uuid", "p_viewer_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_expense_receipt"("p_receipt_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_expense_receipt"("p_receipt_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_expense_receipt"("p_receipt_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_saved_trips_on_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_saved_trips_on_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_saved_trips_on_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."request_to_join_trip"("p_trip_id" "uuid", "p_user_id" "uuid", "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_to_join_trip"("p_trip_id" "uuid", "p_user_id" "uuid", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_to_join_trip"("p_trip_id" "uuid", "p_user_id" "uuid", "p_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_guided_departure_slots_for_paid_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_guided_departure_slots_for_paid_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_guided_departure_slots_for_paid_booking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_add_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_add_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_add_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_chat_push"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_chat_push"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_chat_push"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_action_url" "text", "p_sender_id" "uuid", "p_related_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_action_url" "text", "p_sender_id" "uuid", "p_related_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_notification"("p_user_id" "uuid", "p_type" "public"."notification_type", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_action_url" "text", "p_sender_id" "uuid", "p_related_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_notification_email"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_notification_email"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_notification_email"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_notification_email_via_edge"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_notification_email_via_edge"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_notification_email_via_edge"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_trip_created_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_trip_created_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_trip_created_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_welcome_email_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_welcome_email_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_welcome_email_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_published_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_published_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_published_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_trip_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_trip_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_trip_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_discussion_reply_vote_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_discussion_reply_vote_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_discussion_reply_vote_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_guided_booking_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_guided_booking_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_guided_booking_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_guided_schedule_from_payment_record"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_guided_schedule_from_payment_record"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_guided_schedule_from_payment_record"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_guided_trip_current_participants"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_guided_trip_current_participants"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_guided_trip_current_participants"("p_trip_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_guided_trips_owner_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_guided_trips_owner_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_guided_trips_owner_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_trip_member_to_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_trip_member_to_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_trip_member_to_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_storage_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_storage_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_storage_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_review_helpful"("p_review_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_review_helpful"("p_review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_review_helpful"("p_review_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_story_reaction"("p_story_id" "uuid", "p_reaction_type" "public"."reaction_type", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_story_reaction"("p_story_id" "uuid", "p_reaction_type" "public"."reaction_type", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_story_reaction"("p_story_id" "uuid", "p_reaction_type" "public"."reaction_type", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_guided_trips_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_guided_trips_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_guided_trips_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_event"("p_event_name" "text", "p_event_category" "text", "p_event_data" "jsonb", "p_session_id" "text", "p_page_url" "text", "p_referrer_url" "text", "p_user_agent" "text", "p_ip_address" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."track_event"("p_event_name" "text", "p_event_category" "text", "p_event_data" "jsonb", "p_session_id" "text", "p_page_url" "text", "p_referrer_url" "text", "p_user_agent" "text", "p_ip_address" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_event"("p_event_name" "text", "p_event_category" "text", "p_event_data" "jsonb", "p_session_id" "text", "p_page_url" "text", "p_referrer_url" "text", "p_user_agent" "text", "p_ip_address" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_sync_guided_trip_current_participants"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_sync_guided_trip_current_participants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_sync_guided_trip_current_participants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_trip_conversations"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_trip_conversations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_trip_conversations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_handle_member_leaving"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_handle_member_leaving"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_handle_member_leaving"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_messages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_messages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_messages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_help_articles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_help_articles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_help_articles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_active_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_active_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_active_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tip_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tip_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tip_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trip_participants"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trip_participants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trip_participants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trip_participants_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trip_participants_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trip_participants_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trip_payment_methods_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trip_payment_methods_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trip_payment_methods_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trip_rating_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_trip_rating_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trip_rating_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upload_expense_receipt"("p_file_name" "text", "p_file_data" "bytea", "p_content_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upload_expense_receipt"("p_file_name" "text", "p_file_data" "bytea", "p_content_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upload_expense_receipt"("p_file_name" "text", "p_file_data" "bytea", "p_content_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_device_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_push_token"("p_token" "text", "p_platform" "text", "p_device_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";
























GRANT ALL ON TABLE "public"."trip_members" TO "anon";
GRANT ALL ON TABLE "public"."trip_members" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_members" TO "service_role";



GRANT ALL ON TABLE "public"."active_trip_members" TO "anon";
GRANT ALL ON TABLE "public"."active_trip_members" TO "authenticated";
GRANT ALL ON TABLE "public"."active_trip_members" TO "service_role";



GRANT ALL ON TABLE "public"."admin_actions" TO "anon";
GRANT ALL ON TABLE "public"."admin_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_actions" TO "service_role";



GRANT ALL ON TABLE "public"."agent_profiles" TO "anon";
GRANT ALL ON TABLE "public"."agent_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."agent_revenue" TO "anon";
GRANT ALL ON TABLE "public"."agent_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."balance_settlements" TO "anon";
GRANT ALL ON TABLE "public"."balance_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_settlements" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_users" TO "anon";
GRANT ALL ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants_detailed" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."destinations" TO "anon";
GRANT ALL ON TABLE "public"."destinations" TO "authenticated";
GRANT ALL ON TABLE "public"."destinations" TO "service_role";



GRANT ALL ON TABLE "public"."direct_messages" TO "anon";
GRANT ALL ON TABLE "public"."direct_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."direct_messages" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_replies" TO "anon";
GRANT ALL ON TABLE "public"."discussion_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_replies" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_tags" TO "anon";
GRANT ALL ON TABLE "public"."discussion_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_tags" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_votes" TO "anon";
GRANT ALL ON TABLE "public"."discussion_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_votes" TO "service_role";



GRANT ALL ON TABLE "public"."discussions" TO "anon";
GRANT ALL ON TABLE "public"."discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."discussions" TO "service_role";



GRANT ALL ON TABLE "public"."email_queue" TO "anon";
GRANT ALL ON TABLE "public"."email_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."emote_presets" TO "anon";
GRANT ALL ON TABLE "public"."emote_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."emote_presets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."emote_presets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."emote_presets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."emote_presets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."expense_participants" TO "anon";
GRANT ALL ON TABLE "public"."expense_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_participants" TO "service_role";



GRANT ALL ON TABLE "public"."expense_payments" TO "anon";
GRANT ALL ON TABLE "public"."expense_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_payments" TO "service_role";



GRANT ALL ON TABLE "public"."expense_receipts" TO "anon";
GRANT ALL ON TABLE "public"."expense_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."group_messages" TO "anon";
GRANT ALL ON TABLE "public"."group_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."group_messages" TO "service_role";



GRANT ALL ON TABLE "public"."group_messages_with_profiles" TO "anon";
GRANT ALL ON TABLE "public"."group_messages_with_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."group_messages_with_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."guided_bookings" TO "anon";
GRANT ALL ON TABLE "public"."guided_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."guided_payment_records" TO "anon";
GRANT ALL ON TABLE "public"."guided_payment_records" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_payment_records" TO "service_role";



GRANT ALL ON TABLE "public"."guided_payment_schedules" TO "anon";
GRANT ALL ON TABLE "public"."guided_payment_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_payment_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trip_departure_dates" TO "anon";
GRANT ALL ON TABLE "public"."guided_trip_departure_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trip_departure_dates" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trip_exclusions" TO "anon";
GRANT ALL ON TABLE "public"."guided_trip_exclusions" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trip_exclusions" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trip_gallery" TO "anon";
GRANT ALL ON TABLE "public"."guided_trip_gallery" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trip_gallery" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trip_inclusions" TO "anon";
GRANT ALL ON TABLE "public"."guided_trip_inclusions" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trip_inclusions" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trip_locations" TO "anon";
GRANT ALL ON TABLE "public"."guided_trip_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trip_locations" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trip_qr_codes" TO "anon";
GRANT ALL ON TABLE "public"."guided_trip_qr_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trip_qr_codes" TO "service_role";



GRANT ALL ON TABLE "public"."guided_trips" TO "anon";
GRANT ALL ON TABLE "public"."guided_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."guided_trips" TO "service_role";



GRANT ALL ON TABLE "public"."help_articles" TO "anon";
GRANT ALL ON TABLE "public"."help_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."help_articles" TO "service_role";



GRANT ALL ON TABLE "public"."join_requests" TO "anon";
GRANT ALL ON TABLE "public"."join_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."join_requests" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."message_read_status" TO "anon";
GRANT ALL ON TABLE "public"."message_read_status" TO "authenticated";
GRANT ALL ON TABLE "public"."message_read_status" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."moderation_actions" TO "anon";
GRANT ALL ON TABLE "public"."moderation_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."moderation_actions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_counts" TO "anon";
GRANT ALL ON TABLE "public"."notification_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_counts" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_templates" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reminders" TO "anon";
GRANT ALL ON TABLE "public"."payment_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."trip_reviews" TO "anon";
GRANT ALL ON TABLE "public"."trip_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."platform_statistics" TO "anon";
GRANT ALL ON TABLE "public"."platform_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."policies" TO "anon";
GRANT ALL ON TABLE "public"."policies" TO "authenticated";
GRANT ALL ON TABLE "public"."policies" TO "service_role";



GRANT ALL ON TABLE "public"."profile_views" TO "anon";
GRANT ALL ON TABLE "public"."profile_views" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_views" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."reactions" TO "anon";
GRANT ALL ON TABLE "public"."reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."reactions" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."review_helpful" TO "anon";
GRANT ALL ON TABLE "public"."review_helpful" TO "authenticated";
GRANT ALL ON TABLE "public"."review_helpful" TO "service_role";



GRANT ALL ON TABLE "public"."review_reports" TO "anon";
GRANT ALL ON TABLE "public"."review_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."review_reports" TO "service_role";



GRANT ALL ON TABLE "public"."review_statistics" TO "anon";
GRANT ALL ON TABLE "public"."review_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."review_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."saved_trips" TO "anon";
GRANT ALL ON TABLE "public"."saved_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_trips" TO "service_role";



GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."story_comments" TO "anon";
GRANT ALL ON TABLE "public"."story_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."story_comments" TO "service_role";



GRANT ALL ON TABLE "public"."story_tags" TO "anon";
GRANT ALL ON TABLE "public"."story_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."story_tags" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tips" TO "anon";
GRANT ALL ON TABLE "public"."tips" TO "authenticated";
GRANT ALL ON TABLE "public"."tips" TO "service_role";



GRANT ALL ON TABLE "public"."tip_analytics" TO "anon";
GRANT ALL ON TABLE "public"."tip_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."tip_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."tip_settings" TO "anon";
GRANT ALL ON TABLE "public"."tip_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tip_settings" TO "service_role";



GRANT ALL ON TABLE "public"."trip_analytics" TO "anon";
GRANT ALL ON TABLE "public"."trip_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."trip_announcements" TO "anon";
GRANT ALL ON TABLE "public"."trip_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."trip_announcements_with_reactions" TO "anon";
GRANT ALL ON TABLE "public"."trip_announcements_with_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_announcements_with_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."trip_categories" TO "anon";
GRANT ALL ON TABLE "public"."trip_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_categories" TO "service_role";



GRANT ALL ON TABLE "public"."trip_details" TO "anon";
GRANT ALL ON TABLE "public"."trip_details" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_details" TO "service_role";



GRANT ALL ON TABLE "public"."trip_expenses" TO "anon";
GRANT ALL ON TABLE "public"."trip_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."trip_expenses_detailed" TO "anon";
GRANT ALL ON TABLE "public"."trip_expenses_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_expenses_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."trip_feedback" TO "anon";
GRANT ALL ON TABLE "public"."trip_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."trip_feedback_with_users" TO "anon";
GRANT ALL ON TABLE "public"."trip_feedback_with_users" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_feedback_with_users" TO "service_role";



GRANT ALL ON TABLE "public"."trip_invites" TO "anon";
GRANT ALL ON TABLE "public"."trip_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_invites" TO "service_role";



GRANT ALL ON TABLE "public"."trip_notes" TO "anon";
GRANT ALL ON TABLE "public"."trip_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_notes" TO "service_role";



GRANT ALL ON TABLE "public"."trip_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."trip_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."trip_performance_overview" TO "anon";
GRANT ALL ON TABLE "public"."trip_performance_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_performance_overview" TO "service_role";



GRANT ALL ON TABLE "public"."trip_photos" TO "anon";
GRANT ALL ON TABLE "public"."trip_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_photos" TO "service_role";



GRANT ALL ON TABLE "public"."trip_photos_with_users" TO "anon";
GRANT ALL ON TABLE "public"."trip_photos_with_users" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_photos_with_users" TO "service_role";



GRANT ALL ON TABLE "public"."trip_reminders_scheduled" TO "anon";
GRANT ALL ON TABLE "public"."trip_reminders_scheduled" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_reminders_scheduled" TO "service_role";



GRANT ALL ON TABLE "public"."trip_tip_summary" TO "anon";
GRANT ALL ON TABLE "public"."trip_tip_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_tip_summary" TO "service_role";



GRANT ALL ON TABLE "public"."unread_message_counts" TO "anon";
GRANT ALL ON TABLE "public"."unread_message_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."unread_message_counts" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_cancelled_trips" TO "anon";
GRANT ALL ON TABLE "public"."user_cancelled_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cancelled_trips" TO "service_role";



GRANT ALL ON TABLE "public"."user_destinations" TO "anon";
GRANT ALL ON TABLE "public"."user_destinations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_destinations" TO "service_role";



GRANT ALL ON TABLE "public"."user_engagement" TO "anon";
GRANT ALL ON TABLE "public"."user_engagement" TO "authenticated";
GRANT ALL ON TABLE "public"."user_engagement" TO "service_role";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";



GRANT ALL ON TABLE "public"."user_inspirations" TO "anon";
GRANT ALL ON TABLE "public"."user_inspirations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_inspirations" TO "service_role";



GRANT ALL ON TABLE "public"."user_inspirations_with_user" TO "anon";
GRANT ALL ON TABLE "public"."user_inspirations_with_user" TO "authenticated";
GRANT ALL ON TABLE "public"."user_inspirations_with_user" TO "service_role";



GRANT ALL ON TABLE "public"."user_push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."user_statistics" TO "anon";
GRANT ALL ON TABLE "public"."user_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."user_trip_join_status" TO "anon";
GRANT ALL ON TABLE "public"."user_trip_join_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_trip_join_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_trips" TO "anon";
GRANT ALL ON TABLE "public"."user_trips" TO "authenticated";
GRANT ALL ON TABLE "public"."user_trips" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































