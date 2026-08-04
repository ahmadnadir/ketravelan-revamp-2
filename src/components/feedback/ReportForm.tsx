import { useEffect, useMemo, useState } from "react";
import { Bug, ImagePlus, Info, Lightbulb, Loader2, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ReportType = "bug" | "feedback" | "feature_request";

export const REPORT_TYPES = [
  { value: "bug" as const, label: "Bug", icon: Bug },
  { value: "feedback" as const, label: "Feedback", icon: MessageSquare },
  { value: "feature_request" as const, label: "Idea", icon: Lightbulb },
];

export const REPORT_AREAS = [
  { value: "explore_public_trips", label: "Explore and public trips" },
  { value: "create_trip", label: "Creating a trip" },
  { value: "join_requests_invites", label: "Join requests and invites" },
  { value: "trip_chat", label: "Trip chat" },
  { value: "expenses_splitting", label: "Expenses and splitting" },
  { value: "settlement_payment", label: "Settlement and payment" },
  { value: "notes", label: "Notes" },
  { value: "community", label: "Community (stories and discussions)" },
  { value: "profile_account", label: "Profile and account" },
  { value: "notifications_email", label: "Notifications and emails" },
  { value: "other", label: "Something else" },
];

const FREQUENCIES = [
  { value: "once", label: "Once" },
  { value: "sometimes", label: "Sometimes" },
  { value: "every_time", label: "Every time" },
];

const SEVERITIES = [
  { value: "minor", label: "Still fine" },
  { value: "annoying", label: "Annoying" },
  { value: "blocking", label: "Can't continue" },
];

const SENTIMENTS = [
  { value: "positive", label: "Love it" },
  { value: "mixed", label: "Mixed" },
  { value: "negative", label: "Frustrated" },
];

const COPY: Record<ReportType, { detailsLabel: string; detailsHint: string; placeholder: string; titlePlaceholder: string }> = {
  bug: {
    detailsLabel: "What happened?",
    detailsHint: "Include what you expected to happen instead.",
    placeholder: "Bila tekan toggle RM ke JPY, jumlah tak sama dengan yang aku key in...",
    titlePlaceholder: "Currency toggle shows wrong rate",
  },
  feedback: {
    detailsLabel: "Tell us more",
    detailsHint: "Anything confusing, slow, or surprisingly good.",
    placeholder: "The settlement screen is clear, but I couldn't find where to...",
    titlePlaceholder: "Settlement screen is easy to read",
  },
  feature_request: {
    detailsLabel: "What are you trying to do?",
    detailsHint: "Describe the problem, not the solution. We'll work out the how.",
    placeholder: "Selalu kena tunjuk breakdown kat member yang tak guna app...",
    titlePlaceholder: "Let me export the expense list",
  },
};

const MAX_FILES = 3;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

async function collectContext() {
  const fallbackPlatform = /android/i.test(navigator.userAgent)
    ? "android"
    : /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? "ios"
      : "web";

  const context: Record<string, string | boolean> = {
    platform: fallbackPlatform,
    app_version: __APP_VERSION__ || import.meta.env.VITE_APP_VERSION || "unknown",
    user_agent: navigator.userAgent,
    route: window.location.pathname + window.location.search,
    locale: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    reported_at: new Date().toISOString(),
  };

  try {
    const { Capacitor } = await import("@capacitor/core");
    context.platform = Capacitor.getPlatform() || fallbackPlatform;

    if (Capacitor.isNativePlatform()) {
      const [{ App }, { Device }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/device"),
      ]);

      const [appInfoResult, deviceInfoResult] = await Promise.allSettled([
        App.getInfo(),
        Device.getInfo(),
      ]);

      if (appInfoResult.status === "fulfilled") {
        const appInfo = appInfoResult.value;
        if (appInfo.version) context.app_version = appInfo.version;
        if (appInfo.build) context.app_build = appInfo.build;
      }

      if (deviceInfoResult.status === "fulfilled") {
        const deviceInfo = deviceInfoResult.value;
        if (deviceInfo.model) context.device_model = deviceInfo.model;
        if (deviceInfo.operatingSystem) context.device_os = deviceInfo.operatingSystem;
        if (deviceInfo.osVersion) context.device_os_version = deviceInfo.osVersion;
        context.device_is_virtual = Boolean(deviceInfo.isVirtual);
      }
    }
  } catch {
    // Keep graceful web/native fallback context when plugin info is unavailable.
  }

  return context;
}

interface ReportFormProps {
  defaultArea?: string;
  tripId?: string;
  defaultType?: ReportType;
  onSubmitted?: (referenceCode: string) => void;
}

export default function ReportForm({
  defaultArea,
  tripId,
  defaultType = "bug",
  onSubmitted,
}: ReportFormProps) {
  const [type, setType] = useState<ReportType>(defaultType);
  const [area, setArea] = useState(defaultArea ?? "");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [frequency, setFrequency] = useState("");
  const [severity, setSeverity] = useState("");
  const [workaround, setWorkaround] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [wantsReply, setWantsReply] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const copy = COPY[type];
  const canSubmit = area !== "" && title.trim().length >= 3 && details.trim().length >= 15 && !submitting;

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function resetForm() {
    setType(defaultType);
    setArea(defaultArea ?? "");
    setTitle("");
    setDetails("");
    setSteps("");
    setFrequency("");
    setSeverity("");
    setWorkaround("");
    setSentiment("");
    setFiles([]);
    setWantsReply(true);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;

    const accepted = Array.from(incoming).filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
    if (accepted.length !== incoming.length) {
      toast.error("Some files were skipped", {
        description: "Each screenshot must be 5MB or smaller.",
      });
    }

    setFiles((current) => {
      const next = [...current, ...accepted].slice(0, MAX_FILES);
      if (current.length + accepted.length > MAX_FILES) {
        toast("Only 3 screenshots allowed", {
          description: "Remove one first if you want to replace it.",
        });
      }
      return next;
    });
  }

  async function uploadAttachments(userId: string) {
    const paths: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("report-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        throw error;
      }

      paths.push(path);
    }

    return paths;
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("You need to be signed in to send feedback.");

      const attachments = files.length > 0 ? await uploadAttachments(user.id) : [];

      const { data, error } = await supabase
        .from("user_reports")
        .insert({
          user_id: user.id,
          report_type: type,
          area,
          title: title.trim(),
          details: details.trim(),
          steps_to_reproduce: type === "bug" ? steps.trim() || null : null,
          frequency: type === "bug" ? frequency || null : null,
          severity: type === "bug" ? severity || null : null,
          problem_to_solve: type === "feature_request" ? details.trim() : null,
          current_workaround: type === "feature_request" ? workaround.trim() || null : null,
          sentiment: type === "feedback" ? sentiment || null : null,
          attachments,
          wants_reply: wantsReply,
          contact_email: wantsReply ? user.email ?? null : null,
          trip_id: tripId ?? null,
          context: await collectContext(),
        })
        .select("id, reference_code")
        .single();

      if (error) throw error;

      const emailResult = await supabase.functions.invoke("send-feedback-confirmation", {
        body: { reportId: data.id },
      });

      if (emailResult.error) {
        console.warn("Failed to send feedback confirmation email", emailResult.error);
      }

      resetForm();
      onSubmitted?.(data.reference_code);
      toast.success("Feedback sent", {
        description: emailResult.error
          ? `Reference ${data.reference_code}. Your report was saved, but the confirmation email could not be sent.`
          : `Reference ${data.reference_code}. A confirmation email is on its way.`,
      });
    } catch (error) {
      toast.error("Couldn't send that report", {
        description: error instanceof Error ? error.message : "Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 rounded-[28px] border border-border/60 bg-card/95 px-4 py-5 shadow-sm sm:px-5">
      <p className="text-sm text-muted-foreground">
        Tell us what&apos;s broken, what&apos;s confusing, or what&apos;s missing.
      </p>

      <div className="space-y-2">
        <Label>What is this about?</Label>
        <div className="grid grid-cols-3 gap-2">
          {REPORT_TYPES.map(({ value, label, icon: Icon }) => {
            const active = type === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setType(value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Where in the app?</Label>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger id="area" className="h-12 rounded-2xl">
            <SelectValue placeholder="Pick the closest one" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_AREAS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">One line summary</Label>
        <Input
          id="title"
          maxLength={80}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={copy.titlePlaceholder}
          className="h-12 rounded-2xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">{copy.detailsLabel}</Label>
        <Textarea
          id="details"
          rows={4}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={copy.placeholder}
          className="min-h-[7rem] rounded-2xl"
        />
        <p className="text-xs text-muted-foreground">{copy.detailsHint}</p>
      </div>

      {type === "bug" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="steps">Steps to reproduce (optional)</Label>
            <Textarea
              id="steps"
              rows={3}
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              placeholder={"1. Open trip\n2. Tap Expenses\n3. Tap the RM / JPY toggle"}
              className="rounded-2xl"
            />
          </div>

          <ChipGroup label="How often?" options={FREQUENCIES} value={frequency} onChange={setFrequency} />
          <ChipGroup label="Can you still use the app?" options={SEVERITIES} value={severity} onChange={setSeverity} />
        </>
      )}

      {type === "feature_request" && (
        <div className="space-y-2">
          <Label htmlFor="workaround">How do you handle it now? (optional)</Label>
          <Textarea
            id="workaround"
            rows={2}
            value={workaround}
            onChange={(event) => setWorkaround(event.target.value)}
            placeholder="Screenshot the list and send in the group chat"
            className="rounded-2xl"
          />
        </div>
      )}

      {type === "feedback" && (
        <ChipGroup label="How do you feel about it?" options={SENTIMENTS} value={sentiment} onChange={setSentiment} />
      )}

      <div className="space-y-2">
        <Label>Screenshots (optional, up to {MAX_FILES})</Label>
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map(({ file, url }, index) => (
              <div key={`${file.name}-${index}`} className="relative">
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  className="h-16 w-16 rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove attachment ${index + 1}`}
                  onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {files.length < MAX_FILES && (
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-border py-4 text-xs text-muted-foreground transition-colors hover:border-foreground/30">
            <ImagePlus className="h-5 w-5" aria-hidden />
            Add screenshot
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-3">
        <div>
          <p className="text-sm text-foreground">Reply to me about this</p>
          <p className="text-xs text-muted-foreground">We&apos;ll use your account email</p>
        </div>
        <Switch
          checked={wantsReply}
          onCheckedChange={setWantsReply}
          aria-label="Reply to me about this"
        />
      </div>

      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        Your app version, device and current screen are attached automatically.
      </p>

      <Button className="h-12 w-full rounded-2xl" disabled={!canSubmit} onClick={handleSubmit}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitting ? "Sending" : "Send report"}
      </Button>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : option.value)}
              className={cn(
                "flex-1 rounded-2xl border py-2 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}