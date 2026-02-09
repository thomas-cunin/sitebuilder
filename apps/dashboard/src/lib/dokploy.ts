import path from "path";
import prisma from "./db";

// Base paths - configurable via env vars
const CLIENTS_DIR = process.env.CLIENTS_DIR || path.join(process.cwd(), "..", "..", "storage", "clients");

interface DokployConfig {
  url: string;
  token: string;
}

async function getDokployConfig(): Promise<DokployConfig | null> {
  const settings = await prisma.settings.findUnique({
    where: { id: "global" },
  });

  if (!settings?.dokployUrl || !settings?.dokployToken) {
    return null;
  }

  return {
    url: settings.dokployUrl.replace(/\/$/, ""), // Remove trailing slash
    token: settings.dokployToken,
  };
}

async function addLog(siteId: string, level: string, message: string) {
  await prisma.log.create({
    data: { siteId, level, message },
  });
}

async function updateJobProgress(jobId: string, progress: number, status?: string, error?: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      progress,
      ...(status && { status }),
      ...(error && { error }),
    },
  });
}

/**
 * Make a tRPC API call to Dokploy
 */
async function dokployApi<T>(
  config: DokployConfig,
  procedure: string,
  input: Record<string, unknown>
): Promise<T> {
  const url = `${config.url}/api/trpc/${procedure}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.token,
    },
    body: JSON.stringify({ json: input }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dokploy API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  return data.result?.data?.json as T;
}

export async function startDeployment(siteId: string, siteName: string): Promise<string> {
  const config = await getDokployConfig();
  if (!config) {
    throw new Error("Dokploy non configuré. Veuillez configurer les paramètres.");
  }

  // Create job record
  const job = await prisma.job.create({
    data: {
      siteId,
      type: "DEPLOY",
      status: "RUNNING",
      progress: 0,
    },
  });

  // Update site status
  await prisma.site.update({
    where: { id: siteId },
    data: { status: "DEPLOYING" },
  });

  await addLog(siteId, "INFO", `Démarrage du déploiement pour ${siteName}`);

  // Run deployment in background
  runDeploymentProcess(job.id, siteId, siteName, config);

  return job.id;
}

async function runDeploymentProcess(
  jobId: string,
  siteId: string,
  siteName: string,
  config: DokployConfig
) {
  const clientDir = path.join(CLIENTS_DIR, siteName);
  const projectName = `site-${siteName}`;
  const appName = "web";

  try {
    // Step 1: Get or create project
    await addLog(siteId, "INFO", "Recherche/création du projet Dokploy...");
    await updateJobProgress(jobId, 10);

    let projectId: string | null = null;

    // Try to find existing project
    try {
      const projects = await dokployApi<Array<{ projectId: string; name: string }>>(
        config,
        "project.all",
        {}
      );
      const existing = projects?.find((p) => p.name === projectName);
      if (existing) {
        projectId = existing.projectId;
        await addLog(siteId, "INFO", `Projet existant trouvé: ${projectId}`);
      }
    } catch {
      // No projects or error, will create new
    }

    // Create project if not found
    if (!projectId) {
      await addLog(siteId, "INFO", "Création d'un nouveau projet...");
      const newProject = await dokployApi<{ projectId: string }>(
        config,
        "project.create",
        { name: projectName, description: `Site généré: ${siteName}` }
      );
      projectId = newProject.projectId;
      await addLog(siteId, "INFO", `Projet créé: ${projectId}`);
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { dokployProjectId: projectId },
    });

    // Step 2: Get or create application
    await addLog(siteId, "INFO", "Recherche/création de l'application...");
    await updateJobProgress(jobId, 30);

    let appId: string | null = null;

    // Try to find existing app in project
    try {
      const project = await dokployApi<{
        applications: Array<{ applicationId: string; name: string }>;
      }>(config, "project.one", { projectId });

      const existingApp = project?.applications?.find((a) => a.name === appName);
      if (existingApp) {
        appId = existingApp.applicationId;
        await addLog(siteId, "INFO", `Application existante trouvée: ${appId}`);
      }
    } catch {
      // Will create new app
    }

    // Create application if not found
    if (!appId) {
      await addLog(siteId, "INFO", "Création d'une nouvelle application...");

      // For static sites built with Astro, we use nixpacks or dockerfile
      const newApp = await dokployApi<{ applicationId: string }>(
        config,
        "application.create",
        {
          name: appName,
          projectId: projectId,
          description: `Site vitrine ${siteName}`,
        }
      );
      appId = newApp.applicationId;
      await addLog(siteId, "INFO", `Application créée: ${appId}`);

      // Configure the application for static site
      // Set build path to the client directory
      await dokployApi(config, "application.update", {
        applicationId: appId,
        buildPath: `/data/storage/clients/${siteName}`,
        // Use the dist folder from Astro build
        publishDirectory: "dist",
      });
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { dokployAppId: appId },
    });

    // Step 3: Deploy
    await addLog(siteId, "INFO", "Lancement du déploiement...");
    await updateJobProgress(jobId, 50);

    await dokployApi(config, "application.deploy", { applicationId: appId });

    await addLog(siteId, "INFO", "Déploiement lancé, en attente...");
    await updateJobProgress(jobId, 70);

    // Step 4: Wait for deployment and get URL
    // Poll for deployment status
    let deployedUrl = "";
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      try {
        const appInfo = await dokployApi<{
          applicationStatus: string;
          domains: Array<{ host: string; https: boolean }>;
        }>(config, "application.one", { applicationId: appId });

        if (appInfo.applicationStatus === "done" || appInfo.applicationStatus === "running") {
          // Get the URL from domains
          if (appInfo.domains && appInfo.domains.length > 0) {
            const domain = appInfo.domains[0];
            deployedUrl = `${domain.https ? "https" : "http"}://${domain.host}`;
          } else {
            // Generate a default URL
            deployedUrl = `https://${siteName}.${new URL(config.url).hostname.replace(/:\d+$/, "")}.sslip.io`;
          }
          break;
        }

        if (appInfo.applicationStatus === "error") {
          throw new Error("Le déploiement a échoué sur Dokploy");
        }

        await updateJobProgress(jobId, 70 + Math.min(attempts, 20));
      } catch (pollError) {
        // Continue polling
        console.error("Poll error:", pollError);
      }
    }

    if (!deployedUrl) {
      deployedUrl = `https://${siteName}.${new URL(config.url).hostname.replace(/:\d+$/, "")}.sslip.io`;
    }

    // Complete
    await addLog(siteId, "INFO", `Déploiement terminé! URL: ${deployedUrl}`);
    await updateJobProgress(jobId, 100, "COMPLETED");

    await prisma.site.update({
      where: { id: siteId },
      data: {
        status: "DEPLOYED",
        deployedUrl,
        deployedAt: new Date(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await addLog(siteId, "ERROR", `Erreur de déploiement: ${errorMessage}`);
    await updateJobProgress(jobId, 0, "FAILED", errorMessage);

    await prisma.site.update({
      where: { id: siteId },
      data: { status: "ERROR" },
    });
  }
}

export async function getDeploymentStatus(appId: string): Promise<unknown> {
  const config = await getDokployConfig();
  if (!config) return null;

  try {
    return await dokployApi(config, "application.one", { applicationId: appId });
  } catch {
    return null;
  }
}

export async function deleteDeployment(projectId: string): Promise<void> {
  const config = await getDokployConfig();
  if (!config) return;

  try {
    await dokployApi(config, "project.remove", { projectId });
  } catch (error) {
    console.error("Error deleting deployment:", error);
  }
}
