# n8n Monitor Dashboard - Implementation Guide

## Overview

This guide outlines the complete implementation strategy for building an open-source n8n monitoring dashboard with Better Auth authentication, supporting single-account deployment with user invitation capabilities.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Strategy](#authentication-strategy)
3. [Database Schema](#database-schema)
4. [Implementation Phases](#implementation-phases)
5. [Better Auth Setup](#better-auth-setup)
6. [Initial Admin Account Creation](#initial-admin-account-creation)
7. [User Invitation System](#user-invitation-system)
8. [Resend Email Integration](#resend-email-integration)
9. [PWA (Progressive Web App) Setup](#pwa-progressive-web-app-setup)
10. [Push Notifications](#push-notifications)
11. [Settings UI](#settings-ui)
12. [API Routes Structure](#api-routes-structure)
13. [Frontend Components](#frontend-components)
14. [Security Considerations](#security-considerations)
15. [Environment Variables](#environment-variables)

---

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Authentication**: Better Auth
- **Database**: SQLite (default) / PostgreSQL (optional)
- **ORM**: Prisma
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query
- **Validation**: Zod
- **Email**: Resend
- **PWA**: Next.js PWA Plugin
- **Push Notifications**: Web Push API

### Project Structure

```
n8n-monitor/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── setup/              # Initial admin account creation
│   │   └── accept-invite/      # Invitation acceptance
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── instances/
│   │   ├── workflows/
│   │   ├── executions/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── instances/
│   │   ├── workflows/
│   │   ├── executions/
│   │   └── invitations/
│   └── layout.tsx
├── lib/
│   ├── auth/
│   │   ├── client.ts           # Better Auth client
│   │   └── server.ts           # Better Auth server config
│   ├── db/
│   │   └── prisma.ts
│   ├── n8n/
│   │   └── client.ts           # n8n API client
│   ├── email/
│   │   └── resend.ts           # Resend email client
│   ├── push/
│   │   └── notifications.ts    # Push notification utilities
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── components/
│   ├── ui/                     # shadcn components
│   ├── auth/
│   ├── dashboard/
│   ├── instances/
│   └── settings/
├── public/
│   ├── icons/                  # PWA icons
│   └── manifest.json           # PWA manifest
└── service-worker.ts           # Service worker for PWA
```

---

## Authentication Strategy

### Single Account Deployment Flow

1. **Initial Setup**: On first deployment, the app checks if any admin user exists
2. **Admin Creation**: If no admin exists, redirect to `/setup` to create the first admin account
3. **Invite-Only**: After admin creation, registration is disabled; only invitations work
4. **User Invitations**: Admin can invite users via email
5. **Invite Acceptance**: Invited users can accept and create their account

### User Roles

- **admin**: Full access, can invite users, manage all instances
- **user**: Can manage their own instances and workflows

---

## Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // Change to "postgresql" for PostgreSQL
  url      = env("DATABASE_URL")
}

// Better Auth required tables
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  emailVerified DateTime?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Better Auth relations
  accounts     Account[]
  sessions     Session[]
  
  // App relations
  n8nInstances    N8nInstance[]
  invitations     Invitation[] @relation("InvitedBy")
  role            UserRole     @default(USER)
  userSettings    UserSettings?
  pushSubscriptions PushSubscription[]
  
  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
}

enum UserRole {
  ADMIN
  USER
}

// App-specific models
model N8nInstance {
  id          String   @id @default(cuid())
  userId      String
  name        String
  baseUrl     String
  apiKey      String   // Encrypted
  isActive    Boolean  @default(true)
  lastCheck   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workflows   Workflow[]
  executions  Execution[]
  
  @@index([userId])
}

model Workflow {
  id            String   @id @default(cuid())
  instanceId    String
  n8nWorkflowId String
  name          String
  isActive      Boolean
  lastExecution DateTime?
  lastSync      DateTime  @default(now())
  
  instance      N8nInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  executions    Execution[]
  
  @@unique([instanceId, n8nWorkflowId])
  @@index([instanceId])
}

model Execution {
  id            String   @id @default(cuid())
  instanceId    String
  workflowId    String?
  n8nExecutionId String
  status        String   // success, error, running, waiting
  startedAt     DateTime
  finishedAt    DateTime?
  data          String?  @db.Text // JSON data
  
  instance      N8nInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  workflow      Workflow?   @relation(fields: [workflowId], references: [id], onDelete: SetNull)
  
  @@index([instanceId])
  @@index([workflowId])
  @@index([status])
  @@index([startedAt])
}

model Invitation {
  id          String   @id @default(cuid())
  email       String
  token       String   @unique
  invitedBy   String
  role        UserRole @default(USER)
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime @default(now())
  
  inviter     User     @relation("InvitedBy", fields: [invitedBy], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([email])
}

model UserSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique
  resendApiKey          String?  // Encrypted
  resendFromEmail       String?
  pushNotificationsEnabled Boolean @default(false)
  emailNotificationsEnabled Boolean @default(true)
  executionFailureAlerts Boolean @default(true)
  workflowStatusAlerts  Boolean @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model PushSubscription {
  id            String   @id @default(cuid())
  userId        String
  endpoint      String   @unique
  p256dh        String   @db.Text
  auth          String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}
```

---

## Implementation Phases

### Phase 1: Foundation Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Setup Prisma with database schema
- [ ] Configure Better Auth
- [ ] Setup initial admin creation flow
- [ ] Create basic authentication UI

### Phase 2: Core Authentication
- [ ] Implement login functionality
- [ ] Setup session management
- [ ] Create invitation system
- [ ] Build invite acceptance flow
- [ ] Add role-based access control

### Phase 3: Instance Management
- [ ] Create instance CRUD operations
- [ ] Implement n8n API client
- [ ] Add API key encryption/decryption
- [ ] Build instance management UI
- [ ] Add connection testing

### Phase 4: Workflow & Execution Monitoring
- [ ] Implement workflow fetching
- [ ] Add enable/disable workflow functionality
- [ ] Build execution log viewing
- [ ] Create dashboard with statistics
- [ ] Add real-time updates (optional)

### Phase 5: Email & PWA Setup
- [ ] Setup Resend integration
- [ ] Configure email templates
- [ ] Create PWA manifest
- [ ] Setup service worker
- [ ] Add PWA icons
- [ ] Test PWA installation

### Phase 6: Push Notifications
- [ ] Implement push notification service
- [ ] Create subscription management
- [ ] Add notification permissions UI
- [ ] Build notification triggers
- [ ] Test push notifications

### Phase 7: Settings UI
- [ ] Create settings page layout
- [ ] Build Resend configuration UI
- [ ] Create push notification settings
- [ ] Add email notification preferences
- [ ] Implement profile settings

### Phase 8: Polish & Security
- [ ] Add error handling
- [ ] Implement rate limiting
- [ ] Create loading states
- [ ] Add comprehensive logging
- [ ] Write documentation

---

## Better Auth Setup

### 1. Installation

```bash
npm install better-auth
npm install @better-auth/prisma-adapter
npm install bcryptjs
npm install @types/bcryptjs
```

### 2. Better Auth Server Configuration

```typescript
// lib/auth/server.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite", // or "postgresql"
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        // Implement email sending logic
        // Use your preferred email service (Resend, SendGrid, etc.)
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${data.token}`;
        
        // Example with Resend (you'll need to install it)
        // await resend.emails.send({
        //   from: 'onboarding@yourapp.com',
        //   to: data.email,
        //   subject: 'Invitation to n8n Monitor',
        //   html: `<p>You've been invited! Click <a href="${inviteLink}">here</a> to accept.</p>`
        // });
      },
    }),
  ],
  
  advanced: {
    generateId: () => {
      // Use Prisma's cuid or uuid
      return crypto.randomUUID();
    },
  },
});

export type Session = typeof auth.$Infer.Session;
```

### 3. Better Auth API Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 4. Better Auth Client

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  organization: orgClient,
} = authClient;
```

### 5. Server-Side Auth Utilities

```typescript
// lib/auth/utils.ts
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((h) => h.headers()),
  });
  
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  // Check if user is admin
  // This will depend on your role implementation
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }
  
  return session;
}
```

---

## Initial Admin Account Creation

### 1. Setup Check Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if admin exists
  const adminExists = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  
  // If no admin and not on setup page, redirect to setup
  if (!adminExists && !path.startsWith("/setup") && !path.startsWith("/api")) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  
  // If admin exists and on setup page, redirect to login
  if (adminExists && path.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 2. Setup Page Component

```typescript
// app/(auth)/setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Sign up the admin
      const { data, error: signUpError } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (signUpError) {
        throw signUpError;
      }

      // Update user role to ADMIN in database
      const response = await fetch("/api/auth/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to set admin role");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Initial Setup</CardTitle>
          <CardDescription>
            Create the first admin account for your n8n Monitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded">
                {error}
              </div>
            )}
            
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Admin Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Setup Admin API Route

```typescript
// app/api/auth/setup-admin/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
});

export async function POST(request: Request) {
  try {
    // Check if admin already exists (just in case)
    const adminExists = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (adminExists) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId } = schema.parse(body);

    // Set user as admin
    await prisma.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup admin error:", error);
    return NextResponse.json(
      { error: "Failed to setup admin" },
      { status: 500 }
    );
  }
}
```

---

## User Invitation System

### 1. Invitation API Routes

```typescript
// app/api/invitations/send/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { email, role } = schema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check for pending invitation
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent" },
        { status: 400 }
      );
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        role,
        invitedBy: session.user.id,
        expiresAt,
      },
    });

    // Send invitation email via Resend
    await sendInvitationEmail(email, token, invitation);

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Send invitation error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/invitations/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";

const schema = z.object({
  token: z.string(),
  name: z.string(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, name, password } = schema.parse(body);

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { inviter: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 400 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create user account
    const { data, error: signUpError } = await authClient.signUp.email({
      email: invitation.email,
      password,
      name,
    });

    if (signUpError) {
      throw signUpError;
    }

    // Update user role
    await prisma.user.update({
      where: { id: data.user.id },
      data: { role: invitation.role },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/invitations/list/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("List invitations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
```

### 2. Invite Acceptance Page

```typescript
// app/(auth)/accept-invite/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setValidating(false);
      return;
    }

    // Validate token
    fetch(`/api/invitations/validate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
      })
      .catch((err) => {
        setError("Failed to validate invitation");
      })
      .finally(() => {
        setValidating(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: formData.name,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      router.push("/login?message=Account created successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Create your account for {invitation?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. User Management UI (Admin Only)

```typescript
// app/(dashboard)/settings/users/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function UsersPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations/list");
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: "ADMIN" | "USER" }) => {
      const res = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    sendInviteMutation.mutate({ email, role });
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Invite users to access n8n Monitor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSendInvite} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="w-40">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v: "ADMIN" | "USER") => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={sendInviteMutation.isPending}>
                {sendInviteMutation.isPending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </form>

          <div>
            <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
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
                  {invitations?.invitations?.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>{inv.role}</TableCell>
                      <TableCell>{inv.inviter?.name || inv.inviter?.email}</TableCell>
                      <TableCell>
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {inv.acceptedAt ? (
                          <span className="text-green-600">Accepted</span>
                        ) : new Date(inv.expiresAt) < new Date() ? (
                          <span className="text-red-600">Expired</span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Resend Email Integration

### 1. Installation

```bash
npm install resend
```

### 2. Resend Client Setup

```typescript
// lib/email/resend.ts
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";

let resendInstance: Resend | null = null;

export async function getResendClient(userId?: string): Promise<Resend | null> {
  // If userId provided, use user's Resend API key
  if (userId) {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { resendApiKey: true, resendFromEmail: true },
    });

    if (settings?.resendApiKey) {
      const apiKey = decrypt(settings.resendApiKey);
      return new Resend(apiKey);
    }
  }

  // Fallback to global Resend API key
  if (process.env.RESEND_API_KEY) {
    if (!resendInstance) {
      resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
  }

  return null;
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  invitation: { email: string; role: string; expiresAt: Date }
) {
  const resend = await getResendClient();
  if (!resend) {
    throw new Error("Resend is not configured");
  }

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Invitation to n8n Monitor",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>You've been invited!</h1>
              <p>You've been invited to join n8n Monitor with the role: <strong>${invitation.role}</strong></p>
              <p>Click the button below to accept your invitation:</p>
              <a href="${inviteLink}" class="button">Accept Invitation</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${inviteLink}</p>
              <p><strong>This invitation expires on:</strong> ${new Date(invitation.expiresAt).toLocaleString()}</p>
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}

export async function sendExecutionFailureEmail(
  userId: string,
  execution: {
    workflowName: string;
    instanceName: string;
    error: string;
    executionId: string;
  }
) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });

  if (!settings?.emailNotificationsEnabled || !settings?.executionFailureAlerts) {
    return;
  }

  const resend = await getResendClient(userId);
  if (!resend) {
    return; // Silently fail if Resend not configured
  }

  const fromEmail = settings.resendFromEmail || process.env.RESEND_FROM_EMAIL || "noreply@n8n-monitor.dev";

  try {
    await resend.emails.send({
      from: fromEmail,
      to: settings.user.email,
      subject: `Workflow Execution Failed: ${execution.workflowName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .error-box { background-color: #fee; border-left: 4px solid #f00; padding: 15px; margin: 20px 0; }
              .info-box { background-color: #eef; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Workflow Execution Failed</h1>
              <div class="info-box">
                <p><strong>Workflow:</strong> ${execution.workflowName}</p>
                <p><strong>Instance:</strong> ${execution.instanceName}</p>
                <p><strong>Execution ID:</strong> ${execution.executionId}</p>
              </div>
              <div class="error-box">
                <p><strong>Error:</strong></p>
                <pre style="white-space: pre-wrap;">${execution.error}</pre>
              </div>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/executions/${execution.executionId}">View Execution Details</a></p>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send execution failure email:", error);
  }
}
```

### 3. Update Better Auth to Use Resend

```typescript
// lib/auth/server.ts (update)
import { sendInvitationEmail } from "@/lib/email/resend";

export const auth = betterAuth({
  // ... existing config
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        try {
          await sendInvitationEmail(data.email, data.token, {
            email: data.email,
            role: data.role || "USER",
            expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        } catch (error) {
          console.error("Failed to send invitation email:", error);
          throw error;
        }
      },
    }),
  ],
});
```

---

## PWA (Progressive Web App) Setup

### 1. Installation

```bash
npm install next-pwa
npm install --save-dev @types/node
```

### 2. Next.js Configuration

```typescript
// next.config.js
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  // Your existing Next.js config
});
```

### 3. PWA Manifest

```json
// public/manifest.json
{
  "name": "n8n Monitor",
  "short_name": "n8n Monitor",
  "description": "Monitor and manage your n8n workflows",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0070f3",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "View dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Workflows",
      "short_name": "Workflows",
      "description": "View workflows",
      "url": "/workflows",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

### 4. Add Manifest to Layout

```typescript
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  themeColor: "#0070f3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "n8n Monitor",
  },
  // ... other metadata
};
```

### 5. Install Prompt Component

```typescript
// components/pwa/InstallPrompt.tsx
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
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
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

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install n8n Monitor</DialogTitle>
          <DialogDescription>
            Install this app on your device for a better experience. You can access it from your home screen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
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
```

---

## Push Notifications

### 1. Push Notification Utilities

```typescript
// lib/push/notifications.ts
import { prisma } from "@/lib/db/prisma";
import webpush from "web-push";

// Set VAPID keys (generate once: web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@n8n-monitor.dev";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
) {
  return await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function removePushSubscription(endpoint: string) {
  return await prisma.pushSubscription.delete({
    where: { endpoint },
  });
}

export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    url?: string;
  }
) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { pushNotificationsEnabled: true },
  });

  if (!settings?.pushNotificationsEnabled) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || "/icons/icon-192x192.png",
    badge: notification.badge || "/icons/icon-96x96.png",
    data: {
      ...notification.data,
      url: notification.url || process.env.NEXT_PUBLIC_APP_URL || "/",
    },
  });

  const promises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      );
    } catch (error: any) {
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await removePushSubscription(subscription.endpoint);
      }
      console.error("Push notification error:", error);
    }
  });

  await Promise.allSettled(promises);
}

export async function sendExecutionFailureNotification(
  userId: string,
  execution: {
    workflowName: string;
    instanceName: string;
    executionId: string;
  }
) {
  await sendPushNotification(userId, {
    title: "Workflow Execution Failed",
    body: `${execution.workflowName} on ${execution.instanceName} has failed`,
    url: `/executions/${execution.executionId}`,
    data: {
      type: "execution_failure",
      executionId: execution.executionId,
    },
  });
}
```

### 2. Push Subscription API Route

```typescript
// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { savePushSubscription } from "@/lib/push/notifications";
import { z } from "zod";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const subscription = subscriptionSchema.parse(body);

    await savePushSubscription(session.user.id, subscription);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe push error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/push/unsubscribe/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { removePushSubscription } from "@/lib/push/notifications";
import { z } from "zod";

const schema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { endpoint } = schema.parse(body);

    await removePushSubscription(endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe push error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
```

### 3. Push Notification Client Component

```typescript
// components/push/PushNotificationButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function PushNotificationButton() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to subscribe");
      }

      setIsSubscribed(true);
      toast({
        title: "Subscribed",
        description: "You'll now receive push notifications",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enable notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setIsSubscribed(false);
        toast({
          title: "Unsubscribed",
          description: "You'll no longer receive push notifications",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Disable Notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
```

### 4. Service Worker for Push Notifications

```typescript
// public/sw.js (or service-worker.ts)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const options = {
    title: data.title || "n8n Monitor",
    body: data.body || "You have a new notification",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-96x96.png",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(options.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

---

## Settings UI

### 1. Settings Page Layout

```typescript
// app/(dashboard)/settings/page.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PWASettings } from "@/components/settings/PWASettings";

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
```

### 2. Email Settings Component

```typescript
// components/settings/EmailSettings.tsx
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
    return <div>Loading...</div>;
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
```

### 3. Notification Settings Component

```typescript
// components/settings/NotificationSettings.tsx
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
```

### 4. Settings API Routes

```typescript
// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const updateSettingsSchema = z.object({
  resendApiKey: z.string().optional(),
  resendFromEmail: z.string().email().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  executionFailureAlerts: z.boolean().optional(),
  workflowStatusAlerts: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    const updateData: any = {};
    
    if (data.resendApiKey !== undefined) {
      updateData.resendApiKey = encrypt(data.resendApiKey);
    }
    if (data.resendFromEmail !== undefined) {
      updateData.resendFromEmail = data.resendFromEmail;
    }
    if (data.pushNotificationsEnabled !== undefined) {
      updateData.pushNotificationsEnabled = data.pushNotificationsEnabled;
    }
    if (data.emailNotificationsEnabled !== undefined) {
      updateData.emailNotificationsEnabled = data.emailNotificationsEnabled;
    }
    if (data.executionFailureAlerts !== undefined) {
      updateData.executionFailureAlerts = data.executionFailureAlerts;
    }
    if (data.workflowStatusAlerts !== undefined) {
      updateData.workflowStatusAlerts = data.workflowStatusAlerts;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
    });

    // Don't return encrypted API key
    const { resendApiKey, ...safeSettings } = settings;

    return NextResponse.json({
      ...safeSettings,
      resendApiKey: settings.resendApiKey ? "••••••••" : null,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/settings/test-email/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/utils";
import { getResendClient } from "@/lib/email/resend";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { email } = schema.parse(body);

    const resend = await getResendClient(session.user.id);
    if (!resend) {
      return NextResponse.json(
        { error: "Resend is not configured. Please add your API key in settings." },
        { status: 400 }
      );
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Test Email from n8n Monitor",
      html: `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Test Email</h1>
            <p>This is a test email from your n8n Monitor installation.</p>
            <p>If you received this, your Resend integration is working correctly!</p>
          </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
```

### 5. PWA Settings Component

```typescript
// components/settings/PWASettings.tsx
"use client";

import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor } from "lucide-react";

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
```

---

## API Routes Structure

```
app/api/
├── auth/
│   ├── [...all]/route.ts          # Better Auth handler
│   └── setup-admin/route.ts       # Initial admin setup
├── invitations/
│   ├── send/route.ts              # Send invitation
│   ├── accept/route.ts            # Accept invitation
│   ├── validate/route.ts          # Validate token
│   └── list/route.ts              # List invitations (admin)
├── instances/
│   ├── route.ts                   # GET, POST instances
│   ├── [id]/route.ts              # GET, PUT, DELETE instance
│   └── [id]/test/route.ts         # Test connection
├── workflows/
│   ├── route.ts                   # List workflows
│   ├── [id]/route.ts              # Get workflow details
│   └── [id]/toggle/route.ts       # Enable/disable
└── executions/
    ├── route.ts                   # List executions
    └── [id]/route.ts              # Get execution details
```

---

## Frontend Components

### Key Components Needed

1. **Authentication**
   - Login form
   - Setup form
   - Accept invite form
   - Protected route wrapper

2. **Dashboard**
   - Overview stats
   - Recent executions
   - Instance status cards

3. **Instances**
   - Instance list
   - Add/edit instance form
   - Instance health indicator

4. **Workflows**
   - Workflow list with filters
   - Workflow card
   - Enable/disable toggle

5. **Executions**
   - Execution list
   - Execution details modal
   - Status badges

6. **Settings**
   - User management (admin only)
   - Profile settings
   - Email settings (Resend configuration)
   - Notification preferences
   - PWA installation

7. **PWA Components**
   - Install prompt
   - Service worker
   - Offline support

8. **Push Notifications**
   - Subscription management
   - Notification preferences
   - Execution failure alerts

---

## Security Considerations

### 1. API Key Encryption

```typescript
// lib/encryption.ts
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = "aes-256-cbc";

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 2. Rate Limiting

```typescript
// lib/rate-limit.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}
```

### 3. Input Validation

Always use Zod for validation:

```typescript
import { z } from "zod";

const instanceSchema = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
});
```

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="file:./dev.db"  # SQLite
# DATABASE_URL="postgresql://user:password@localhost:5432/n8n-monitor"  # PostgreSQL

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"

# Encryption
ENCRYPTION_KEY="your-32-byte-hex-key"  # Generate with: openssl rand -hex 32

# Resend (Global fallback - can be configured per user in settings)
RESEND_API_KEY=""
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Push Notifications (VAPID keys)
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_EMAIL="mailto:admin@yourdomain.com"

# Optional: Rate limiting
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

---

## Next Steps

1. **Initialize Project**
   - Create Next.js app with TypeScript
   - Setup Prisma with schema
   - Install all dependencies

2. **Setup Better Auth**
   - Configure Better Auth server
   - Create API routes
   - Setup middleware

3. **Implement Authentication Flow**
   - Create setup page
   - Create login page
   - Create invite acceptance page

4. **Build Core Features**
   - Instance management
   - Workflow monitoring
   - Execution logs

5. **Add Security**
   - Implement encryption
   - Add rate limiting
   - Add input validation

6. **Polish & Deploy**
   - Add error handling
   - Create documentation
   - Setup Docker

---

## Additional Notes

- Better Auth may need some configuration adjustments based on the latest version
- Generate PWA icons: Use tools like PWA Asset Generator or create icons in sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- Generate VAPID keys for push notifications: `npx web-push generate-vapid-keys`
- Resend requires domain verification for production. Use Resend's domain verification feature
- Service worker must be served from the root domain for push notifications to work
- Test PWA installation on actual devices for best results
- Consider adding audit logging for admin actions
- Add proper error boundaries and loading states
- Consider adding real-time updates using WebSockets or Server-Sent Events
- Add pagination for large lists (workflows, executions)
- Consider caching strategies for n8n API calls

### Additional Dependencies

```bash
# Resend
npm install resend

# PWA
npm install next-pwa

# Push Notifications
npm install web-push
npm install --save-dev @types/web-push

# Icons (for PWA)
# Generate icons using online tools or CLI:
# npx pwa-asset-generator public/icon.png public/icons
```

This guide provides a complete roadmap for implementing the authentication system with Better Auth, Resend email integration, PWA functionality, and push notifications. Follow the phases in order, and refer back to this guide as you build each component.

