import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/azure-users";
import { verifyPassword, getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Uživatelské jméno a heslo jsou povinné" },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Neplatné uživatelské jméno nebo heslo" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Neplatné uživatelské jméno nebo heslo" },
        { status: 401 }
      );
    }

    // Create session
    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.salutation = user.salutation;
    session.isAdmin = user.isAdmin;
    session.isLoggedIn = true;
    await session.save();

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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Při přihlašování došlo k chybě" },
      { status: 500 }
    );
  }
}
