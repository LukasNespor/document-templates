import { NextRequest, NextResponse } from "next/server";
import { getTemplate } from "@/lib/azure-table";
import { downloadBlob } from "@/lib/azure-blob";
import { generateDocument } from "@/lib/docx-processor";
import { parseCsvFile, handleDuplicateFilenames } from "@/lib/csv-processor";
import { createZipFile, DocumentFile } from "@/lib/zip-generator";
import { incrementFilesGenerated } from "@/lib/azure-statistics";
import { getCurrentUser } from "@/lib/auth";
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

    const formData = await request.formData();
    const templateId = formData.get("templateId") as string;
    const csvFile = formData.get("csvFile") as File;

    // Validate inputs
    if (!templateId || !csvFile) {
      return NextResponse.json(
        { error: "ID šablony a CSV soubor jsou povinné" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!csvFile.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Soubor musí být CSV soubor" },
        { status: 400 }
      );
    }

    // Get template metadata
    const template = await getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    // Read CSV file content
    const csvContent = await csvFile.text();

    // Parse and validate CSV
    const validationResult = parseCsvFile(csvContent, template.fields);

    if (!validationResult.isValid || !validationResult.data) {
      return NextResponse.json(
        {
          error: "Validace CSV selhala",
          details: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Download template from Azure Blob Storage (once for all documents)
    const blobFileName = `${templateId}.docx`;
    const templateBuffer = await downloadBlob(blobFileName);

    // Handle duplicate filenames
    const rowsWithUniqueFilenames = handleDuplicateFilenames(
      validationResult.data.rows
    );

    // Generate documents for each row
    const documents: DocumentFile[] = [];
    const generationErrors: string[] = [];

    for (let i = 0; i < rowsWithUniqueFilenames.length; i++) {
      const row = rowsWithUniqueFilenames[i];

      try {
        // Convert row fields to FieldValue array
        const fields: FieldValue[] = Object.entries(row.fields).map(
          ([field, value]) => ({
            field,
            value,
          })
        );

        // Generate document
        const generatedBuffer = generateDocument(templateBuffer, fields);

        documents.push({
          filename: row.filename,
          buffer: generatedBuffer,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Neznámá chyba";
        generationErrors.push(
          `Nepodařilo se vygenerovat dokument pro "${row.filename}": ${errorMessage}`
        );
        console.error(`Error generating document for row ${i + 1}:`, error);
      }
    }

    // Check if we generated any documents
    if (documents.length === 0) {
      return NextResponse.json(
        {
          error: "Nepodařilo se vygenerovat žádný dokument",
          details: generationErrors,
        },
        { status: 500 }
      );
    }

    // Create ZIP file with all documents
    const zipBuffer = await createZipFile(documents);

    // Update statistics (don't await to avoid blocking the response)
    incrementFilesGenerated(currentUser.userId, documents.length, template.fields.length).catch(
      (error) => console.error("Failed to update statistics:", error)
    );

    // Prepare response
    const timestamp = new Date().toISOString().split("T")[0];
    const zipFilename = `${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_bulk_${timestamp}.zip`;

    // Return warnings if any documents failed
    const responseHeaders: HeadersInit = {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    };

    if (generationErrors.length > 0) {
      responseHeaders["X-Generation-Warnings"] = JSON.stringify({
        totalRows: rowsWithUniqueFilenames.length,
        successfulDocuments: documents.length,
        failedDocuments: generationErrors.length,
        errors: generationErrors,
      });
    }

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Bulk generate error:", error);
    return NextResponse.json(
      {
        error: "Generování dokumentů selhalo",
        details: error instanceof Error ? error.message : "Neznámá chyba",
      },
      { status: 500 }
    );
  }
}
