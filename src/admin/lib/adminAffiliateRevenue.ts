import { supabase } from '@/lib/supabase';

export type AffiliateTab =
  | 'overview'
  | 'providers'
  | 'programs'
  | 'campaigns'
  | 'links'
  | 'clicks'
  | 'conversions'
  | 'commissions'
  | 'reconciliation';

export type AffiliateEntity = Exclude<AffiliateTab, 'overview' | 'reconciliation'>;
export type AffiliateRow = Record<string, unknown>;

export interface AffiliateRevenueOverview {
  providers: number;
  programs: number;
  campaigns: number;
  links: number;
  clicks: number;
  conversions: number;
  commissions: number;
  revenue: Array<{ currency: string; status: string; records: number; amount: number }>;
}

export interface AffiliatePage<T> {
  rows: T[];
  total: number;
}

export interface AffiliateOptions {
  providers: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; provider_id: string }>;
  campaigns: Array<{ id: string; name: string; program_id: string }>;
}

const PAGE_SIZE_CAP = 100;
const SELECTS: Record<AffiliateEntity, string> = {
  providers: 'id,name,network_type,status,base_url,tracking_config,metadata,created_at,updated_at',
  programs: 'id,provider_id,name,category,status,commission_model,commission_rate,fixed_commission_amount,currency,starts_at,ends_at,created_at,provider:affiliate_providers(name)',
  campaigns: 'id,program_id,name,tracking_marker,status,destination_url,starts_at,ends_at,metadata,created_at,program:affiliate_programs(name,provider:affiliate_providers(name))',
  links: 'id,campaign_id,code,destination_url,tracking_params,status,expires_at,created_at,campaign:affiliate_campaigns(name,tracking_marker,program:affiliate_programs(name,provider:affiliate_providers(name)))',
  clicks: 'id,link_id,session_id,attribution_token,source_metadata,device_metadata,created_at,link:affiliate_links(code,campaign:affiliate_campaigns(name,program:affiliate_programs(name)))',
  conversions: 'id,link_id,booking_id,guided_booking_id,status,conversion_amount,currency,converted_at,created_at,link:affiliate_links(code,campaign:affiliate_campaigns(name,program:affiliate_programs(name)))',
  commissions: 'id,conversion_id,provider_id,program_id,booking_id,commission_base,commission_rate,commission_amount,currency,status,received_at,reconciled_at,reconciliation_reference,created_at,provider:affiliate_providers(name),program:affiliate_programs(name)',
};

const TABLES: Record<AffiliateEntity, string> = {
  providers: 'affiliate_providers',
  programs: 'affiliate_programs',
  campaigns: 'affiliate_campaigns',
  links: 'affiliate_links',
  clicks: 'affiliate_clicks',
  conversions: 'affiliate_conversions',
  commissions: 'affiliate_commissions',
};

export async function getAffiliateRevenueOverview(): Promise<AffiliateRevenueOverview> {
  const { data, error } = await supabase.rpc('admin_affiliate_revenue_overview');
  if (error) throw new Error(error.message);
  return data as unknown as AffiliateRevenueOverview;
}

export async function listAffiliateRecords(
  entity: AffiliateEntity,
  page: number,
  pageSize: number,
  status: string,
): Promise<AffiliatePage<AffiliateRow>> {
  const size = Math.min(Math.max(pageSize, 1), PAGE_SIZE_CAP);
  const currentPage = Math.max(page, 1);
  let query = supabase
    .from(TABLES[entity] as never)
    .select(SELECTS[entity] as never, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * size, currentPage * size - 1);

  if (status !== 'all' && ['providers', 'programs', 'campaigns', 'links', 'conversions', 'commissions'].includes(entity)) {
    query = query.eq('status', status) as typeof query;
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: (data || []) as unknown as AffiliateRow[], total: count || 0 };
}

export async function getAffiliateOptions(): Promise<AffiliateOptions> {
  const [providers, programs, campaigns] = await Promise.all([
    supabase.from('affiliate_providers').select('id,name').order('name'),
    supabase.from('affiliate_programs').select('id,name,provider_id').order('name'),
    supabase.from('affiliate_campaigns').select('id,name,program_id').order('name'),
  ]);
  for (const result of [providers, programs, campaigns]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    providers: providers.data || [],
    programs: programs.data || [],
    campaigns: campaigns.data || [],
  };
}

export async function createAffiliateRecord(entity: 'providers' | 'programs' | 'campaigns' | 'links', values: Record<string, unknown>) {
  const { error } = await supabase.from(TABLES[entity] as never).insert(values as never);
  if (error) throw new Error(error.message);
}

export async function editAffiliateRecord(entity: 'providers' | 'programs' | 'campaigns' | 'links', id: string, values: Record<string, unknown>) {
  const { error } = await supabase.from(TABLES[entity] as never).update(values as never).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateAffiliateRecordStatus(entity: 'providers' | 'programs' | 'campaigns' | 'links', id: string, status: string) {
  const { error } = await supabase.from(TABLES[entity] as never).update({ status } as never).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAffiliateRecord(entity: 'providers' | 'programs' | 'campaigns' | 'links', id: string) {
  const { error } = await supabase.from(TABLES[entity] as never).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Child tables that reference each editable entity via ON DELETE RESTRICT foreign keys.
const DEPENDENT_LOOKUPS: Record<'providers' | 'programs' | 'campaigns' | 'links', Array<{ table: string; column: string }>> = {
  providers: [
    { table: 'affiliate_programs', column: 'provider_id' },
    { table: 'affiliate_commissions', column: 'provider_id' },
  ],
  programs: [
    { table: 'affiliate_campaigns', column: 'program_id' },
    { table: 'affiliate_commissions', column: 'program_id' },
  ],
  campaigns: [
    { table: 'affiliate_links', column: 'campaign_id' },
  ],
  links: [
    { table: 'affiliate_clicks', column: 'link_id' },
    { table: 'affiliate_conversions', column: 'link_id' },
  ],
};

export async function getAffiliateDependencyCounts(
  entity: 'providers' | 'programs' | 'campaigns' | 'links',
  ids: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (ids.length === 0) return counts;

  const lookups = DEPENDENT_LOOKUPS[entity];
  await Promise.all(lookups.map(async ({ table, column }) => {
    const { data, error } = await supabase.from(table as never).select(column as never).in(column, ids as never);
    if (error) throw new Error(error.message);
    (data || []).forEach((row) => {
      const value = String((row as Record<string, unknown>)[column]);
      counts[value] = (counts[value] || 0) + 1;
    });
  }));

  return counts;
}

export async function getAffiliateRecord(entity: AffiliateEntity, id: string): Promise<AffiliateRow> {
  const { data, error } = await supabase
    .from(TABLES[entity] as never)
    .select(SELECTS[entity] as never)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Affiliate record not found or access denied.');
  return data as unknown as AffiliateRow;
}
