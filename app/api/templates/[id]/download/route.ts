import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/lib/azure-table";
import { downloadBlob } from "@/lib/azure-blob";
import { getCurrentUser } from "@/lib/auth";
import { normalizeFilename } from "@/lib/filename-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Neautorizováno" },
        { status: 401 }
      );
    }

    // Get template metadata
    const template = await getTemplate(currentUser.userId, id);
    if (!template) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    // Extract filename from template ID
    const blobFileName = `${id}.docx`;

    // Download template from Azure Blob Storage
    const templateBuffer = await downloadBlob(blobFileName);

    // Use template name for the download filename with normalized characters
    const downloadFileName = `${normalizeFilename(template.name)}.docx`;

    // Return the original document as a download
    return new NextResponse(new Uint8Array(templateBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
      },
    });
  } catch (error) {
    console.error("Download template error:", error);
    return NextResponse.json(
      { error: "Stažení šablony selhalo" },
      { status: 500 }
    );
  }
}
