import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  // We cannot access Prisma here because middleware runs on Edge Runtime.
  // Instead, we'll rely on page-level redirects or API checks for the "is admin setup" logic.
  
  const path = request.nextUrl.pathname;

  // Simple check: if user has a session cookie and tries to go to /login or /setup,
  // we could redirect them to dashboard?
  // But for now, let's just strip the DB logic that was breaking the app.
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
