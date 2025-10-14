import { NextResponse } from "next/server";
import { getTemplatesByUser } from "@/lib/azure-table";
import { getStatistics } from "@/lib/azure-statistics";
import { getCurrentUser } from "@/lib/auth";
import { Statistics } from "@/types";

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

    // Get current template count for this user
    const templates = await getTemplatesByUser(currentUser.userId);
    const currentTemplateCount = templates.length;

    // Get user-specific statistics
    const stats = await getStatistics(currentUser.userId);

    // Calculate saved time
    // Overhead per file: 30 seconds (copy, rename, open, save)
    // Time per field: 20 seconds (finding and updating)
    const savedTimeSeconds =
      stats.totalFilesGenerated * 30 + stats.totalFieldsFilled * 20;

    const response: Statistics = {
      currentTemplateCount,
      totalTemplatesCreated: stats.totalTemplatesCreated,
      totalFilesGenerated: stats.totalFilesGenerated,
      totalFieldsFilled: stats.totalFieldsFilled,
      lastGenerationDate: stats.lastGenerationDate,
      savedTimeSeconds,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Get statistics error:", error);
    return NextResponse.json(
      { error: "Načtení statistik selhalo" },
      { status: 500 }
    );
  }
}
