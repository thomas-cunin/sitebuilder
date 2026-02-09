"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertTriangle, Terminal, RefreshCw } from "lucide-react";

interface ClaudeStatusData {
  status: "logged_in" | "not_logged_in" | "error";
  version?: string;
  message: string;
  instructions?: string;
  error?: string;
}

export function ClaudeStatus() {
  const [data, setData] = useState<ClaudeStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claude/status");
      const json = await res.json();
      setData(json);
    } catch {
      setData({
        status: "error",
        message: "Impossible de vérifier le statut",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />;
    switch (data?.status) {
      case "logged_in":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "not_logged_in":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    if (loading) return <Badge variant="secondary">Vérification...</Badge>;
    switch (data?.status) {
      case "logged_in":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connecté</Badge>;
      case "not_logged_in":
        return <Badge variant="destructive">Non connecté</Badge>;
      default:
        return <Badge variant="secondary">Erreur</Badge>;
    }
  };

  return (
    <Card className={data?.status === "not_logged_in" ? "border-red-200 bg-red-50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Claude CLI
        </CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{data?.message}</p>
        {data?.version && (
          <p className="text-xs text-muted-foreground mb-2">Version: {data.version}</p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          {data?.status !== "logged_in" && data?.instructions && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Terminal className="h-3 w-3 mr-1" />
                  Instructions de connexion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Connexion Claude CLI</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Claude CLI doit être authentifié pour pouvoir générer des sites.
                    Suivez ces instructions pour vous connecter:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                    {data.instructions}
                  </pre>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Après avoir exécuté la commande{" "}
                      <code className="bg-yellow-100 px-1 rounded">claude login</code>, un lien
                      s&apos;affichera. Ouvrez-le dans votre navigateur pour authentifier.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
