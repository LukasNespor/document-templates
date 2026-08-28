import { NextResponse } from "next/server";
import { hasAnyUser, saveUser } from "@/lib/azure-users";
import { hashPassword } from "@/lib/auth";
import { validateCredentials } from "@/lib/validation";
import { AUTH_ERRORS, logAuthError } from "@/lib/auth-errors";
import {
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
  RateLimitKey,
} from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    // Get username and password from request
    const body = await request.json();
    const { username, password } = body;

    const clientIp = getClientIp(request);
    const rateLimitKeys: RateLimitKey[] = [
      { scope: "username", value: typeof username === "string" ? username.trim() : "" },
      { scope: "ip", value: clientIp },
    ];

    // Check the lockout before doing any work
    if (await isRateLimited(rateLimitKeys)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.TOO_MANY_ATTEMPTS },
        { status: 429 }
      );
    }

    // Check if setup is still needed
    let hasUser = false;
    try {
      hasUser = await hasAnyUser();
    } catch (error: any) {
      // If table doesn't exist, that's fine - setup is needed
      if (error?.statusCode !== 404 && !error?.message?.includes("TableNotFound")) {
        throw error;
      }
    }

    if (hasUser) {
      await recordFailedAttempt(rateLimitKeys);
      return NextResponse.json(
        { error: AUTH_ERRORS.SETUP_ALREADY_COMPLETED },
        { status: 403 }
      );
    }

    // Validate input using centralized validation
    const validation = validateCredentials(username, password);
    if (!validation.isValid) {
      await recordFailedAttempt(rateLimitKeys);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Create first user
    const passwordHash = await hashPassword(password);
    const user = {
      id: uuidv4(),
      username: username.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      passwordChangedAt: new Date().toISOString(),
      isAdmin: true, // First user is always admin
    };

    await saveUser(user);

    await resetAttempts(rateLimitKeys);

    return NextResponse.json({ success: true });
  } catch (error) {
    logAuthError("Setup initialization endpoint", error);
    return NextResponse.json(
      { error: AUTH_ERRORS.SETUP_FAILED },
      { status: 500 }
    );
  }
}
