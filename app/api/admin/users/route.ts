import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllUsers, saveUser } from "@/lib/azure-users";
import { hashPassword } from "@/lib/auth";
import { validateCredentials } from "@/lib/validation";
import { AUTH_ERRORS, logAuthError } from "@/lib/auth-errors";
import { v4 as uuidv4 } from "uuid";

// GET /api/admin/users - List all users
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Přístup odepřen. Pouze administrátoři mohou zobrazit seznam uživatelů." },
        { status: 403 }
      );
    }

    const users = await getAllUsers();

    // Remove password hashes from response
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      salutation: user.salutation,
      isAdmin: user.isAdmin,
      canBulkGenerate: user.canBulkGenerate,
    }));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    logAuthError("Admin list users endpoint", error);
    return NextResponse.json(
      { error: "Při načítání uživatelů došlo k chybě" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Přístup odepřen. Pouze administrátoři mohou vytvářet uživatele." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, salutation, isAdmin, canBulkGenerate } = body;

    // Validate input using centralized validation
    const validation = validateCredentials(username, password);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await getAllUsers();
    const trimmedUsername = username.trim();
    if (existingUsers.some(u => u.username === trimmedUsername)) {
      return NextResponse.json(
        { error: "Uživatel s tímto jménem již existuje" },
        { status: 409 }
      );
    }

    // Create new user
    const passwordHash = await hashPassword(password);
    const newUser = {
      id: uuidv4(),
      username: trimmedUsername,
      passwordHash,
      createdAt: new Date().toISOString(),
      salutation: salutation || undefined,
      isAdmin: isAdmin || false,
      canBulkGenerate: canBulkGenerate || false,
    };

    await saveUser(newUser);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        createdAt: newUser.createdAt,
        salutation: newUser.salutation,
        isAdmin: newUser.isAdmin,
        canBulkGenerate: newUser.canBulkGenerate,
      },
    });
  } catch (error) {
    logAuthError("Admin create user endpoint", error);
    return NextResponse.json(
      { error: "Při vytváření uživatele došlo k chybě" },
      { status: 500 }
    );
  }
}
