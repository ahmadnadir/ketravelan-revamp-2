import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import feedbackIllustration from "@/assets/feedback-illustration.png";
export default function Feedback() {
  const navigate = useNavigate();
  const googleFormUrl = "https://forms.google.com/your-form-id"; // Replace with actual Google Form URL

  return (
    <AppLayout hideHeader hideBottomNav>
      <div className="relative py-8 px-4 space-y-8 text-center min-h-dvh flex flex-col justify-center pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {/* Close button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 flex items-center justify-center w-9 h-9 rounded-full bg-black/[0.06] text-foreground/70 hover:bg-black/10 active:bg-black/15 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Help Us Build a Better Ketravelan
          </h1>
          <div className="text-base text-muted-foreground max-w-md mx-auto space-y-2">
            <p>
              Your feedback helps us improve the experience for everyone  from planning trips to splitting expenses smoothly.
            </p>
            <p>
              Every suggestion matters, and we truly read them all.
            </p>
          </div>
        </div>

        {/* Notion-style Illustration */}
        <div className="py-6">
          <img
            src={feedbackIllustration}
            alt="Tour guide and tourist exploring together"
            className="w-full max-w-[280px] sm:max-w-xs mx-auto"
          />
        </div>

        {/* CTA Section */}
        <div className="pt-2">
          <a
            href={googleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button 
              className="w-full rounded-full py-6 text-base font-medium gap-2"
              size="lg"
            >
              Share Your Feedback
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
