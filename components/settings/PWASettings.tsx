"use client";

import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Monitor } from "lucide-react";

export function PWASettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Install as App</CardTitle>
          <CardDescription>
            Install n8n Monitor as a Progressive Web App on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InstallPrompt />

          <div className="space-y-2">
            <h3 className="font-semibold">Benefits of installing as PWA:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Faster loading times</li>
              <li>Works offline (with caching)</li>
              <li>App-like experience</li>
              <li>Push notifications support</li>
              <li>Access from home screen</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Mobile</h4>
                <p className="text-sm text-muted-foreground">
                  Install from browser menu (Chrome/Safari) and add to home screen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Desktop</h4>
                <p className="text-sm text-muted-foreground">
                  Install from browser address bar (Chrome/Edge) or menu
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


