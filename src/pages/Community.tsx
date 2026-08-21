import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommunityProvider, useCommunity } from "@/contexts/CommunityContext";
import { StoriesFeed } from "@/components/community/stories/StoriesFeed";
import { DiscussionsFeed } from "@/components/community/discussions/DiscussionsFeed";
import { AskQuestionDrawer } from "@/components/community/discussions/AskQuestionDrawer";
import { SEOHead } from "@/components/seo/SEOHead";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { detectCountryFromLocale } from "@/lib/geolocation";
import { useAuth } from "@/contexts/AuthContext";
import { isMinorProfile } from "@/lib/familiesSafety";
import ParentalPinOnboarding from "@/components/ParentalPinOnboarding";
import { buildDataIdSelector, useListItemRestore } from "@/hooks/useListItemRestore";

const DISCUSSION_LOCATION_STORAGE_KEY = "ketravelan-discussion-country";

function CommunityContent() {
  const [searchParams] = useSearchParams();
  const {
    mode,
    setMode,
    setLocationFilter,
    refreshDiscussions,
    isStoriesLoading,
    isDiscussionsLoading,
  } = useCommunity();
  const [askQuestionOpen, setAskQuestionOpen] = useState(false);
  const restoreScope = `community:${mode}`;

  useListItemRestore({
    scope: restoreScope,
    ready: mode === "stories" ? !isStoriesLoading : !isDiscussionsLoading,
    selectorForItemId: (itemId) =>
      mode === "stories"
        ? buildDataIdSelector("data-story-id", itemId)
        : buildDataIdSelector("data-discussion-id", itemId),
  });

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

  // Use cached discussion country when available, then refresh discussions only
  // if the newly inferred locale country differs from the cached one.
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

        const detectedCountry = detectCountryFromLocale();
        const normalizedCountry = detectedCountry?.trim();

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
        {mode === "stories"
          ? <StoriesFeed restoreScope={restoreScope} />
          : <DiscussionsFeed restoreScope={restoreScope} onAskQuestion={() => setAskQuestionOpen(true)} />}
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

type FamilySafetyProfile = {
  social_features_pin_hash?: string | null;
  date_of_birth?: string | null;
};

export default function Community() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showPinOnboard, setShowPinOnboard] = useState(false);
  const safetyProfile = profile as FamilySafetyProfile | null;

  useEffect(() => {
    if (!safetyProfile) return;
    const raw = safetyProfile.social_features_pin_hash;
    const hasPin = typeof raw === "string" && raw.trim().length > 0;
    setShowPinOnboard(!hasPin);
  }, [safetyProfile]);

  return (
    <CommunityProvider>
      <AppLayout
        hideHeader={showPinOnboard}
        hideBottomNav={showPinOnboard}
        fullWidth={showPinOnboard}
        mainClassName={showPinOnboard ? "px-0 sm:px-0" : "px-0 sm:px-0 pt-0"}
      >
        {showPinOnboard && (
          <ParentalPinOnboarding
            closeIcon
            mandatory={isMinorProfile(safetyProfile)}
            onCancel={() => navigate(-1)}
            onComplete={() => setShowPinOnboard(false)}
          />
        )}
        {!showPinOnboard && <CommunityContent />}
      </AppLayout>
    </CommunityProvider>
  );
}
