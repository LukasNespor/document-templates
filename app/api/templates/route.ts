import { NextResponse } from "next/server";
import { getTemplatesByUser } from "@/lib/azure-table";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Neautorizováno" },
        { status: 401 }
      );
    }

    // Get only templates uploaded by current user
    const templates = await getTemplatesByUser(currentUser.userId);

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Načtení šablon selhalo" },
      { status: 500 }
    );
  }
}
