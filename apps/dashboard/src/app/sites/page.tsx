import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SiteList } from "@/components/SiteList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import prisma from "@/lib/db";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

async function getSites(status?: string, search?: string) {
  return prisma.site.findMany({
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
}

export default async function SitesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sites = await getSites(params.status, params.search);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sites</h1>
            <p className="text-muted-foreground">
              Gérez tous vos sites générés
            </p>
          </div>
          <Button asChild>
            <Link href="/sites/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau site
            </Link>
          </Button>
        </div>

        <div className="flex gap-4">
          <form className="flex-1" action="/sites" method="GET">
            <Input
              name="search"
              placeholder="Rechercher un site..."
              defaultValue={params.search}
            />
            <input type="hidden" name="status" value={params.status || ""} />
          </form>
          <form action="/sites" method="GET">
            <input type="hidden" name="search" value={params.search || ""} />
            <Select name="status" defaultValue={params.status || "all"}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="GENERATING">En génération</SelectItem>
                <SelectItem value="GENERATED">Généré</SelectItem>
                <SelectItem value="DEPLOYING">Déploiement</SelectItem>
                <SelectItem value="DEPLOYED">Déployé</SelectItem>
                <SelectItem value="ERROR">Erreur</SelectItem>
              </SelectContent>
            </Select>
          </form>
        </div>

        <SiteList sites={sites} />
      </div>
    </Layout>
  );
}
