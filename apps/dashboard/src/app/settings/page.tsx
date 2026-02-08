"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Eye, EyeOff } from "lucide-react";

interface Settings {
  dokployUrl: string;
  dokployToken: string;
  claudeApiKey: string;
  adminPassword: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    dokployUrl: "",
    dokployToken: "",
    claudeApiKey: "",
    adminPassword: "",
  });
  const [showTokens, setShowTokens] = useState({
    dokployToken: false,
    claudeApiKey: false,
    adminPassword: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          dokployUrl: data.dokployUrl || "",
          dokployToken: data.dokployToken || "",
          claudeApiKey: data.claudeApiKey || "",
          adminPassword: "",
        });
      })
      .catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShow = (field: keyof typeof showTokens) => {
    setShowTokens((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Paramètres enregistrés avec succès" });
        setSettings((prev) => ({ ...prev, adminPassword: "" }));
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur de connexion" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Configurez les intégrations et la sécurité
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dokploy</CardTitle>
              <CardDescription>
                Configuration de la connexion à Dokploy pour le déploiement automatique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dokployUrl">URL Dokploy</Label>
                <Input
                  id="dokployUrl"
                  name="dokployUrl"
                  value={settings.dokployUrl}
                  onChange={handleChange}
                  placeholder="https://dokploy.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dokployToken">Token API Dokploy</Label>
                <div className="flex gap-2">
                  <Input
                    id="dokployToken"
                    name="dokployToken"
                    type={showTokens.dokployToken ? "text" : "password"}
                    value={settings.dokployToken}
                    onChange={handleChange}
                    placeholder="Votre token Dokploy"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShow("dokployToken")}
                  >
                    {showTokens.dokployToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claude API</CardTitle>
              <CardDescription>
                Clé API Anthropic pour la génération de contenu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="claudeApiKey">Clé API Claude</Label>
                <div className="flex gap-2">
                  <Input
                    id="claudeApiKey"
                    name="claudeApiKey"
                    type={showTokens.claudeApiKey ? "text" : "password"}
                    value={settings.claudeApiKey}
                    onChange={handleChange}
                    placeholder="sk-ant-..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShow("claudeApiKey")}
                  >
                    {showTokens.claudeApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>
                Modifier le mot de passe administrateur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Nouveau mot de passe</Label>
                <div className="flex gap-2">
                  <Input
                    id="adminPassword"
                    name="adminPassword"
                    type={showTokens.adminPassword ? "text" : "password"}
                    value={settings.adminPassword}
                    onChange={handleChange}
                    placeholder="Laisser vide pour ne pas changer"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShow("adminPassword")}
                  >
                    {showTokens.adminPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
