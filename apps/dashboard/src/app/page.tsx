import Link from "next/link";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteCard } from "@/components/SiteCard";
import prisma from "@/lib/db";
import { Globe, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [total, deployed, generating, error] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: "DEPLOYED" } }),
    prisma.site.count({ where: { status: { in: ["GENERATING", "DEPLOYING"] } } }),
    prisma.site.count({ where: { status: "ERROR" } }),
  ]);

  return { total, deployed, generating, error };
}

async function getRecentSites() {
  return prisma.site.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      jobs: {
        where: { status: { in: ["RUNNING", "PENDING"] } },
        take: 1,
      },
    },
  });
}

export default async function DashboardPage() {
  const stats = await getStats();
  const recentSites = await getRecentSites();

  const statCards = [
    {
      title: "Total Sites",
      value: stats.total,
      icon: Globe,
      color: "text-blue-600",
    },
    {
      title: "Déployés",
      value: stats.deployed,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "En cours",
      value: stats.generating,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Erreurs",
      value: stats.error,
      icon: AlertCircle,
      color: "text-red-600",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Vue d&apos;ensemble de vos sites générés
            </p>
          </div>
          <Button asChild>
            <Link href="/sites/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau site
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Sites récents</h2>
            <Button variant="outline" asChild>
              <Link href="/sites">Voir tous</Link>
            </Button>
          </div>
          {recentSites.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Aucun site créé pour le moment
                </p>
                <Button asChild>
                  <Link href="/sites/new">Créer votre premier site</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentSites.map((site) => (
                <SiteCard key={site.id} site={site} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
