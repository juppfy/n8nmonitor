"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { Bell, Mail, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function NotificationsSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [formData, setFormData] = useState({
    notificationEmail: settings?.settings?.notificationEmail || "",
    errorThreshold: settings?.settings?.errorThreshold || 1,
    autoDeactivateWorkflow: settings?.settings?.autoDeactivateWorkflow || false,
    autoDeactivateThreshold: settings?.settings?.autoDeactivateThreshold || 3,
    notifyOnSuccess: settings?.settings?.notifyOnSuccess || false,
    notifyOnError: settings?.settings?.notifyOnError || true,
    notifyOnWarning: settings?.settings?.notifyOnWarning || false,
  });

  const updateMutation = useMutation({
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
        title: "Settings Updated",
        description: "Your notification preferences have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure how you want to be notified about workflow events
        </p>
      </div>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <CardDescription>
            Receive real-time notifications on this device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushSupported && (
            <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-md flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  Push notifications not supported
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your browser doesn&apos;t support push notifications. Try using Chrome, Edge, or Firefox.
                </p>
              </div>
            </div>
          )}

          {pushSupported && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base">Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get instant alerts on this device
                  </p>
                </div>
                <Button
                  onClick={pushSubscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                  variant={pushSubscribed ? "outline" : "default"}
                >
                  {pushLoading ? "Loading..." : pushSubscribed ? "Disable" : "Enable"}
                </Button>
              </div>

              {pushSubscribed && (
                <div className="space-y-3">
                  <div className="p-3 border border-green-500/50 bg-green-500/10 rounded-md flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Push notifications are active on this device
                    </span>
                  </div>
                  <Button
                    onClick={sendTestNotification}
                    variant="outline"
                    size="sm"
                    disabled={pushLoading}
                  >
                    Send Test Notification
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Receive notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Notification Email</Label>
            <Input
              id="notificationEmail"
              type="email"
              placeholder="your-email@example.com"
              value={formData.notificationEmail}
              onChange={(e) =>
                setFormData({ ...formData, notificationEmail: e.target.value })
              }
            />
            <p className="text-sm text-muted-foreground">
              Leave blank to use your account email
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>
            Choose when to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <Label>Workflow Errors</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a workflow fails
                </p>
              </div>
            </div>
            <Switch
              checked={formData.notifyOnError}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyOnError: checked })
              }
            />
          </div>

          {formData.notifyOnError && (
            <div className="ml-6 space-y-2 p-4 border rounded-md">
              <div className="space-y-2">
                <Label>Error Threshold</Label>
                <Select
                  value={formData.errorThreshold.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, errorThreshold: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Notify on every error</SelectItem>
                    <SelectItem value="2">After 2 consecutive errors</SelectItem>
                    <SelectItem value="3">After 3 consecutive errors</SelectItem>
                    <SelectItem value="5">After 5 consecutive errors</SelectItem>
                    <SelectItem value="10">After 10 consecutive errors</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Only send notifications after X consecutive errors
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <Label>Workflow Success</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a workflow succeeds
                </p>
              </div>
            </div>
            <Switch
              checked={formData.notifyOnSuccess}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyOnSuccess: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-500" />
              <div>
                <Label>Warnings</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about workflow warnings
                </p>
              </div>
            </div>
            <Switch
              checked={formData.notifyOnWarning}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyOnWarning: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-Deactivation */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Deactivation</CardTitle>
          <CardDescription>
            Automatically disable workflows after repeated failures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Deactivation</Label>
              <p className="text-sm text-muted-foreground">
                Workflows will be disabled after reaching error threshold
              </p>
            </div>
            <Switch
              checked={formData.autoDeactivateWorkflow}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, autoDeactivateWorkflow: checked })
              }
            />
          </div>

          {formData.autoDeactivateWorkflow && (
            <div className="space-y-2 p-4 border rounded-md">
              <Label>Deactivation Threshold</Label>
              <Select
                value={formData.autoDeactivateThreshold.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    autoDeactivateThreshold: parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">After 3 consecutive errors</SelectItem>
                  <SelectItem value="5">After 5 consecutive errors</SelectItem>
                  <SelectItem value="10">After 10 consecutive errors</SelectItem>
                  <SelectItem value="15">After 15 consecutive errors</SelectItem>
                  <SelectItem value="20">After 20 consecutive errors</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Workflows will be automatically disabled after this many consecutive failures
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}


