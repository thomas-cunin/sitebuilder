#!/usr/bin/env node

/**
 * Validation visuelle post-génération
 *
 * Capture des screenshots en scrollant le site généré,
 * puis analyse avec Claude pour détecter les problèmes visuels.
 *
 * Usage: node scripts/validate-site.js <client-dir> [--fix]
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${c.reset}`);
}

/**
 * Lance le serveur de preview et retourne l'URL
 */
async function startPreviewServer(clientDir) {
  return new Promise((resolve, reject) => {
    log('🚀 Démarrage du serveur de preview...', c.blue);

    const server = spawn('npm', ['run', 'preview', '--', '--port', '4322'], {
      cwd: clientDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });

    let resolved = false;

    server.stdout.on('data', (data) => {
      const output = data.toString();
      // Astro preview affiche l'URL quand le serveur est prêt
      if (output.includes('localhost') && !resolved) {
        resolved = true;
        setTimeout(() => resolve({ server, url: 'http://localhost:4322' }), 1000);
      }
    });

    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('localhost') && !resolved) {
        resolved = true;
        setTimeout(() => resolve({ server, url: 'http://localhost:4322' }), 1000);
      }
    });

    server.on('error', reject);

    // Timeout au cas où
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ server, url: 'http://localhost:4322' });
      }
    }, 5000);
  });
}

/**
 * Capture des screenshots en scrollant
 */
async function captureScrollingScreenshots(url, outputDir) {
  const screenshotsDir = join(outputDir, 'validation-screenshots');
  mkdirSync(screenshotsDir, { recursive: true });

  log('\n📸 Capture des screenshots de validation...', c.blue);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screenshots = [];

  try {
    const page = await browser.newPage();

    // Desktop
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Récupérer la hauteur totale de la page
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = 1080;
    const scrollSteps = Math.ceil(pageHeight / viewportHeight);

    log(`  Page height: ${pageHeight}px, capturing ${scrollSteps} sections`, c.cyan);

    // Screenshots desktop en scrollant
    for (let i = 0; i < scrollSteps; i++) {
      const scrollY = i * viewportHeight;
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await new Promise(r => setTimeout(r, 500));

      const filename = `desktop-section-${i + 1}.png`;
      const filepath = join(screenshotsDir, filename);
      await page.screenshot({ path: filepath, type: 'png' });
      screenshots.push({ path: filepath, viewport: 'desktop', section: i + 1 });
      log(`  ${c.green}✓${c.reset} ${filename}`);
    }

    // Mobile
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const mobileHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const mobileSteps = Math.min(Math.ceil(mobileHeight / 812), 5); // Max 5 pour mobile

    for (let i = 0; i < mobileSteps; i++) {
      const scrollY = i * 812;
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await new Promise(r => setTimeout(r, 500));

      const filename = `mobile-section-${i + 1}.png`;
      const filepath = join(screenshotsDir, filename);
      await page.screenshot({ path: filepath, type: 'png' });
      screenshots.push({ path: filepath, viewport: 'mobile', section: i + 1 });
      log(`  ${c.green}✓${c.reset} ${filename}`);
    }

  } catch (error) {
    log(`  ⚠ Erreur capture: ${error.message}`, c.yellow);
  }

  await browser.close();
  return screenshots;
}

/**
 * Analyse les screenshots avec Claude pour détecter les problèmes
 */
async function analyzeWithClaude(screenshots, clientDir) {
  log('\n🔍 Analyse visuelle avec Claude...', c.blue);

  const reportPath = join(clientDir, 'validation-report.json');
  const imageRefs = screenshots.map(s => `- ${s.path} (${s.viewport}, section ${s.section})`).join('\n');

  const prompt = `Tu es un expert QA/UI chargé de valider un site web généré automatiquement.

Analyse ces screenshots et identifie TOUS les problèmes visuels.

## Screenshots à analyser:
${imageRefs}

## Checklist de validation:

### 1. Texte et lisibilité
- Texte tronqué ou coupé
- Texte qui déborde de son conteneur
- Texte illisible (contraste insuffisant avec le fond)
- Texte trop petit pour être lu
- Texte superposé à d'autres éléments

### 2. Layout et espacement
- Éléments qui se chevauchent
- Espacement incohérent entre sections
- Éléments mal alignés
- Conteneurs vides ou trop petits
- Débordements horizontaux (scroll horizontal indésirable)

### 3. Images et médias
- Images manquantes (zones vides, icônes cassées)
- Images déformées ou mal proportionnées
- Placeholder non remplacés

### 4. Composants UI
- Boutons tronqués ou mal formés
- Cartes avec contenu coupé
- Navigation cassée ou incomplète
- Footer mal positionné

### 5. Responsive
- Éléments trop larges sur mobile
- Texte trop petit sur mobile
- Menu mobile non fonctionnel (visuellement)

### 6. Cohérence
- Couleurs incohérentes
- Styles de typographie mélangés
- Espacements inconsistants

## Output attendu

Écris le fichier ${reportPath} avec cette structure:

\`\`\`json
{
  "status": "success" | "warning" | "error",
  "summary": "Résumé en une phrase",
  "score": 0-100,
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "category": "text" | "layout" | "image" | "component" | "responsive" | "style",
      "viewport": "desktop" | "mobile" | "both",
      "section": "hero" | "services" | "testimonials" | "pricing" | "faq" | "contact" | "footer" | "header",
      "description": "Description précise du problème",
      "location": "Description de l'emplacement",
      "suggestion": "Comment corriger ce problème"
    }
  ],
  "recommendations": [
    "Recommandation générale 1",
    "Recommandation générale 2"
  ]
}
\`\`\`

IMPORTANT:
- Sois exhaustif, liste TOUS les problèmes visibles
- Priorise les problèmes critiques (texte illisible, éléments cassés)
- Pour chaque problème, indique clairement où il se trouve
- Si le site semble correct, indique quand même les améliorations possibles
- Score 90-100 = excellent, 70-89 = bon, 50-69 = passable, <50 = problématique

Écris le fichier maintenant avec Write.`;

  const promptFile = join(clientDir, '.validation-prompt.txt');
  writeFileSync(promptFile, prompt);

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--dangerously-skip-permissions',
      '--output-format', 'text'
    ], {
      cwd: clientDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // Envoyer le prompt via stdin
    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', () => {
      process.stdout.write(c.green + '.' + c.reset);
    });

    claude.stderr.on('data', (data) => {
      const text = data.toString();
      if (text.includes('error') || text.includes('Error')) {
        process.stderr.write(c.yellow + text + c.reset);
      }
    });

    claude.on('close', () => {
      console.log('\n');
      if (existsSync(reportPath)) {
        try {
          const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
          resolve(report);
        } catch (e) {
          log('⚠ Erreur parsing du rapport', c.yellow);
          resolve(null);
        }
      } else {
        log('⚠ Rapport non généré', c.yellow);
        resolve(null);
      }
    });

    claude.on('error', reject);
  });
}

/**
 * Tente de corriger les problèmes automatiquement
 */
async function autoFix(report, clientDir) {
  if (!report || !report.issues || report.issues.length === 0) {
    log('✓ Aucun problème à corriger', c.green);
    return;
  }

  const criticalIssues = report.issues.filter(i => i.severity === 'critical');
  const majorIssues = report.issues.filter(i => i.severity === 'major');

  if (criticalIssues.length === 0 && majorIssues.length === 0) {
    log('✓ Aucun problème critique ou majeur à corriger', c.green);
    return;
  }

  log('\n🔧 Tentative de correction automatique...', c.blue);

  const issuesText = [...criticalIssues, ...majorIssues].map((issue, i) =>
    `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.section}: ${issue.description}\n   Suggestion: ${issue.suggestion}`
  ).join('\n\n');

  const fixPrompt = `Tu dois corriger des problèmes visuels dans un site Astro/Tailwind.

## Dossier du projet: ${clientDir}

## Problèmes à corriger:

${issuesText}

## Instructions:

1. Lis les fichiers de composants concernés dans src/components/
2. Identifie la cause de chaque problème
3. Corrige le code (Astro/Tailwind CSS)
4. Privilégie des corrections CSS simples:
   - truncate, line-clamp pour le texte
   - overflow-hidden pour les débordements
   - min-h, max-w pour les dimensions
   - text-sm/text-base pour la taille du texte
   - contrast fixes avec text-white/text-black

Applique les corrections maintenant avec Edit.`;

  const fixPromptFile = join(clientDir, '.fix-prompt.txt');
  writeFileSync(fixPromptFile, fixPrompt);

  return new Promise((resolve) => {
    const claude = spawn('claude', [
      '--dangerously-skip-permissions',
      '--output-format', 'text'
    ], {
      cwd: clientDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // Envoyer le prompt via stdin
    claude.stdin.write(fixPrompt);
    claude.stdin.end();

    claude.stdout.on('data', () => {
      process.stdout.write(c.cyan + '.' + c.reset);
    });

    claude.on('close', (code) => {
      console.log('\n');
      if (code === 0) {
        log('✓ Corrections appliquées', c.green);
      }
      resolve();
    });

    claude.on('error', () => resolve());
  });
}

/**
 * Affiche le rapport de validation
 */
function displayReport(report) {
  if (!report) {
    log('\n⚠ Impossible de générer le rapport de validation', c.yellow);
    return;
  }

  const statusColors = {
    success: c.green,
    warning: c.yellow,
    error: c.red
  };

  const statusIcons = {
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  console.log('\n' + c.bold + '╔══════════════════════════════════════════════════════╗' + c.reset);
  console.log(c.bold + '║           📊 RAPPORT DE VALIDATION                    ║' + c.reset);
  console.log(c.bold + '╚══════════════════════════════════════════════════════╝' + c.reset);

  console.log(`\n${statusIcons[report.status]} Status: ${statusColors[report.status]}${report.status.toUpperCase()}${c.reset}`);
  console.log(`📈 Score: ${report.score >= 70 ? c.green : report.score >= 50 ? c.yellow : c.red}${report.score}/100${c.reset}`);
  console.log(`📝 ${report.summary}`);

  if (report.issues && report.issues.length > 0) {
    console.log(`\n${c.bold}Problèmes détectés (${report.issues.length}):${c.reset}\n`);

    const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
    const majorCount = report.issues.filter(i => i.severity === 'major').length;
    const minorCount = report.issues.filter(i => i.severity === 'minor').length;

    if (criticalCount > 0) console.log(`  ${c.red}● ${criticalCount} critique(s)${c.reset}`);
    if (majorCount > 0) console.log(`  ${c.yellow}● ${majorCount} majeur(s)${c.reset}`);
    if (minorCount > 0) console.log(`  ${c.cyan}● ${minorCount} mineur(s)${c.reset}`);

    console.log('\n' + c.bold + 'Détails:' + c.reset);
    report.issues.forEach((issue, i) => {
      const severityColor = issue.severity === 'critical' ? c.red :
                           issue.severity === 'major' ? c.yellow : c.cyan;
      console.log(`\n  ${i + 1}. ${severityColor}[${issue.severity.toUpperCase()}]${c.reset} ${issue.section}`);
      console.log(`     ${issue.description}`);
      console.log(`     ${c.blue}→ ${issue.suggestion}${c.reset}`);
    });
  }

  if (report.recommendations && report.recommendations.length > 0) {
    console.log(`\n${c.bold}Recommandations:${c.reset}`);
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  console.log('');
}

/**
 * Point d'entrée principal
 */
export async function validateSite(clientDir, options = {}) {
  const { fix = false, skipServer = false, serverUrl = null, fixOnly = false } = options;

  if (!existsSync(clientDir)) {
    log(`❌ Dossier non trouvé: ${clientDir}`, c.red);
    return null;
  }

  // Mode correction seule : utilise le dernier rapport existant
  if (fixOnly || (fix && skipServer)) {
    const reportPath = join(clientDir, 'validation-report.json');
    if (existsSync(reportPath)) {
      try {
        const existingReport = JSON.parse(readFileSync(reportPath, 'utf-8'));
        if (existingReport.issues && existingReport.issues.length > 0) {
          await autoFix(existingReport, clientDir);
        }
        return existingReport;
      } catch (e) {
        log('⚠ Pas de rapport existant pour correction', c.yellow);
        return null;
      }
    }
    return null;
  }

  let server = null;
  let url = serverUrl || 'http://localhost:4322';

  try {
    // Démarrer le serveur si nécessaire
    if (!skipServer && !serverUrl) {
      const result = await startPreviewServer(clientDir);
      server = result.server;
      url = result.url;
      log(`✓ Serveur démarré sur ${url}`, c.green);
    }

    // Capturer les screenshots
    const screenshots = await captureScrollingScreenshots(url, clientDir);

    if (screenshots.length === 0) {
      log('⚠ Aucun screenshot capturé', c.yellow);
      return null;
    }

    log(`✓ ${screenshots.length} screenshots capturés`, c.green);

    // Analyser avec Claude
    const report = await analyzeWithClaude(screenshots, clientDir);

    // Afficher le rapport
    displayReport(report);

    // Corriger si demandé (dans le même flow)
    if (fix && report && report.issues && report.issues.length > 0) {
      const hasCriticalOrMajor = report.issues.some(i =>
        i.severity === 'critical' || i.severity === 'major'
      );

      if (hasCriticalOrMajor) {
        await autoFix(report, clientDir);
      }
    }

    return report;

  } finally {
    // Arrêter le serveur
    if (server) {
      try {
        process.kill(-server.pid);
      } catch (e) {
        // Ignorer si déjà arrêté
      }
    }
  }
}

// Exécution directe
if (process.argv[1].includes('validate-site')) {
  const args = process.argv.slice(2);
  const clientDir = args.find(a => !a.startsWith('--'));
  const shouldFix = args.includes('--fix');

  if (!clientDir) {
    log('\nUsage: node scripts/validate-site.js <client-dir> [--fix]', c.yellow);
    log('\nOptions:');
    log('  --fix    Tenter de corriger automatiquement les problèmes\n');
    process.exit(1);
  }

  validateSite(clientDir, { fix: shouldFix }).then(report => {
    if (report) {
      process.exit(report.status === 'error' ? 1 : 0);
    } else {
      process.exit(1);
    }
  }).catch(err => {
    log(`\n❌ Erreur: ${err.message}`, c.red);
    process.exit(1);
  });
}
