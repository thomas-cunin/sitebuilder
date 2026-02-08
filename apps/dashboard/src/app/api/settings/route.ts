import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword, getOrCreateSettings } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await getOrCreateSettings();

    // Don't return sensitive data
    return NextResponse.json({
      dokployUrl: settings.dokployUrl || "",
      dokployToken: settings.dokployToken ? "••••••••" : "",
      claudeApiKey: settings.claudeApiKey ? "••••••••" : "",
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dokployUrl, dokployToken, claudeApiKey, adminPassword } = body;

    const updateData: Record<string, unknown> = {};

    if (dokployUrl !== undefined) {
      updateData.dokployUrl = dokployUrl || null;
    }

    if (dokployToken && dokployToken !== "••••••••") {
      updateData.dokployToken = dokployToken;
    }

    if (claudeApiKey && claudeApiKey !== "••••••••") {
      updateData.claudeApiKey = claudeApiKey;
    }

    if (adminPassword) {
      updateData.adminPassword = await hashPassword(adminPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: "Aucune modification" });
    }

    await prisma.settings.update({
      where: { id: "global" },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres" },
      { status: 500 }
    );
  }
}
