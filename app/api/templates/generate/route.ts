import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/lib/azure-table";
import { downloadBlob } from "@/lib/azure-blob";
import { generateDocument } from "@/lib/docx-processor";
import { incrementFilesGenerated } from "@/lib/azure-statistics";
import { getCurrentUser } from "@/lib/auth";
import { normalizeFilename } from "@/lib/filename-utils";
import { FieldValue } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Neautorizováno" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId, fields, fileName } = body as {
      templateId: string;
      fields: FieldValue[];
      fileName?: string;
    };

    if (!templateId || !fields) {
      return NextResponse.json(
        { error: "ID šablony a pole jsou povinné" },
        { status: 400 }
      );
    }

    // Get template metadata
    const template = await getTemplate(currentUser.userId, templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    // Extract filename from blob URL
    const blobFileName = `${templateId}.docx`;

    // Download template from Azure Blob Storage
    const templateBuffer = await downloadBlob(blobFileName);

    // Generate document with fields
    const generatedBuffer = generateDocument(templateBuffer, fields);

    // Update statistics (don't await to avoid blocking the response)
    incrementFilesGenerated(currentUser.userId, 1, template.fields.length).catch((error) =>
      console.error("Failed to update statistics:", error)
    );

    // Use provided fileName or fallback to template name with normalization
    const downloadFileName = fileName
      ? `${normalizeFilename(fileName)}.docx`
      : `${normalizeFilename(template.name)}_generated.docx`;

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
      { error: "Generování dokumentu selhalo" },
      { status: 500 }
    );
  }
}
