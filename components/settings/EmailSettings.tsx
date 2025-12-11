"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Mail, Key, TestTube } from "lucide-react";

export function EmailSettings() {
  const queryClient = useQueryClient();
  const [resendApiKey, setResendApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState("");

  const { data: settings, isLoading } = useQuery({
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
        description: "Your email settings have been saved",
      });
      setResendApiKey("");
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

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send test email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test email",
      });
      setTestingEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Resend Configuration
          </CardTitle>
          <CardDescription>
            Configure Resend API key for sending emails. Get your API key from{" "}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              resend.com
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="resendApiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Resend API Key
            </Label>
            <Input
              id="resendApiKey"
              type="password"
              placeholder={settings?.resendApiKey ? "••••••••" : "re_..."}
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave blank to keep existing key
            </p>
          </div>

          <div>
            <Label htmlFor="fromEmail">From Email</Label>
            <Input
              id="fromEmail"
              type="email"
              placeholder="noreply@yourdomain.com"
              value={fromEmail || settings?.resendFromEmail || ""}
              onChange={(e) => setFromEmail(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Email address to send from (must be verified in Resend)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() =>
                updateSettingsMutation.mutate({
                  resendApiKey: resendApiKey || undefined,
                  resendFromEmail: fromEmail || settings?.resendFromEmail,
                })
              }
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>

            <div className="flex-1 flex gap-2">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testingEmail}
                onChange={(e) => setTestingEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => testEmailMutation.mutate(testingEmail)}
                disabled={testEmailMutation.isPending || !testingEmail}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                Send Test Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Notification Preferences</CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for important events
              </p>
            </div>
            <Switch
              checked={settings?.emailNotificationsEnabled ?? true}
              onCheckedChange={(checked) =>
                updateSettingsMutation.mutate({ emailNotificationsEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Execution Failure Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when workflow executions fail
              </p>
            </div>
            <Switch
              checked={settings?.executionFailureAlerts ?? true}
              onCheckedChange={(checked) =>
                updateSettingsMutation.mutate({ executionFailureAlerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Workflow Status Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when workflows are enabled or disabled
              </p>
            </div>
            <Switch
              checked={settings?.workflowStatusAlerts ?? false}
              onCheckedChange={(checked) =>
                updateSettingsMutation.mutate({ workflowStatusAlerts: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


