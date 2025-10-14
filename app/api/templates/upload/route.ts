import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { uploadBlob } from "@/lib/azure-blob";
import { saveTemplate } from "@/lib/azure-table";
import { extractMergeFields } from "@/lib/docx-processor";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const note = formData.get("note") as string;
    const group = formData.get("group") as string;
    const file = formData.get("file") as File;

    if (!name || !file) {
      return NextResponse.json(
        { error: "Name and file are required" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (group && group.length > 50) {
      return NextResponse.json(
        { error: "Group must be 50 characters or less" },
        { status: 400 }
      );
    }

    if (note && note.length > 500) {
      return NextResponse.json(
        { error: "Note must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract merge fields
    let mergeFields: string[];
    try {
      mergeFields = extractMergeFields(buffer);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to parse Word document. Please ensure it is a valid .docx file" },
        { status: 400 }
      );
    }

    // Generate unique ID and filename
    const id = uuidv4();
    const fileName = `${id}.docx`;

    // Upload to Azure Blob Storage
    const blobUrl = await uploadBlob(fileName, buffer);

    // Save metadata to Azure Table Storage
    const template = {
      id,
      name,
      note: note || "",
      group: group || "Uncategorized",
      blobUrl,
      mergeFields,
      createdAt: new Date().toISOString(),
    };

    await saveTemplate(template);

    return NextResponse.json(
      { message: "Template uploaded successfully", template },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload template" },
      { status: 500 }
    );
  }
}
