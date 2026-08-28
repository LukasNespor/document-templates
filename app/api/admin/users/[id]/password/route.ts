import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getUserById, updateUser } from "@/lib/azure-users";
import { validatePassword } from "@/lib/validation";
import { AUTH_ERRORS, logAuthError } from "@/lib/auth-errors";
import {
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
  RateLimitKey,
} from "@/lib/rate-limit";

// PUT /api/admin/users/[id]/password - Change user password
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Resolving the current user only reads the session cookie, no storage call
    const currentUser = await getCurrentUser();
    const clientIp = getClientIp(request);
    const rateLimitKeys: RateLimitKey[] = [
      { scope: "ip", value: clientIp },
      { scope: "user", value: currentUser?.userId || "anonymous" },
    ];

    // Check the lockout before any storage access
    if (await isRateLimited(rateLimitKeys)) {
      return NextResponse.json(
        { error: AUTH_ERRORS.TOO_MANY_ATTEMPTS },
        { status: 429 }
      );
    }

    if (!currentUser || !currentUser.isAdmin) {
      await recordFailedAttempt(rateLimitKeys);
      return NextResponse.json(
        { error: "Přístup odepřen. Pouze administrátoři mohou měnit hesla." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    // Validate password using centralized validation
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      await recordFailedAttempt(rateLimitKeys);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToUpdate = await getUserById(id);
    if (!userToUpdate) {
      await recordFailedAttempt(rateLimitKeys);
      return NextResponse.json(
        { error: "Uživatel nebyl nalezen" },
        { status: 404 }
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    await updateUser(id, { passwordHash });

    await resetAttempts(rateLimitKeys);

    return NextResponse.json({
      success: true,
      message: "Heslo bylo úspěšně změněno",
    });
  } catch (error) {
    logAuthError("Admin change password endpoint", error);
    return NextResponse.json(
      { error: "Při změně hesla došlo k chybě" },
      { status: 500 }
    );
  }
}
