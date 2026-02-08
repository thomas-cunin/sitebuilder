import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const sites = await prisma.site.findMany({
      where: {
        ...(status && status !== "all" ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { displayName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        jobs: {
          where: { status: { in: ["RUNNING", "PENDING"] } },
          take: 1,
        },
      },
    });

    return NextResponse.json(sites);
  } catch (error) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des sites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, displayName, sourceUrl, clientInfo } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Nom et displayName requis" },
        { status: 400 }
      );
    }

    // Check if site already exists
    const existing = await prisma.site.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Un site avec ce nom existe déjà" },
        { status: 409 }
      );
    }

    const site = await prisma.site.create({
      data: {
        name,
        displayName,
        sourceUrl: sourceUrl || null,
        clientInfo: clientInfo || {},
        status: "DRAFT",
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error("Error creating site:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du site" },
      { status: 500 }
    );
  }
}
