import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { startDeployment } from "@/lib/dokploy";

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

    // Check if already deploying
    if (site.status === "GENERATING" || site.status === "DEPLOYING") {
      return NextResponse.json(
        { error: "Une opération est déjà en cours" },
        { status: 409 }
      );
    }

    // Check if generated
    if (site.status === "DRAFT") {
      return NextResponse.json(
        { error: "Le site doit d'abord être généré" },
        { status: 400 }
      );
    }

    const jobId = await startDeployment(site.id, site.name);

    return NextResponse.json({ jobId, status: "DEPLOYING" });
  } catch (error) {
    console.error("Error starting deployment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors du démarrage du déploiement" },
      { status: 500 }
    );
  }
}
