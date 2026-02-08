import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Layout } from "@/components/Layout";
import { LogViewer } from "@/components/LogViewer";
import { JobProgress } from "@/components/JobProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/db";
import { startGeneration } from "@/lib/generation";
import { startDeployment } from "@/lib/dokploy";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Rocket,
  Trash2,
  RefreshCw,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSite(id: string) {
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
  return site;
}

async function handleGenerate(formData: FormData) {
  "use server";
  const siteId = formData.get("siteId") as string;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
  });

  if (!site) {
    redirect(`/sites/${siteId}`);
  }

  // Check if already generating
  if (site.status === "GENERATING" || site.status === "DEPLOYING") {
    redirect(`/sites/${siteId}`);
  }

  const clientInfo = site.clientInfo as Record<string, unknown>;

  await startGeneration({
    siteId: site.id,
    siteName: site.name,
    sourceUrl: site.sourceUrl || undefined,
    clientInfo,
    creative: clientInfo.generationMode === "creative",
  });

  redirect(`/sites/${siteId}`);
}

async function handleDeploy(formData: FormData) {
  "use server";
  const siteId = formData.get("siteId") as string;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
  });

  if (!site) {
    redirect(`/sites/${siteId}`);
  }

  // Check if already deploying or not generated
  if (site.status === "GENERATING" || site.status === "DEPLOYING" || site.status === "DRAFT") {
    redirect(`/sites/${siteId}`);
  }

  await startDeployment(site.id, site.name);

  redirect(`/sites/${siteId}`);
}

async function handleDelete(formData: FormData) {
  "use server";
  const siteId = formData.get("siteId") as string;

  await prisma.site.delete({
    where: { id: siteId },
  });

  redirect("/sites");
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const site = await getSite(id);

  if (!site) {
    notFound();
  }

  const isLoading = site.status === "GENERATING" || site.status === "DEPLOYING";
  const canGenerate = site.status === "DRAFT" || site.status === "ERROR" || site.status === "GENERATED";
  const canDeploy = site.status === "GENERATED" || site.status === "ERROR" || site.status === "DEPLOYED";

  const clientInfo = site.clientInfo as Record<string, unknown>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/sites">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{site.displayName}</h1>
              <Badge className={getStatusColor(site.status)}>
                {getStatusLabel(site.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Slug: <code className="bg-muted px-1 rounded">{site.name}</code>
            </p>
          </div>
          <div className="flex gap-2">
            {site.deployedUrl && (
              <Button variant="outline" asChild>
                <a href={site.deployedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir le site
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Créé le</p>
                    <p className="font-medium">{formatDate(site.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mis à jour le</p>
                    <p className="font-medium">{formatDate(site.updatedAt)}</p>
                  </div>
                  {site.deployedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Déployé le</p>
                      <p className="font-medium">{formatDate(site.deployedAt)}</p>
                    </div>
                  )}
                  {site.validationScore !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Score</p>
                      <p className="font-medium">{site.validationScore}/100</p>
                    </div>
                  )}
                </div>

                {site.sourceUrl && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">URL source</p>
                      <a
                        href={site.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {site.sourceUrl}
                      </a>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Informations client</p>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                    {JSON.stringify(clientInfo, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <LogViewer
              siteId={site.id}
              initialLogs={site.logs}
              autoRefresh={isLoading}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={handleGenerate}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canGenerate || isLoading}
                  >
                    {isLoading && site.status === "GENERATING" ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        {site.status === "GENERATED" || site.status === "DEPLOYED"
                          ? "Régénérer"
                          : "Générer"}
                      </>
                    )}
                  </Button>
                </form>

                <form action={handleDeploy}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    disabled={!canDeploy || isLoading}
                  >
                    {isLoading && site.status === "DEPLOYING" ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Déploiement...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        {site.status === "DEPLOYED" ? "Redéployer" : "Déployer"}
                      </>
                    )}
                  </Button>
                </form>

                <Separator />

                <form action={handleDelete}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </form>
              </CardContent>
            </Card>

            <JobProgress siteId={site.id} initialJobs={site.jobs} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
