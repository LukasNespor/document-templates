import { NextRequest, NextResponse } from "next/server";
import { getTemplate, updateTemplate } from "@/lib/azure-table";
import { uploadBlob } from "@/lib/azure-blob";
import { extractMergeFields } from "@/lib/docx-processor";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
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

    // Check if template exists
    const existingTemplate = await getTemplate(id);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    // Check if user owns this template
    if (existingTemplate.uploadedBy !== currentUser.userId) {
      return NextResponse.json(
        { error: "Nemáte oprávnění znovu nahrát tuto šablonu" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Soubor je povinný" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract fields from new template
    let fields: string[];
    try {
      fields = extractMergeFields(buffer);
    } catch (error) {
      return NextResponse.json(
        { error: "Nepodařilo se zpracovat Word dokument. Ujistěte se, že se jedná o platný soubor .docx" },
        { status: 400 }
      );
    }

    // Upload to Azure Blob Storage (this will overwrite the existing file)
    const fileName = `${id}.docx`;
    const blobUrl = await uploadBlob(fileName, buffer);

    // Update template metadata with new fields
    await updateTemplate(id, {
      fields,
      blobUrl,
    });

    return NextResponse.json(
      { message: "Šablona úspěšně nahrána znovu", fields },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reupload error:", error);
    return NextResponse.json(
      { error: "Opětovné nahrání šablony selhalo" },
      { status: 500 }
    );
  }
}
