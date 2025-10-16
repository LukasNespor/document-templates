import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUser, getUserById, updateUser, getAllUsers } from "@/lib/azure-users";

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

    // Validate input
    if (!username) {
      return NextResponse.json(
        { error: "Uživatelské jméno je povinné" },
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
    const usernameExists = allUsers.some(
      u => u.username === username && u.id !== id
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
      username,
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
    console.error("Error updating user:", error);
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
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Při mazání uživatele došlo k chybě" },
      { status: 500 }
    );
  }
}
