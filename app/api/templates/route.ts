import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/azure-table";

export async function GET() {
  try {
    const templates = await getAllTemplates();

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
