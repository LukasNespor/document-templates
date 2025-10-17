import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AUTH_ERRORS, logAuthError } from "@/lib/auth-errors";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (user) {
      return NextResponse.json({
        isLoggedIn: true,
        user,
      });
    }

    return NextResponse.json({
      isLoggedIn: false,
      user: null,
    });
  } catch (error) {
    logAuthError("Session check endpoint", error);
    return NextResponse.json(
      { error: AUTH_ERRORS.SESSION_ERROR },
      { status: 500 }
    );
  }
}
