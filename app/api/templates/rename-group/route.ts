import { NextRequest, NextResponse } from "next/server";
import { getTemplatesByUser, updateTemplate } from "@/lib/azure-table";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const body = await request.json();
    const { oldGroup, newGroup } = body;

    if (!oldGroup || !newGroup) {
      return NextResponse.json(
        { error: "Původní a nový název skupiny jsou povinné" },
        { status: 400 }
      );
    }

    if (newGroup.length > 50) {
      return NextResponse.json(
        { error: "Skupina musí mít nejvýše 50 znaků" },
        { status: 400 }
      );
    }

    if (oldGroup === newGroup) {
      return NextResponse.json({ message: "Skupina přejmenována", count: 0 }, { status: 200 });
    }

    const allTemplates = await getTemplatesByUser(currentUser.userId);
    const templatesInGroup = allTemplates.filter((t) => t.group === oldGroup);

    await Promise.all(
      templatesInGroup.map((t) =>
        updateTemplate(currentUser.userId, t.id, { group: newGroup })
      )
    );

    return NextResponse.json(
      { message: "Skupina úspěšně přejmenována", count: templatesInGroup.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("Rename group error:", error);
    return NextResponse.json(
      { error: "Přejmenování skupiny selhalo" },
      { status: 500 }
    );
  }
}
