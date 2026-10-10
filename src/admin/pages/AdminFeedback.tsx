import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Activity, AlertCircle, ArrowDownUp, Bug, ChevronLeft, ChevronRight, ExternalLink, Inbox, Mail, MessageSquare, Paperclip, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  type FeedbackListRow,
  type FeedbackOverview,
  FEEDBACK_AREAS,
  FEEDBACK_REPORT_TYPES,
  FEEDBACK_STATUSES,
  feedbackAction,
  feedbackAreaLabel,
  feedbackStatusLabel,
  feedbackTypeLabel,
  formatFeedbackDate,
} from "../lib/adminFeedback";
import { Link } from "react-router-dom";
import { supabase as appSupabase } from "@/lib/supabase";

const PAGE_SIZE = 25;
const PAGE_SIZES = [25, 50, 100] as const;
const SORT_OPTIONS = [
  ["needs_attention", "Needs attention"], ["newest", "Newest"], ["oldest", "Oldest"],
  ["updated", "Recently updated"], ["severity", "Severity"], ["status", "Status"], ["needs_reply", "Needs reply"],
] as const;

function Badge({ value, kind = "type" }: { value: string | null | undefined; kind?: "type" | "status" | "severity" }) {
  const tone: Record<string, string> = {
    new: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
    triaged: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300",
    in_progress: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    shipped: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    wont_do: "border-border bg-muted text-muted-foreground", duplicate: "border-border bg-muted text-muted-foreground",
    blocking: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    annoying: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    minor: "border-border bg-muted text-muted-foreground", bug: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    feature_request: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300",
  };
  const label = kind === "status" ? feedbackStatusLabel(value) : kind === "severity" ? value : feedbackTypeLabel(value);
  return <UiBadge variant="outline" className={`whitespace-nowrap capitalize ${tone[value ?? ""] ?? ""}`}>{label || "—"}</UiBadge>;
}

function Metric({ label, value, icon: Icon, active, onClick }: { label: string; value: number; icon: typeof Inbox; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`min-w-0 border-l-2 px-3 py-1 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-l-primary bg-muted/40" : "border-l-transparent"}`}><span className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span><span className="mt-1 block text-xl font-semibold tabular-nums">{value.toLocaleString()}</span></button>;
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState<FeedbackOverview | null>(null);
  const [rows, setRows] = useState<FeedbackListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => Number(searchParams.get("page") ?? 0) || 0);
  const [pageSize, setPageSize] = useState<number>(() => PAGE_SIZES.includes(Number(searchParams.get("size")) as typeof PAGE_SIZES[number]) ? Number(searchParams.get("size")) : PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "");
  const [reportType, setReportType] = useState(() => searchParams.get("type") ?? "");
  const [area, setArea] = useState(() => searchParams.get("area") ?? "");
  const [severity, setSeverity] = useState(() => searchParams.get("severity") ?? "");
  const [sentiment, setSentiment] = useState(() => searchParams.get("sentiment") ?? "");
  const [wantsReply, setWantsReply] = useState(() => searchParams.get("reply") ?? "");
  const [hasAttachment, setHasAttachment] = useState(() => searchParams.get("attachment") ?? "");
  const [hasLinkedIssue, setHasLinkedIssue] = useState(() => searchParams.get("issue") ?? "");
  const [hasTrip, setHasTrip] = useState(() => searchParams.get("trip") ?? "");
  const [createdFrom, setCreatedFrom] = useState(() => searchParams.get("from") ?? "");
  const [createdTo, setCreatedTo] = useState(() => searchParams.get("to") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "needs_attention");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => ({
    search: debouncedSearch.trim() || null,
    status: status || null,
    reportType: reportType || null,
    area: area || null,
    severity: severity || null,
    wantsReply: wantsReply === "" ? null : wantsReply === "true",
    sentiment: sentiment || null,
    hasAttachment: hasAttachment === "" ? null : hasAttachment === "true",
    hasLinkedIssue: hasLinkedIssue === "" ? null : hasLinkedIssue === "true",
    hasTrip: hasTrip === "" ? null : hasTrip === "true",
    createdFrom: createdFrom || null,
    createdTo: createdTo || null,
    sort,
    limit: pageSize,
    offset: page * pageSize,
  }), [debouncedSearch, status, reportType, area, severity, sentiment, wantsReply, hasAttachment, hasLinkedIssue, hasTrip, createdFrom, createdTo, sort, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, queryData] = await Promise.all([
        feedbackAction(appSupabase, "overview"),
        feedbackAction(appSupabase, "query", filters),
      ]);
      setOverview(((Array.isArray(overviewData) ? overviewData[0] : overviewData) as FeedbackOverview | null) ?? null);
      const resultRows = (queryData as Array<FeedbackListRow & { total_count: number }> | null) ?? [];
      setRows(resultRows);
      setTotal(Number(resultRows[0]?.total_count ?? 0));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load Feedback Center.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const next = new URLSearchParams();
    const values: Record<string, string> = { q: search, status, type: reportType, area, severity, sentiment, reply: wantsReply, attachment: hasAttachment, issue: hasLinkedIssue, trip: hasTrip, from: createdFrom, to: createdTo, sort };
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); });
    if (page > 0) next.set("page", String(page));
    if (pageSize !== PAGE_SIZE) next.set("size", String(pageSize));
    setSearchParams(next, { replace: true });
  }, [search, status, reportType, area, severity, sentiment, wantsReply, hasAttachment, hasLinkedIssue, hasTrip, createdFrom, createdTo, sort, page, pageSize, setSearchParams]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setReportType("");
    setArea("");
    setSeverity("");
    setSentiment("");
    setWantsReply("");
    setHasAttachment("");
    setHasLinkedIssue("");
    setHasTrip("");
    setCreatedFrom("");
    setCreatedTo("");
    setSort("needs_attention");
    setPage(0);
    setSelected([]);
  }

  const activeFilterCount = [search, status, reportType, area, severity, sentiment, wantsReply, hasAttachment, hasLinkedIssue, hasTrip, createdFrom, createdTo].filter(Boolean).length;
  const setQuickFilter = (kind: "status" | "reply" | "type" | "severity" | "attachment", value: string) => {
    setPage(0);
    if (kind === "status") setStatus(value);
    if (kind === "reply") setWantsReply(value);
    if (kind === "type") setReportType(value);
    if (kind === "severity") setSeverity(value);
    if (kind === "attachment") setHasAttachment(value);
  };

  const toggleSelected = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const togglePageSelection = () => {
    const pageIds = rows.map((row) => row.id);
    setSelected((current) => pageIds.every((id) => current.includes(id)) ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]);
  };
  const selectedAllOnPage = rows.length > 0 && rows.every((row) => selected.includes(row.id));
  const performBulkStatus = async () => {
    if (!bulkStatus || selected.length === 0) return;
    setBulkBusy(true);
    try {
      for (const feedbackId of selected) await feedbackAction(appSupabase, "update", { feedbackId, patch: { status: bulkStatus } });
      toast({ title: "Feedback updated", description: `${selected.length} items moved to ${feedbackStatusLabel(bulkStatus)}.` });
      setSelected([]);
      setBulkStatus(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: "Bulk update incomplete", description: error instanceof Error ? error.message : "Retry the remaining feedback updates.", variant: "destructive" });
      setRefreshKey((value) => value + 1);
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Central triage for user feedback, feature requests and bug reports.
        </p>
      </header>

      {overview && <section aria-label="Feedback overview" className="grid grid-cols-2 gap-y-4 border-b border-border/60 py-2 sm:grid-cols-4 xl:grid-cols-7">
        <Metric label="Total feedback" value={Number(overview.total_reports)} icon={Inbox} />
        <Metric label="New" value={Number(overview.new_count)} icon={Sparkles} active={status === "new"} onClick={() => setQuickFilter("status", status === "new" ? "" : "new")} />
        <Metric label="In progress" value={Number(overview.in_progress_count)} icon={Activity} active={status === "in_progress"} onClick={() => setQuickFilter("status", status === "in_progress" ? "" : "in_progress")} />
        <Metric label="Needs reply" value={Number(overview.wants_reply_count)} icon={Mail} active={wantsReply === "true"} onClick={() => setQuickFilter("reply", wantsReply === "true" ? "" : "true")} />
        <Metric label="Bugs" value={Number(overview.bug_count)} icon={Bug} active={reportType === "bug"} onClick={() => setQuickFilter("type", reportType === "bug" ? "" : "bug")} />
        <Metric label="Feature requests" value={Number(overview.feature_request_count)} icon={Sparkles} active={reportType === "feature_request"} onClick={() => setQuickFilter("type", reportType === "feature_request" ? "" : "feature_request")} />
        <Metric label="General feedback" value={Number(overview.feedback_count)} icon={MessageSquare} active={reportType === "feedback"} onClick={() => setQuickFilter("type", reportType === "feedback" ? "" : "feedback")} />
      </section>}

      {overview && Number(overview.new_count) + Number(overview.wants_reply_count) > 0 && <section className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-4 text-sm">
        <span className="inline-flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4 text-amber-600" />Needs attention</span>
        <button type="button" onClick={() => setQuickFilter("status", "new")} className="text-muted-foreground hover:text-foreground">{Number(overview.new_count)} new</button>
        <button type="button" onClick={() => setQuickFilter("reply", "true")} className="text-muted-foreground hover:text-foreground">{Number(overview.wants_reply_count)} reply requested</button>
      </section>}

      <section className="space-y-3" aria-label="Feedback inbox filters">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search reference, title, details, user or email" aria-label="Search feedback" className="h-10 pl-9 pr-9" />{search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); setPage(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}</label>
          <Button type="button" variant="outline" className="h-10" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}><SlidersHorizontal className="mr-2 h-4 w-4" />Filters{activeFilterCount > 0 && <UiBadge className="ml-2 h-5 min-w-5 justify-center px-1">{activeFilterCount}</UiBadge>}</Button>
          <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm"><ArrowDownUp className="h-4 w-4 text-muted-foreground" /><select aria-label="Sort feedback" value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }} className="max-w-[10rem] bg-transparent outline-none">{SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {filtersOpen && <div className="grid gap-2 rounded-lg border bg-muted/10 p-3 sm:grid-cols-2 xl:grid-cols-6">
          <select aria-label="Filter type" value={reportType} onChange={(event) => { setReportType(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All types</option>{FEEDBACK_REPORT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All statuses</option>{FEEDBACK_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select aria-label="Filter area" value={area} onChange={(event) => { setArea(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All areas</option>{FEEDBACK_AREAS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select aria-label="Filter severity" value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All severity</option><option value="blocking">Blocking</option><option value="annoying">Annoying</option><option value="minor">Minor</option></select>
          <select aria-label="Filter sentiment" value={sentiment} onChange={(event) => { setSentiment(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All sentiment</option><option value="negative">Negative</option><option value="mixed">Mixed</option><option value="positive">Positive</option></select>
          <select aria-label="Filter reply preference" value={wantsReply} onChange={(event) => { setWantsReply(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Reply preference</option><option value="true">Wants reply</option><option value="false">No reply requested</option></select>
          <select aria-label="Filter attachments" value={hasAttachment} onChange={(event) => { setHasAttachment(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Any attachments</option><option value="true">With attachments</option><option value="false">Without attachments</option></select>
          <select aria-label="Filter linked issue" value={hasLinkedIssue} onChange={(event) => { setHasLinkedIssue(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Any issue link</option><option value="true">With linked issue</option><option value="false">Without linked issue</option></select>
          <select aria-label="Filter linked trip" value={hasTrip} onChange={(event) => { setHasTrip(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Any trip</option><option value="true">With trip</option><option value="false">Without trip</option></select>
          <label className="grid gap-1 text-xs text-muted-foreground">Created from<input type="date" value={createdFrom} onChange={(event) => { setCreatedFrom(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">Created to<input type="date" value={createdTo} onChange={(event) => { setCreatedTo(event.target.value); setPage(0); }} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" /></label>
          <div className="flex items-end"><Button type="button" variant="ghost" onClick={clearFilters}>Clear all filters</Button></div>
        </div>}
        <div className="flex flex-wrap items-center gap-2">{[{ label: "New", active: status === "new", action: () => setQuickFilter("status", status === "new" ? "" : "new") }, { label: "Needs reply", active: wantsReply === "true", action: () => setQuickFilter("reply", wantsReply === "true" ? "" : "true") }, { label: "Bugs", active: reportType === "bug", action: () => setQuickFilter("type", reportType === "bug" ? "" : "bug") }, { label: "Feature requests", active: reportType === "feature_request", action: () => setQuickFilter("type", reportType === "feature_request" ? "" : "feature_request") }, { label: "Blocking", active: severity === "blocking", action: () => setQuickFilter("severity", severity === "blocking" ? "" : "blocking") }, { label: "With attachments", active: hasAttachment === "true", action: () => setQuickFilter("attachment", hasAttachment === "true" ? "" : "true") }].map((item) => <button key={item.label} type="button" aria-pressed={item.active} onClick={item.action} className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.active ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</button>)}{activeFilterCount > 0 && <Button type="button" variant="ghost" size="sm" className="h-7" onClick={clearFilters}>Reset</Button>}</div>
      </section>

      {selected.length > 0 && <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur" role="region" aria-label="Bulk feedback actions"><span className="mr-auto text-sm font-medium">Selected: {selected.length} feedback {selected.length === 1 ? "item" : "items"}</span><Button type="button" variant="outline" size="sm" onClick={() => setBulkStatus("in_progress")}>Mark in progress</Button><Button type="button" variant="outline" size="sm" onClick={() => setBulkStatus("shipped")}>Mark shipped</Button><Button type="button" variant="outline" size="sm" onClick={() => setBulkStatus("wont_do")}>Mark won't do</Button><Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}><X className="mr-1 h-4 w-4" />Clear</Button></div>}

      {error && <Card role="alert" className="flex flex-wrap items-center gap-3 border-destructive/30 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">Unable to load feedback: {error}</span><Button type="button" variant="outline" size="sm" onClick={() => setRefreshKey((value) => value + 1)}>Retry</Button></Card>}
      {loading && <div className="space-y-2" aria-label="Loading feedback">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[4.5rem] rounded-lg" />)}</div>}

      {!loading && !error && <section className="overflow-hidden rounded-lg border border-border/60" aria-label="Feedback inbox">
        {rows.length === 0 ? <div className="flex flex-col items-center gap-2 px-4 py-16 text-center"><Inbox className="h-8 w-8 text-muted-foreground/60" /><h2 className="font-medium">{activeFilterCount ? "No feedback matches your filters" : "No feedback yet"}</h2><p className="text-sm text-muted-foreground">{activeFilterCount ? "Adjust or clear filters to see more reports." : "New user reports will appear here."}</p>{activeFilterCount > 0 && <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}</div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1020px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select all feedback on this page" checked={selectedAllOnPage} onChange={togglePageSelection} className="h-4 w-4 rounded border-input accent-primary" /></th><th className="px-3 py-3 font-medium">Reference</th><th className="px-3 py-3 font-medium">Feedback</th><th className="px-3 py-3 font-medium">User</th><th className="px-3 py-3 font-medium">Area</th><th className="px-3 py-3 font-medium">Severity</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Updated</th></tr></thead>
            <tbody className="divide-y">{rows.map((row) => <tr key={row.id} tabIndex={0} onClick={() => navigate(`/admin/feedback/${row.id}`)} onKeyDown={(event) => { if (event.key === "Enter") navigate(`/admin/feedback/${row.id}`); }} className="group cursor-pointer outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <td className="px-3 py-3 align-top" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${row.reference_code}`} checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} className="h-4 w-4 rounded border-input accent-primary" /></td>
              <td className="px-3 py-3 align-top"><Link className="font-mono text-xs font-semibold text-primary hover:underline" to={`/admin/feedback/${row.id}`} onClick={(event) => event.stopPropagation()}>{row.reference_code}</Link><div className="mt-1"><Badge value={row.report_type} /></div></td>
              <td className="max-w-[380px] px-3 py-3 align-top"><p className="line-clamp-1 font-medium group-hover:text-primary">{row.title}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{row.wants_reply && <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><Mail className="h-3 w-3" />Reply requested</span>}{row.attachment_count > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{row.attachment_count}</span>}{row.linked_issue_url && <ExternalLink className="h-3 w-3" aria-label="Linked issue" />}{row.trip_id && <span>Trip</span>}</p></td>
              <td className="px-3 py-3 align-top">{row.full_name || (row.username ? `@${row.username}` : "Unknown user")}</td><td className="px-3 py-3 align-top text-muted-foreground">{feedbackAreaLabel(row.area)}</td><td className="px-3 py-3 align-top">{row.severity ? <Badge value={row.severity} kind="severity" /> : "—"}</td><td className="px-3 py-3 align-top"><Badge value={row.status} kind="status" /></td><td className="px-3 py-3 align-top text-xs text-muted-foreground" title={row.updated_at}>{formatFeedbackDate(row.updated_at)}</td>
            </tr>)}</tbody>
          </table></div>
          <div className="divide-y md:hidden">{rows.map((row) => <article key={row.id} className="p-4 transition-colors hover:bg-muted/20"><div className="flex items-start gap-3"><input type="checkbox" aria-label={`Select ${row.reference_code}`} checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary" /><Link to={`/admin/feedback/${row.id}`} className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-primary">{row.reference_code}</span><Badge value={row.report_type} /><Badge value={row.status} kind="status" /></div><h2 className="mt-2 line-clamp-2 font-medium">{row.title}</h2><p className="mt-1 text-xs text-muted-foreground">{row.full_name || (row.username ? `@${row.username}` : "Unknown user")} · {feedbackAreaLabel(row.area)}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{row.severity && <Badge value={row.severity} kind="severity" />}{row.wants_reply && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Reply requested</span>}{row.attachment_count > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{row.attachment_count}</span>}<time>{formatFeedbackDate(row.created_at)}</time></div></Link></div></article>)}</div>
          <footer className="flex flex-col gap-3 border-t bg-background p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Showing {total === 0 ? 0 : page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total.toLocaleString()}</p><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs text-muted-foreground">Rows<select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="h-8 rounded-md border bg-background px-2 text-foreground">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label><Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="px-1 text-xs tabular-nums text-muted-foreground">{page + 1} / {totalPages}</span><Button type="button" variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></footer>
        </>}
      </section>}

      <AlertDialog open={Boolean(bulkStatus)} onOpenChange={(open) => { if (!open && !bulkBusy) setBulkStatus(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Update selected feedback?</AlertDialogTitle><AlertDialogDescription>Move {selected.length} feedback {selected.length === 1 ? "item" : "items"} to {feedbackStatusLabel(bulkStatus)}. Each change will be recorded in admin activity.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={bulkBusy} onClick={(event) => { event.preventDefault(); void performBulkStatus(); }}>{bulkBusy ? "Updating…" : "Confirm update"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}
