import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams, Navigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/lib/supabase";
import { isNativePlatform } from "@/lib/capacitor";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ExpenseProvider } from "./contexts/ExpenseContext";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import MainPage from "./pages/MainPage";
import TripDetails from "./pages/TripDetails";
import TripHub from "./pages/TripHub";
import CreateTrip from "./pages/CreateTrip";
import MyTrips from "./pages/MyTrips";
import Chat from "./pages/Chat";
import Expenses from "./pages/Expenses";
import DirectChat from "./pages/DirectChat";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import UserProfileView from "./pages/UserProfileView";
import Favourites from "./pages/Favourites";
import Approvals from "./pages/Approvals";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Community from "./pages/Community";
import StoryDetail from "./pages/StoryDetail";
import DiscussionDetail from "./pages/DiscussionDetail";
import CreateStory from "./pages/CreateStory";
import Feedback from "./pages/Feedback";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import HelpArticleDetail from "./pages/HelpArticleDetail";

import { PageTransition } from "./components/layout/PageTransition";
import React, { Suspense, useEffect, useRef, useState } from "react";

const VerificationPending = React.lazy(() => import("./pages/VerificationPending"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const WelcomeOnboarding = React.lazy(() => import("./pages/WelcomeOnboarding"));

const queryClient = new QueryClient();

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

function NativeSplashOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="native-splash" aria-hidden="true">
      <img src="/homescreen.png" alt="Ketravelan" />
    </div>
  );
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

const App = () => (
  <AuthProvider>
    <ExpenseProvider>
      <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <NativeSplashOverlay />
          <AuthDeepLinkHandler />
          <RecoveryBootstrap />
          <PageTransition>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/trip/:id" element={<TripDetails />} />
              <Route path="/trip/:id/chat" element={<ProtectedRoute><TripChatRedirect /></ProtectedRoute>} />
              <Route path="/trip/:id/hub" element={<ProtectedRoute><TripHub /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
              <Route path="/create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
              <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/stories/:slug" element={<StoryDetail />} />
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
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/help-center/:slug" element={<HelpArticleDetail />} />
              <Route path="/install" element={<Install />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </PageTransition> 
        </BrowserRouter>
      </TooltipProvider>
      </QueryClientProvider>
    </ExpenseProvider>
  </AuthProvider>
);

export default App;
