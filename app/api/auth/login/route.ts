import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/azure-users";
import { verifyPassword, getSession } from "@/lib/auth";
import { validateCredentials } from "@/lib/validation";
import {
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
  RateLimitKey,
} from "@/lib/rate-limit";
import {
  AUTH_ERRORS,
  AuthErrorType,
  createAuthErrorResponse,
  logAuthError,
  logAuthAttempt,
  hashUsernameForLogs,
} from "@/lib/auth-errors";

export async function POST(request: NextRequest) {
  let username = "";

  try {
    const body = await request.json();
    username = body.username || "";
    const password = body.password || "";

    const clientIp = getClientIp(request);
    const rateLimitKeys: RateLimitKey[] = [
      { scope: "username", value: username.trim() },
      { scope: "ip", value: clientIp },
    ];

    // Check the lockout before touching storage or bcrypt
    if (await isRateLimited(rateLimitKeys)) {
      logAuthAttempt(username, false, AuthErrorType.RATE_LIMITED);
      return NextResponse.json(
        { error: AUTH_ERRORS.TOO_MANY_ATTEMPTS },
        { status: 429 }
      );
    }

    // Validate input format
    const validation = validateCredentials(username, password);
    if (!validation.isValid) {
      await recordFailedAttempt(rateLimitKeys);
      return NextResponse.json(
        { error: validation.error || AUTH_ERRORS.INVALID_CREDENTIALS },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await getUserByUsername(username.trim());
    if (!user) {
      await recordFailedAttempt(rateLimitKeys);
      const errorMessage = createAuthErrorResponse(
        AuthErrorType.USER_NOT_FOUND,
        username
      );
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await recordFailedAttempt(rateLimitKeys);
      const errorMessage = createAuthErrorResponse(
        AuthErrorType.INVALID_PASSWORD,
        username
      );
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    // Create session
    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.salutation = user.salutation;
    session.isAdmin = user.isAdmin;
    session.canBulkGenerate = user.canBulkGenerate;
    session.isLoggedIn = true;
    await session.save();

    // Clear the counter for this username after a successful login
    await resetAttempts([{ scope: "username", value: username.trim() }]);

    // Log successful authentication
    logAuthAttempt(username, true);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        salutation: user.salutation,
        isAdmin: user.isAdmin,
        canBulkGenerate: user.canBulkGenerate,
      },
    });
  } catch (error) {
    logAuthError("Login endpoint", error, {
      usernameHash: hashUsernameForLogs(username),
    });
    return NextResponse.json(
      { error: AUTH_ERRORS.LOGIN_ERROR },
      { status: 500 }
    );
  }
}
