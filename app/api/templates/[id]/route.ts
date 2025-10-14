import { NextRequest, NextResponse } from "next/server";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/azure-table";
import { deleteBlob } from "@/lib/azure-blob";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, note, group } = body;

    if (!name && !note && !group) {
      return NextResponse.json(
        { error: "At least one field (name, note, or group) is required" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name !== undefined && name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (group !== undefined && group.length > 50) {
      return NextResponse.json(
        { error: "Group must be 50 characters or less" },
        { status: 400 }
      );
    }

    if (note !== undefined && note.length > 500) {
      return NextResponse.json(
        { error: "Note must be 500 characters or less" },
        { status: 400 }
      );
    }

    const updates: { name?: string; note?: string; group?: string } = {};
    if (name !== undefined) updates.name = name;
    if (note !== undefined) updates.note = note;
    if (group !== undefined) updates.group = group;

    await updateTemplate(id, updates);

    return NextResponse.json(
      { message: "Template updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get template to find blob filename
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Extract filename from blob URL
    const blobFileName = `${id}.docx`;

    // Delete from both blob storage and table storage
    await Promise.all([
      deleteBlob(blobFileName),
      deleteTemplate(id)
    ]);

    return NextResponse.json(
      { message: "Template deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
