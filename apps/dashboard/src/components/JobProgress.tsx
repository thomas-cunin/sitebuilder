"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  error?: string | null;
  createdAt: string | Date;
}

interface JobProgressProps {
  siteId: string;
  initialJobs?: Job[];
}

export function JobProgress({ siteId, initialJobs = [] }: JobProgressProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}`);
        const data = await res.json();
        if (data.jobs) {
          setJobs(data.jobs);
        }
      } catch (e) {
        console.error("Failed to refresh jobs:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [siteId]);

  const activeJobs = jobs.filter(
    (job) => job.status === "RUNNING" || job.status === "PENDING"
  );
  const completedJobs = jobs.filter((job) => job.status === "COMPLETED");
  const failedJobs = jobs.filter((job) => job.status === "FAILED");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RUNNING":
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case "PENDING":
        return <Badge className="bg-gray-100 text-gray-800">En attente</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Échoué</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case "GENERATE":
        return "Génération";
      case "DEPLOY":
        return "Déploiement";
      default:
        return type;
    }
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Tâches en cours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeJobs.map((job) => (
          <div key={job.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{getJobTypeLabel(job.type)}</span>
              {getStatusBadge(job.status)}
            </div>
            <Progress value={job.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Progression: {job.progress}%
            </p>
          </div>
        ))}

        {activeJobs.length === 0 && (
          <div className="space-y-2">
            {completedJobs.length > 0 && (
              <p className="text-sm text-green-600">
                {completedJobs.length} tâche(s) terminée(s)
              </p>
            )}
            {failedJobs.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-red-600">
                  {failedJobs.length} tâche(s) échouée(s)
                </p>
                {failedJobs.map((job) => (
                  <p key={job.id} className="text-xs text-red-500">
                    {getJobTypeLabel(job.type)}: {job.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
