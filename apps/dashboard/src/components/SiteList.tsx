"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteCard } from "./SiteCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

interface SiteListProps {
  sites: Site[];
}

export function SiteList({ sites }: SiteListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sites/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      await fetch(`/api/sites/${id}/generate`, {
        method: "POST",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  };

  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun site créé pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <SiteCard
            key={site.id}
            site={site}
            onDelete={(id) => setDeleteId(id)}
            onRegenerate={handleRegenerate}
          />
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce site ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
