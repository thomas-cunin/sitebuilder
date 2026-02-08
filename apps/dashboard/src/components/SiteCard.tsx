"use client";

import Link from "next/link";
import { ExternalLink, MoreHorizontal, Eye, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
}

interface Site {
  id: string;
  name: string;
  displayName: string;
  status: string;
  deployedUrl?: string | null;
  validationScore?: number | null;
  createdAt: string | Date;
  jobs?: Job[];
}

interface SiteCardProps {
  site: Site;
  onDelete?: (id: string) => void;
  onRegenerate?: (id: string) => void;
}

export function SiteCard({ site, onDelete, onRegenerate }: SiteCardProps) {
  const activeJob = site.jobs?.find(
    (job) => job.status === "RUNNING" || job.status === "PENDING"
  );
  const isLoading = site.status === "GENERATING" || site.status === "DEPLOYING";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          <Link href={`/sites/${site.id}`} className="hover:underline">
            {site.displayName}
          </Link>
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(site.status)}>
            {getStatusLabel(site.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Slug: {site.name}</span>
            <span>{formatDate(site.createdAt)}</span>
          </div>

          {activeJob && isLoading && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{activeJob.type === "GENERATE" ? "Génération" : "Déploiement"}</span>
                <span>{activeJob.progress}%</span>
              </div>
              <Progress value={activeJob.progress} className="h-2" />
            </div>
          )}

          {site.validationScore !== null && site.validationScore !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Score de validation</span>
              <span className="font-medium">{site.validationScore}/100</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/sites/${site.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  Détails
                </Link>
              </Button>
              {site.deployedUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={site.deployedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Voir
                  </a>
                </Button>
              )}
            </div>
            <div className="flex space-x-1">
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRegenerate(site.id)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(site.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
