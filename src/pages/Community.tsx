import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommunityProvider, useCommunity } from "@/contexts/CommunityContext";
import { StoriesFeed } from "@/components/community/stories/StoriesFeed";
import { DiscussionsFeed } from "@/components/community/discussions/DiscussionsFeed";
import { AskQuestionDrawer } from "@/components/community/discussions/AskQuestionDrawer";
import { SEOHead } from "@/components/seo/SEOHead";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { getCurrentCoords, getCountryFromCoords } from "@/lib/geolocation";

const DISCUSSION_LOCATION_STORAGE_KEY = "ketravelan-discussion-country";

function CommunityContent() {
  const [searchParams] = useSearchParams();
  const { mode, setMode, setLocationFilter, refreshDiscussions } = useCommunity();
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

  // Use cached discussion country when available, then only refresh discussions
  // if the newly detected country differs from the cached one.
  useEffect(() => {
    let isMounted = true;

    const getStoredCountry = (): string | null => {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(DISCUSSION_LOCATION_STORAGE_KEY);
      const value = raw?.trim();
      return value ? value : null;
    };

    const storeCountry = (country: string) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(DISCUSSION_LOCATION_STORAGE_KEY, country);
    };

    (async () => {
      try {
        const cachedCountry = getStoredCountry();
        if (isMounted && cachedCountry) {
          setLocationFilter(cachedCountry);
        }

        const coords = await getCurrentCoords();
        const country = await getCountryFromCoords(coords);
        const normalizedCountry = country?.trim();

        if (!isMounted || !normalizedCountry) return;

        if (normalizedCountry !== cachedCountry) {
          setLocationFilter(normalizedCountry);
          storeCountry(normalizedCountry);

          if (cachedCountry) {
            await refreshDiscussions();
          }
        }
      } catch (error) {
        console.error("Background location preload error:", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshDiscussions, setLocationFilter]);

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
      
      <AskQuestionDrawer
        open={askQuestionOpen}
        onOpenChange={setAskQuestionOpen}
        onCreated={async () => {
          setMode("discussions");
          await refreshDiscussions();
        }}
      />
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
