import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/lib/azure-table";
import { downloadBlob } from "@/lib/azure-blob";
import { generateDocument } from "@/lib/docx-processor";
import { MergeFieldValue } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, mergeFields } = body as {
      templateId: string;
      mergeFields: MergeFieldValue[];
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
    const fileName = `${templateId}.docx`;

    // Download template from Azure Blob Storage
    const templateBuffer = await downloadBlob(fileName);

    // Generate document with merge fields
    const generatedBuffer = generateDocument(templateBuffer, mergeFields);

    // Return the generated document as a download
    return new NextResponse(new Uint8Array(generatedBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_generated.docx"`,
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
