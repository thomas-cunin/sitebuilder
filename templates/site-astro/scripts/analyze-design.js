#!/usr/bin/env node

/**
 * Analyse le design d'un site web via screenshots
 * Extrait: couleurs, style, paramètres UI, sections présentes, industrie
 *
 * Usage: node scripts/analyze-design.js "https://example.com" [output-dir]
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClaudeLogger } from './claude-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load industry palettes for keyword matching
let industryPalettes = {};
try {
  industryPalettes = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'industry-palettes.json'), 'utf-8'));
} catch (e) {
  // Will use defaults
}

/**
 * Retourne la commande et les args pour exécuter Claude CLI
 * Utilise le wrapper si on est root (Docker)
 */
function getClaudeCommand(prompt) {
  const isRoot = process.getuid && process.getuid() === 0;
  const wrapperPath = join(__dirname, 'run-claude.sh');

  if (isRoot && existsSync(wrapperPath)) {
    // En root, utiliser le wrapper
    return {
      cmd: wrapperPath,
      args: ['--dangerously-skip-permissions', '--print', prompt]
    };
  }
  // Sinon, appeler claude directement
  return {
    cmd: 'claude',
    args: ['--dangerously-skip-permissions', '--print', prompt]
  };
}

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Detect industry from text content
 * @param {string} text - Text to analyze (description, page content, etc.)
 * @returns {{industry: string, confidence: number, reasoning: string}}
 */
export function detectIndustry(text) {
  if (!text) return { industry: 'default', confidence: 0, reasoning: 'No text provided' };

  const normalizedText = text.toLowerCase();
  const scores = {};

  for (const [industry, data] of Object.entries(industryPalettes)) {
    if (industry === 'default' || !data.keywords) continue;

    let score = 0;
    const matchedKeywords = [];

    for (const keyword of data.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score++;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      scores[industry] = { score, matchedKeywords };
    }
  }

  // Find best match
  let bestIndustry = 'default';
  let bestScore = 0;
  let matchedKeywords = [];

  for (const [industry, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestIndustry = industry;
      matchedKeywords = data.matchedKeywords;
    }
  }

  const confidence = Math.min(bestScore / 3, 1); // Normalize to 0-1

  return {
    industry: bestIndustry,
    confidence,
    reasoning: bestScore > 0
      ? `Matched keywords: ${matchedKeywords.join(', ')}`
      : 'No industry keywords matched, using default'
  };
}

/**
 * Get color palette for an industry
 * @param {string} industry - Industry name
 * @returns {{primary: string, secondary: string, accent: string, reasoning: string}}
 */
export function getIndustryPalette(industry) {
  const palette = industryPalettes[industry] || industryPalettes.default;
  return {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent || palette.secondary,
    reasoning: palette.reasoning
  };
}

/**
 * Detect pricing section on page
 * @param {import('puppeteer').Page} page
 * @returns {Promise<{hasPricing: boolean, pricingType: string, indicators: string[]}>}
 */
async function detectPricingSection(page) {
  return page.evaluate(() => {
    const indicators = [];
    let pricingType = 'none';

    // Check for pricing-related elements
    const pricingSelectors = [
      '[class*="pricing"]',
      '[id*="pricing"]',
      '[class*="tarif"]',
      '[id*="tarif"]',
      '[class*="plans"]',
      '[class*="price"]',
    ];

    for (const selector of pricingSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        indicators.push(`Found ${elements.length} elements matching "${selector}"`);
      }
    }

    // Check for price patterns in text
    const pageText = document.body.innerText;

    // Currency patterns
    const currencyPatterns = [
      /\d+[.,]?\d*\s*[€$£]/g,
      /[€$£]\s*\d+[.,]?\d*/g,
      /\d+\s*(€|EUR|USD|\$|£)/gi,
      /prix|price|tarif/gi,
      /\/\s*mois|\/\s*month|\/\s*an|\/\s*year/gi,
    ];

    let priceMatches = 0;
    for (const pattern of currencyPatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        priceMatches += matches.length;
      }
    }

    if (priceMatches > 3) {
      indicators.push(`Found ${priceMatches} price-related patterns`);
    }

    // Determine pricing type
    if (indicators.length > 0 || priceMatches > 3) {
      // Check for menu indicators (restaurant)
      const menuKeywords = ['menu', 'carte', 'plat', 'entrée', 'dessert', 'boisson'];
      const hasMenuKeywords = menuKeywords.some(k => pageText.toLowerCase().includes(k));

      // Check for plans/subscription indicators
      const planKeywords = ['plan', 'offre', 'formule', 'abonnement', 'starter', 'pro', 'enterprise', 'basic', 'premium'];
      const hasPlanKeywords = planKeywords.some(k => pageText.toLowerCase().includes(k));

      // Check for quote/contact indicators
      const quoteKeywords = ['devis', 'sur mesure', 'contactez', 'quote', 'custom', 'contact us'];
      const hasQuoteKeywords = quoteKeywords.some(k => pageText.toLowerCase().includes(k));

      if (hasMenuKeywords && priceMatches > 5) {
        pricingType = 'menu';
      } else if (hasPlanKeywords) {
        pricingType = 'plans';
      } else if (hasQuoteKeywords && priceMatches < 3) {
        pricingType = 'quote';
      } else if (priceMatches > 0) {
        pricingType = 'simple';
      }
    }

    return {
      hasPricing: indicators.length > 0 || priceMatches > 3,
      pricingType,
      indicators
    };
  });
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

4. **Industrie détectée** (analyse le contenu visible):
   - Identifie le secteur d'activité: healthcare | restaurant | technology | finance | creative | legal | realestate | education | fitness | beauty | construction | consulting | hospitality | environment | default
   - Base-toi sur le contenu visible, les images, et le style général

5. **Sections présentes** (analyse les screenshots):
   - Identifie si une section pricing/tarifs est présente
   - Type de pricing: "plans" (abonnements SaaS) | "menu" (restaurant) | "quote" (sur devis) | "simple" (prix unitaires) | "none"

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
  "industry": {
    "detected": "industry-name",
    "confidence": 0.0-1.0,
    "reasoning": "Why this industry was detected"
  },
  "sections": {
    "hasPricing": true|false,
    "pricingType": "plans|menu|quote|simple|none",
    "hasTestimonials": true|false,
    "hasFAQ": true|false
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

  // Obtenir la commande Claude (avec wrapper si root)
  const { cmd, args } = getClaudeCommand(prompt);

  return new Promise((resolve, reject) => {
    const claude = spawn(cmd, args, {
      cwd: outputDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, HOME: process.env.HOME || '/home/claude' }
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
    // 1. Capturer les screenshots et détecter le pricing
    const screenshotsDir = join(outputDir, 'screenshots');
    mkdirSync(screenshotsDir, { recursive: true });

    console.log(`${c.blue}📸 Capture des screenshots...${c.reset}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const screenshots = [];
    let pricingInfo = { hasPricing: false, pricingType: 'none', indicators: [] };
    let pageText = '';

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));

      // Screenshot hero/header
      const heroPath = join(screenshotsDir, 'hero-desktop.png');
      await page.screenshot({ path: heroPath, type: 'png' });
      screenshots.push(heroPath);
      console.log(`  ${c.green}✓${c.reset} Hero desktop`);

      // Screenshot page complète
      const fullPath = join(screenshotsDir, 'full-desktop.png');
      await page.screenshot({ path: fullPath, fullPage: true, type: 'png' });
      screenshots.push(fullPath);
      console.log(`  ${c.green}✓${c.reset} Page complète desktop`);

      // Detect pricing section
      pricingInfo = await detectPricingSection(page);
      if (pricingInfo.hasPricing) {
        console.log(`  ${c.cyan}→ Pricing detected: ${pricingInfo.pricingType}${c.reset}`);
      }

      // Get page text for industry detection
      pageText = await page.evaluate(() => document.body.innerText);

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

    if (screenshots.length === 0) {
      console.log(`${c.yellow}⚠ Aucun screenshot capturé${c.reset}`);
      return null;
    }

    // 2. Detect industry from page text
    const industryInfo = detectIndustry(pageText);
    console.log(`  ${c.cyan}→ Industry detected: ${industryInfo.industry} (${Math.round(industryInfo.confidence * 100)}%)${c.reset}`);

    // 3. Analyser avec Claude
    const designConfig = await analyzeDesignWithClaude(screenshots, outputDir);

    // Merge detected info if Claude didn't provide it
    if (designConfig) {
      if (!designConfig.sections) {
        designConfig.sections = pricingInfo;
      }
      if (!designConfig.industry || designConfig.industry.confidence < industryInfo.confidence) {
        designConfig.industry = industryInfo;
      }

      // Save updated config
      writeFileSync(join(outputDir, 'design-config.json'), JSON.stringify(designConfig, null, 2));
    }

    // 4. Générer la config Tailwind
    const tailwindValues = generateTailwindConfig(designConfig);

    return {
      config: designConfig,
      tailwind: tailwindValues,
      screenshots,
      pricing: pricingInfo,
      industry: industryInfo
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
