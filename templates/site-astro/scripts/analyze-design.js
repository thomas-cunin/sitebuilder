#!/usr/bin/env node

/**
 * Analyse le design d'un site web via screenshots
 * Extrait: couleurs, style, paramètres UI
 *
 * Usage: node scripts/analyze-design.js "https://example.com" [output-dir]
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createClaudeLogger } from './claude-logger.js';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Capture des screenshots du site
 */
async function captureScreenshots(url, outputDir) {
  const screenshotsDir = join(outputDir, 'screenshots');

  // S'assurer que le dossier existe
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log(`${c.blue}📸 Capture des screenshots...${c.reset}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const screenshots = [];

  try {
    // Screenshot desktop - page complète
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Attendre un peu pour les animations
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot hero/header (visible au chargement)
    const heroPath = join(screenshotsDir, 'hero-desktop.png');
    await page.screenshot({ path: heroPath, type: 'png' });
    screenshots.push(heroPath);
    console.log(`  ${c.green}✓${c.reset} Hero desktop`);

    // Screenshot page complète
    const fullPath = join(screenshotsDir, 'full-desktop.png');
    await page.screenshot({ path: fullPath, fullPage: true, type: 'png' });
    screenshots.push(fullPath);
    console.log(`  ${c.green}✓${c.reset} Page complète desktop`);

    // Screenshot mobile
    await page.setViewport({ width: 375, height: 812 });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const mobilePath = join(screenshotsDir, 'hero-mobile.png');
    await page.screenshot({ path: mobilePath, type: 'png' });
    screenshots.push(mobilePath);
    console.log(`  ${c.green}✓${c.reset} Hero mobile`);

  } catch (error) {
    console.log(`  ${c.yellow}⚠ Erreur capture: ${error.message}${c.reset}`);
  }

  await browser.close();
  return screenshots;
}

/**
 * Analyse les screenshots avec Claude pour extraire le design
 */
async function analyzeDesignWithClaude(screenshots, outputDir) {
  console.log(`\n${c.blue}🎨 Analyse du design avec Claude...${c.reset}`);

  const logger = createClaudeLogger(outputDir);
  const designConfigPath = join(outputDir, 'design-config.json');

  // Construire le prompt avec références aux images
  const imageRefs = screenshots.map(s => `- ${s}`).join('\n');

  const prompt = `Analyse ces screenshots d'un site web pour en extraire le design system.

Screenshots à analyser:
${imageRefs}

Lis ces images et analyse-les visuellement pour extraire:

1. **Couleurs** (en format hex):
   - Couleur primaire (boutons, liens, accents principaux)
   - Couleur secondaire (accents secondaires)
   - Couleur de fond principale
   - Couleur de texte principale

2. **Style général**:
   - Style: "modern" | "classic" | "minimal" | "bold" | "elegant"
   - Mood: "professional" | "friendly" | "luxurious" | "tech" | "creative"

3. **Paramètres UI**:
   - borderRadius: "none" | "small" | "medium" | "large" | "full"
   - shadows: "none" | "subtle" | "medium" | "strong"
   - spacing: "compact" | "normal" | "spacious"
   - fontStyle: "sans" | "serif" | "mono" | "mixed"

Écris le fichier ${designConfigPath} avec cette structure EXACTE:

\`\`\`json
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex",
    "text": "#hex",
    "accent": "#hex"
  },
  "style": {
    "type": "modern|classic|minimal|bold|elegant",
    "mood": "professional|friendly|luxurious|tech|creative"
  },
  "ui": {
    "borderRadius": "none|small|medium|large|full",
    "shadows": "none|subtle|medium|strong",
    "spacing": "compact|normal|spacious",
    "fontStyle": "sans|serif|mono|mixed"
  },
  "tailwind": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "borderRadius": "0|0.25rem|0.5rem|1rem|9999px",
    "fontFamily": "font-sans|font-serif|font-mono"
  },
  "notes": "Description courte du style observé"
}
\`\`\`

IMPORTANT: Utilise les vraies couleurs extraites des screenshots, pas des valeurs par défaut.
Écris le fichier maintenant avec Write.`;

  // Écrire le prompt dans un fichier temporaire
  const promptFile = join(outputDir, '.design-prompt.txt');
  writeFileSync(promptFile, prompt);

  // Démarrer le logging
  const logContext = logger.start('design-analysis', prompt);

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--dangerously-skip-permissions',
      '--print',
      prompt
    ], {
      cwd: outputDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    claude.stdout.on('data', (data) => {
      const text = data.toString();
      logContext.stdout += text;
      process.stdout.write(c.green + '.' + c.reset);
    });

    claude.stderr.on('data', (data) => {
      const text = data.toString();
      logContext.stderr += text;
      if (text.includes('error') || text.includes('Error')) {
        console.error(c.yellow + text + c.reset);
      }
    });

    claude.on('close', (code) => {
      // Log la fin de l'appel
      logger.end(logContext, code);

      console.log('\n');
      if (existsSync(designConfigPath)) {
        try {
          const config = JSON.parse(readFileSync(designConfigPath, 'utf-8'));
          console.log(`${c.green}✓ Design analysé${c.reset}`);
          console.log(`  Couleur primaire: ${c.cyan}${config.colors?.primary || 'N/A'}${c.reset}`);
          console.log(`  Style: ${c.cyan}${config.style?.type || 'N/A'}${c.reset}`);
          console.log(`  UI: ${c.cyan}${config.ui?.borderRadius || 'N/A'} corners, ${config.ui?.shadows || 'N/A'} shadows${c.reset}`);
          logger.info(`Design analysis complete: ${config.style?.type || 'unknown'} style`);
          resolve(config);
        } catch (e) {
          console.log(`${c.yellow}⚠ Erreur parsing design config${c.reset}`);
          logger.error('Failed to parse design config', e);
          resolve(null);
        }
      } else {
        console.log(`${c.yellow}⚠ Design config non généré, utilisation des valeurs par défaut${c.reset}`);
        logger.warn('Design config not generated, using defaults');
        resolve(null);
      }
    });

    claude.on('error', (err) => {
      logger.end(logContext, -1, err);
      reject(err);
    });
  });
}

/**
 * Génère les valeurs Tailwind à partir du design config
 */
function generateTailwindConfig(designConfig) {
  if (!designConfig) {
    return {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      borderRadius: '0.5rem',
      fontFamily: 'font-sans'
    };
  }

  const radiusMap = {
    'none': '0',
    'small': '0.25rem',
    'medium': '0.5rem',
    'large': '1rem',
    'full': '9999px'
  };

  return {
    primaryColor: designConfig.colors?.primary || '#3b82f6',
    secondaryColor: designConfig.colors?.secondary || '#8b5cf6',
    borderRadius: radiusMap[designConfig.ui?.borderRadius] || '0.5rem',
    fontFamily: `font-${designConfig.ui?.fontStyle || 'sans'}`
  };
}

/**
 * Point d'entrée principal
 */
export async function analyzeDesign(url, outputDir) {
  // Vérifier si c'est une URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.log(`${c.yellow}⚠ Pas d'URL fournie, skip de l'analyse design${c.reset}`);
    return null;
  }

  try {
    // 1. Capturer les screenshots
    const screenshots = await captureScreenshots(url, outputDir);

    if (screenshots.length === 0) {
      console.log(`${c.yellow}⚠ Aucun screenshot capturé${c.reset}`);
      return null;
    }

    // 2. Analyser avec Claude
    const designConfig = await analyzeDesignWithClaude(screenshots, outputDir);

    // 3. Générer la config Tailwind
    const tailwindValues = generateTailwindConfig(designConfig);

    return {
      config: designConfig,
      tailwind: tailwindValues,
      screenshots
    };

  } catch (error) {
    console.log(`${c.yellow}⚠ Erreur analyse design: ${error.message}${c.reset}`);
    return null;
  }
}

// Exécution directe
if (process.argv[1].includes('analyze-design')) {
  const url = process.argv[2];
  const outputDir = process.argv[3] || './temp-analysis';

  if (!url) {
    console.log('Usage: node scripts/analyze-design.js <url> [output-dir]');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });
  analyzeDesign(url, outputDir).then(result => {
    if (result) {
      console.log('\n✅ Analyse terminée');
      console.log(JSON.stringify(result.tailwind, null, 2));
    }
  });
}
