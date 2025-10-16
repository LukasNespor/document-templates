import { NextResponse } from "next/server";
import { hasAnyUser, saveUser } from "@/lib/azure-users";
import { hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    // Check if setup is still needed
    let hasUser = false;
    try {
      hasUser = await hasAnyUser();
    } catch (error: any) {
      // If table doesn't exist, that's fine - setup is needed
      if (error?.statusCode !== 404 && !error?.message?.includes("TableNotFound")) {
        throw error;
      }
    }

    if (hasUser) {
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 403 }
      );
    }

    // Get username and password from request
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Create first user
    const passwordHash = await hashPassword(password);
    const user = {
      id: uuidv4(),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      isAdmin: true, // First user is always admin
    };

    await saveUser(user);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during initial setup:", error);
    return NextResponse.json(
      { error: "Failed to complete setup" },
      { status: 500 }
    );
  }
}
