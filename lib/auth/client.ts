"use client";

import { createAuthClient } from "better-auth/react";

// Use window.location.origin in browser for correct URL, fall back to env var
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  $fetch: authFetch,
} = authClient;

