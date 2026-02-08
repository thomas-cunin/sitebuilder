import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    GENERATING: "bg-blue-100 text-blue-800",
    GENERATED: "bg-green-100 text-green-800",
    DEPLOYING: "bg-yellow-100 text-yellow-800",
    DEPLOYED: "bg-emerald-100 text-emerald-800",
    ERROR: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    GENERATING: "En génération",
    GENERATED: "Généré",
    DEPLOYING: "Déploiement",
    DEPLOYED: "Déployé",
    ERROR: "Erreur",
  };
  return labels[status] || status;
}
