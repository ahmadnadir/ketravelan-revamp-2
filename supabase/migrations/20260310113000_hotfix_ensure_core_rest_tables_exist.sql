-- Emergency hotfix for environments with partial/failed migration history.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure core tables used by REST endpoints exist.
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid,
  title text,
  destination text,
  status text DEFAULT 'draft',
  max_participants integer,
  current_participants integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  is_admin boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending',
  message text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by uuid,
  description text,
  amount numeric(10,2),
  currency varchar(3) DEFAULT 'USD',
  category varchar(50),
  expense_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.trip_expenses(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  receipt_url text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes used by common queries.
CREATE INDEX IF NOT EXISTS idx_join_requests_trip_id ON public.join_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON public.join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_id ON public.expense_receipts(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_status ON public.expense_receipts(status);

-- Enable RLS to align with app expectations.
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

-- Ensure PostgREST roles can see public schema and these tables.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_receipts TO anon, authenticated;

-- Minimal policies to prevent 404s and allow authenticated app access.
DROP POLICY IF EXISTS "Users can create join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Users can view own join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Trip creators can view join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Trip creators can update join requests" ON public.join_requests;
DROP POLICY IF EXISTS "join_requests_auth_select" ON public.join_requests;
CREATE POLICY "join_requests_auth_select"
  ON public.join_requests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "join_requests_auth_insert" ON public.join_requests;
CREATE POLICY "join_requests_auth_insert"
  ON public.join_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "join_requests_auth_update" ON public.join_requests;
CREATE POLICY "join_requests_auth_update"
  ON public.join_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "expense_receipts_auth_all" ON public.expense_receipts;
CREATE POLICY "expense_receipts_auth_all"
  ON public.expense_receipts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Remove legacy join-request triggers that may reference unqualified tables.
DROP TRIGGER IF EXISTS trigger_notify_on_join_request ON public.join_requests;
DROP TRIGGER IF EXISTS trigger_notify_join_request ON public.join_requests;

-- Recreate a safe notification function with explicit schema references.
CREATE OR REPLACE FUNCTION public.notify_trip_creator_on_join_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER trigger_notify_on_join_request
  AFTER INSERT ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trip_creator_on_join_request();

-- Patch legacy trigger functions that used SET search_path TO '' with
-- unqualified table references (e.g., FROM trips), which can cause 42P01.
CREATE OR REPLACE FUNCTION public.add_member_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.notify_join_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Patch countries_visited functions that can fire on trip_members inserts.
CREATE OR REPLACE FUNCTION public.recalculate_user_countries_visited_v2(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.on_trip_member_joined_update_countries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_user_countries_visited_v2(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_trip_member_left_update_countries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    PERFORM public.recalculate_user_countries_visited_v2(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Fix approve RPC ambiguity (42702: column reference "trip_id" is ambiguous).
DROP FUNCTION IF EXISTS public.approve_join_request(uuid);
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS TABLE(approved_trip_id uuid, approved_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_user_id uuid;
  v_creator_id uuid;
  v_status text;
  v_inserted_count integer := 0;
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
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    UPDATE public.trips
    SET current_participants = COALESCE(current_participants, 0) + 1
    WHERE id = v_trip_id;
  END IF;

  RETURN QUERY SELECT v_trip_id AS approved_trip_id, v_user_id AS approved_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
