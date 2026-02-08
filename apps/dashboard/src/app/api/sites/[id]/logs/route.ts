import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const stream = searchParams.get("stream") === "true";

  if (stream) {
    // Server-Sent Events for real-time logs
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let lastLogId: string | null = null;

        const sendLogs = async () => {
          try {
            const logs = await prisma.log.findMany({
              where: {
                siteId: id,
                ...(lastLogId ? { id: { gt: lastLogId } } : {}),
              },
              orderBy: { createdAt: "asc" },
              take: 100,
            });

            if (logs.length > 0) {
              lastLogId = logs[logs.length - 1].id;

              // Get all logs for this site to send full list
              const allLogs = await prisma.log.findMany({
                where: { siteId: id },
                orderBy: { createdAt: "asc" },
                take: 100,
              });

              const data = `data: ${JSON.stringify(allLogs)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // Check if site is still processing
            const site = await prisma.site.findUnique({
              where: { id },
              select: { status: true },
            });

            if (site?.status === "GENERATING" || site?.status === "DEPLOYING") {
              setTimeout(sendLogs, 1000);
            } else {
              // Send final logs and close
              const finalLogs = await prisma.log.findMany({
                where: { siteId: id },
                orderBy: { createdAt: "asc" },
                take: 100,
              });
              const data = `data: ${JSON.stringify(finalLogs)}\n\n`;
              controller.enqueue(encoder.encode(data));
              controller.close();
            }
          } catch (error) {
            console.error("Error sending logs:", error);
            controller.close();
          }
        };

        // Send initial logs
        const initialLogs = await prisma.log.findMany({
          where: { siteId: id },
          orderBy: { createdAt: "asc" },
          take: 100,
        });
        const data = `data: ${JSON.stringify(initialLogs)}\n\n`;
        controller.enqueue(encoder.encode(data));

        if (initialLogs.length > 0) {
          lastLogId = initialLogs[initialLogs.length - 1].id;
        }

        // Start polling
        setTimeout(sendLogs, 1000);
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Regular JSON response
  try {
    const logs = await prisma.log.findMany({
      where: { siteId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des logs" },
      { status: 500 }
    );
  }
}
