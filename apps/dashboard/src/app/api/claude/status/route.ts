import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

const SCRIPTS_DIR = process.env.SITE_ASTRO_DIR
  ? path.join(process.env.SITE_ASTRO_DIR, "scripts")
  : path.join(process.cwd(), "..", "..", "templates", "site-astro", "scripts");

/**
 * Check if Claude CLI is logged in for the claude user
 */
export async function GET() {
  try {
    const isRoot = process.getuid?.() === 0;
    const wrapperPath = path.join(SCRIPTS_DIR, "run-claude.sh");

    // Determine which command to use
    let cmd: string;
    if (isRoot && existsSync(wrapperPath)) {
      // Use wrapper which handles user switching
      cmd = `${wrapperPath} --version`;
    } else {
      cmd = "claude --version";
    }

    // Try to get Claude version (quick check)
    const { stdout: versionOutput } = await execAsync(cmd, { timeout: 10000 });

    // Now check if logged in by running a simple command
    // The wrapper will copy credentials and switch user
    let authCmd: string;
    if (isRoot && existsSync(wrapperPath)) {
      // Check if credentials exist for claude user
      const credentialsExist = existsSync("/home/claude/.claude/.credentials.json") ||
                               existsSync("/root/.claude/.credentials.json");

      if (!credentialsExist) {
        return NextResponse.json({
          status: "not_logged_in",
          version: versionOutput.trim(),
          message: "Claude CLI n'est pas connecté",
          instructions: getLoginInstructions(),
        });
      }

      // Try a simple Claude command to verify auth works
      authCmd = `${wrapperPath} --print "echo test" 2>&1 | head -5`;
    } else {
      authCmd = 'claude --print "echo test" 2>&1 | head -5';
    }

    try {
      const { stdout: authOutput } = await execAsync(authCmd, { timeout: 15000 });

      // Check for login prompt in output
      if (authOutput.includes("Not logged in") || authOutput.includes("/login")) {
        return NextResponse.json({
          status: "not_logged_in",
          version: versionOutput.trim(),
          message: "Claude CLI n'est pas connecté",
          instructions: getLoginInstructions(),
        });
      }

      return NextResponse.json({
        status: "logged_in",
        version: versionOutput.trim(),
        message: "Claude CLI est connecté et prêt",
      });
    } catch (authError) {
      // Auth check failed, probably not logged in
      return NextResponse.json({
        status: "not_logged_in",
        version: versionOutput.trim(),
        message: "Claude CLI n'est pas connecté ou erreur d'authentification",
        instructions: getLoginInstructions(),
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Claude CLI non disponible ou erreur",
      error: error instanceof Error ? error.message : "Unknown error",
      instructions: getLoginInstructions(),
    });
  }
}

function getLoginInstructions(): string {
  return `Pour connecter Claude CLI, exécutez ces commandes sur le serveur:

# 1. Connexion SSH au serveur
ssh debian@152.228.131.87
# Mot de passe: c620ceef6276c7c41b6c777dd24b8c83

# 2. Entrer dans le container Docker
sudo docker exec -it $(sudo docker ps --filter name=sitebuilder-dashboard -q) /bin/sh

# 3. Se connecter en tant qu'utilisateur claude et lancer le login
su -s /bin/sh claude -c "HOME=/home/claude claude login"

# 4. Suivre les instructions pour authentifier via le navigateur`;
}
