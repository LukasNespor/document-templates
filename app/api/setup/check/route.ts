import { NextResponse } from "next/server";
import { hasAnyUser } from "@/lib/azure-users";

export async function GET() {
  try {
    const hasUser = await hasAnyUser();
    const setupNeeded = !hasUser;

    return NextResponse.json({ setupNeeded });
  } catch (error: any) {
    // If the table doesn't exist, setup is needed
    if (error?.statusCode === 404 || error?.message?.includes("TableNotFound")) {
      return NextResponse.json({ setupNeeded: true });
    }

    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}
