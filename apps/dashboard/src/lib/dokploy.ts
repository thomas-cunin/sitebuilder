import { spawn } from "child_process";
import path from "path";
import prisma from "./db";

// Base paths - configurable via env vars
const ROOT_DIR = process.env.ROOT_DIR || path.resolve(process.cwd(), "..", "..");
const CLIENTS_DIR = process.env.CLIENTS_DIR || path.join(ROOT_DIR, "storage", "clients");

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
    url: settings.dokployUrl,
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

async function runCommand(command: string, args: string[], env?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: { ...process.env, ...env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
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

  const env = {
    DOKPLOY_URL: config.url,
    DOKPLOY_TOKEN: config.token,
  };

  try {
    // Step 1: Create project
    await addLog(siteId, "INFO", "Création du projet Dokploy...");
    await updateJobProgress(jobId, 10);

    let projectId: string;
    try {
      const projectOutput = await runCommand(
        "dokploy",
        ["project", "create", "--name", projectName, "--json"],
        env
      );
      const projectData = JSON.parse(projectOutput);
      projectId = projectData.id || projectData.projectId;
    } catch (error) {
      // Project might already exist, try to get it
      await addLog(siteId, "INFO", "Projet existant, récupération...");
      const listOutput = await runCommand("dokploy", ["project", "list", "--json"], env);
      const projects = JSON.parse(listOutput);
      const existing = projects.find((p: { name: string }) => p.name === projectName);
      if (!existing) throw error;
      projectId = existing.id;
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { dokployProjectId: projectId },
    });

    // Step 2: Create application
    await addLog(siteId, "INFO", "Création de l'application...");
    await updateJobProgress(jobId, 30);

    let appId: string;
    try {
      const appOutput = await runCommand(
        "dokploy",
        [
          "app",
          "create",
          "--project",
          projectId,
          "--name",
          appName,
          "--type",
          "dockerfile",
          "--path",
          clientDir,
          "--json",
        ],
        env
      );
      const appData = JSON.parse(appOutput);
      appId = appData.id || appData.appId;
    } catch (error) {
      // App might already exist
      await addLog(siteId, "INFO", "Application existante, récupération...");
      const appsOutput = await runCommand(
        "dokploy",
        ["app", "list", "--project", projectId, "--json"],
        env
      );
      const apps = JSON.parse(appsOutput);
      const existing = apps.find((a: { name: string }) => a.name === appName);
      if (!existing) throw error;
      appId = existing.id;
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { dokployAppId: appId },
    });

    // Step 3: Deploy
    await addLog(siteId, "INFO", "Déploiement en cours...");
    await updateJobProgress(jobId, 50);

    await runCommand("dokploy", ["deploy", "--app", appId], env);

    await updateJobProgress(jobId, 80);

    // Step 4: Get deployed URL
    await addLog(siteId, "INFO", "Récupération de l'URL...");

    const appInfoOutput = await runCommand("dokploy", ["app", "info", "--app", appId, "--json"], env);
    const appInfo = JSON.parse(appInfoOutput);
    const deployedUrl = appInfo.url || appInfo.domain || `https://${siteName}.${new URL(config.url).hostname}`;

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
    const output = await runCommand(
      "dokploy",
      ["app", "info", "--app", appId, "--json"],
      { DOKPLOY_URL: config.url, DOKPLOY_TOKEN: config.token }
    );
    return JSON.parse(output);
  } catch {
    return null;
  }
}

export async function deleteDeployment(projectId: string): Promise<void> {
  const config = await getDokployConfig();
  if (!config) return;

  await runCommand(
    "dokploy",
    ["project", "delete", "--project", projectId, "--force"],
    { DOKPLOY_URL: config.url, DOKPLOY_TOKEN: config.token }
  );
}
