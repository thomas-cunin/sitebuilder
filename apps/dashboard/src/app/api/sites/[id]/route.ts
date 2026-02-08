import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteDeployment } from "@/lib/dokploy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!site) {
      return NextResponse.json(
        { error: "Site non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error fetching site:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du site" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const site = await prisma.site.update({
      where: { id },
      data: {
        displayName: body.displayName,
        sourceUrl: body.sourceUrl,
        clientInfo: body.clientInfo,
      },
    });

    return NextResponse.json(site);
  } catch (error) {
    console.error("Error updating site:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du site" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return NextResponse.json(
        { error: "Site non trouvé" },
        { status: 404 }
      );
    }

    // Delete from Dokploy if deployed
    if (site.dokployProjectId) {
      try {
        await deleteDeployment(site.dokployProjectId);
      } catch (e) {
        console.error("Failed to delete from Dokploy:", e);
      }
    }

    // Delete from database
    await prisma.site.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting site:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du site" },
      { status: 500 }
    );
  }
}
