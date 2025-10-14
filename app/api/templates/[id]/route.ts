import { NextRequest, NextResponse } from "next/server";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/azure-table";
import { deleteBlob } from "@/lib/azure-blob";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Načtení šablony selhalo" },
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

    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Neautorizováno" },
        { status: 401 }
      );
    }

    // Get template to check ownership
    const template = await getTemplate(id);
    if (!template) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    // Check if user owns this template
    if (template.uploadedBy !== currentUser.userId) {
      return NextResponse.json(
        { error: "Nemáte oprávnění upravit tuto šablonu" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { name, note, group } = body;

    if (!name && !note && !group) {
      return NextResponse.json(
        { error: "Alespoň jedno pole (název, poznámka nebo skupina) je povinné" },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name !== undefined && name.length > 100) {
      return NextResponse.json(
        { error: "Název musí mít nejvýše 100 znaků" },
        { status: 400 }
      );
    }

    if (group !== undefined && group.length > 50) {
      return NextResponse.json(
        { error: "Skupina musí mít nejvýše 50 znaků" },
        { status: 400 }
      );
    }

    if (note !== undefined && note.length > 500) {
      return NextResponse.json(
        { error: "Poznámka musí mít nejvýše 500 znaků" },
        { status: 400 }
      );
    }

    const updates: { name?: string; note?: string; group?: string } = {};
    if (name !== undefined) updates.name = name;
    if (note !== undefined) updates.note = note;
    if (group !== undefined) updates.group = group;

    await updateTemplate(id, updates);

    return NextResponse.json(
      { message: "Šablona úspěšně aktualizována" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Aktualizace šablony selhala" },
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

    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Neautorizováno" },
        { status: 401 }
      );
    }

    // Get template to find blob filename and check ownership
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: "Šablona nenalezena" },
        { status: 404 }
      );
    }

    // Check if user owns this template
    if (template.uploadedBy !== currentUser.userId) {
      return NextResponse.json(
        { error: "Nemáte oprávnění smazat tuto šablonu" },
        { status: 403 }
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
      { message: "Šablona úspěšně smazána" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Smazání šablony selhalo" },
      { status: 500 }
    );
  }
}
