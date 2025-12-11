"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PushNotificationButton } from "@/components/push/PushNotificationButton";
import { toast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

export function NotificationSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your notification settings have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Enable push notifications to get alerts on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow the app to send push notifications to your device
              </p>
            </div>
            <PushNotificationButton />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notification Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications for important events
              </p>
            </div>
            <Switch
              checked={settings?.pushNotificationsEnabled ?? false}
              onCheckedChange={(checked) =>
                updateSettingsMutation.mutate({ pushNotificationsEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


