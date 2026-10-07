CREATE OR REPLACE FUNCTION public.admin_get_analytics_day_messages(
  p_date date,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rows jsonb;
  v_total bigint;
  v_page_size integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;
  IF p_date IS NULL THEN RAISE EXCEPTION 'Message date is required'; END IF;

  SELECT count(*) INTO v_total FROM public.messages m
  WHERE m.created_at >= p_date AND m.created_at < p_date + 1 AND coalesce(m.type, 'user') = 'user';

  SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT m.id::text AS message_id, m.conversation_id::text AS conversation_id,
      m.created_at, m.content, coalesce(m.attachments, '[]'::jsonb) AS attachments,
      coalesce(nullif(sender.username, ''), nullif(sender.full_name, ''), 'Unknown sender') AS sender,
      coalesce(c.conversation_type, 'conversation') AS conversation_type,
      c.name AS conversation_name, c.trip_id::text AS trip_id,
      coalesce(t.title, 'Direct conversation') AS trip_title
    FROM public.messages m
    LEFT JOIN public.profiles sender ON sender.id = m.sender_id
    LEFT JOIN public.conversations c ON c.id = m.conversation_id
    LEFT JOIN public.trips t ON t.id = c.trip_id
    WHERE m.created_at >= p_date AND m.created_at < p_date + 1 AND coalesce(m.type, 'user') = 'user'
    ORDER BY m.conversation_id, m.created_at, m.id
    OFFSET v_offset LIMIT v_page_size
  ) page;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

NOTIFY pgrst, 'reload schema';