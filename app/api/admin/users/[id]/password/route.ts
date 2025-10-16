import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getUserById, updateUser } from "@/lib/azure-users";

// PUT /api/admin/users/[id]/password - Change user password
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Přístup odepřen. Pouze administrátoři mohou měnit hesla." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    // Validate input
    if (!newPassword) {
      return NextResponse.json(
        { error: "Nové heslo je povinné" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Heslo musí mít alespoň 6 znaků" },
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

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    await updateUser(id, { passwordHash });

    return NextResponse.json({
      success: true,
      message: "Heslo bylo úspěšně změněno",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Při změně hesla došlo k chybě" },
      { status: 500 }
    );
  }
}
