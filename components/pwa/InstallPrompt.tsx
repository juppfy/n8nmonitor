"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, so we can show a manual install prompt
      // This would be handled differently - you might want to show instructions
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } catch (error) {
      console.error("Error installing PWA:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't clear deferredPrompt so user can try again later
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install n8n Monitor</DialogTitle>
          <DialogDescription>
            Install this app on your device for a better experience. You can access it from your home screen and use it offline.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Faster loading times</li>
            <li>Works offline (with caching)</li>
            <li>App-like experience</li>
            <li>Push notifications support</li>
            <li>Access from home screen</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-2" />
            Maybe Later
          </Button>
          <Button onClick={handleInstall} className="gap-2">
            <Download className="h-4 w-4" />
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


