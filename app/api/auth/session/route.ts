import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (user) {
      return NextResponse.json({
        isLoggedIn: true,
        user,
      });
    }

    return NextResponse.json({
      isLoggedIn: false,
      user: null,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Při kontrole relace došlo k chybě" },
      { status: 500 }
    );
  }
}
