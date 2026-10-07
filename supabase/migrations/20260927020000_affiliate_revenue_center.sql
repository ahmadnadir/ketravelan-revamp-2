-- Phase 7: internal Ketravelan affiliate-provider and revenue center.
-- No public registration, affiliate user profiles, or settlement-payment coupling.
-- Ingestion of clicks/conversions/commissions and reconciliation writes must be
-- implemented separately through authenticated, idempotent server-side paths.

DO $$
DECLARE
  v_existing text[];
BEGIN
  IF to_regprocedure('public.admin_has_permission(text)') IS NULL THEN
    RAISE EXCEPTION 'Phase 7 requires public.admin_has_permission(text) from the existing Admin RBAC migration';
  END IF;

  SELECT array_agg(table_name ORDER BY table_name)
  INTO v_existing
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = ANY (ARRAY[
      'affiliate_providers', 'affiliate_programs', 'affiliate_campaigns',
      'affiliate_links', 'affiliate_clicks', 'affiliate_conversions',
      'affiliate_commissions'
    ]);

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Affiliate tables already exist (%); inspect their columns and constraints before applying Phase 7', array_to_string(v_existing, ', ');
  END IF;
END;
$$;

CREATE TABLE public.affiliate_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  network_type text NOT NULL DEFAULT 'direct',
  status text NOT NULL DEFAULT 'active',
  base_url text,
  tracking_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.affiliate_providers(id) ON DELETE RESTRICT,
  name text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'active',
  commission_model text NOT NULL DEFAULT 'percentage',
  commission_rate numeric(8,4),
  fixed_commission_amount numeric(18,2),
  currency text,
  starts_at timestamptz,
  ends_at timestamptz,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.affiliate_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE RESTRICT,
  name text NOT NULL,
  tracking_marker text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  destination_url text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, tracking_marker)
);

CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.affiliate_campaigns(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  destination_url text NOT NULL,
  tracking_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE RESTRICT,
  session_id text,
  attribution_token text NOT NULL,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  device_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE RESTRICT,
  booking_id uuid,
  guided_booking_id uuid,
  status text NOT NULL DEFAULT 'pending',
  conversion_amount numeric(18,2),
  currency text,
  converted_at timestamptz,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id uuid NOT NULL REFERENCES public.affiliate_conversions(id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES public.affiliate_providers(id) ON DELETE RESTRICT,
  program_id uuid REFERENCES public.affiliate_programs(id) ON DELETE RESTRICT,
  booking_id uuid,
  commission_base numeric(18,2) NOT NULL,
  commission_rate numeric(8,4),
  commission_amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  received_at timestamptz,
  reconciled_at timestamptz,
  reconciliation_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX affiliate_program_provider_idx ON public.affiliate_programs(provider_id);
CREATE INDEX affiliate_campaign_program_idx ON public.affiliate_campaigns(program_id);
CREATE INDEX affiliate_links_campaign_idx ON public.affiliate_links(campaign_id);
CREATE INDEX affiliate_clicks_link_idx ON public.affiliate_clicks(link_id, created_at DESC);
CREATE INDEX affiliate_conversions_status_idx ON public.affiliate_conversions(status, created_at DESC);
CREATE INDEX affiliate_commissions_provider_status_idx ON public.affiliate_commissions(provider_id, status, created_at DESC);

ALTER TABLE public.affiliate_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.affiliate_providers, public.affiliate_programs, public.affiliate_campaigns,
  public.affiliate_links, public.affiliate_clicks, public.affiliate_conversions,
  public.affiliate_commissions FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.affiliate_providers, public.affiliate_programs, public.affiliate_campaigns,
  public.affiliate_links, public.affiliate_clicks, public.affiliate_conversions,
  public.affiliate_commissions TO authenticated;
GRANT INSERT, UPDATE ON public.affiliate_providers, public.affiliate_programs,
  public.affiliate_campaigns, public.affiliate_links TO authenticated;

CREATE POLICY affiliate_providers_admin_select ON public.affiliate_providers
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));
CREATE POLICY affiliate_programs_admin_select ON public.affiliate_programs
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));
CREATE POLICY affiliate_campaigns_admin_select ON public.affiliate_campaigns
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));
CREATE POLICY affiliate_links_admin_select ON public.affiliate_links
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));
CREATE POLICY affiliate_clicks_admin_select ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));
CREATE POLICY affiliate_conversions_admin_select ON public.affiliate_conversions
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));
CREATE POLICY affiliate_commissions_admin_select ON public.affiliate_commissions
  FOR SELECT TO authenticated USING (public.admin_has_permission('affiliate.view'));

CREATE POLICY affiliate_providers_admin_insert ON public.affiliate_providers
  FOR INSERT TO authenticated WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_providers_admin_update ON public.affiliate_providers
  FOR UPDATE TO authenticated USING (public.admin_has_permission('affiliate.manage'))
  WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_programs_admin_insert ON public.affiliate_programs
  FOR INSERT TO authenticated WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_programs_admin_update ON public.affiliate_programs
  FOR UPDATE TO authenticated USING (public.admin_has_permission('affiliate.manage'))
  WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_campaigns_admin_insert ON public.affiliate_campaigns
  FOR INSERT TO authenticated WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_campaigns_admin_update ON public.affiliate_campaigns
  FOR UPDATE TO authenticated USING (public.admin_has_permission('affiliate.manage'))
  WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_links_admin_insert ON public.affiliate_links
  FOR INSERT TO authenticated WITH CHECK (public.admin_has_permission('affiliate.manage'));
CREATE POLICY affiliate_links_admin_update ON public.affiliate_links
  FOR UPDATE TO authenticated USING (public.admin_has_permission('affiliate.manage'))
  WITH CHECK (public.admin_has_permission('affiliate.manage'));

CREATE OR REPLACE FUNCTION public.admin_affiliate_revenue_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.admin_has_permission('affiliate.view') THEN
    RAISE EXCEPTION 'Affiliate read access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'providers', (SELECT count(*) FROM public.affiliate_providers),
    'programs', (SELECT count(*) FROM public.affiliate_programs),
    'campaigns', (SELECT count(*) FROM public.affiliate_campaigns),
    'links', (SELECT count(*) FROM public.affiliate_links),
    'clicks', (SELECT count(*) FROM public.affiliate_clicks),
    'conversions', (SELECT count(*) FROM public.affiliate_conversions),
    'commissions', (SELECT count(*) FROM public.affiliate_commissions),
    'revenue', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'currency', grouped.currency,
        'status', grouped.status,
        'records', grouped.records,
        'amount', grouped.amount
      ) ORDER BY grouped.currency, grouped.status)
      FROM (
        SELECT currency, status, count(*)::bigint AS records, coalesce(sum(commission_amount), 0)::numeric AS amount
        FROM public.affiliate_commissions
        GROUP BY currency, status
      ) grouped
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_affiliate_revenue_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_affiliate_revenue_overview() TO authenticated;

NOTIFY pgrst, 'reload schema';