import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Download, Smartphone, ArrowUpFromLine, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const BANNER_DISMISSED_KEY = "ketravelan_install_banner_dismissed";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.ketravelan.app";
const APP_STORE_URL = "https://apps.apple.com/my/app/ketravelan/id6762271506";

export function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Never show in native iOS/Android app
    if (Capacitor.isNativePlatform()) return;

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Check if already dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed) return;

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Show banner after a delay for better UX
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleStoreRedirect = () => {
    const storeUrl = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;
    window.open(storeUrl, "_blank", "noopener,noreferrer");
    setShowBanner(false);
  };

  const isStorePrompt = isIOS || isAndroid;
  const storeLabel = isAndroid ? "Get it on Google Play" : "Download on the App Store";
  const storeIcon = isAndroid ? Download : ShoppingBag;
  const StoreIcon = storeIcon;

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="relative w-full max-w-[360px] rounded-[28px] border border-black/5 bg-white px-6 pb-6 pt-8 shadow-[0_24px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(99,102,241,0.18)] ring-1 ring-black/5">
          <img src="/ketravelan_icon.jpeg" alt="Ketravelan" className="h-full w-full object-cover" />
        </div>

        <div className="space-y-2 text-center">
          <h3 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-slate-900">Install Ketravelan</h3>
          <p className="text-sm leading-6 text-slate-500">
            {isStorePrompt
              ? "Get the full app for a smoother, faster travel planning experience."
              : "Install the app for a native experience with offline access and faster performance."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-center">
          {isAndroid && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Get the app</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Open Google Play to download Ketravelan and use it like a regular app.</p>
            </>
          )}

          {isIOS && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Get the app</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Open the App Store to download Ketravelan and start planning your trips.</p>
            </>
          )}

          {!isStorePrompt && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Installation steps</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <p className="flex items-center justify-center gap-2"><span className="font-medium">1.</span> Tap <ArrowUpFromLine className="h-4 w-4 text-primary" /> below</p>
                <p><span className="font-medium">2.</span> Choose "Install app" or "Add to Home Screen"</p>
                <p><span className="font-medium">3.</span> Confirm the installation</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={handleDismiss}>
            Later
          </Button>
          {isStorePrompt ? (
            <Button className="flex-1 gap-2 rounded-2xl" onClick={handleStoreRedirect}>
              <StoreIcon className="h-4 w-4" />
              {isAndroid ? "Open Play Store" : "Open App Store"}
            </Button>
          ) : deferredPrompt ? (
            <Button className="flex-1 gap-2 rounded-2xl" onClick={handleInstall}>
              <Download className="h-4 w-4" />
              Install
            </Button>
          ) : (
            <Link to="/install" className="flex-1">
              <Button className="w-full gap-2 rounded-2xl">
                <Download className="h-4 w-4" />
                Install
              </Button>
            </Link>
          )}
        </div>

        {isStorePrompt && (
          <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
            {storeLabel}
          </p>
        )}
      </div>
    </div>
  );
}
