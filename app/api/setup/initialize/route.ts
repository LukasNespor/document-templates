import { NextResponse } from "next/server";
import { hasAnyUser, saveUser } from "@/lib/azure-users";
import { hashPassword } from "@/lib/auth";
import { validateCredentials } from "@/lib/validation";
import { AUTH_ERRORS, logAuthError } from "@/lib/auth-errors";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { error: AUTH_ERRORS.SETUP_ALREADY_COMPLETED },
        { status: 403 }
      );
    }

    // Get username and password from request
    const body = await request.json();
    const { username, password } = body;

    // Validate input using centralized validation
    const validation = validateCredentials(username, password);
    if (!validation.isValid) {
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
      isAdmin: true, // First user is always admin
    };

    await saveUser(user);

    return NextResponse.json({ success: true });
  } catch (error) {
    logAuthError("Setup initialization endpoint", error);
    return NextResponse.json(
      { error: AUTH_ERRORS.SETUP_FAILED },
      { status: 500 }
    );
  }
}
