import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/lib/azure-table";
import { downloadBlob } from "@/lib/azure-blob";
import { generateDocument } from "@/lib/docx-processor";
import { MergeFieldValue } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, mergeFields, fileName } = body as {
      templateId: string;
      mergeFields: MergeFieldValue[];
      fileName?: string;
    };

    if (!templateId || !mergeFields) {
      return NextResponse.json(
        { error: "Template ID and merge fields are required" },
        { status: 400 }
      );
    }

    // Get template metadata
    const template = await getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Extract filename from blob URL
    const blobFileName = `${templateId}.docx`;

    // Download template from Azure Blob Storage
    const templateBuffer = await downloadBlob(blobFileName);

    // Generate document with merge fields
    const generatedBuffer = generateDocument(templateBuffer, mergeFields);

    // Use provided fileName or fallback to template name
    const downloadFileName = fileName
      ? `${fileName}.docx`
      : `${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_generated.docx`;

    // Return the generated document as a download
    return new NextResponse(new Uint8Array(generatedBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
      },
    });
  } catch (error) {
    console.error("Generate document error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
