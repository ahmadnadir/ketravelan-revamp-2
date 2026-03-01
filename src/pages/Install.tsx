import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Share, MoreVertical, Plus, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
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

  if (isInstalled) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-sm w-full text-center">
            <CardContent className="pt-8 pb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-xl font-bold mb-2">App Installed!</h1>
              <p className="text-muted-foreground mb-6">
                Ketravelan is now on your home screen. Open it anytime to plan trips with friends.
              </p>
              <Link to="/">
                <Button className="w-full">Open App</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-6 space-y-8">
        {/* Hero */}
        <div className="text-center pt-4">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Get the App</h2>
          <p className="text-muted-foreground">
            Install Ketravelan on your device for the best experience. Works offline and loads instantly.
          </p>
        </div>

        {/* Android Install Button */}
        {deferredPrompt && (
          <Button onClick={handleInstall} size="lg" className="w-full gap-2">
            <Download className="w-5 h-5" />
            Install App
          </Button>
        )}

        {/* iOS Instructions */}
        {isIOS && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                  
                </span>
                iPhone / iPad
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="font-medium">1. Tap Share</p>
                    <p className="text-sm text-muted-foreground">
                      Find the share icon at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="font-medium">2. Add to Home Screen</p>
                    <p className="text-sm text-muted-foreground">
                      Scroll down and tap "Add to Home Screen"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">3. Confirm</p>
                    <p className="text-sm text-muted-foreground">
                      Tap "Add" in the top right corner
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions */}
        {isAndroid && !deferredPrompt && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                  🤖
                </span>
                Android
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center shrink-0">
                    <MoreVertical className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="font-medium">1. Open Menu</p>
                    <p className="text-sm text-muted-foreground">
                      Tap the three dots in Chrome's top right
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="font-medium">2. Install App</p>
                    <p className="text-sm text-muted-foreground">
                      Select "Install app" or "Add to Home screen"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">3. Confirm</p>
                    <p className="text-sm text-muted-foreground">
                      Tap "Install" in the popup
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Desktop Browser</h3>
              <p className="text-sm text-muted-foreground">
                Look for the install icon in your browser's address bar, or use the browser menu to install this app.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-center">Why Install?</h3>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="font-medium text-sm">⚡ Instant Loading</p>
                <p className="text-xs text-muted-foreground">Opens in a flash</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="font-medium text-sm">📴 Works Offline</p>
                <p className="text-xs text-muted-foreground">No internet needed</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="font-medium text-sm">🏠 Home Screen</p>
                <p className="text-xs text-muted-foreground">One tap access</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="font-medium text-sm">🔒 Secure</p>
                <p className="text-xs text-muted-foreground">Same security as web</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
