import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  // Enable debug logs to diagnose 422 errors
  logger: {
    level: "debug",
    log: (level, message, ...args) => {
      console.log(`[BetterAuth] [${level}] ${message}`, ...args);
    },
  },

  secret: process.env.BETTER_AUTH_SECRET || "change-this-secret",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;

