import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { AUTH_ERRORS, logAuthError } from "@/lib/auth-errors";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    logAuthError("Logout endpoint", error);
    return NextResponse.json(
      { error: AUTH_ERRORS.LOGOUT_ERROR },
      { status: 500 }
    );
  }
}
