import { useEffect, useState } from "react";
import { ArrowUpFromLine, CheckCircle2, Download, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.ketravelan.app";
const APP_STORE_URL = "https://apps.apple.com/us/search?term=Ketravelan";

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleStoreRedirect = () => {
    window.open(isAndroid ? PLAY_STORE_URL : APP_STORE_URL, "_blank", "noopener,noreferrer");
  };

  const isStorePrompt = isIOS || isAndroid;

  if (isInstalled) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-sm w-full text-center rounded-[28px] border-black/5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] mb-2">Ketravelan is ready</h1>
              <p className="text-muted-foreground mb-6 leading-7">
                Open the app anytime from your home screen to plan trips faster.
              </p>
              <Button className="w-full rounded-2xl" onClick={() => window.location.assign("/")}>Open App</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-center py-8 sm:py-12">
        <Card className="w-full max-w-[420px] rounded-[30px] border-black/5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardContent className="px-6 pb-6 pt-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(99,102,241,0.18)] ring-1 ring-black/5">
              <img src="/ketravelan_icon.jpeg" alt="Ketravelan" className="h-full w-full object-cover" />
            </div>

            <h1 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-900">Install Ketravelan</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {isStorePrompt
                ? "Get the full app for a smoother, faster travel planning experience."
                : "Install the app for a native experience with offline access and faster performance."}
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-5">
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
                    <p className="flex items-center justify-center gap-2"><span className="font-medium">1.</span> Tap <ArrowUpFromLine className="h-4 w-4 text-primary" /> in your browser</p>
                    <p><span className="font-medium">2.</span> Choose "Install app" or "Add to Home Screen"</p>
                    <p><span className="font-medium">3.</span> Confirm to finish installation</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {isStorePrompt ? (
                <Button className="w-full gap-2 rounded-2xl" onClick={handleStoreRedirect}>
                  {isAndroid ? <Download className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                  {isAndroid ? "Open Play Store" : "Open App Store"}
                </Button>
              ) : deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full gap-2 rounded-2xl">
                  <Download className="h-4 w-4" />
                  Install Now
                </Button>
              ) : (
                <Button className="w-full gap-2 rounded-2xl" onClick={() => window.location.reload()}>
                  <Download className="h-4 w-4" />
                  Check Install Option
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}