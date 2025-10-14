import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { uploadBlob } from "@/lib/azure-blob";
import { saveTemplate } from "@/lib/azure-table";
import { extractMergeFields } from "@/lib/docx-processor";
import { incrementTemplatesCreated } from "@/lib/azure-statistics";
import { getCurrentUser } from "@/lib/auth";

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

    const name = formData.get("name") as string;
    const note = formData.get("note") as string;
    const group = formData.get("group") as string;
    const file = formData.get("file") as File;

    if (!name || !file) {
      return NextResponse.json(
        { error: "Název a soubor jsou povinné" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Název musí mít nejvýše 100 znaků" },
        { status: 400 }
      );
    }

    if (group && group.length > 50) {
      return NextResponse.json(
        { error: "Skupina musí mít nejvýše 50 znaků" },
        { status: 400 }
      );
    }

    if (note && note.length > 500) {
      return NextResponse.json(
        { error: "Poznámka musí mít nejvýše 500 znaků" },
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
        { error: "Nepodařilo se zpracovat Word dokument. Ujistěte se, že se jedná o platný soubor .docx" },
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
      uploadedBy: currentUser.userId,
    };

    await saveTemplate(template);

    // Update statistics (don't await to avoid blocking the response)
    incrementTemplatesCreated(currentUser.userId).catch((error) =>
      console.error("Failed to update statistics:", error)
    );

    return NextResponse.json(
      { message: "Šablona úspěšně nahrána", template },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Nahrání šablony selhalo" },
      { status: 500 }
    );
  }
}
