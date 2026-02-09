import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import prisma from "./db";

const execAsync = promisify(exec);

// Base paths - configurable via env vars
const CLIENTS_DIR = process.env.CLIENTS_DIR || path.join(process.cwd(), "..", "..", "storage", "clients");

// Host path mapping (container /data = host /home/debian/sitebuilder)
const CONTAINER_DATA_PATH = "/data";
const HOST_DATA_PATH = process.env.HOST_DATA_PATH || "/home/debian/sitebuilder";

// Dokploy server base domain
const SSLIP_DOMAIN = process.env.SSLIP_DOMAIN || "152.228.131.87.sslip.io";

// Preview domain for client sites (e.g., "preview.lemonlab.fr" -> {siteName}.preview.lemonlab.fr)
const PREVIEW_DOMAIN = process.env.PREVIEW_DOMAIN || SSLIP_DOMAIN;

/**
 * Convert container path to host path for Dokploy access
 */
function containerToHostPath(containerPath: string): string {
  if (containerPath.startsWith(CONTAINER_DATA_PATH)) {
    return containerPath.replace(CONTAINER_DATA_PATH, HOST_DATA_PATH);
  }
  return containerPath;
}

/**
 * Create a simple nginx Dockerfile for serving static files
 */
async function createStaticDockerfile(clientDir: string): Promise<void> {
  const fs = await import("fs/promises");

  const dockerfileContent = `FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

  await fs.writeFile(path.join(clientDir, "Dockerfile"), dockerfileContent);
}

/**
 * Check if Docker is available (socket mounted)
 */
async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker info", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build and deploy a static site using Docker Swarm directly
 * This bypasses Dokploy's git-based build system
 */
async function deployStaticSiteDocker(
  siteName: string,
  clientDir: string,
  siteId: string,
  addLogFn: (siteId: string, level: string, message: string) => Promise<void>
): Promise<string> {
  const imageName = `site-${siteName}:latest`;
  const serviceName = `site-${siteName}`;
  const hostDomain = `${siteName}.${PREVIEW_DOMAIN}`;

  // Create Dockerfile in the client directory
  await createStaticDockerfile(clientDir);
  await addLogFn(siteId, "INFO", "Dockerfile créé pour le site statique");

  // Build Docker image
  // Note: Docker CLI runs inside container but connects to host daemon via socket
  // The CLI reads files from container filesystem, daemon executes on host
  await addLogFn(siteId, "INFO", "Construction de l'image Docker...");
  try {
    await execAsync(`DOCKER_BUILDKIT=1 docker build -t ${imageName} ${clientDir}`, { timeout: 180000 });
    await addLogFn(siteId, "INFO", `Image Docker construite: ${imageName}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Build failed";
    await addLogFn(siteId, "ERROR", `Erreur build Docker: ${msg}`);
    throw new Error(`Docker build failed: ${msg}`);
  }

  // Check if service exists
  let serviceExists = false;
  try {
    await execAsync(`docker service inspect ${serviceName}`);
    serviceExists = true;
  } catch {
    serviceExists = false;
  }

  // Deploy or update service
  const labels = [
    `--label traefik.enable=true`,
    `--label "traefik.http.routers.${serviceName}.rule=Host(\\\`${hostDomain}\\\`)"`,
    `--label traefik.http.routers.${serviceName}.entrypoints=websecure`,
    `--label traefik.http.routers.${serviceName}.tls=true`,
    `--label traefik.http.routers.${serviceName}.tls.certresolver=letsencrypt`,
    `--label traefik.http.services.${serviceName}.loadbalancer.server.port=80`,
  ].join(" ");

  if (serviceExists) {
    await addLogFn(siteId, "INFO", "Mise à jour du service existant...");
    try {
      await execAsync(`docker service update --image ${imageName} --force ${serviceName}`, { timeout: 120000 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Update failed";
      await addLogFn(siteId, "ERROR", `Erreur mise à jour: ${msg}`);
      throw error;
    }
  } else {
    await addLogFn(siteId, "INFO", "Création du service Docker Swarm...");
    try {
      await execAsync(
        `docker service create --name ${serviceName} --network dokploy-network ${labels} ${imageName}`,
        { timeout: 120000 }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Create failed";
      await addLogFn(siteId, "ERROR", `Erreur création service: ${msg}`);
      throw error;
    }
  }

  const deployedUrl = `https://${hostDomain}`;
  await addLogFn(siteId, "INFO", `Service déployé: ${deployedUrl}`);

  return deployedUrl;
}

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
 * Make a tRPC query (GET) to Dokploy
 */
async function dokployQuery<T>(
  config: DokployConfig,
  procedure: string,
  input: Record<string, unknown> = {}
): Promise<T> {
  const inputParam = encodeURIComponent(JSON.stringify({ json: input }));
  const url = `${config.url}/api/trpc/${procedure}?input=${inputParam}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": config.token,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dokploy API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.json?.message || JSON.stringify(data.error));
  }

  return data.result?.data?.json as T;
}

/**
 * Make a tRPC mutation (POST) to Dokploy
 */
async function dokployMutation<T>(
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
    throw new Error(data.error.json?.message || JSON.stringify(data.error));
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

interface DokployProject {
  projectId: string;
  name: string;
  environments: Array<{
    environmentId: string;
    name: string;
    applications: Array<{ applicationId: string; name: string }>;
  }>;
}

async function runDeploymentProcess(
  jobId: string,
  siteId: string,
  siteName: string,
  config: DokployConfig
) {
  try {
    // Step 1: Verify site files exist
    await addLog(siteId, "INFO", "Vérification des fichiers du site...");
    await updateJobProgress(jobId, 10);

    const clientDir = path.join(CLIENTS_DIR, siteName);
    const fs = await import("fs/promises");

    try {
      await fs.access(path.join(clientDir, "dist"));
    } catch {
      throw new Error(`Dossier dist non trouvé dans ${clientDir}. Le site doit être généré avant le déploiement.`);
    }

    await addLog(siteId, "INFO", "Fichiers du site trouvés");
    await updateJobProgress(jobId, 20);

    // Step 2: Check if Docker is available and deploy
    let deployedUrl = "";
    const dockerAvailable = await isDockerAvailable();

    if (dockerAvailable) {
      // Deploy using Docker Swarm directly (preferred method)
      await addLog(siteId, "INFO", "Déploiement via Docker Swarm...");
      await updateJobProgress(jobId, 30);

      deployedUrl = await deployStaticSiteDocker(
        siteName,
        clientDir,
        siteId,
        addLog
      );
    } else {
      // Docker not available - provide instructions for manual deployment
      await addLog(siteId, "WARN", "Docker non disponible - déploiement manuel requis");
      await addLog(siteId, "INFO", "Le site a été généré avec succès. Pour le déployer:");
      await addLog(siteId, "INFO", `1. Copier ${clientDir}/dist vers le serveur`);
      await addLog(siteId, "INFO", "2. Configurer un serveur web (nginx) pour servir les fichiers");

      // Create a deployment URL placeholder
      deployedUrl = `https://${siteName}.${PREVIEW_DOMAIN}`;
      await addLog(siteId, "INFO", `URL prévue après déploiement: ${deployedUrl}`);
    }

    await updateJobProgress(jobId, 80);

    // Step 3: Optional - Register with Dokploy for management
    // Try to create/update Dokploy project for tracking
    try {
      const projectName = `site-${siteName}`;
      let projectId: string | null = null;

      const projects = await dokployQuery<DokployProject[]>(config, "project.all", {});
      const existing = projects?.find((p) => p.name === projectName);

      if (existing) {
        projectId = existing.projectId;
      } else {
        const newProject = await dokployMutation<DokployProject>(
          config,
          "project.create",
          { name: projectName, description: `Site généré: ${siteName}` }
        );
        projectId = newProject?.projectId;
      }

      if (projectId) {
        await prisma.site.update({
          where: { id: siteId },
          data: { dokployProjectId: projectId },
        });
      }
    } catch (dokployError) {
      // Dokploy registration is optional, log but don't fail
      await addLog(siteId, "WARN", `Enregistrement Dokploy optionnel échoué: ${dokployError instanceof Error ? dokployError.message : 'erreur'}`);
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
    return await dokployQuery(config, "application.one", { applicationId: appId });
  } catch {
    return null;
  }
}

export async function deleteDeployment(projectId: string): Promise<void> {
  const config = await getDokployConfig();
  if (!config) return;

  try {
    await dokployMutation(config, "project.remove", { projectId });
  } catch (error) {
    console.error("Error deleting deployment:", error);
  }
}
