import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { startGeneration } from "@/lib/generation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
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

    // Check if already generating
    if (site.status === "GENERATING" || site.status === "DEPLOYING") {
      return NextResponse.json(
        { error: "Une opération est déjà en cours" },
        { status: 409 }
      );
    }

    const clientInfo = site.clientInfo as Record<string, unknown>;

    const jobId = await startGeneration({
      siteId: site.id,
      siteName: site.name,
      sourceUrl: site.sourceUrl || undefined,
      clientInfo,
      creative: clientInfo.generationMode === "creative",
    });

    return NextResponse.json({ jobId, status: "GENERATING" });
  } catch (error) {
    console.error("Error starting generation:", error);
    return NextResponse.json(
      { error: "Erreur lors du démarrage de la génération" },
      { status: 500 }
    );
  }
}
