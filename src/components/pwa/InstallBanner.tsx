import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const BANNER_DISMISSED_KEY = "ketravelan_install_banner_dismissed";

export function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Never show in native iOS/Android app
    if (Capacitor.isNativePlatform()) return;

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

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Install Ketravelan</p>
          <p className="text-xs text-muted-foreground truncate">
            Get instant access from your home screen
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deferredPrompt ? (
            <Button size="sm" onClick={handleInstall} className="gap-1.5">
              <Download className="w-4 h-4" />
              Install
            </Button>
          ) : (
            <Link to="/install">
              <Button size="sm" className="gap-1.5">
                <Download className="w-4 h-4" />
                Install
              </Button>
            </Link>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
