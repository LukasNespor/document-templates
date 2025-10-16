import { NextRequest, NextResponse } from "next/server";
import { getUserById, getUserByUsername, updateUser } from "@/lib/azure-users";
import { verifyPassword, hashPassword, getSession, isAuthenticated } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: "Nepřihlášený uživatel" },
        { status: 401 }
      );
    }

    const session = await getSession();
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Relace nenalezena" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newSalutation, newUsername, newPassword } = body;

    // Validate current password is provided
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Aktuální heslo je povinné" },
        { status: 400 }
      );
    }

    // At least one field must be changed
    if (!newSalutation && !newUsername && !newPassword) {
      return NextResponse.json(
        { error: "Musíte změnit alespoň jedno pole" },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Uživatel nenalezen" },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, currentUser.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Nesprávné aktuální heslo" },
        { status: 401 }
      );
    }

    // Prepare updates
    const updates: { salutation?: string; username?: string; passwordHash?: string } = {};

    // Update salutation if provided
    if (newSalutation !== undefined) {
      updates.salutation = newSalutation;
    }

    // Validate and check new username
    if (newUsername && newUsername !== currentUser.username) {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9._-]+$/;
      if (!usernameRegex.test(newUsername)) {
        return NextResponse.json(
          { error: "Uživatelské jméno může obsahovat pouze písmena, čísla, tečku, podtržítko a pomlčku" },
          { status: 400 }
        );
      }

      // Check if new username is already taken
      const existingUser = await getUserByUsername(newUsername);
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { error: "Uživatelské jméno je již obsazeno" },
          { status: 409 }
        );
      }
      updates.username = newUsername;
    }

    // Hash new password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Heslo musí mít alespoň 6 znaků" },
          { status: 400 }
        );
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    // Update user in database
    const updatedUser = await updateUser(userId, updates);

    // Update session if username or salutation changed
    if (updates.username || updates.salutation !== undefined) {
      if (updates.username) {
        session.username = updatedUser.username;
      }
      if (updates.salutation !== undefined) {
        session.salutation = updatedUser.salutation;
      }
      await session.save();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        salutation: updatedUser.salutation,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Při aktualizaci profilu došlo k chybě" },
      { status: 500 }
    );
  }
}
