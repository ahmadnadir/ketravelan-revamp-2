import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommunityProvider, useCommunity } from "@/contexts/CommunityContext";
import { StoriesFeed } from "@/components/community/stories/StoriesFeed";
import { DiscussionsFeed } from "@/components/community/discussions/DiscussionsFeed";
import { AskQuestionDrawer } from "@/components/community/discussions/AskQuestionDrawer";
import { SEOHead } from "@/components/seo/SEOHead";
import { SegmentedControl } from "@/components/shared/SegmentedControl";

function CommunityContent() {
  const [searchParams] = useSearchParams();
  const { mode, setMode } = useCommunity();
  const [askQuestionOpen, setAskQuestionOpen] = useState(false);

  // Set mode based on URL query param (only on mount), default to stories
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "stories" || tabParam === "discussions") {
      setMode(tabParam);
    } else {
      setMode("stories");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SEOHead
        title="Community | Ketravelan"
        description="Join the Ketravelan community. Read travel stories, ask questions, and connect with fellow DIY travelers."
      />
      <div className="w-full max-w-5xl mx-auto px-0 sm:px-4">
        <div className="py-3">
          <SegmentedControl
            options={[
              { label: "Stories", value: "stories" },
              { label: "Discussions", value: "discussions" },
            ]}
            value={mode}
            onChange={(value) => setMode(value as "stories" | "discussions")}
            className="w-full"
          />
        </div>
        {mode === "stories" ? <StoriesFeed /> : <DiscussionsFeed onAskQuestion={() => setAskQuestionOpen(true)} />}
      </div>
      
      <AskQuestionDrawer open={askQuestionOpen} onOpenChange={setAskQuestionOpen} />
    </>
  );
}

export default function Community() {
  return (
    <CommunityProvider>
      <AppLayout mainClassName="px-0 sm:px-0 pt-0">
        <CommunityContent />
      </AppLayout>
    </CommunityProvider>
  );
}
