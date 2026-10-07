CREATE INDEX IF NOT EXISTS idx_reports_status_created_admin ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_type_status_created_admin ON public.reports(content_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_created_admin ON public.moderation_actions(report_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_list_moderation_reports(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_content_type text DEFAULT 'all',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  reporter_id uuid,
  reporter_name text,
  reporter_username text,
  reported_user_id uuid,
  reported_user_name text,
  reported_user_username text,
  content_type text,
  content_id uuid,
  reason text,
  details text,
  description text,
  status text,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz,
  reported_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.admin_has_permission('moderation.view') THEN
    RAISE EXCEPTION 'moderation.view permission required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_status, 'all') NOT IN ('all','open','under_review','resolved','dismissed') THEN
    RAISE EXCEPTION 'Invalid report status filter';
  END IF;
  IF coalesce(p_content_type, 'all') NOT IN ('all','story','story_comment','discussion','discussion_reply','trip','trip_chat_message','direct_chat_message','user_profile') THEN
    RAISE EXCEPTION 'Invalid report content type filter';
  END IF;

  RETURN QUERY
  SELECT r.id, r.reporter_id, rp.full_name, rp.username,
    r.reported_user_id, up.full_name, up.username, r.content_type::text,
    r.content_id, r.reason::text, r.details, r.description, r.status::text,
    r.resolution_notes, r.resolved_by, r.resolved_at, r.created_at, r.reported_at
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  LEFT JOIN public.profiles up ON up.id = r.reported_user_id
  WHERE (coalesce(p_status, 'all') = 'all' OR r.status::text = p_status)
    AND (coalesce(p_content_type, 'all') = 'all' OR r.content_type::text = p_content_type)
    AND (nullif(trim(p_search), '') IS NULL OR concat_ws(' ', r.id::text, r.reporter_id::text,
      rp.full_name, rp.username, up.full_name, up.username, r.content_type::text,
      r.content_id::text, r.reason::text, r.details, r.description) ILIKE '%' || trim(p_search) || '%')
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT least(greatest(coalesce(p_limit,20),1),100)
  OFFSET greatest(coalesce(p_offset,0),0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_count_moderation_reports(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_content_type text DEFAULT 'all'
)
RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_count bigint;
BEGIN
  IF NOT public.admin_has_permission('moderation.view') THEN
    RAISE EXCEPTION 'moderation.view permission required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_status, 'all') NOT IN ('all','open','under_review','resolved','dismissed')
    OR coalesce(p_content_type, 'all') NOT IN ('all','story','story_comment','discussion','discussion_reply','trip','trip_chat_message','direct_chat_message','user_profile') THEN
    RAISE EXCEPTION 'Invalid moderation filter';
  END IF;
  SELECT count(*) INTO v_count
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  LEFT JOIN public.profiles up ON up.id = r.reported_user_id
  WHERE (coalesce(p_status, 'all') = 'all' OR r.status::text = p_status)
    AND (coalesce(p_content_type, 'all') = 'all' OR r.content_type::text = p_content_type)
    AND (nullif(trim(p_search), '') IS NULL OR concat_ws(' ', r.id::text, r.reporter_id::text,
      rp.full_name, rp.username, up.full_name, up.username, r.content_type::text,
      r.content_id::text, r.reason::text, r.details, r.description) ILIKE '%' || trim(p_search) || '%');
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_moderation_report(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_content jsonb;
BEGIN
  IF NOT public.admin_has_permission('moderation.view') THEN
    RAISE EXCEPTION 'moderation.view permission required' USING ERRCODE = '42501';
  END IF;

  SELECT CASE r.content_type::text
    WHEN 'story' THEN (SELECT jsonb_build_object('title',s.title,'summary',s.excerpt,'author_id',s.author_id,'hidden',s.is_hidden,'deleted',s.deleted_at IS NOT NULL) FROM public.stories s WHERE s.id=r.content_id)
    WHEN 'story_comment' THEN (SELECT jsonb_build_object('title','Story comment','summary',sc.body,'author_id',sc.author_id,'hidden',sc.is_hidden,'deleted',sc.deleted_at IS NOT NULL) FROM public.story_comments sc WHERE sc.id=r.content_id)
    WHEN 'discussion' THEN (SELECT jsonb_build_object('title',d.title,'summary',d.body,'author_id',d.author_id,'hidden',d.is_hidden,'locked',d.is_locked,'deleted',d.deleted_at IS NOT NULL) FROM public.discussions d WHERE d.id=r.content_id)
    WHEN 'discussion_reply' THEN (SELECT jsonb_build_object('title','Discussion reply','summary',dr.body,'author_id',dr.author_id,'hidden',dr.is_hidden,'deleted',dr.deleted_at IS NOT NULL,'discussion_id',dr.discussion_id) FROM public.discussion_replies dr WHERE dr.id=r.content_id)
    WHEN 'trip' THEN (SELECT jsonb_build_object('title',t.title,'summary',t.description,'author_id',t.creator_id,'status',t.status::text,'destination',t.destination) FROM public.trips t WHERE t.id=r.content_id)
    WHEN 'trip_chat_message' THEN (SELECT jsonb_build_object('title','Trip chat message','summary',gm.message,'author_id',gm.user_id,'trip_id',gm.trip_id,'deleted',gm.is_deleted) FROM public.group_messages gm WHERE gm.id=r.content_id)
    WHEN 'direct_chat_message' THEN (SELECT jsonb_build_object('title','Direct message','summary',dm.content,'author_id',dm.sender_id,'conversation_id',dm.conversation_id) FROM public.direct_messages dm WHERE dm.id=r.content_id)
    WHEN 'user_profile' THEN (SELECT jsonb_build_object('title',coalesce(p.full_name,p.username,'User profile'),'summary',p.bio,'author_id',p.id,'username',p.username) FROM public.profiles p WHERE p.id=r.content_id)
    ELSE NULL
  END INTO v_content
  FROM public.reports r WHERE r.id = p_report_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'report not found'; END IF;

  SELECT jsonb_build_object(
    'id',r.id,'reporter_id',r.reporter_id,'reporter_name',rp.full_name,'reporter_username',rp.username,'reporter_avatar',rp.avatar_url,
    'reported_user_id',r.reported_user_id,'reported_user_name',up.full_name,'reported_user_username',up.username,'reported_user_avatar',up.avatar_url,
    'reported_user_status',CASE WHEN up.is_deleted THEN 'deleted' WHEN aus.status='suspended' THEN 'suspended' ELSE 'active' END,
    'content_type',r.content_type::text,'content_id',r.content_id,'content',v_content,
    'reason',r.reason::text,'details',r.details,'description',r.description,'status',r.status::text,
    'resolution_notes',r.resolution_notes,'resolved_by',r.resolved_by,'resolved_at',r.resolved_at,
    'created_at',r.created_at,'reported_at',r.reported_at,
    'actions',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',ma.id,'moderator_id',ma.moderator_id,'moderator_name',mp.full_name,'moderator_username',mp.username,
      'content_type',ma.content_type::text,'content_id',ma.content_id,'action_type',ma.action_type::text,
      'reason',ma.reason,'report_id',ma.report_id,'created_at',ma.created_at
    ) ORDER BY ma.created_at DESC) FROM public.moderation_actions ma LEFT JOIN public.profiles mp ON mp.id=ma.moderator_id WHERE ma.report_id=r.id),'[]'::jsonb)
  ) INTO v_result
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id=r.reporter_id
  LEFT JOIN public.profiles up ON up.id=r.reported_user_id
  LEFT JOIN public.admin_user_status aus ON aus.user_id=up.id
  WHERE r.id=p_report_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transition_moderation_report(
  p_report_id uuid,
  p_status text,
  p_resolution_notes text DEFAULT NULL
)
RETURNS public.report_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_old public.report_status; v_new public.report_status; v_report public.reports%ROWTYPE;
BEGIN
  IF NOT public.admin_has_permission('moderation.manage') THEN
    RAISE EXCEPTION 'moderation.manage permission required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('under_review','resolved','dismissed') THEN RAISE EXCEPTION 'Invalid report status'; END IF;
  v_new := p_status::public.report_status;
  SELECT * INTO v_report FROM public.reports WHERE id=p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found'; END IF;
  v_old := v_report.status;
  IF v_new = v_old THEN RETURN v_new; END IF;
  IF v_new='under_review' AND v_old NOT IN ('open','under_review') THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
  IF v_new IN ('resolved','dismissed') AND v_old NOT IN ('under_review','open') THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
  UPDATE public.reports SET status=v_new,
    resolution_notes=CASE WHEN v_new IN ('resolved','dismissed') THEN nullif(trim(p_resolution_notes),'') ELSE resolution_notes END,
    resolved_by=CASE WHEN v_new IN ('resolved','dismissed') THEN auth.uid() ELSE resolved_by END,
    resolved_at=CASE WHEN v_new IN ('resolved','dismissed') THEN now() ELSE resolved_at END
  WHERE id=p_report_id;

  INSERT INTO public.moderation_actions(moderator_id,content_type,content_id,action_type,reason,report_id)
  VALUES(
    auth.uid(),
    v_report.content_type,
    v_report.content_id,
    CASE v_new
      WHEN 'under_review' THEN 'report_under_review'::public.moderation_action_type
      WHEN 'resolved' THEN 'report_resolved'::public.moderation_action_type
      ELSE 'report_dismissed'::public.moderation_action_type
    END,
    nullif(trim(p_resolution_notes),''),
    p_report_id
  );
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_execute_moderation_action(
  p_report_id uuid,
  p_content_type text,
  p_content_id uuid,
  p_action_type text,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_action public.moderation_action_type;
  v_report public.reports%ROWTYPE;
  v_action_id uuid;
  v_exists boolean := false;
BEGIN
  IF NOT public.admin_has_permission('moderation.manage') THEN
    RAISE EXCEPTION 'moderation.manage permission required' USING ERRCODE = '42501';
  END IF;
  IF p_report_id IS NULL OR p_content_type IS NULL OR p_content_id IS NULL OR p_action_type IS NULL THEN
    RAISE EXCEPTION 'A report, target and action are required';
  END IF;
  IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'A moderation action reason is required'; END IF;
  IF p_action_type NOT IN ('hide','unhide','delete','restore','lock','unlock') THEN
    RAISE EXCEPTION 'This action is not supported for content in the current system';
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id=p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found'; END IF;
  IF v_report.content_type::text <> p_content_type OR v_report.content_id <> p_content_id THEN
    RAISE EXCEPTION 'Action target does not match the report';
  END IF;
  IF v_report.status IN ('resolved','dismissed') THEN RAISE EXCEPTION 'Cannot act on a closed report'; END IF;

  v_action := p_action_type::public.moderation_action_type;
  CASE p_content_type
    WHEN 'story' THEN
      SELECT EXISTS(SELECT 1 FROM public.stories WHERE id=p_content_id) INTO v_exists;
      IF NOT v_exists THEN RAISE EXCEPTION 'Story target not found'; END IF;
      IF p_action_type IN ('hide','unhide') THEN
        UPDATE public.stories SET is_hidden=(p_action_type='hide'), hidden_reason=CASE WHEN p_action_type='hide' THEN trim(p_reason) ELSE NULL END, hidden_at=CASE WHEN p_action_type='hide' THEN now() ELSE NULL END, hidden_by=CASE WHEN p_action_type='hide' THEN auth.uid() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSIF p_action_type IN ('delete','restore') THEN
        UPDATE public.stories SET deleted_at=CASE WHEN p_action_type='delete' THEN now() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSE RAISE EXCEPTION 'Lock actions are not supported for stories'; END IF;
    WHEN 'story_comment' THEN
      SELECT EXISTS(SELECT 1 FROM public.story_comments WHERE id=p_content_id) INTO v_exists;
      IF NOT v_exists THEN RAISE EXCEPTION 'Story comment target not found'; END IF;
      IF p_action_type IN ('hide','unhide') THEN
        UPDATE public.story_comments SET is_hidden=(p_action_type='hide'), hidden_reason=CASE WHEN p_action_type='hide' THEN trim(p_reason) ELSE NULL END, hidden_at=CASE WHEN p_action_type='hide' THEN now() ELSE NULL END, hidden_by=CASE WHEN p_action_type='hide' THEN auth.uid() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSIF p_action_type IN ('delete','restore') THEN
        UPDATE public.story_comments SET deleted_at=CASE WHEN p_action_type='delete' THEN now() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSE RAISE EXCEPTION 'Lock actions are not supported for comments'; END IF;
    WHEN 'discussion' THEN
      SELECT EXISTS(SELECT 1 FROM public.discussions WHERE id=p_content_id) INTO v_exists;
      IF NOT v_exists THEN RAISE EXCEPTION 'Discussion target not found'; END IF;
      IF p_action_type IN ('hide','unhide') THEN
        UPDATE public.discussions SET is_hidden=(p_action_type='hide'), hidden_reason=CASE WHEN p_action_type='hide' THEN trim(p_reason) ELSE NULL END, hidden_at=CASE WHEN p_action_type='hide' THEN now() ELSE NULL END, hidden_by=CASE WHEN p_action_type='hide' THEN auth.uid() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSIF p_action_type IN ('delete','restore') THEN
        UPDATE public.discussions SET deleted_at=CASE WHEN p_action_type='delete' THEN now() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSIF p_action_type IN ('lock','unlock') THEN
        UPDATE public.discussions SET is_locked=(p_action_type='lock'), updated_at=now() WHERE id=p_content_id;
      END IF;
    WHEN 'discussion_reply' THEN
      SELECT EXISTS(SELECT 1 FROM public.discussion_replies WHERE id=p_content_id) INTO v_exists;
      IF NOT v_exists THEN RAISE EXCEPTION 'Discussion reply target not found'; END IF;
      IF p_action_type IN ('hide','unhide') THEN
        UPDATE public.discussion_replies SET is_hidden=(p_action_type='hide'), hidden_reason=CASE WHEN p_action_type='hide' THEN trim(p_reason) ELSE NULL END, hidden_at=CASE WHEN p_action_type='hide' THEN now() ELSE NULL END, hidden_by=CASE WHEN p_action_type='hide' THEN auth.uid() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSIF p_action_type IN ('delete','restore') THEN
        UPDATE public.discussion_replies SET deleted_at=CASE WHEN p_action_type='delete' THEN now() ELSE NULL END, updated_at=now() WHERE id=p_content_id;
      ELSE RAISE EXCEPTION 'Lock actions are not supported for replies'; END IF;
    WHEN 'trip_chat_message' THEN
      SELECT EXISTS(SELECT 1 FROM public.group_messages WHERE id=p_content_id) INTO v_exists;
      IF NOT v_exists THEN RAISE EXCEPTION 'Trip chat message target not found'; END IF;
      IF p_action_type IN ('delete','restore','hide','unhide') THEN
        UPDATE public.group_messages SET is_deleted=(p_action_type IN ('delete','hide')), updated_at=now() WHERE id=p_content_id;
      ELSE RAISE EXCEPTION 'Lock actions are not supported for trip chat messages'; END IF;
    WHEN 'trip' THEN RAISE EXCEPTION 'Trip content actions are managed through the Trips module';
    WHEN 'direct_chat_message' THEN RAISE EXCEPTION 'Direct message content actions are not supported by the current schema';
    WHEN 'user_profile' THEN RAISE EXCEPTION 'Profile actions are managed through Users Management';
    ELSE RAISE EXCEPTION 'Unsupported content type';
  END CASE;

  INSERT INTO public.moderation_actions(moderator_id,content_type,content_id,action_type,reason,report_id)
  VALUES(auth.uid(),p_content_type::public.report_content_type,p_content_id,v_action,trim(p_reason),p_report_id)
  RETURNING id INTO v_action_id;
  RETURN v_action_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_moderation_reports(text,text,text,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_count_moderation_reports(text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_moderation_report(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_transition_moderation_report(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_execute_moderation_action(uuid,text,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_moderation_reports(text,text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_count_moderation_reports(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_moderation_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transition_moderation_report(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_execute_moderation_action(uuid,text,uuid,text,text) TO authenticated;

DROP POLICY IF EXISTS reports_admin_moderation_select ON public.reports;
CREATE POLICY reports_admin_moderation_select ON public.reports
  FOR SELECT TO authenticated USING (public.admin_has_permission('moderation.view'));

DROP POLICY IF EXISTS reports_admin_moderation_update ON public.reports;
CREATE POLICY reports_admin_moderation_update ON public.reports
  FOR UPDATE TO authenticated
  USING (public.admin_has_permission('moderation.manage'))
  WITH CHECK (public.admin_has_permission('moderation.manage'));

NOTIFY pgrst, 'reload schema';
