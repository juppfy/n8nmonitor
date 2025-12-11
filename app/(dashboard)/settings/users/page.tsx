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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Bell, Settings, Send, Clock } from "lucide-react";

export default function UsersManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "USER">("USER");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations/list");
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }
      return data;
    },
    onSuccess: () => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({
        title: "Invitation sent",
        description: "User has been invited.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserNotificationsMutation = useMutation({
    mutationFn: async ({
      userId,
      settings,
    }: {
      userId: string;
      settings: any;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "Notification settings have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Invite teammates and manage their notification preferences
        </p>
      </div>

      {/* Invitation section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            <CardTitle>Invite users</CardTitle>
          </div>
          <CardDescription>
            Send an email invitation. Pending invites expire after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-full md:w-40 space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value === "ADMIN" ? "ADMIN" : "USER")
                }
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <Button
              className="w-full md:w-auto"
              onClick={() => sendInvitationMutation.mutate()}
              disabled={!inviteEmail || sendInvitationMutation.isPending}
            >
              {sendInvitationMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Pending invitations
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitationsLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>Loading invitations...</TableCell>
                  </TableRow>
                )}
                {!invitationsLoading &&
                  invitations?.invitations
                    ?.filter((inv: any) => !inv.acceptedAt)
                    .map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell>
                          <Badge variant={inv.role === "ADMIN" ? "default" : "secondary"}>
                            {inv.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.inviter?.name || inv.inviter?.email || "—"}
                        </TableCell>
                        <TableCell>
                          {new Date(inv.expiresAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Pending</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                {!invitationsLoading &&
                  invitations?.invitations?.filter((inv: any) => !inv.acceptedAt)
                    .length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No pending invitations
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Team Members</CardTitle>
          </div>
          <CardDescription>
            Configure who receives alerts for workflow errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email Notifications</TableHead>
                <TableHead>Push Notifications</TableHead>
                <TableHead>Error Alerts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.users?.map((user: any) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onUpdate={(settings) =>
                    updateUserNotificationsMutation.mutate({
                      userId: user.id,
                      settings,
                    })
                  }
                  updating={updateUserNotificationsMutation.isPending}
                />
              ))}
            </TableBody>
          </Table>

          {users?.users?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Rules</CardTitle>
          <CardDescription>
            Global notification settings for your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">Alert Priority</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Users will receive notifications based on their configured settings
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Admins: Receive all error notifications</li>
              <li>• Users: Only receive notifications for workflows they own</li>
              <li>• Error threshold: Configurable per user</li>
              <li>• Auto-deactivation: Optional per user</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  onUpdate,
  updating,
}: {
  user: any;
  onUpdate: (settings: any) => void;
  updating: boolean;
}) {
  const [emailEnabled, setEmailEnabled] = useState(
    user.userSettings?.emailNotificationsEnabled ?? true
  );
  const [pushEnabled, setPushEnabled] = useState(
    user.userSettings?.pushNotificationsEnabled ?? false
  );
  const [errorAlerts, setErrorAlerts] = useState(
    user.userSettings?.executionFailureAlerts ?? true
  );

  const handleSave = () => {
    onUpdate({
      emailNotificationsEnabled: emailEnabled,
      pushNotificationsEnabled: pushEnabled,
      executionFailureAlerts: errorAlerts,
    });
  };

  const hasChanges =
    emailEnabled !== (user.userSettings?.emailNotificationsEnabled ?? true) ||
    pushEnabled !== (user.userSettings?.pushNotificationsEnabled ?? false) ||
    errorAlerts !== (user.userSettings?.executionFailureAlerts ?? true);

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={emailEnabled}
          onCheckedChange={setEmailEnabled}
          disabled={updating}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={pushEnabled}
          onCheckedChange={setPushEnabled}
          disabled={updating}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={errorAlerts}
          onCheckedChange={setErrorAlerts}
          disabled={updating}
        />
      </TableCell>
      <TableCell>
        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updating}
          >
            {updating ? "Saving..." : "Save"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
