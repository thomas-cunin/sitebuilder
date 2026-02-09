import { spawn } from "child_process";
import path from "path";
import prisma from "./db";

// Base paths - configurable via env vars
const ROOT_DIR = process.env.ROOT_DIR || path.resolve(process.cwd(), "..", "..");
const SITE_ASTRO_DIR = process.env.SITE_ASTRO_DIR || path.join(ROOT_DIR, "templates", "site-astro");
const CLIENTS_DIR = process.env.CLIENTS_DIR || path.join(ROOT_DIR, "storage", "clients");
const SCRIPTS_DIR = path.join(SITE_ASTRO_DIR, "scripts");
const TEMPLATE_DIR = path.join(SITE_ASTRO_DIR, "template");

// Generation mode: "script" (legacy) or "claude-code" (new)
const GENERATION_MODE = process.env.GENERATION_MODE || "script";

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

async function runCommand(command: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
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
        reject(new Error(stderr || stdout || `Command failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

async function runClaude(cwd: string, prompt: string, siteId: string): Promise<string> {
  await addLog(siteId, "INFO", `Claude: ${prompt.substring(0, 100)}...`);

  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["--print", prompt], {
      cwd,
      env: process.env,
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
        reject(new Error(stderr || `Claude exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Claude not found: ${err.message}. Install with: npm install -g @anthropic-ai/claude-code`));
    });
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

  await addLog(siteId, "INFO", `Démarrage de la génération pour ${siteName} (mode: ${GENERATION_MODE})`);

  // Create client directory
  const clientDir = path.join(CLIENTS_DIR, siteName);

  // Run generation in background
  if (GENERATION_MODE === "claude-code") {
    runClaudeCodeGeneration(job.id, siteId, siteName, clientDir, sourceUrl, clientInfo);
  } else {
    runScriptGeneration(job.id, siteId, siteName, clientDir, sourceUrl, clientInfo, creative);
  }

  return job.id;
}

/**
 * Generation using Claude Code CLI
 */
async function runClaudeCodeGeneration(
  jobId: string,
  siteId: string,
  siteName: string,
  clientDir: string,
  sourceUrl: string | undefined,
  clientInfo: Record<string, unknown>
) {
  const fs = await import("fs/promises");

  try {
    // Step 1: Create directory and copy template
    await addLog(siteId, "INFO", "Préparation du répertoire client...");
    await updateJobProgress(jobId, 5);

    await runCommand("mkdir", ["-p", clientDir]);
    await runCommand("cp", ["-r", `${TEMPLATE_DIR}/.`, clientDir]);

    // Step 2: Write client info
    await addLog(siteId, "INFO", "Écriture des informations client...");
    await updateJobProgress(jobId, 10);

    const clientInfoData = {
      name: siteName,
      sourceUrl,
      ...clientInfo,
    };

    await fs.writeFile(
      path.join(clientDir, "client-info.json"),
      JSON.stringify(clientInfoData, null, 2)
    );

    // Step 3: Analyze source URL if provided
    if (sourceUrl) {
      await addLog(siteId, "INFO", `Analyse du site source: ${sourceUrl}`);
      await updateJobProgress(jobId, 20);

      await runClaude(clientDir, `
        Analyse le site ${sourceUrl} et crée un fichier data/site.json contenant :
        {
          "businessName": "nom de l'entreprise",
          "activity": "description courte de l'activité",
          "services": ["service 1", "service 2"],
          "colors": {
            "primary": "#hex",
            "secondary": "#hex",
            "accent": "#hex"
          },
          "style": "moderne/classique/minimaliste",
          "contact": {
            "email": "",
            "phone": "",
            "address": ""
          }
        }
        Extrais les vraies informations du site.
      `, siteId);
    }

    // Step 4: Generate content
    await addLog(siteId, "INFO", "Génération du contenu avec Claude...");
    await updateJobProgress(jobId, 40);

    const description = (clientInfo.description as string) || "";

    await runClaude(clientDir, `
      En utilisant les fichiers data/site.json et client-info.json,
      génère le contenu complet du site dans data/content.json.

      Le fichier doit contenir :
      {
        "hero": {
          "title": "Titre accrocheur (5-8 mots)",
          "subtitle": "Sous-titre explicatif (15-20 mots)",
          "cta": { "text": "Texte bouton", "link": "#contact" }
        },
        "services": [
          { "title": "", "description": "", "icon": "lucide-icon-name" }
        ],
        "about": {
          "title": "",
          "text": "Paragraphe de présentation",
          "highlights": ["point 1", "point 2", "point 3"]
        },
        "testimonials": [
          { "author": "", "role": "", "text": "", "rating": 5 }
        ],
        "faq": [
          { "question": "", "answer": "" }
        ],
        "contact": {
          "title": "",
          "text": ""
        }
      }

      Contexte : ${description}
      Langue : français
      Ton : professionnel et engageant
    `, siteId);

    // Step 5: Customize design
    await addLog(siteId, "INFO", "Personnalisation du design...");
    await updateJobProgress(jobId, 60);

    const colors = clientInfo.colors as { primary?: string; secondary?: string } | undefined;

    await runClaude(clientDir, `
      Modifie src/styles/global.css pour personnaliser les couleurs :

      ${colors?.primary ? `Couleur primaire : ${colors.primary}` : "Utilise les couleurs de data/site.json"}
      ${colors?.secondary ? `Couleur secondaire : ${colors.secondary}` : ""}

      Crée les variables CSS dans :root et applique-les aux éléments appropriés.
    `, siteId);

    // Step 6: Install dependencies and build
    await addLog(siteId, "INFO", "Installation des dépendances...");
    await updateJobProgress(jobId, 75);

    await runCommand("npm", ["install"], { cwd: clientDir });

    await addLog(siteId, "INFO", "Build du site...");
    await updateJobProgress(jobId, 85);

    try {
      await runCommand("npm", ["run", "build"], { cwd: clientDir });
    } catch (buildError) {
      // Try to fix build errors with Claude
      await addLog(siteId, "WARN", "Erreur de build, tentative de correction...");

      await runClaude(clientDir, `
        Le build a échoué. Analyse les erreurs et corrige les fichiers problématiques.
        Ensuite, le build sera relancé automatiquement.
      `, siteId);

      // Retry build
      await runCommand("npm", ["run", "build"], { cwd: clientDir });
    }

    // Step 7: Complete
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

/**
 * Generation using legacy scripts (creative-generate.js)
 */
async function runScriptGeneration(
  jobId: string,
  siteId: string,
  siteName: string,
  clientDir: string,
  sourceUrl: string | undefined,
  clientInfo: Record<string, unknown>,
  creative: boolean
) {
  const fs = await import("fs/promises");

  try {
    // Step 1: Create directory structure
    await addLog(siteId, "INFO", "Création du répertoire client...");
    await updateJobProgress(jobId, 5);

    await runCommand("mkdir", ["-p", clientDir]);

    // Step 2: Copy template
    await addLog(siteId, "INFO", "Copie du template de base...");
    await updateJobProgress(jobId, 10);

    await runCommand("cp", ["-r", `${TEMPLATE_DIR}/.`, clientDir]);

    // Step 3: Write client info
    await addLog(siteId, "INFO", "Écriture des informations client...");
    await updateJobProgress(jobId, 15);

    await fs.writeFile(
      path.join(clientDir, "client-info.json"),
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
      : path.join(SCRIPTS_DIR, "generate-site.js");

    const generateProcess = spawn("node", [scriptPath, sourceUrl || "description", siteName], {
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
