import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams, Navigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Preferences } from "@capacitor/preferences";
import { SplashScreen } from "@capacitor/splash-screen";
import { supabase } from "@/lib/supabase";
import { configureIOSStatusBarForLightHeader, isNativePlatform } from "@/lib/capacitor";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { SafeAreaLayout } from "./components/layout/SafeAreaLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ExpenseProvider } from "./contexts/ExpenseContext";
import { CommunityProvider } from "./contexts/CommunityContext";
import { classifyRequestError } from "@/lib/requestErrors";
import { getPendingAuthIntent, normalizeOAuthErrorMessage, persistAuthError } from "@/lib/authFlow";
import { GUIDED_ROUTES, isValidGuidedPaymentStatus } from "@/lib/guidedRoutes";
import { OfflineBanner } from "./components/layout/OfflineBanner";
import { NetworkStatusProvider } from "./contexts/NetworkStatusContext";
import { AppInitializer } from "./components/AppInitializer";
import { TermsAcceptanceModal } from "./components/modals/TermsAcceptanceModal";
import React, { Suspense, useEffect, useRef, useState } from "react";

const routeFallback = (
  <div className="min-h-[60vh] flex items-center justify-center px-4">
    <div className="rounded-2xl border border-border/50 bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
      Loading...
    </div>
  </div>
);

const Home = React.lazy(() => import("./pages/Home"));
const Explore = React.lazy(() => import("./pages/Explore"));
const MainPage = React.lazy(() => import("./pages/MainPage"));
const TripDetails = React.lazy(() => import("./pages/TripDetails"));
const TripHub = React.lazy(() => import("./pages/TripHub"));
const CreateTrip = React.lazy(() => import("./pages/CreateTrip"));
const MyTrips = React.lazy(() => import("./pages/MyTrips"));
const Chat = React.lazy(() => import("./pages/Chat"));
const Expenses = React.lazy(() => import("./pages/Expenses"));
const DirectChat = React.lazy(() => import("./pages/DirectChat"));
const Profile = React.lazy(() => import("./pages/Profile"));
const EditProfile = React.lazy(() => import("./pages/EditProfile"));
const Install = React.lazy(() => import("./pages/Install"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const UserProfileView = React.lazy(() => import("./pages/UserProfileView"));
const Favourites = React.lazy(() => import("./pages/Favourites"));
const Approvals = React.lazy(() => import("./pages/Approvals"));
const MyStories = React.lazy(() => import("./pages/MyStories"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Community = React.lazy(() => import("./pages/Community"));
const StoryDetail = React.lazy(() => import("./pages/StoryDetail"));
const DiscussionDetail = React.lazy(() => import("./pages/DiscussionDetail"));
const CreateStory = React.lazy(() => import("./pages/CreateStory"));
const Feedback = React.lazy(() => import("./pages/Feedback"));
const Settings = React.lazy(() => import("./pages/Settings"));
const BlockedUsers = React.lazy(() => import("./pages/BlockedUsers"));
const ModerationReports = React.lazy(() => import("./pages/ModerationReports"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const Contact = React.lazy(() => import("./pages/Contact"));
const About = React.lazy(() => import("./pages/About"));
const HelpCenter = React.lazy(() => import("./pages/HelpCenter"));
const HelpArticleDetail = React.lazy(() => import("./pages/HelpArticleDetail"));
const GuidedRevamp = React.lazy(() => import("./pages/GuidedRevamp"));
const GuidedPaymentGateway = React.lazy(() => import("./guided-revamp/components/Payment/PaymentGateway"));
const GuidedPaymentResult = React.lazy(() => import("./guided-revamp/components/Payment/PaymentResult"));

const VerificationPending = React.lazy(() => import("./pages/VerificationPending"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const WelcomeOnboarding = React.lazy(() => import("./pages/WelcomeOnboarding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,            // Show cached data instantly; background-refresh after 30s
      gcTime: 1000 * 60 * 10,          // Keep unused cache for 10 minutes
      refetchOnWindowFocus: false,      // Don't refetch just from switching tabs
      refetchOnReconnect: true,         // Auto-refetch when network is restored
      networkMode: "online",            // Pause query (don't fire) when offline; resume on reconnect
      // Safe retries for transient mobile failures only.
      retry: (failureCount, error) => {
        const classified = classifyRequestError(error);
        if (!classified.retryable) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        const base = 300 * 2 ** Math.max(0, attemptIndex - 1);
        const jitter = Math.floor(Math.random() * 250);
        return Math.min(base + jitter, 3500);
      },
    },
  },
});

function RecoveryBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery") && location.pathname !== "/reset-password") {
      // Preserve the hash so the reset page can set the session
      navigate(`/reset-password${hash}` as never, { replace: true } as never);
    }
  }, [location.pathname, navigate]);
  return null;
}

function TripChatRedirect() {
  const { id } = useParams();
  const location = useLocation();
  const search = location.search || "";
  if (!id) return <Navigate to="/" replace />;
  return <Navigate to={`/trip/${id}/hub${search}`} replace />;
}

function GuidedRouteAliasRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function GuidedPaymentQueryGuard({
  mode,
  children,
}: {
  mode: "gateway" | "result";
  children: React.ReactElement;
}) {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const paymentIntentId = query.get("payment_intent");
  const bookingReference = query.get("booking_reference");
  const status = query.get("status");

  const hasBaseParams = !!paymentIntentId && !!bookingReference;
  const isResultValid = mode === "result" ? isValidGuidedPaymentStatus(status) : true;

  if (!hasBaseParams || !isResultValid) {
    return <Navigate to={GUIDED_ROUTES.home} replace />;
  }

  return children;
}

function AuthDeepLinkHandler() {
  const navigate = useNavigate();
  const processingDeepLinkRef = useRef(false);
  const processedAuthCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    const handleUrl = async (url: string) => {
      const pendingIntent = getPendingAuthIntent();
      const normalizedUrl = url.toLowerCase();
      const isSupportedAuthCallback =
        normalizedUrl.startsWith("ketravelan://login-callback") ||
        normalizedUrl.startsWith("ketravelan://auth/callback");

      if (!isSupportedAuthCallback) {
        return;
      }
      const hasCode = url.includes("code=");
      let authCode = "";
      try {
        authCode = new URL(url).searchParams.get("code") || "";
      } catch {
        authCode = "";
      }

      if (authCode && processedAuthCodesRef.current.has(authCode)) {
        console.log("[AuthDeepLink] Duplicate code ignored:", authCode);
        return;
      }

      if (processingDeepLinkRef.current) {
        console.log("[AuthDeepLink] Deep link ignored while processing in progress");
        return;
      }

      processingDeepLinkRef.current = true;
      if (authCode) {
        processedAuthCodesRef.current.add(authCode);
      }

      console.log("[AuthDeepLink] Received URL:", url);
      console.log("[AuthDeepLink] code present:", hasCode);

      let callbackError = "";
      try {
        const parsedUrl = new URL(url);
        callbackError = parsedUrl.searchParams.get("error_description") || parsedUrl.searchParams.get("error") || "";
      } catch {
        callbackError = "";
      }

      if (callbackError) {
        persistAuthError(normalizeOAuthErrorMessage(callbackError, pendingIntent?.provider));
      }

      try {
        const prefKeys = await Preferences.keys();
        const prefKeysUnknown = prefKeys as { keys?: string[] | string };
        const prefKeyList = Array.isArray(prefKeysUnknown?.keys)
          ? prefKeysUnknown.keys
          : (typeof prefKeysUnknown?.keys === "string" ? [prefKeysUnknown.keys] : []);
        const storageKeys = Object.keys(window.localStorage || {}).filter(
          (key) => key.includes("sb-") || key.includes("supabase") || key.includes("pkce") || key.includes("auth")
        );
        console.log("[AuthDeepLink] Preferences keys(raw):", prefKeys);
        console.log("[AuthDeepLink] Preferences keys(normalized):", prefKeyList);
        console.log("[AuthDeepLink] localStorage keys:", storageKeys);
        const pkceKey = prefKeyList.find((key) => key.includes("code-verifier"));
        console.log("[AuthDeepLink] PKCE key candidate:", pkceKey || "<none>");
        if (pkceKey) {
          const prefValue = await Preferences.get({ key: pkceKey });
          const localValue = window.localStorage.getItem(pkceKey);
          console.log("[AuthDeepLink] PKCE verifier length:", JSON.stringify({
            key: pkceKey,
            prefLength: prefValue.value?.length || 0,
            localLength: localValue?.length || 0,
          }));
        } else {
          console.warn("[AuthDeepLink] PKCE verifier key not found");
        }
      } catch (logError) {
        console.warn("[AuthDeepLink] Failed to read storage keys:", logError);
      }
      try {
        if (!authCode) {
          console.warn("[AuthDeepLink] Missing auth code, skipping exchange");
        } else {
          const exchangeResult = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeResult.error) {
            console.warn("[AuthDeepLink] exchangeCodeForSession error:", exchangeResult.error);
            persistAuthError(normalizeOAuthErrorMessage(exchangeResult.error.message, pendingIntent?.provider));
          } else {
            console.log("[AuthDeepLink] exchangeCodeForSession success:", JSON.stringify({
              hasSession: !!exchangeResult.data.session,
              userId: exchangeResult.data.session?.user?.id,
            }));
          }
        }

        const sessionCheck = await supabase.auth.getSession();
        console.log("[AuthDeepLink] session after exchange:", JSON.stringify({
          hasSession: !!sessionCheck.data.session,
          userId: sessionCheck.data.session?.user?.id,
          error: sessionCheck.error?.message,
        }));
      } catch (error) {
        console.warn("Failed to exchange auth code from deep link:", error);
      } finally {
        try {
          await Browser.close();
        } catch {
          // Ignore if browser is already closed.
        }
        navigate("/auth/callback", { replace: true });
        processingDeepLinkRef.current = false;
      }
    };

    let removeListener: (() => void) | undefined;

    CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      if (url) {
        handleUrl(url);
      }
    }).then((listener) => {
      removeListener = () => listener.remove();
    });

    CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        handleUrl(launch.url);
      }
    });

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [navigate]);

  return null;
}

function IOSStatusBarInitializer() {
  const location = useLocation();

  useEffect(() => {
    configureIOSStatusBarForLightHeader();
  }, [location.pathname]);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let removeListener: (() => void) | undefined;
    CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        configureIOSStatusBarForLightHeader();
      }
    }).then((listener) => {
      removeListener = () => listener.remove();
    });

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  return null;
}

function GlobalSwipeBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartAtRef = useRef<number>(0);
  const touchTargetRef = useRef<EventTarget | null>(null);
  const lastBackAtRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          'input, textarea, select, [contenteditable="true"], [data-swipe-back-ignore="true"], [data-no-swipe-back="true"], [role="slider"]'
        )
      );
    };

    const hasHorizontalScrollableAncestor = (target: EventTarget | null, deltaX: number) => {
      if (!(target instanceof HTMLElement)) return false;
      let node: HTMLElement | null = target;

      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const canScrollX =
          (style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth;

        if (canScrollX) {
          const atLeft = node.scrollLeft <= 0;
          const atRight = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;

          // Swiping left means content attempts to move right, requiring room on the right.
          if (deltaX < 0 && !atRight) return true;
          // Swiping right means content attempts to move left, requiring room on the left.
          if (deltaX > 0 && !atLeft) return true;
        }

        node = node.parentElement;
      }

      return false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchStartXRef.current = null;
        touchStartYRef.current = null;
        touchTargetRef.current = null;
        return;
      }

      const touch = event.touches[0];

      // Only allow swipe-back when the gesture starts within the left edge zone (first 24px)
      const EDGE_ZONE = 24;
      if (touch.clientX > EDGE_ZONE) {
        touchStartXRef.current = null;
        touchStartYRef.current = null;
        touchTargetRef.current = null;
        return;
      }

      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchStartAtRef.current = Date.now();
      touchTargetRef.current = event.target;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const startX = touchStartXRef.current;
      const startY = touchStartYRef.current;
      const target = touchTargetRef.current;

      touchStartXRef.current = null;
      touchStartYRef.current = null;
      touchTargetRef.current = null;

      if (startX === null || startY === null) return;
      if (event.changedTouches.length !== 1) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const elapsed = Date.now() - touchStartAtRef.current;

      if (elapsed > 650) return;
      if (Math.abs(deltaX) < 70) return;
      if (Math.abs(deltaY) > 80) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (shouldIgnoreTarget(target)) return;
      if (hasHorizontalScrollableAncestor(target, deltaX)) return;

      const now = Date.now();
      if (now - lastBackAtRef.current < 450) return;
      lastBackAtRef.current = now;

      if (window.history.length > 1 && location.pathname !== "/") {
        navigate(-1);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return null;
}

function NativeAnimatedSplash() {
  const [visible, setVisible] = useState(isNativePlatform());

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let timeoutId: number | undefined;

    const bootSplash = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 220 });
      } catch {
        // Ignore if native splash is already hidden.
      }

      timeoutId = window.setTimeout(() => {
        setVisible(false);
      }, 1400);
    };

    bootSplash();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="native-animated-splash" aria-hidden="true">
      <div className="native-animated-splash-logo-wrap">
        <img className="native-animated-splash-logo" src="/ketravelan_icon.jpeg" alt="" />
      </div>
    </div>
  );
}

const App = () => (
  <AuthProvider>
    <ExpenseProvider>
      <QueryClientProvider client={queryClient}>
      <NetworkStatusProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NativeAnimatedSplash />
          <SafeAreaLayout>
            <OfflineBanner />
            <IOSStatusBarInitializer />
            <GlobalSwipeBackHandler />
            <AppInitializer />
            <TermsAcceptanceModal />
            <ScrollToTop />
          <AuthDeepLinkHandler />
            <RecoveryBootstrap />
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/trip/:id" element={<TripDetails />} />
              <Route path="/share/trip/:id" element={<TripDetails />} />
              <Route path="/trip/:id/chat" element={<ProtectedRoute><TripChatRedirect /></ProtectedRoute>} />
              <Route path="/trip/:id/hub" element={<ProtectedRoute><TripHub /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
              <Route path="/create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
              <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
              <Route
                path="/my-stories"
                element={
                  <ProtectedRoute>
                    <CommunityProvider>
                      <MyStories />
                    </CommunityProvider>
                  </ProtectedRoute>
                }
              />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/chat/new/:userId" element={<ProtectedRoute><DirectChat /></ProtectedRoute>} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/stories/:slug" element={<StoryDetail />} />
              <Route path="/share/story/:slug" element={<StoryDetail />} />
              <Route path="/community/discussions/:id" element={<DiscussionDetail />} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/chat/:id" element={<ProtectedRoute><DirectChat /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/user/:userId" element={<UserProfileView />} />
              <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
              <Route path="/welcome" element={<WelcomeOnboarding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/verification-pending" element={<VerificationPending />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/blocked-users" element={<ProtectedRoute><BlockedUsers /></ProtectedRoute>} />
              <Route path="/settings/moderation-reports" element={<ProtectedRoute><ModerationReports /></ProtectedRoute>} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path={GUIDED_ROUTES.home} element={<ProtectedRoute><GuidedRevamp /></ProtectedRoute>} />
              <Route
                path={GUIDED_ROUTES.paymentGateway}
                element={
                  <GuidedPaymentQueryGuard mode="gateway">
                    <GuidedPaymentGateway />
                  </GuidedPaymentQueryGuard>
                }
              />
              <Route
                path={GUIDED_ROUTES.paymentResult}
                element={
                  <GuidedPaymentQueryGuard mode="result">
                    <GuidedPaymentResult />
                  </GuidedPaymentQueryGuard>
                }
              />
              <Route
                path={GUIDED_ROUTES.paymentGatewayScoped}
                element={<GuidedRouteAliasRedirect to={GUIDED_ROUTES.paymentGateway} />}
              />
              <Route
                path={GUIDED_ROUTES.paymentResultScoped}
                element={<GuidedRouteAliasRedirect to={GUIDED_ROUTES.paymentResult} />}
              />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/help-center/:slug" element={<HelpArticleDetail />} />
              <Route path="/install" element={<Install />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </SafeAreaLayout>
        </BrowserRouter>
      </TooltipProvider>
      </NetworkStatusProvider>
      </QueryClientProvider>
    </ExpenseProvider>
  </AuthProvider>
);

export default App;
