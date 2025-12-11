"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export function ProfileSettings() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return null;
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <p className="text-sm text-muted-foreground mt-1">
              {session?.user?.name || "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-sm text-muted-foreground mt-1">
              {session?.user?.email || "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <p className="text-sm text-muted-foreground mt-1">
              {session?.user?.role || "USER"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


