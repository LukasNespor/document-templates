import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUser, getUserById, updateUser, getAllUsers } from "@/lib/azure-users";
import { validateUsername } from "@/lib/validation";
import { logAuthError } from "@/lib/auth-errors";

// PUT /api/admin/users/[id] - Update user details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Přístup odepřen. Pouze administrátoři mohou upravovat uživatele." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { username, salutation, isAdmin } = body;

    // Validate username using centralized validation
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToUpdate = await getUserById(id);
    if (!userToUpdate) {
      return NextResponse.json(
        { error: "Uživatel nebyl nalezen" },
        { status: 404 }
      );
    }

    // Check if username is already taken by another user
    const allUsers = await getAllUsers();
    const trimmedUsername = username.trim();
    const usernameExists = allUsers.some(
      u => u.username === trimmedUsername && u.id !== id
    );
    if (usernameExists) {
      return NextResponse.json(
        { error: "Uživatelské jméno je již používáno" },
        { status: 409 }
      );
    }

    // Prevent removing admin status from yourself
    if (currentUser.userId === id && userToUpdate.isAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "Nemůžete odebrat administrátorská práva sami sobě" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await updateUser(id, {
      username: trimmedUsername,
      salutation: salutation || undefined,
      isAdmin: isAdmin || false,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        createdAt: updatedUser.createdAt,
        salutation: updatedUser.salutation,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } catch (error) {
    logAuthError("Admin update user endpoint", error);
    return NextResponse.json(
      { error: "Při aktualizaci uživatele došlo k chybě" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Přístup odepřen. Pouze administrátoři mohou mazat uživatele." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (currentUser.userId === id) {
      return NextResponse.json(
        { error: "Nemůžete smazat svůj vlastní účet" },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToDelete = await getUserById(id);
    if (!userToDelete) {
      return NextResponse.json(
        { error: "Uživatel nebyl nalezen" },
        { status: 404 }
      );
    }

    await deleteUser(id);

    return NextResponse.json({
      success: true,
      message: "Uživatel byl úspěšně smazán",
    });
  } catch (error) {
    logAuthError("Admin delete user endpoint", error);
    return NextResponse.json(
      { error: "Při mazání uživatele došlo k chybě" },
      { status: 500 }
    );
  }
}
