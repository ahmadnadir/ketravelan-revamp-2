import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, Bug, Check, ChevronDown, Clipboard, ExternalLink, FileImage, FileText, ImageOff, Link as LinkIcon, Loader2, Mail, MessageSquare, Paperclip, RefreshCw, Send, ShieldAlert, UserRound, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  FEEDBACK_STATUSES,
  type FeedbackActivity,
  type FeedbackDetail,
  type FeedbackListRow,
  feedbackAction,
  feedbackAreaLabel,
  feedbackStatusLabel,
  feedbackTypeLabel,
  formatFeedbackDate,
} from "../lib/adminFeedback";
import { supabase as appSupabase } from "@/lib/supabase";
import { getAdminAccess, hasPermission } from "@/admin/lib/adminAccess";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value || "—"}</div>
    </div>
  );
}

function displayLabel(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function activityText(item: FeedbackActivity) {
  const action = item.action_data && typeof item.action_data === "object" ? item.action_data as Record<string, unknown> : {};
  const changed = action.changed && typeof action.changed === "object" ? action.changed as Record<string, { before?: unknown; after?: unknown }> : {};
  if (item.action_type === "feedback_reply_sent") return "Replied to user by email";
  if (item.action_type === "feedback_reply_failed") return "Email reply failed";
  const status = changed.status;
  if (status && status.before !== status.after) return `Status changed: ${feedbackStatusLabel(String(status.before))} → ${feedbackStatusLabel(String(status.after))}`;
  if (changed.internal_notes && changed.internal_notes.before !== changed.internal_notes.after) return "Internal notes updated";
  if (changed.duplicate_of && changed.duplicate_of.before !== changed.duplicate_of.after) return changed.duplicate_of.after ? "Marked as duplicate" : "Duplicate link removed";
  if (changed.linked_issue_url && changed.linked_issue_url.before !== changed.linked_issue_url.after) return changed.linked_issue_url.after ? "Linked issue updated" : "Linked issue removed";
  return item.action_type.replace(/_/g, " ");
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value);
}

export default function AdminFeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<FeedbackDetail | null>(null);
  const [status, setStatus] = useState("new");
  const [internalNotes, setInternalNotes] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [linkedIssueUrl, setLinkedIssueUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyPreview, setReplyPreview] = useState<{ to: string; from: string; subject: string; html: string } | null>(null);
  const [replyPreviewLoading, setReplyPreviewLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [duplicateQuery, setDuplicateQuery] = useState("");
  const [duplicateResults, setDuplicateResults] = useState<FeedbackListRow[]>([]);
  const [duplicateRecord, setDuplicateRecord] = useState<FeedbackListRow | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string | null>>({});
  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
  const [attachmentLoading, setAttachmentLoading] = useState<Record<string, boolean>>({});
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [rawContextOpen, setRawContextOpen] = useState(false);

  const dirtyNotes = Boolean(data && internalNotes !== (data.internal_notes ?? ""));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await feedbackAction(appSupabase, "get", { feedbackId: id });
      const record = (Array.isArray(result) ? result[0] : result) as FeedbackDetail | null;
      setData(record);
      setStatus(record?.status ?? "new");
      setInternalNotes(record?.internal_notes ?? "");
      setDuplicateOf(record?.duplicate_of ?? "");
      setLinkedIssueUrl(record?.linked_issue_url ?? "");
      setReplySubject(record ? `Re: ${record.title} (${record.reference_code})` : "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load feedback.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    void getAdminAccess().then((access) => { if (active) setCanManage(hasPermission(access, "feedback.manage")); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!dirtyNotes) return;
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [dirtyNotes]);

  useEffect(() => {
    if (!data || !data.attachments?.length) return;
    let active = true;
    void Promise.all(data.attachments.map(async (objectPath) => {
      try {
        const result = await feedbackAction(appSupabase, "attachment-url", { feedbackId: data.id, objectPath }) as { signedUrl: string };
        return { objectPath, signedUrl: result.signedUrl, error: "" };
      } catch (error) {
        return { objectPath, signedUrl: null, error: error instanceof Error ? error.message : "Unable to load attachment." };
      }
    })).then((results) => {
      if (!active) return;
      setAttachmentUrls(Object.fromEntries(results.map(({ objectPath, signedUrl }) => [objectPath, signedUrl])));
      setAttachmentErrors(Object.fromEntries(results.filter((item) => item.error).map(({ objectPath, error }) => [objectPath, error])));
    });
    return () => { active = false; };
  }, [data]);

  const retryAttachment = async (objectPath: string) => {
    if (!data) return;
    setAttachmentLoading((current) => ({ ...current, [objectPath]: true }));
    setAttachmentErrors((current) => ({ ...current, [objectPath]: "" }));
    try {
      const result = await feedbackAction(appSupabase, "attachment-url", { feedbackId: data.id, objectPath }) as { signedUrl: string };
      setAttachmentUrls((current) => ({ ...current, [objectPath]: result.signedUrl }));
    } catch (error) {
      setAttachmentErrors((current) => ({ ...current, [objectPath]: error instanceof Error ? error.message : "Unable to load attachment." }));
    } finally {
      setAttachmentLoading((current) => ({ ...current, [objectPath]: false }));
    }
  };

  useEffect(() => {
    const query = duplicateQuery.trim();
    if (query.length < 2) { setDuplicateResults([]); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      void feedbackAction(appSupabase, "duplicate-search", { search: query })
        .then((result) => { if (active) setDuplicateResults((result as FeedbackListRow[]).filter((item) => item.id !== id)); })
        .catch(() => { if (active) setDuplicateResults([]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [duplicateQuery, id]);

  useEffect(() => {
    if (!duplicateOf) { setDuplicateRecord(null); return; }
    let active = true;
    void feedbackAction(appSupabase, "get", { feedbackId: duplicateOf }).then((result) => {
      const record = (Array.isArray(result) ? result[0] : result) as FeedbackDetail | null;
      if (active && record) setDuplicateRecord({ id: record.id, reference_code: record.reference_code, report_type: record.report_type, area: record.area, title: record.title, severity: record.severity, sentiment: record.sentiment, wants_reply: record.wants_reply, status: record.status, duplicate_of: record.duplicate_of, trip_id: record.trip_id, linked_issue_url: record.linked_issue_url, attachment_count: record.attachments?.length ?? 0, username: record.username, full_name: record.full_name, created_at: record.created_at, updated_at: record.updated_at, user_id: record.user_id });
    }).catch(() => { if (active) setDuplicateRecord(null); });
    return () => { active = false; };
  }, [duplicateOf]);

  async function save() {
    if (!id) return;
    if (!canManage) return;
    if (duplicateOf && duplicateOf === id) {
      setError("A feedback report cannot be a duplicate of itself.");
      return;
    }
    if (linkedIssueUrl.trim()) {
      try {
        const parsed = new URL(linkedIssueUrl.trim());
        if (parsed.protocol !== "https:") throw new Error();
      } catch {
        setError("Linked issue must be a valid HTTPS URL.");
        return;
      }
    }
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await feedbackAction(appSupabase, "update", {
        feedbackId: id,
        patch: {
          status,
          internal_notes: internalNotes || null,
          duplicate_of: duplicateOf || null,
          linked_issue_url: linkedIssueUrl || null,
        },
      });
      setNotice("Triage saved.");
      toast({ title: "Feedback updated", description: "Triage changes were added to the activity history." });
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update feedback.");
    } finally {
      setSaving(false);
    }
  }

  const changeStatus = async (nextStatus: string) => {
    if (!id || !canManage) return;
    setSaving(true);
    setError(null);
    try {
      await feedbackAction(appSupabase, "update", { feedbackId: id, patch: { status: nextStatus } });
      setStatus(nextStatus);
      setConfirmStatus(null);
      toast({ title: "Status updated", description: `${feedbackStatusLabel(nextStatus)} was recorded in activity.` });
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async () => {
    if (!data || !replySubject.trim() || !replyMessage.trim()) return;
    setReplySending(true);
    try {
      const result = await feedbackAction(appSupabase, "reply", {
        feedbackId: data.id,
        subject: replySubject.trim(),
        message: replyMessage.trim(),
        idempotencyKey: crypto.randomUUID(),
      }) as { deliveryStatus: string; activityRecorded: boolean };
      setReplyOpen(false);
      setReplyMessage("");
      toast({ title: "Reply accepted by email provider", description: result.activityRecorded ? "Reply event recorded in feedback activity." : "The email was accepted, but its activity record could not be saved." });
      await load();
    } catch (error) {
      toast({ title: "Message could not be sent", description: error instanceof Error ? error.message : "Check the connection and retry.", variant: "destructive" });
    } finally {
      setReplySending(false);
    }
  };

  const previewReply = async () => {
    if (!data || !replySubject.trim() || !replyMessage.trim()) return;
    setReplyPreviewLoading(true);
    try {
      const result = await feedbackAction(appSupabase, "reply-preview", {
        feedbackId: data.id,
        subject: replySubject.trim(),
        message: replyMessage.trim(),
      }) as { to: string; from: string; subject: string; html: string };
      setReplyPreview(result);
    } catch (error) {
      toast({ title: "Could not preview email", description: error instanceof Error ? error.message : "Check the connection and retry.", variant: "destructive" });
    } finally {
      setReplyPreviewLoading(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await copyText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Could not copy", description: "Clipboard access is unavailable.", variant: "destructive" });
    }
  };

  if (loading) return <main className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></main>;
  if (!data) return <main className="space-y-4"><Button asChild variant="ghost"><a href="/admin/feedback"><ArrowLeft className="mr-2 h-4 w-4" />Back to Feedback</a></Button><Card role="alert" className="flex flex-wrap items-center gap-3 border-destructive/30 p-5 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="flex-1">{error || "Feedback case not found."}</span><Button type="button" variant="outline" size="sm" onClick={() => void load()}>Retry</Button></Card></main>;

  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  const activity: FeedbackActivity[] = Array.isArray(data.activity) ? data.activity : [];
  const context = data.context && typeof data.context === "object" && !Array.isArray(data.context) ? data.context as Record<string, unknown> : {};
  const replyTo = data.contact_email || data.account_email;
  const imageAttachment = (path: string) => /\.(png|jpe?g|webp|heic)$/i.test(path);
  const commonContext = Object.entries(context).filter(([key, value]) => value != null && value !== "" && !/(token|secret|password|api.?key)/i.test(key));

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" className="-ml-3 mb-2" onClick={() => { if (!dirtyNotes || window.confirm("Discard unsaved internal notes?")) navigate("/admin/feedback"); }}><ArrowLeft className="mr-2 h-4 w-4" />Back to feedback</Button>
          <div className="flex flex-wrap items-center gap-2"><code className="font-mono text-sm font-semibold">{data.reference_code}</code><Badge variant="outline">{feedbackTypeLabel(data.report_type)}</Badge><Badge variant="outline">{feedbackStatusLabel(data.status)}</Badge><time className="text-xs text-muted-foreground">Created {formatFeedbackDate(data.created_at)}</time><span className="text-xs text-muted-foreground">Updated {formatFeedbackDate(data.updated_at)}</span></div>
          <h1 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">{data.title}</h1>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copy(data.reference_code, "Reference")}><Clipboard className="mr-2 h-4 w-4" />Copy reference</Button>
          <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button>
          {canManage && data.wants_reply && replyTo && <Button type="button" size="sm" onClick={() => { setReplyPreview(null); setReplyOpen(true); }}><Mail className="mr-2 h-4 w-4" />Reply to user</Button>}
        </div>
      </header>

      {data.status === "duplicate" && <div className="flex items-center gap-2 rounded-md border border-amber-300/50 bg-amber-50/50 px-3 py-2 text-sm dark:bg-amber-950/20"><AlertTriangle className="h-4 w-4 text-amber-700" />This feedback is marked as a duplicate.{duplicateRecord && <a className="font-medium underline" href={`/admin/feedback/${duplicateRecord.id}`}>{duplicateRecord.reference_code} · {duplicateRecord.title}</a>}</div>}
      {error && <Card role="alert" className="border-destructive/30 p-3 text-sm text-destructive">{error}</Card>}
      {notice && <div role="status" className="rounded-md border border-emerald-600/20 bg-emerald-50/50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">{notice}</div>}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card className="space-y-5 border-border/60 p-4 shadow-none sm:p-5">
            <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto font-semibold">Submission</h2><Badge variant="outline">{feedbackAreaLabel(data.area)}</Badge>{data.sentiment && <Badge variant="secondary">{displayLabel(data.sentiment)}</Badge>}</div>
            <div className="grid gap-3 border-b pb-4 sm:grid-cols-3"><Info label="Severity" value={data.severity ? <Badge variant="outline">{displayLabel(data.severity)}</Badge> : null} /><Info label="Frequency" value={data.frequency ? displayLabel(data.frequency) : null} /><Info label="Reply requested" value={data.wants_reply ? "Yes" : "No"} /></div>
            <div><h3 className="mb-1 text-xs font-medium text-muted-foreground">Details</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{data.details}</p></div>
            {data.problem_to_solve && <div className="rounded-md border-l-2 border-indigo-500 pl-3"><h3 className="mb-1 text-xs font-medium text-muted-foreground">Problem to solve</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{data.problem_to_solve}</p></div>}
            {data.steps_to_reproduce && <div className="rounded-md border-l-2 border-red-500 pl-3"><h3 className="mb-1 text-xs font-medium text-muted-foreground">Steps to reproduce</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{data.steps_to_reproduce}</p></div>}
            {data.current_workaround && <div><h3 className="mb-1 text-xs font-medium text-muted-foreground">Current workaround</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{data.current_workaround}</p></div>}
          </Card>

          {data.report_type === "bug" && <Card className="border-border/60 p-4 shadow-none sm:p-5"><h2 className="flex items-center gap-2 font-semibold"><Bug className="h-4 w-4" />Bug summary</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><Info label="Impact" value={data.severity ? displayLabel(data.severity) : null} /><Info label="Frequency" value={data.frequency ? displayLabel(data.frequency) : null} /><Info label="Reproduction steps" value={data.steps_to_reproduce ? "Provided" : "Not provided"} /></div></Card>}

          {attachments.length > 0 && <Card className="border-border/60 p-4 shadow-none sm:p-5"><h2 className="flex items-center gap-2 font-semibold"><Paperclip className="h-4 w-4" />Attachments <span className="text-xs font-normal text-muted-foreground">{attachments.length}</span></h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map((path) => {
            const signedUrl = attachmentUrls[path];
            const name = path.split("/").pop() || "Attachment";
            return <div key={path} className="overflow-hidden rounded-md border bg-muted/10">{imageAttachment(path) ? <div className="relative aspect-[4/3] w-full bg-muted/40">{signedUrl ? <button type="button" onClick={() => setPreviewAttachment(path)} aria-label={`Preview ${name}`} className="group absolute inset-0 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><img src={signedUrl} alt={name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" onError={() => { setAttachmentUrls((current) => ({ ...current, [path]: null })); setAttachmentErrors((current) => ({ ...current, [path]: "The signed URL expired or the stored image is unavailable." })); }} /></button> : <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-muted-foreground"><ImageOff className="h-4 w-4" /><span>{attachmentErrors[path] || "Attachment unavailable"}</span><Button type="button" variant="outline" size="sm" disabled={attachmentLoading[path]} onClick={() => void retryAttachment(path)}>{attachmentLoading[path] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}</Button></div>}<span className="absolute inset-x-0 bottom-0 truncate bg-background/90 px-2 py-1 text-xs">{name}</span></div> : <div className="flex items-center gap-3 p-3"><FileText className="h-5 w-5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm" title={name}>{name}</span>{signedUrl ? <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8"><a href={signedUrl} target="_blank" rel="noreferrer" aria-label={`Open ${name}`}><ExternalLink className="h-4 w-4" /></a></Button> : <div className="flex items-center gap-2" title={attachmentErrors[path] || "Attachment unavailable"}><ImageOff className="h-4 w-4 text-muted-foreground" /><Button type="button" variant="ghost" size="sm" disabled={attachmentLoading[path]} onClick={() => void retryAttachment(path)}>{attachmentLoading[path] ? "Retrying…" : "Retry"}</Button></div>}</div>}</div>;
          })}</div></Card>}

          <Card className="border-border/60 p-4 shadow-none sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Technical context</h2><p className="mt-0.5 text-xs text-muted-foreground">Captured with the original submission</p></div><Button type="button" variant="ghost" size="sm" onClick={() => void copy(JSON.stringify(context, null, 2), "Context JSON")}><Clipboard className="mr-2 h-4 w-4" />Copy JSON</Button></div>{commonContext.length ? <dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">{commonContext.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{displayLabel(key)}</dt><dd className="mt-1 break-words text-sm">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl> : <p className="mt-4 text-sm text-muted-foreground">No technical context was captured.</p>}<details open={rawContextOpen} onToggle={(event) => setRawContextOpen(event.currentTarget.open)} className="mt-4 border-t pt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><ChevronDown className="h-4 w-4" />Raw context</summary><pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-muted/40 p-3 text-xs leading-5">{JSON.stringify(context, null, 2)}</pre></details></Card>

          <Card className="border-border/60 p-4 shadow-none sm:p-5"><h2 className="font-semibold">Activity</h2>{activity.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No admin activity yet.</p> : <ol className="mt-4 space-y-0">{activity.map((item) => <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0"><span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background">{item.action_type.includes("reply") ? <Mail className="h-3.5 w-3.5" /> : item.action_type.includes("status") || item.action_type.includes("updated") ? <Check className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}</span><span className="absolute bottom-0 left-3.5 top-7 w-px bg-border last:hidden" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{activityText(item)}</p><p className="mt-1 text-xs text-muted-foreground">{item.admin_name || item.admin_username || "Admin"} · {formatFeedbackDate(item.created_at)}</p>{item.action_type === "feedback_reply_sent" && typeof (item.action_data as Record<string, unknown> | null)?.delivery_status === "string" && <Badge variant="secondary" className="mt-2">Email accepted</Badge>}</div></li>)}</ol>}</Card>
        </div>

        <aside className="min-w-0 space-y-5">
          <Card className="border-border/60 p-4 shadow-none"><h2 className="font-semibold">User</h2><div className="mt-4 flex items-center gap-3"><Avatar className="h-11 w-11"><AvatarImage src={data.avatar_url || undefined} /><AvatarFallback>{(data.full_name || data.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{data.full_name || data.username || "Unknown user"}</p><p className="truncate text-xs text-muted-foreground">{data.username ? `@${data.username}` : "No username"}</p></div></div><div className="mt-4 space-y-3"><Info label="Account email" value={data.account_email} /><Info label="Contact email" value={data.contact_email} /><Info label="Reply preference" value={data.wants_reply ? "Reply requested" : "No reply requested"} /></div><div className="mt-4 flex flex-wrap gap-2">{replyTo && <Button type="button" variant="outline" size="sm" onClick={() => void copy(replyTo, "Email")}><Clipboard className="mr-2 h-3.5 w-3.5" />Copy email</Button>}{data.user_id && <Button type="button" variant="outline" size="sm" onClick={() => void copy(data.user_id, "User ID")}><Clipboard className="mr-2 h-3.5 w-3.5" />Copy ID</Button>}<Button asChild type="button" variant="outline" size="sm"><a href={`/admin/users/${data.user_id}`}><UserRound className="mr-2 h-3.5 w-3.5" />Admin profile</a></Button></div>{canManage && data.wants_reply && replyTo && <Button type="button" className="mt-3 w-full" onClick={() => { setReplyPreview(null); setReplyOpen(true); }}><Mail className="mr-2 h-4 w-4" />Reply to user</Button>}</Card>

          <Card className="border-border/60 p-4 shadow-none"><h2 className="font-semibold">Triage</h2>{canManage ? <div className="mt-4 space-y-4">
            <label className="grid gap-1.5 text-sm"><span className="text-xs font-medium text-muted-foreground">Status</span><select value={data.status} onChange={(event) => { const next = event.target.value; if (next === "shipped" || next === "wont_do") setConfirmStatus(next); else void changeStatus(next); }} disabled={saving} className="h-10 rounded-md border bg-background px-3"><option value={data.status}>{feedbackStatusLabel(data.status)}</option>{FEEDBACK_STATUSES.filter((item) => item.value !== data.status).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm"><span className="text-xs font-medium text-muted-foreground">Internal notes <Badge variant="outline" className="ml-1">Internal only</Badge></span><Textarea rows={5} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Notes visible only to authorized admins" className="resize-y" /></label>
            <div className="space-y-2"><label htmlFor="duplicate-search" className="text-xs font-medium text-muted-foreground">Duplicate of</label>{duplicateRecord ? <div className="flex items-start gap-2 rounded-md border p-3"><div className="min-w-0 flex-1"><a href={`/admin/feedback/${duplicateRecord.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{duplicateRecord.reference_code}</a><p className="mt-1 line-clamp-2 text-sm">{duplicateRecord.title}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Remove duplicate link" className="h-8 w-8" onClick={() => setDuplicateOf("")}><X className="h-4 w-4" /></Button></div> : <><Input id="duplicate-search" value={duplicateQuery} onChange={(event) => setDuplicateQuery(event.target.value)} placeholder="Search reference, title or user" />{duplicateResults.length > 0 && <div className="max-h-52 overflow-auto rounded-md border">{duplicateResults.map((item) => <button key={item.id} type="button" onClick={() => { setDuplicateOf(item.id); setStatus("duplicate"); setDuplicateQuery(""); setDuplicateResults([]); }} className="block w-full border-b p-2.5 text-left last:border-0 hover:bg-muted/40"><span className="font-mono text-xs font-semibold text-primary">{item.reference_code}</span><span className="mt-0.5 block truncate text-sm">{item.title}</span><span className="text-xs text-muted-foreground">{item.full_name || item.username || "Unknown user"}</span></button>)}</div>}</>}</div>
            <div className="space-y-2"><label htmlFor="linked-issue" className="text-xs font-medium text-muted-foreground">Linked issue URL</label><div className="flex gap-2"><Input id="linked-issue" type="url" inputMode="url" value={linkedIssueUrl} onChange={(event) => setLinkedIssueUrl(event.target.value)} placeholder="https://github.com/..." /><Button type="button" variant="outline" size="icon" aria-label="Open linked issue" disabled={!/^https:\/\//i.test(linkedIssueUrl)} onClick={() => window.open(linkedIssueUrl, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /></Button></div>{linkedIssueUrl && <Button type="button" variant="ghost" size="sm" className="h-7 px-1" onClick={() => setLinkedIssueUrl("")}>Remove link</Button>}</div>
            <Button type="button" className="w-full" disabled={saving || !dirtyNotes && duplicateOf === (data.duplicate_of ?? "") && linkedIssueUrl === (data.linked_issue_url ?? "")} onClick={() => void save()}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</> : "Save triage"}</Button>
          </div> : <div className="mt-4 space-y-3"><p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" />Read-only access</p><Info label="Status" value={feedbackStatusLabel(data.status)} /><Info label="Internal notes" value={data.internal_notes} />{duplicateRecord && <Info label="Duplicate of" value={`${duplicateRecord.reference_code} · ${duplicateRecord.title}`} />}</div>}</Card>

          <Card className="border-border/60 p-4 shadow-none"><h2 className="font-semibold">Links</h2><div className="mt-3 space-y-2 text-sm">{data.trip_id ? <a href={`/admin/trips/${data.trip_id}`} className="inline-flex items-center gap-2 text-primary hover:underline"><ExternalLink className="h-4 w-4" />Open linked trip</a> : <p className="text-muted-foreground">No trip linked.</p>}{data.linked_issue_url && <a href={data.linked_issue_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-primary hover:underline"><LinkIcon className="h-4 w-4 shrink-0" />{data.linked_issue_url}</a>}</div></Card>
        </aside>
      </section>

      <Dialog open={replyOpen} onOpenChange={(open) => { if (!replySending) setReplyOpen(open); }}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogTitle>Reply to user</DialogTitle>
          <DialogDescription>Preview the branded email exactly as it will be sent. Delivery is reported only after the provider accepts it.</DialogDescription>
          {!replyPreview ? <div className="space-y-4">
            <Info label="Recipient" value={replyTo} />
            <Info label="Feedback" value={`${data.reference_code} · ${data.title}`} />
            <label className="grid gap-1.5 text-sm"><span>Subject</span><Input value={replySubject} onChange={(event) => { setReplySubject(event.target.value); setReplyPreview(null); }} maxLength={180} /></label>
            <label className="grid gap-1.5 text-sm"><span>Message</span><Textarea rows={8} maxLength={10000} value={replyMessage} onChange={(event) => { setReplyMessage(event.target.value); setReplyPreview(null); }} placeholder="Write a clear, helpful response…" /><span className="text-right text-xs text-muted-foreground">{replyMessage.length}/10000</span></label>
          </div> : <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Recipient email preview</p><Button type="button" variant="outline" size="sm" onClick={() => setReplyPreview(null)}>Edit message</Button></div>
            <dl className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-[4rem_1fr]"><dt className="text-muted-foreground">From</dt><dd>{replyPreview.from}</dd><dt className="text-muted-foreground">To</dt><dd>{replyPreview.to}</dd><dt className="text-muted-foreground">Subject</dt><dd className="font-medium">{replyPreview.subject}</dd></dl>
            <iframe title="Email as received by the recipient" srcDoc={replyPreview.html} sandbox="" className="h-[min(62vh,38rem)] w-full rounded-md border bg-[#f4f6f8]" />
            <p className="text-xs text-muted-foreground">This is the exact HTML generated by the secure email service for sending.</p>
          </div>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={replySending || replyPreviewLoading} onClick={() => setReplyOpen(false)}>Cancel</Button>
            {!replyPreview && <Button type="button" variant="secondary" disabled={replySending || replyPreviewLoading || !replySubject.trim() || !replyMessage.trim()} onClick={() => void previewReply()}>{replyPreviewLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing preview</> : "Preview email"}</Button>}
            <Button type="button" disabled={replySending || !replySubject.trim() || !replyMessage.trim()} onClick={() => void submitReply()}>{replySending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending</> : <><Send className="mr-2 h-4 w-4" />Send reply</>}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(previewAttachment)} onOpenChange={(open) => { if (!open) setPreviewAttachment(null); }}><DialogContent className="max-w-5xl"><DialogTitle>Attachment preview</DialogTitle><DialogDescription>{previewAttachment?.split("/").pop()}</DialogDescription>{previewAttachment && attachmentUrls[previewAttachment] && <img src={attachmentUrls[previewAttachment] ?? undefined} alt={previewAttachment.split("/").pop() || "Feedback attachment"} className="max-h-[75dvh] w-full rounded-md object-contain" />}</DialogContent></Dialog>
      <AlertDialog open={Boolean(confirmStatus)} onOpenChange={(open) => { if (!open) setConfirmStatus(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm status change</AlertDialogTitle><AlertDialogDescription>Move this feedback to {feedbackStatusLabel(confirmStatus)}? The change will be recorded in the activity timeline.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); if (confirmStatus) void changeStatus(confirmStatus); }}>{saving ? "Saving…" : "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}
