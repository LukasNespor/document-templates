import { NextRequest, NextResponse } from "next/server";
import { getTemplate, updateTemplate } from "@/lib/azure-table";
import { uploadBlob } from "@/lib/azure-blob";
import { extractMergeFields } from "@/lib/docx-processor";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if template exists
    const existingTemplate = await getTemplate(id);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract merge fields from new template
    let mergeFields: string[];
    try {
      mergeFields = extractMergeFields(buffer);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to parse Word document. Please ensure it is a valid .docx file" },
        { status: 400 }
      );
    }

    // Upload to Azure Blob Storage (this will overwrite the existing file)
    const fileName = `${id}.docx`;
    const blobUrl = await uploadBlob(fileName, buffer);

    // Update template metadata with new merge fields
    await updateTemplate(id, {
      mergeFields,
      blobUrl,
    });

    return NextResponse.json(
      { message: "Template reuploaded successfully", mergeFields },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reupload error:", error);
    return NextResponse.json(
      { error: "Failed to reupload template" },
      { status: 500 }
    );
  }
}
