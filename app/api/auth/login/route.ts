import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/azure-users";
import { verifyPassword, getSession } from "@/lib/auth";
import { validateCredentials } from "@/lib/validation";
import {
  AUTH_ERRORS,
  AuthErrorType,
  createAuthErrorResponse,
  logAuthError,
  logAuthAttempt,
} from "@/lib/auth-errors";

export async function POST(request: NextRequest) {
  let username = "";

  try {
    const body = await request.json();
    username = body.username || "";
    const password = body.password || "";

    // Validate input format
    const validation = validateCredentials(username, password);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || AUTH_ERRORS.INVALID_CREDENTIALS },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await getUserByUsername(username.trim());
    if (!user) {
      const errorMessage = createAuthErrorResponse(
        AuthErrorType.USER_NOT_FOUND,
        username
      );
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
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
    session.isLoggedIn = true;
    await session.save();

    // Log successful authentication
    logAuthAttempt(username, true);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        salutation: user.salutation,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logAuthError("Login endpoint", error, { username });
    return NextResponse.json(
      { error: AUTH_ERRORS.LOGIN_ERROR },
      { status: 500 }
    );
  }
}
