import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { X } from "lucide-react";
import feedbackIllustration from "@/assets/feedback-illustration.png";
import ReportForm, { REPORT_AREAS, REPORT_TYPES, type ReportType } from "@/components/feedback/ReportForm";

export default function Feedback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultType = useMemo(() => {
    const type = searchParams.get("type");
    return REPORT_TYPES.some((item) => item.value === type) ? (type as ReportType) : "feedback";
  }, [searchParams]);

  const defaultArea = useMemo(() => {
    const area = searchParams.get("area");
    return REPORT_AREAS.some((item) => item.value === area) ? area ?? undefined : undefined;
  }, [searchParams]);

  const tripId = searchParams.get("tripId") ?? undefined;

  return (
    <AppLayout focusedFlow hideBottomNav>
      <div className="relative min-h-dvh bg-[radial-gradient(circle_at_top,rgba(17,24,39,0.04),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-5 lg:px-8 lg:py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.06] text-foreground/70 transition-colors hover:bg-black/10 active:bg-black/15 lg:right-8 lg:top-6"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(28rem,1fr)] lg:items-start lg:justify-center xl:max-w-[72rem] xl:gap-8">
          <section className="space-y-5 text-center lg:sticky lg:top-8 lg:space-y-5 lg:rounded-[30px] lg:border lg:border-border/60 lg:bg-white/70 lg:p-7 lg:text-left lg:shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:backdrop-blur-xl">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-white/80 px-3 py-1 text-xs font-medium text-muted-foreground lg:bg-background/80">
                Product feedback channel
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-[2.6rem] lg:leading-[1.04]">
                  Help Us Build a Better Ketravelan
                </h1>
                <div className="mx-auto max-w-md space-y-2 text-base text-muted-foreground lg:mx-0 lg:max-w-none lg:text-[15px]">
                  <p>
                    Your feedback helps us improve the experience for everyone from planning trips to splitting expenses smoothly.
                  </p>
                  <p>
                    Every suggestion matters, and we truly read them all.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/50 bg-white/85 px-5 py-4 text-left shadow-sm lg:bg-background/85">
              <p className="text-sm font-medium text-foreground">What gets attached automatically</p>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-1 lg:text-[13px]">
                <p>Current screen and route</p>
                <p>Device platform and viewport</p>
                <p>App version and locale</p>
                <p>Optional screenshots you choose</p>
              </div>
            </div>

            <div className="py-1 lg:pt-1">
              <img
                src={feedbackIllustration}
                alt="Tour guide and tourist exploring together"
                className="mx-auto w-full max-w-[220px] sm:max-w-xs lg:max-w-[18rem] xl:max-w-[19.5rem]"
              />
            </div>
          </section>

          <section className="mx-auto w-full max-w-lg lg:max-w-none">
            <ReportForm
              defaultType={defaultType}
              defaultArea={defaultArea}
              tripId={tripId}
            />
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
