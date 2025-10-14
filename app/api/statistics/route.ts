import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/azure-table";
import { getStatistics } from "@/lib/azure-statistics";
import { Statistics } from "@/types";

export async function GET() {
  try {
    // Get current template count
    const templates = await getAllTemplates();
    const currentTemplateCount = templates.length;

    // Get cumulative statistics
    const stats = await getStatistics();

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
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
