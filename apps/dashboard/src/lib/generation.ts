import { spawn } from "child_process";
import path from "path";
import prisma from "./db";

// Base paths - configurable via env vars
const ROOT_DIR = process.env.ROOT_DIR || path.resolve(process.cwd(), "..", "..");
const SITE_ASTRO_DIR = process.env.SITE_ASTRO_DIR || path.join(ROOT_DIR, "templates", "site-astro");
const CLIENTS_DIR = process.env.CLIENTS_DIR || path.join(ROOT_DIR, "storage", "clients");
const SCRIPTS_DIR = path.join(SITE_ASTRO_DIR, "scripts");
const TEMPLATE_DIR = path.join(SITE_ASTRO_DIR, "template");

export interface GenerationOptions {
  siteId: string;
  siteName: string;
  sourceUrl?: string;
  clientInfo: Record<string, unknown>;
  creative?: boolean;
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

export async function startGeneration(options: GenerationOptions): Promise<string> {
  const { siteId, siteName, sourceUrl, clientInfo, creative = true } = options;

  // Create job record
  const job = await prisma.job.create({
    data: {
      siteId,
      type: "GENERATE",
      status: "RUNNING",
      progress: 0,
    },
  });

  // Update site status
  await prisma.site.update({
    where: { id: siteId },
    data: { status: "GENERATING" },
  });

  await addLog(siteId, "INFO", `Démarrage de la génération pour ${siteName}`);

  // Create client directory
  const clientDir = path.join(CLIENTS_DIR, siteName);

  // Run generation in background
  runGenerationProcess(job.id, siteId, siteName, clientDir, sourceUrl, clientInfo, creative);

  return job.id;
}

async function runGenerationProcess(
  jobId: string,
  siteId: string,
  siteName: string,
  clientDir: string,
  sourceUrl: string | undefined,
  clientInfo: Record<string, unknown>,
  creative: boolean
) {
  try {
    // Step 1: Create directory structure
    await addLog(siteId, "INFO", "Création du répertoire client...");
    await updateJobProgress(jobId, 5);

    const mkdirProcess = spawn("mkdir", ["-p", clientDir]);
    await new Promise((resolve, reject) => {
      mkdirProcess.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`mkdir failed with code ${code}`));
      });
    });

    // Step 2: Copy template
    await addLog(siteId, "INFO", "Copie du template de base...");
    await updateJobProgress(jobId, 10);

    const cpProcess = spawn("cp", ["-r", `${TEMPLATE_DIR}/.`, clientDir]);
    await new Promise((resolve, reject) => {
      cpProcess.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`cp failed with code ${code}`));
      });
    });

    // Step 3: Write client info
    await addLog(siteId, "INFO", "Écriture des informations client...");
    await updateJobProgress(jobId, 15);

    const configPath = path.join(clientDir, "client-info.json");
    const fs = await import("fs/promises");
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          name: siteName,
          sourceUrl,
          ...clientInfo,
        },
        null,
        2
      )
    );

    // Step 4: Run generation script
    await addLog(siteId, "INFO", "Lancement du script de génération IA...");
    await updateJobProgress(jobId, 20);

    const scriptPath = creative
      ? path.join(SCRIPTS_DIR, "creative-generate.js")
      : path.join(SCRIPTS_DIR, "generate.js");

    const generateProcess = spawn("node", [scriptPath], {
      cwd: clientDir,
      env: {
        ...process.env,
        SOURCE_URL: sourceUrl || "",
        CLIENT_NAME: siteName,
      },
    });

    let lastProgress = 20;

    generateProcess.stdout.on("data", async (data) => {
      const output = data.toString();
      await addLog(siteId, "INFO", output.trim());

      // Parse progress from output if available
      const progressMatch = output.match(/\[(\d+)%\]/);
      if (progressMatch) {
        lastProgress = Math.min(90, parseInt(progressMatch[1]));
        await updateJobProgress(jobId, lastProgress);
      } else {
        // Increment progress slowly
        lastProgress = Math.min(90, lastProgress + 2);
        await updateJobProgress(jobId, lastProgress);
      }
    });

    generateProcess.stderr.on("data", async (data) => {
      await addLog(siteId, "ERROR", data.toString().trim());
    });

    await new Promise<void>((resolve, reject) => {
      generateProcess.on("close", async (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Generation script exited with code ${code}`));
        }
      });

      generateProcess.on("error", reject);
    });

    // Step 5: Complete
    await addLog(siteId, "INFO", "Génération terminée avec succès!");
    await updateJobProgress(jobId, 100, "COMPLETED");

    await prisma.site.update({
      where: { id: siteId },
      data: { status: "GENERATED" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await addLog(siteId, "ERROR", `Erreur: ${errorMessage}`);
    await updateJobProgress(jobId, 0, "FAILED", errorMessage);

    await prisma.site.update({
      where: { id: siteId },
      data: { status: "ERROR" },
    });
  }
}

export async function getJobStatus(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId },
  });
}

export async function getSiteLogs(siteId: string, limit = 100) {
  return prisma.log.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
