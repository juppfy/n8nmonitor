"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PWASettings } from "@/components/settings/PWASettings";
import { requireAuth } from "@/lib/auth/utils";
import { redirect } from "next/navigation";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="pwa">PWA</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="email">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="pwa">
          <PWASettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}


