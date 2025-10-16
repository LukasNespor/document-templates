import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData } from "@/types";

// Session configuration for middleware
const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_change_this",
  cookieName: "word_templates_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// Paths that don't require authentication
const publicPaths = ["/login", "/setup", "/api/auth/login"];

// API paths that don't require authentication
const publicApiPaths = ["/api/auth/login", "/api/setup/check", "/api/setup/initialize"];

// Helper function to check if setup is needed
async function isSetupNeeded(request: NextRequest): Promise<boolean> {
  try {
    const url = new URL("/api/setup/check", request.url);
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Error checking setup status in middleware:", response.statusText);
      return false;
    }

    const data = await response.json();
    return data.setupNeeded === true;
  } catch (error: any) {
    // On errors, assume setup is not needed to avoid redirect loop
    console.error("Error checking setup status in middleware:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public API paths
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check session for protected routes
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    // If not logged in, check if setup is needed
    if (!session.isLoggedIn) {
      // For API routes, return 401
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Neautorizováno" },
          { status: 401 }
        );
      }

      // For pages, check if setup is needed first
      const setupNeeded = await isSetupNeeded(request);
      if (setupNeeded) {
        const setupUrl = new URL("/setup", request.url);
        return NextResponse.redirect(setupUrl);
      }

      // Setup is done, redirect to login
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);

    // On error, check if setup is needed before redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Neautorizováno" },
        { status: 401 }
      );
    }

    // Check if setup is needed
    const setupNeeded = await isSetupNeeded(request);
    if (setupNeeded) {
      const setupUrl = new URL("/setup", request.url);
      return NextResponse.redirect(setupUrl);
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
