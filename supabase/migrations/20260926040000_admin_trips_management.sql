CREATE OR REPLACE FUNCTION public.admin_list_trips(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_visibility text DEFAULT 'all',
  p_trip_type text DEFAULT 'all',
  p_creator_id uuid DEFAULT NULL,
  p_created_from date DEFAULT NULL,
  p_created_to date DEFAULT NULL,
  p_start_from date DEFAULT NULL,
  p_start_to date DEFAULT NULL,
  p_featured text DEFAULT 'all',
  p_sort text DEFAULT 'newest',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, title text, slug text, destination text, status text, visibility text, trip_type text,
  creator_id uuid, creator_name text, creator_username text, creator_avatar text,
  cover_image text, start_date date, end_date date, price numeric, currency text,
  max_participants integer, current_participants integer, rating_average numeric,
  rating_count integer, view_count integer, is_featured boolean, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_sort text := coalesce(p_sort, 'newest');
BEGIN
  IF NOT public.admin_has_permission('trips.view') THEN
    RAISE EXCEPTION 'trips.view permission required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_status, 'all') NOT IN ('all','draft','published','in_progress','completed','cancelled') THEN RAISE EXCEPTION 'Invalid trip status filter'; END IF;
  IF coalesce(p_visibility, 'all') NOT IN ('all','public','private') THEN RAISE EXCEPTION 'Invalid visibility filter'; END IF;
  IF coalesce(p_trip_type, 'all') NOT IN ('all','community','guided') THEN RAISE EXCEPTION 'Invalid trip type filter'; END IF;
  IF coalesce(p_featured, 'all') NOT IN ('all','featured','not_featured') THEN RAISE EXCEPTION 'Invalid featured filter'; END IF;
  IF v_sort NOT IN ('newest','oldest','updated','views','rating','participants','start_date') THEN RAISE EXCEPTION 'Invalid sort option'; END IF;
  IF p_created_from IS NOT NULL AND p_created_to IS NOT NULL AND p_created_from > p_created_to THEN RAISE EXCEPTION 'Created date range is invalid'; END IF;
  IF p_start_from IS NOT NULL AND p_start_to IS NOT NULL AND p_start_from > p_start_to THEN RAISE EXCEPTION 'Trip start date range is invalid'; END IF;

  RETURN QUERY
  SELECT t.id, t.title, t.slug, t.destination, t.status::text, t.visibility, t.type::text,
    t.creator_id, p.full_name, p.username, p.avatar_url, t.cover_image,
    t.start_date, t.end_date, t.price, t.currency, t.max_participants, t.current_participants,
    t.rating_average, t.rating_count, t.view_count, coalesce(t.is_featured,false), t.created_at, t.updated_at
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.id = t.creator_id
  WHERE (coalesce(p_status,'all')='all' OR t.status::text=p_status)
    AND (coalesce(p_visibility,'all')='all' OR coalesce(t.visibility,'public')=p_visibility)
    AND (coalesce(p_trip_type,'all')='all' OR t.type::text=p_trip_type)
    AND (p_creator_id IS NULL OR t.creator_id=p_creator_id)
    AND (p_created_from IS NULL OR t.created_at >= p_created_from::timestamptz)
    AND (p_created_to IS NULL OR t.created_at < (p_created_to + 1)::timestamptz)
    AND (p_start_from IS NULL OR t.start_date >= p_start_from)
    AND (p_start_to IS NULL OR t.start_date <= p_start_to)
    AND (coalesce(p_featured,'all')='all' OR (p_featured='featured' AND coalesce(t.is_featured,false)) OR (p_featured='not_featured' AND NOT coalesce(t.is_featured,false)))
    AND (nullif(trim(p_search),'') IS NULL OR concat_ws(' ',t.title,t.destination,t.slug,p.full_name,p.username) ILIKE '%'||trim(p_search)||'%')
  ORDER BY
    CASE WHEN v_sort='newest' THEN t.created_at END DESC NULLS LAST,
    CASE WHEN v_sort='oldest' THEN t.created_at END ASC NULLS LAST,
    CASE WHEN v_sort='updated' THEN t.updated_at END DESC NULLS LAST,
    CASE WHEN v_sort='views' THEN t.view_count END DESC NULLS LAST,
    CASE WHEN v_sort='rating' THEN t.rating_average END DESC NULLS LAST,
    CASE WHEN v_sort='participants' THEN t.current_participants END DESC NULLS LAST,
    CASE WHEN v_sort='start_date' THEN t.start_date END ASC NULLS LAST,
    t.id DESC
  LIMIT least(greatest(coalesce(p_limit,20),1),100)
  OFFSET greatest(coalesce(p_offset,0),0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_count_trips(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_visibility text DEFAULT 'all',
  p_trip_type text DEFAULT 'all',
  p_creator_id uuid DEFAULT NULL,
  p_created_from date DEFAULT NULL,
  p_created_to date DEFAULT NULL,
  p_start_from date DEFAULT NULL,
  p_start_to date DEFAULT NULL,
  p_featured text DEFAULT 'all'
)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_count bigint;
BEGIN
  IF NOT public.admin_has_permission('trips.view') THEN RAISE EXCEPTION 'trips.view permission required' USING ERRCODE = '42501'; END IF;
  IF coalesce(p_visibility, 'all') NOT IN ('all','public','private') OR coalesce(p_status, 'all') NOT IN ('all','draft','published','in_progress','completed','cancelled') OR coalesce(p_trip_type, 'all') NOT IN ('all','community','guided') OR coalesce(p_featured, 'all') NOT IN ('all','featured','not_featured') THEN RAISE EXCEPTION 'Invalid trip filter'; END IF;
  IF p_created_from IS NOT NULL AND p_created_to IS NOT NULL AND p_created_from > p_created_to THEN RAISE EXCEPTION 'Created date range is invalid'; END IF;
  IF p_start_from IS NOT NULL AND p_start_to IS NOT NULL AND p_start_from > p_start_to THEN RAISE EXCEPTION 'Trip start date range is invalid'; END IF;
  SELECT count(*) INTO v_count
  FROM public.trips t LEFT JOIN public.profiles p ON p.id=t.creator_id
  WHERE (coalesce(p_status,'all')='all' OR t.status::text=p_status)
    AND (coalesce(p_visibility,'all')='all' OR coalesce(t.visibility,'public')=p_visibility)
    AND (coalesce(p_trip_type,'all')='all' OR t.type::text=p_trip_type)
    AND (p_creator_id IS NULL OR t.creator_id=p_creator_id)
    AND (p_created_from IS NULL OR t.created_at >= p_created_from::timestamptz)
    AND (p_created_to IS NULL OR t.created_at < (p_created_to + 1)::timestamptz)
    AND (p_start_from IS NULL OR t.start_date >= p_start_from)
    AND (p_start_to IS NULL OR t.start_date <= p_start_to)
    AND (coalesce(p_featured,'all')='all' OR (p_featured='featured' AND coalesce(t.is_featured,false)) OR (p_featured='not_featured' AND NOT coalesce(t.is_featured,false)))
    AND (nullif(trim(p_search),'') IS NULL OR concat_ws(' ',t.title,t.destination,t.slug,p.full_name,p.username) ILIKE '%'||trim(p_search)||'%');
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_trip(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_trip jsonb;
BEGIN
  IF NOT public.admin_has_permission('trips.view') THEN RAISE EXCEPTION 'trips.view permission required' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'id',t.id,'title',t.title,'slug',t.slug,'destination',t.destination,'status',t.status::text,
    'visibility',t.visibility,'type',t.type::text,'creator_id',t.creator_id,
    'creator_name',p.full_name,'creator_username',p.username,'creator_avatar',p.avatar_url,
    'creator_is_agent',p.role::text='agent',
    'cover_image',t.cover_image,'images',t.images,'start_date',t.start_date,'end_date',t.end_date,
    'price',t.price,'currency',t.currency,'max_participants',t.max_participants,
    'current_participants',t.current_participants,'rating_average',t.rating_average,
    'rating_count',t.rating_count,'view_count',t.view_count,'is_featured',coalesce(t.is_featured,false),
    'created_at',t.created_at,'updated_at',t.updated_at,'description',t.description,
    'meeting_point',t.meeting_point,'itinerary',t.itinerary,'stops',t.stops,
    'requirements',t.requirements,'tags',t.tags,'travel_styles',t.travel_styles,
    'budget_mode',t.budget_mode,'budget_breakdown',t.budget_breakdown,
    'trip_settings',t.trip_settings,'currency_settings',t.currency_settings,
    'members',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'user_id',tm.user_id,'full_name',mp.full_name,'username',mp.username,'avatar_url',mp.avatar_url,
      'role',tm.role,'is_admin',coalesce(tm.is_admin,false),'joined_at',tm.joined_at,
      'left_at',tm.left_at,'status',CASE WHEN tm.left_at IS NULL THEN 'active' ELSE 'left' END
    ) ORDER BY tm.joined_at), '[]'::jsonb)
      FROM public.trip_members tm LEFT JOIN public.profiles mp ON mp.id=tm.user_id WHERE tm.trip_id=t.id),
    'reviews',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'user_id',r.user_id,'full_name',rp.full_name,'username',rp.username,
      'rating',r.rating,'title',r.title,'comment',r.comment,'verified_booking',r.is_verified_booking,'created_at',r.created_at
    ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.trip_reviews r LEFT JOIN public.profiles rp ON rp.id=r.user_id WHERE r.trip_id=t.id),
    'analytics',(SELECT coalesce(jsonb_build_object(
      'views',sum(ta.views),'unique_visitors',sum(ta.unique_visitors),'join_requests',sum(ta.join_requests),
      'conversions',sum(ta.conversions),'shares',sum(ta.shares),'saves',sum(ta.saves)
    ), '{}'::jsonb) FROM public.trip_analytics ta WHERE ta.trip_id=t.id),
    'bookings',(SELECT coalesce(jsonb_agg(jsonb_build_object('status',b.status::text,'count',b.booking_count)), '[]'::jsonb)
      FROM (SELECT status,count(*)::integer AS booking_count FROM public.bookings WHERE trip_id=t.id GROUP BY status) b),
    'payments',(SELECT coalesce(jsonb_agg(jsonb_build_object('status',pay.status::text,'count',pay.payment_count,'amount',pay.total_amount)), '[]'::jsonb)
      FROM (SELECT status,count(*)::integer AS payment_count,sum(amount) AS total_amount FROM public.payments WHERE trip_id=t.id GROUP BY status) pay),
    'reports',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'reason',r.reason::text,'status',r.status::text,'created_at',r.created_at,'resolution',r.resolution_notes)), '[]'::jsonb)
      FROM public.reports r WHERE r.content_type::text='trip' AND r.content_id=t.id)
  ) INTO v_trip
  FROM public.trips t LEFT JOIN public.profiles p ON p.id=t.creator_id
  WHERE t.id=p_trip_id;
  RETURN v_trip;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_trip_featured(p_trip_id uuid,p_featured boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_old boolean; v_actor uuid := auth.uid();
BEGIN
  IF NOT public.admin_has_permission('trips.manage') THEN RAISE EXCEPTION 'trips.manage permission required' USING ERRCODE='42501'; END IF;
  IF p_featured IS NULL THEN RAISE EXCEPTION 'featured value is required'; END IF;
  SELECT coalesce(is_featured,false) INTO v_old FROM public.trips WHERE id=p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trip not found'; END IF;
  IF v_old IS DISTINCT FROM p_featured THEN
    UPDATE public.trips SET is_featured=p_featured,updated_at=now() WHERE id=p_trip_id;
    INSERT INTO public.admin_actions(trip_id,admin_id,action_type,action_data)
    VALUES(p_trip_id,v_actor,CASE WHEN p_featured THEN 'TRIP_FEATURED' ELSE 'TRIP_UNFEATURED' END,
      jsonb_build_object('previous_state',jsonb_build_object('is_featured',v_old),'new_state',jsonb_build_object('is_featured',p_featured),'created_at',now()));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_trip_visibility(p_trip_id uuid,p_visibility text,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_old text; v_actor uuid := auth.uid();
BEGIN
  IF NOT public.admin_has_permission('trips.manage') THEN RAISE EXCEPTION 'trips.manage permission required' USING ERRCODE='42501'; END IF;
  IF p_visibility IS NULL OR p_visibility NOT IN ('public','private') THEN RAISE EXCEPTION 'invalid visibility'; END IF;
  SELECT visibility INTO v_old FROM public.trips WHERE id=p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trip not found'; END IF;
  IF v_old IS DISTINCT FROM p_visibility THEN
    UPDATE public.trips SET visibility=p_visibility,updated_at=now() WHERE id=p_trip_id;
    INSERT INTO public.admin_actions(trip_id,admin_id,action_type,action_data)
    VALUES(p_trip_id,v_actor,'TRIP_VISIBILITY_CHANGED',jsonb_build_object('reason',nullif(trim(p_reason),''),'previous_state',jsonb_build_object('visibility',v_old),'new_state',jsonb_build_object('visibility',p_visibility),'created_at',now()));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_trip_status(p_trip_id uuid,p_status text,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE v_old text; v_actor uuid := auth.uid(); v_action text;
BEGIN
  IF NOT public.admin_has_permission('trips.manage') THEN RAISE EXCEPTION 'trips.manage permission required' USING ERRCODE='42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('draft','published','in_progress','completed','cancelled') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT status::text INTO v_old FROM public.trips WHERE id=p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trip not found'; END IF;
  IF v_old=p_status THEN RETURN; END IF;
  IF NOT (
    (v_old='draft' AND p_status='published') OR
    (v_old='published' AND p_status IN ('draft','in_progress','cancelled')) OR
    (v_old='in_progress' AND p_status IN ('completed','cancelled'))
  ) THEN RAISE EXCEPTION 'invalid trip status transition: % to %',v_old,p_status; END IF;
  v_action := CASE
    WHEN v_old='draft' AND p_status='published' THEN 'TRIP_PUBLISHED'
    WHEN v_old='published' AND p_status='draft' THEN 'TRIP_UNPUBLISHED'
    WHEN p_status='cancelled' THEN 'TRIP_CANCELLED'
    WHEN v_old='in_progress' AND p_status='completed' THEN 'TRIP_COMPLETED'
    ELSE 'TRIP_STATUS_CHANGED'
  END;
  UPDATE public.trips SET status=p_status::public.trip_status,updated_at=now() WHERE id=p_trip_id;
  INSERT INTO public.admin_actions(trip_id,admin_id,action_type,action_data)
  VALUES(p_trip_id,v_actor,v_action,jsonb_build_object('reason',nullif(trim(p_reason),''),'previous_state',jsonb_build_object('status',v_old),'new_state',jsonb_build_object('status',p_status),'created_at',now()));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_trips(text,text,text,text,uuid,date,date,date,date,text,text,integer,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_count_trips(text,text,text,text,uuid,date,date,date,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_get_trip(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_set_trip_featured(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_set_trip_visibility(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_set_trip_status(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_trips(text,text,text,text,uuid,date,date,date,date,text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_count_trips(text,text,text,text,uuid,date,date,date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trip_featured(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trip_visibility(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trip_status(uuid,text,text) TO authenticated;

NOTIFY pgrst,'reload schema';
