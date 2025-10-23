import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSession } from "@/lib/auth";
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
    const { username, salutation, isAdmin, canBulkGenerate } = body;

    // Check if user exists
    const userToUpdate = await getUserById(id);
    if (!userToUpdate) {
      return NextResponse.json(
        { error: "Uživatel nebyl nalezen" },
        { status: 404 }
      );
    }

    // If updating own profile and no username provided, skip username validation
    const isEditingSelf = currentUser.userId === id;
    const shouldUpdateUsername = username !== undefined;

    let trimmedUsername = userToUpdate.username; // Keep existing username by default

    // Only validate and update username if it's provided
    if (shouldUpdateUsername) {
      const validation = validateUsername(username);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      trimmedUsername = username.trim();

      // Check if username is already taken by another user
      const allUsers = await getAllUsers();
      const usernameExists = allUsers.some(
        u => u.username === trimmedUsername && u.id !== id
      );
      if (usernameExists) {
        return NextResponse.json(
          { error: "Uživatelské jméno je již používáno" },
          { status: 409 }
        );
      }
    }

    // Prevent removing admin status from yourself
    if (currentUser.userId === id && userToUpdate.isAdmin && !isAdmin) {
      return NextResponse.json(
        { error: "Nemůžete odebrat administrátorská práva sami sobě" },
        { status: 400 }
      );
    }

    // Build update payload - only include fields that should be updated
    const updatePayload: {
      username?: string;
      salutation?: string;
      isAdmin?: boolean;
      canBulkGenerate?: boolean;
    } = {};

    // Only update username if provided
    if (shouldUpdateUsername) {
      updatePayload.username = trimmedUsername;
    }

    // Only update salutation if provided (can be undefined to clear it)
    if (salutation !== undefined) {
      updatePayload.salutation = salutation || undefined;
    }

    // Always update permissions if provided
    if (isAdmin !== undefined) {
      updatePayload.isAdmin = isAdmin || false;
    }
    if (canBulkGenerate !== undefined) {
      updatePayload.canBulkGenerate = canBulkGenerate || false;
    }

    // Update user
    const updatedUser = await updateUser(id, updatePayload);

    // If user updated their own profile, update the session
    if (currentUser.userId === id) {
      const session = await getSession();
      session.username = updatedUser.username;
      session.salutation = updatedUser.salutation;
      session.isAdmin = updatedUser.isAdmin;
      session.canBulkGenerate = updatedUser.canBulkGenerate;
      await session.save();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        createdAt: updatedUser.createdAt,
        salutation: updatedUser.salutation,
        isAdmin: updatedUser.isAdmin,
        canBulkGenerate: updatedUser.canBulkGenerate,
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
