#!/usr/bin/env node

/**
 * Générateur créatif avec agents spécialisés
 *
 * Chaque section est générée par un agent Claude indépendant
 * qui a la liberté de créer un design unique dans les contraintes définies.
 *
 * Usage: node scripts/creative-generate.js "https://example.com" "nom-client"
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClaudeLogger } from './claude-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load industry palettes
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

// Import dynamique pour gérer l'absence de puppeteer
let analyzeDesign = null;
let validateSite = null;
let extractImagesFromSource = null;
let fetchImagesForSite = null;
let detectIndustry = null;
let getIndustryPalette = null;

try {
  const mod = await import('./analyze-design.js');
  analyzeDesign = mod.analyzeDesign;
  detectIndustry = mod.detectIndustry;
  getIndustryPalette = mod.getIndustryPalette;
} catch {
  // puppeteer non disponible
}

try {
  const mod = await import('./validate-site.js');
  validateSite = mod.validateSite;
} catch {
  // puppeteer non disponible
}

try {
  const mod = await import('./extract-media.js');
  extractImagesFromSource = mod.extractImagesFromSource;
} catch {
  // puppeteer non disponible
}

try {
  const mod = await import('./image-library.js');
  fetchImagesForSite = mod.fetchImagesForSite;
} catch {
  // module non disponible
}

const TEMPLATE_DIR = join(__dirname, '..');
const PROMPTS_DIR = join(TEMPLATE_DIR, 'prompts', 'agents');

/**
 * Fallback industry detection when puppeteer module isn't available
 */
function detectIndustryFallback(text) {
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

  return {
    industry: bestIndustry,
    confidence: Math.min(bestScore / 3, 1),
    reasoning: bestScore > 0
      ? `Matched keywords: ${matchedKeywords.join(', ')}`
      : 'No industry keywords matched, using default'
  };
}

/**
 * Hide skipped sections in page templates by commenting them out
 */
async function hideSkippedSectionsInPages(outputDir, skippedSections) {
  const pagesDir = join(outputDir, 'src', 'pages');
  const fs = await import('fs/promises');

  // Map section names to component names
  const sectionToComponent = {
    'hero': 'Hero',
    'services': 'Services',
    'testimonials': 'Testimonials',
    'pricing': 'Pricing',
    'faq': 'FAQ'
  };

  // Find all .astro page files
  const processDir = async (dir) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await processDir(fullPath);
        } else if (entry.name.endsWith('.astro')) {
          await processPageFile(fullPath, skippedSections, sectionToComponent, fs);
        }
      }
    } catch (e) {
      // Directory might not exist
    }
  };

  await processDir(pagesDir);
}

async function processPageFile(filePath, skippedSections, sectionToComponent, fs) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;

    for (const section of skippedSections) {
      const componentName = sectionToComponent[section];
      if (!componentName) continue;

      // Comment out the component usage (e.g., <Pricing /> or <Pricing client:load />)
      const regex = new RegExp(`(<${componentName}[^>]*/>)`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `{/* $1 Section ${section} hidden */}`);
        modified = true;
      }

      // Also handle self-closing with attributes on multiple lines
      const regexMultiline = new RegExp(`(<${componentName}[\\s\\S]*?/>)`, 'g');
      if (regexMultiline.test(content) && !modified) {
        content = content.replace(regexMultiline, `{/* $1 Section ${section} hidden */}`);
        modified = true;
      }
    }

    if (modified) {
      await fs.writeFile(filePath, content);
    }
  } catch (e) {
    // File might not exist or other error
  }
}

/**
 * Fallback get industry palette
 */
function getIndustryPaletteFallback(industry) {
  const palette = industryPalettes[industry] || industryPalettes.default || {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    reasoning: 'Default professional palette'
  };
  return {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent || palette.secondary,
    reasoning: palette.reasoning
  };
}

// Output directory for generated sites - use CLIENTS_DIR env var if set
const CLIENTS_DIR = process.env.CLIENTS_DIR || join(TEMPLATE_DIR, 'clients');

// Couleurs terminal
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

function logPhase(phase, msg) {
  console.log(`\n${c.magenta}━━━ Phase ${phase}: ${msg} ━━━${c.reset}\n`);
}

function logAgent(name, status) {
  const icons = {
    start: '🤖',
    success: '✅',
    error: '❌',
    skip: '⏭️'
  };
  console.log(`  ${icons[status] || '•'} ${c.cyan}${name}${c.reset}`);
}

// Logger global pour la session
let sessionLogger = null;

function getLogger(outputDir) {
  if (!sessionLogger) {
    sessionLogger = createClaudeLogger(outputDir);
  }
  return sessionLogger;
}

/**
 * Exécute un agent Claude avec un prompt spécifique
 */
async function runAgent(name, prompt, outputDir) {
  logAgent(name, 'start');

  const logger = getLogger(outputDir);
  const logContext = logger.start(name, prompt);

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
        process.stderr.write(c.yellow + text + c.reset);
      }
    });

    claude.on('close', (code) => {
      // Log la fin de l'appel
      logger.end(logContext, code);

      console.log('');
      if (code === 0) {
        logAgent(name, 'success');
        resolve(logContext.stdout);
      } else {
        logAgent(name, 'error');
        reject(new Error(`Agent ${name} failed with code ${code}`));
      }
    });

    claude.on('error', (err) => {
      logger.end(logContext, -1, err);
      reject(err);
    });
  });
}

/**
 * Charge un prompt d'agent et le personnalise
 */
function loadAgentPrompt(agentName, context) {
  const promptPath = join(PROMPTS_DIR, `${agentName}-agent.md`);

  if (!existsSync(promptPath)) {
    return null;
  }

  let prompt = readFileSync(promptPath, 'utf-8');

  // Ajouter le contexte
  prompt += `\n\n---\n\n## Contexte pour cette génération\n\n`;
  prompt += `### Design Config\n\`\`\`json\n${JSON.stringify(context.designConfig, null, 2)}\n\`\`\`\n\n`;
  prompt += `### Direction Créative\n\`\`\`json\n${JSON.stringify(context.creativeDirection, null, 2)}\n\`\`\`\n\n`;
  prompt += `### Contenu\n\`\`\`json\n${JSON.stringify(context.content, null, 2)}\n\`\`\`\n\n`;
  prompt += `### Dossier de sortie: ${context.outputDir}\n`;

  return prompt;
}

/**
 * Génère la direction créative globale
 */
async function generateCreativeDirection(designConfig, outputDir) {
  const tokens = JSON.parse(readFileSync(join(TEMPLATE_DIR, 'data', 'design-tokens.json'), 'utf-8'));

  const prompt = `Tu es le directeur artistique pour ce projet.

## Design analysé
\`\`\`json
${JSON.stringify(designConfig, null, 2)}
\`\`\`

## Tokens disponibles
\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

## Ta mission

1. Analyse le design config
2. Choisis un style de la liste (minimal, modern, bold, glassmorphism, brutalist, elegant, playful, dark-tech)
3. Définis une direction créative cohérente
4. Recommande les variantes pour chaque section

## Output

Écris le fichier ${outputDir}/creative-direction.json:

\`\`\`json
{
  "style": "nom du style choisi",
  "direction": "Description de la direction artistique en 2-3 phrases",
  "palette": {
    "primary": "${designConfig?.colors?.primary || '#3b82f6'}",
    "secondary": "${designConfig?.colors?.secondary || '#8b5cf6'}",
    "usage": "Description de l'utilisation des couleurs"
  },
  "typography": {
    "headings": "Style des titres",
    "body": "Style du corps de texte"
  },
  "components": {
    "buttons": "Style des boutons",
    "cards": "Style des cartes",
    "sections": "Espacement entre sections"
  },
  "effects": {
    "recommended": ["effet1", "effet2", "effet3"],
    "avoid": ["effet à éviter"]
  },
  "variants": {
    "hero": "variante recommandée",
    "services": "variante recommandée",
    "testimonials": "variante recommandée",
    "pricing": "variante recommandée"
  }
}
\`\`\`

Écris ce fichier maintenant avec Write.`;

  await runAgent('creative-direction', prompt, outputDir);

  // Charger la direction générée
  const directionPath = join(outputDir, 'creative-direction.json');
  if (existsSync(directionPath)) {
    return JSON.parse(readFileSync(directionPath, 'utf-8'));
  }

  // Fallback
  return {
    style: 'modern',
    direction: 'Style moderne et professionnel',
    variants: {
      hero: 'centered',
      services: 'grid-4',
      testimonials: 'cards',
      pricing: 'cards-3'
    }
  };
}

/**
 * Liste des agents de section
 * condition: function that receives context and returns true if section should be generated
 */
const SECTION_AGENTS = [
  { name: 'hero', component: 'Hero.astro', required: true },
  { name: 'services', component: 'Services.astro', required: true },
  { name: 'testimonials', component: 'Testimonials.astro', required: true },
  {
    name: 'pricing',
    component: 'Pricing.astro',
    required: false,
    condition: (ctx) => {
      // Include pricing if:
      // 1. Explicitly detected on source site
      // 2. Industry typically has pricing (tech, saas, fitness)
      // 3. Not explicitly excluded
      const sections = ctx.designConfig?.sections;
      const industry = ctx.designConfig?.industry?.detected || ctx.industry?.industry;

      // Industries that typically show pricing
      const pricingIndustries = ['technology', 'fitness', 'education', 'consulting', 'beauty'];

      if (sections?.hasPricing === false && sections?.pricingType === 'none') {
        return false;
      }
      if (sections?.hasPricing === true) {
        return true;
      }
      if (pricingIndustries.includes(industry)) {
        return true;
      }
      // Default: include pricing for most business sites
      return true;
    }
  },
  { name: 'faq', component: 'FAQ.astro', required: false },
];

async function main() {
  const args = process.argv.slice(2);
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 2) {
    log('\nUsage: node scripts/creative-generate.js <url-ou-description> <nom-client>\n', c.red);
    log('Ce script génère un site avec des composants créatifs uniques.');
    log('Chaque section est générée par un agent IA indépendant.\n');
    process.exit(1);
  }

  const [source, clientName] = filteredArgs;
  const outputDir = join(CLIENTS_DIR, clientName);
  const isUrl = source.startsWith('http://') || source.startsWith('https://');

  log('\n' + c.bold + '╔══════════════════════════════════════════════════════╗' + c.reset);
  log(c.bold + '║   🎨 GÉNÉRATION CRÉATIVE: ' + c.cyan + clientName.padEnd(25) + c.reset + c.bold + '  ║');
  log(c.bold + '╚══════════════════════════════════════════════════════╝\n' + c.reset);

  // Vérifier si le dossier existe
  const forceOverwrite = args.includes('--force') || args.includes('-y');
  if (existsSync(outputDir)) {
    // En mode non-interactif (pas de TTY) ou avec --force, écraser automatiquement
    if (!process.stdin.isTTY || forceOverwrite) {
      log(`→ Écrasement du dossier existant ${outputDir}`, c.yellow);
      rmSync(outputDir, { recursive: true, force: true });
    } else {
      log(`⚠ Le dossier ${outputDir} existe déjà`, c.yellow);
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise(resolve => rl.question('Écraser ? (y/N) ', resolve));
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        process.exit(0);
      }
      rmSync(outputDir, { recursive: true, force: true });
    }
  }

  // Phase 1: Setup
  logPhase(1, 'Préparation du projet');

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, 'data'), { recursive: true });
  mkdirSync(join(outputDir, 'src', 'components'), { recursive: true });
  mkdirSync(join(outputDir, 'src', 'styles'), { recursive: true });

  // Copier les fichiers de base
  const filesToCopy = [
    'src/layouts', 'src/pages', 'src/lib', 'src/styles', 'public',
    'package.json', 'astro.config.mjs', 'tailwind.config.mjs', 'tsconfig.json'
  ];

  for (const file of filesToCopy) {
    const src = join(TEMPLATE_DIR, file);
    const dest = join(outputDir, file);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
    }
  }

  // Copier pages.json
  cpSync(join(TEMPLATE_DIR, 'data', 'pages.json'), join(outputDir, 'data', 'pages.json'));
  cpSync(join(TEMPLATE_DIR, 'data', 'design-tokens.json'), join(outputDir, 'data', 'design-tokens.json'));

  log('✓ Structure créée', c.green);

  // Phase 2: Analyse design
  logPhase(2, 'Analyse du design');

  let designConfig = null;
  let extractedMedia = null;
  let industryInfo = null;

  if (isUrl && analyzeDesign) {
    try {
      const result = await analyzeDesign(source, outputDir);
      designConfig = result?.config || null;
      industryInfo = result?.industry || null;
    } catch (e) {
      log(`⚠ Analyse échouée: ${e.message}`, c.yellow);
    }
  } else if (isUrl) {
    log('→ Analyse design ignorée (puppeteer non disponible)', c.yellow);
  }

  // Phase 2b: Extract media from source (if URL provided)
  if (isUrl && extractImagesFromSource) {
    logPhase('2b', 'Extraction des médias');
    try {
      extractedMedia = await extractImagesFromSource(source, outputDir);
      if (extractedMedia?.logo) {
        log(`✓ Logo extrait: ${extractedMedia.logo}`, c.green);
      }
      if (extractedMedia?.hero) {
        log(`✓ Image hero extraite: ${extractedMedia.hero}`, c.green);
      }
    } catch (e) {
      log(`⚠ Extraction médias échouée: ${e.message}`, c.yellow);
    }
  }

  // Detect industry from description if no URL
  if (!isUrl) {
    const detectFn = detectIndustry || detectIndustryFallback;
    industryInfo = detectFn(source);
    log(`→ Industrie détectée: ${c.cyan}${industryInfo.industry}${c.reset} (${Math.round(industryInfo.confidence * 100)}%)`);
  }

  // Smart color selection based on industry
  if (!designConfig) {
    const getPaletteFn = getIndustryPalette || getIndustryPaletteFallback;
    const industry = industryInfo?.industry || 'default';
    const palette = getPaletteFn(industry);

    designConfig = {
      colors: {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent
      },
      style: { type: 'modern', mood: 'professional' },
      ui: { borderRadius: 'medium', shadows: 'subtle' },
      industry: industryInfo,
      sections: {
        hasPricing: true,
        pricingType: 'plans'
      }
    };
    log(`→ Palette ${c.cyan}${industry}${c.reset}: ${palette.primary} / ${palette.secondary}`, c.yellow);
    log(`  ${palette.reasoning}`, c.cyan);
  }

  // Phase 2c: Fetch library images if needed
  if (fetchImagesForSite && (!extractedMedia?.hero || extractedMedia.images?.length === 0)) {
    logPhase('2c', 'Recherche d\'images');
    const industry = industryInfo?.industry || designConfig?.industry?.detected || 'business';
    const keywords = isUrl ? industry : `${source} ${industry}`;

    try {
      const libraryImages = await fetchImagesForSite(keywords, outputDir, {
        count: 5,
        category: industry
      });
      if (libraryImages.images?.length > 0) {
        log(`✓ ${libraryImages.images.length} images téléchargées`, c.green);
      }
    } catch (e) {
      log(`⚠ Recherche images échouée: ${e.message}`, c.yellow);
    }
  }

  // Phase 3: Génération du contenu JSON
  logPhase(3, 'Génération du contenu');

  // Prompt explicite pour le contenu (structure stricte)
  const themeColors = {
    primary: designConfig.colors?.primary || '#3b82f6',
    secondary: designConfig.colors?.secondary || '#8b5cf6'
  };

  const contentPrompt = `Tu dois générer les fichiers JSON de configuration pour un site vitrine client.

**Source client:** ${source}

**Dossier de sortie:** ${outputDir}/data/

GÉNÈRE EXACTEMENT 4 fichiers avec l'outil Write. RESPECTE STRICTEMENT les structures JSON suivantes:

## 1. ${outputDir}/data/site.json
\`\`\`json
{
  "name": "Nom entreprise",
  "url": "https://domaine.com",
  "defaultLang": "fr",
  "langs": ["fr", "en"],
  "contact": { "email": "", "phone": "", "address": { "street": "", "city": "", "zip": "", "country": "France" } },
  "social": { "facebook": "", "instagram": "", "linkedin": "", "twitter": "", "github": "" },
  "seo": { "titleTemplate": "%s | NOM", "defaultImage": "/images/og-default.jpg" },
  "analytics": { "plausible": "", "googleAnalytics": "" },
  "theme": { "primaryColor": "${themeColors.primary}", "secondaryColor": "${themeColors.secondary}" }
}
\`\`\`

## 2. ${outputDir}/data/navigation.json
\`\`\`json
{
  "header": {
    "logo": { "text": "NOM_ENTREPRISE", "image": "" },
    "links": [
      { "id": "services", "href": "#services" },
      { "id": "testimonials", "href": "#testimonials" },
      { "id": "pricing", "href": "#pricing" },
      { "id": "faq", "href": "#faq" },
      { "id": "contact", "href": "#contact" }
    ],
    "cta": { "id": "contact", "href": "#contact" }
  },
  "footer": {
    "links": [
      { "id": "services", "href": "#services" },
      { "id": "testimonials", "href": "#testimonials" },
      { "id": "pricing", "href": "#pricing" },
      { "id": "faq", "href": "#faq" }
    ],
    "legal": [
      { "id": "privacy", "href": "/privacy" },
      { "id": "terms", "href": "/terms" }
    ]
  }
}
\`\`\`

## 3. ${outputDir}/data/content.json
STRUCTURE CRITIQUE - Respecte EXACTEMENT ce format (section.lang.key):
\`\`\`json
{
  "nav": {
    "fr": { "home": "Accueil", "services": "Services", "testimonials": "Témoignages", "pricing": "Tarifs", "faq": "FAQ", "contact": "Contact", "privacy": "Confidentialité", "terms": "Mentions légales" },
    "en": { "home": "Home", "services": "Services", "testimonials": "Testimonials", "pricing": "Pricing", "faq": "FAQ", "contact": "Contact", "privacy": "Privacy", "terms": "Terms" }
  },
  "hero": {
    "fr": { "title": "...", "subtitle": "...", "cta_primary": "...", "cta_secondary": "...", "trust_label": "..." },
    "en": { "title": "...", "subtitle": "...", "cta_primary": "...", "cta_secondary": "...", "trust_label": "..." }
  },
  "services": {
    "fr": { "title": "...", "subtitle": "..." },
    "en": { "title": "...", "subtitle": "..." },
    "items": [
      { "icon": "rocket|shield|chart|users", "title": { "fr": "...", "en": "..." }, "description": { "fr": "...", "en": "..." } }
    ]
  },
  "testimonials": {
    "fr": { "title": "...", "subtitle": "..." },
    "en": { "title": "...", "subtitle": "..." },
    "items": [
      { "content": { "fr": "...", "en": "..." }, "author": "...", "role": "...", "company": "...", "rating": 5 }
    ]
  },
  "pricing": {
    "fr": { "title": "...", "subtitle": "...", "popular": "Recommandé", "cta": "Choisir", "perMonth": "/mois" },
    "en": { "title": "...", "subtitle": "...", "popular": "Recommended", "cta": "Choose", "perMonth": "/month" },
    "items": [
      { "name": "...", "price": "...", "description": { "fr": "...", "en": "..." }, "features": { "fr": ["..."], "en": ["..."] }, "popular": false }
    ]
  },
  "faq": {
    "fr": { "title": "...", "subtitle": "..." },
    "en": { "title": "...", "subtitle": "..." },
    "items": [
      { "question": { "fr": "...", "en": "..." }, "answer": { "fr": "...", "en": "..." } }
    ]
  },
  "cta": {
    "fr": { "title": "...", "subtitle": "...", "button": "..." },
    "en": { "title": "...", "subtitle": "...", "button": "..." }
  },
  "contact": {
    "fr": { "title": "...", "subtitle": "...", "form": { "name": "Nom", "email": "Email", "phone": "Téléphone", "message": "Message", "submit": "Envoyer", "success": "Message envoyé !", "error": "Erreur, réessayez." } },
    "en": { "title": "...", "subtitle": "...", "form": { "name": "Name", "email": "Email", "phone": "Phone", "message": "Message", "submit": "Send", "success": "Message sent!", "error": "Error, try again." } }
  },
  "footer": {
    "fr": { "description": "...", "rights": "Tous droits réservés" },
    "en": { "description": "...", "rights": "All rights reserved" }
  }
}
\`\`\`
Génère 4 services, 3 témoignages, 3 plans tarifaires, 5 FAQ.

## 4. ${outputDir}/data/media.json
\`\`\`json
{
  "logo": { "default": "/images/logo.svg", "dark": "/images/logo-dark.svg", "favicon": "/favicon.svg" },
  "hero": { "image": "", "alt": { "fr": "...", "en": "..." } },
  "og": { "default": "/images/og-default.jpg" },
  "trust": [
    { "name": "Partenaire1", "logo": "" },
    { "name": "Partenaire2", "logo": "" },
    { "name": "Partenaire3", "logo": "" }
  ],
  "testimonials": { "avatars": {} }
}
\`\`\`

INSTRUCTIONS CRITIQUES:
- NE MODIFIE PAS la structure JSON, remplis uniquement les valeurs
- Adapte le contenu au secteur d'activité du client
- Textes professionnels et convaincants
- Prix réalistes pour le secteur
- Témoignages avec noms/entreprises crédibles
- Écris les 4 fichiers MAINTENANT avec Write`;

  await runAgent('content', contentPrompt, outputDir);

  // Phase 4: Direction créative
  logPhase(4, 'Direction créative');

  const creativeDirection = await generateCreativeDirection(designConfig, outputDir);
  log(`→ Style: ${c.cyan}${creativeDirection.style}${c.reset}`);
  log(`→ Direction: ${creativeDirection.direction}`);

  // Phase 5: Génération des composants
  logPhase(5, 'Génération des composants créatifs');

  let content = {};
  try {
    content = JSON.parse(readFileSync(join(outputDir, 'data', 'content.json'), 'utf-8'));
  } catch (e) {
    log('⚠ Erreur lecture content.json', c.yellow);
  }

  const context = {
    designConfig,
    creativeDirection,
    content,
    industry: industryInfo,
    extractedMedia,
    outputDir: join(outputDir, 'src', 'components')
  };

  const skippedSections = [];

  for (const agent of SECTION_AGENTS) {
    // Check condition if defined
    if (agent.condition && !agent.condition(context)) {
      logAgent(agent.name, 'skip');
      log(`  → Section ${agent.name} ignorée (non pertinente pour cette industrie)`, c.cyan);
      skippedSections.push(agent.name);
      // Still copy the default component to avoid import errors
      cpSync(
        join(TEMPLATE_DIR, 'src', 'components', agent.component),
        join(outputDir, 'src', 'components', agent.component)
      );
      continue;
    }

    const prompt = loadAgentPrompt(agent.name, context);
    if (prompt) {
      try {
        await runAgent(agent.name, prompt, outputDir);
      } catch (e) {
        if (agent.required) {
          log(`⚠ Copie du composant par défaut pour ${agent.name}`, c.yellow);
          cpSync(
            join(TEMPLATE_DIR, 'src', 'components', agent.component),
            join(outputDir, 'src', 'components', agent.component)
          );
        }
      }
    } else {
      // Copier le composant par défaut
      cpSync(
        join(TEMPLATE_DIR, 'src', 'components', agent.component),
        join(outputDir, 'src', 'components', agent.component)
      );
    }
  }

  // Update pages to hide skipped sections
  if (skippedSections.length > 0) {
    log(`→ Masquage des sections ignorées dans les pages...`, c.cyan);
    await hideSkippedSectionsInPages(outputDir, skippedSections);
  }

  // Copier les composants non générés par agents
  const staticComponents = ['Header.astro', 'Footer.astro', 'FAQ.astro', 'CTA.astro', 'ContactForm.astro', 'LanguageSwitcher.astro'];
  for (const comp of staticComponents) {
    const src = join(TEMPLATE_DIR, 'src', 'components', comp);
    const dest = join(outputDir, 'src', 'components', comp);
    if (existsSync(src) && !existsSync(dest)) {
      cpSync(src, dest);
    }
  }

  // Phase 6: Build
  logPhase(6, 'Build du site');

  log('📦 npm install...', c.blue);
  await runCommand('npm', ['install', '--silent'], outputDir);

  log('🔨 npm run build...', c.blue);
  await runCommand('npm', ['run', 'build'], outputDir);

  // Phase 7: Validation et correction
  const skipValidation = args.includes('--skip-validation');
  const noFix = args.includes('--no-fix');

  if (!skipValidation && validateSite) {
    logPhase(7, 'Validation visuelle');

    try {
      // Première validation (sans correction)
      let report = await validateSite(outputDir, { fix: false });
      const initialScore = report?.score || 0;

      if (report) {
        const hasCriticalOrMajor = report.issues?.some(i =>
          i.severity === 'critical' || i.severity === 'major'
        );

        // Si problèmes critiques/majeurs et correction non désactivée
        if (hasCriticalOrMajor && !noFix) {
          log(`\n⚠ Score initial: ${initialScore}/100 - Tentative de correction...`, c.yellow);

          // Phase 7b: Correction (utilise le rapport existant)
          logPhase('7b', 'Correction automatique');
          await validateSite(outputDir, { fixOnly: true });

          // Rebuild après corrections
          log('\n🔨 Rebuild après corrections...', c.blue);
          await runCommand('npm', ['run', 'build'], outputDir);

          // Phase 7c: Revalidation finale (UNE SEULE fois, sans correction)
          logPhase('7c', 'Validation finale');
          const finalReport = await validateSite(outputDir, { fix: false });

          if (finalReport) {
            const improvement = finalReport.score - initialScore;
            const improvementText = improvement > 0 ? ` (+${improvement})` : '';

            if (finalReport.score >= 80) {
              log(`✓ Score final: ${finalReport.score}/100${improvementText} - Site validé!`, c.green);
            } else {
              log(`⚠ Score final: ${finalReport.score}/100${improvementText}`, c.yellow);
              log(`  Améliorations manuelles recommandées`, c.yellow);
              log(`  Voir: ${outputDir}/validation-report.json`, c.cyan);
            }
          }
        } else if (hasCriticalOrMajor && noFix) {
          log(`⚠ Score: ${report.score}/100 - Problèmes détectés (--no-fix actif)`, c.yellow);
          log(`  Voir: ${outputDir}/validation-report.json`, c.cyan);
        } else if (report.status === 'warning') {
          log(`✓ Score: ${report.score}/100 - Quelques améliorations possibles`, c.yellow);
        } else {
          log(`✓ Score: ${report.score}/100 - Site validé!`, c.green);
        }
      }
    } catch (e) {
      log(`⚠ Validation ignorée: ${e.message}`, c.yellow);
    }
  } else if (!validateSite) {
    log('\n⏭️  Validation ignorée (puppeteer non disponible)', c.yellow);
  } else {
    log('\n⏭️  Validation ignorée (--skip-validation)', c.yellow);
  }

  // Terminé
  console.log('\n' + c.green + c.bold);
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          🎉 GÉNÉRATION CRÉATIVE TERMINÉE!            ║');
  console.log('╚══════════════════════════════════════════════════════╝' + c.reset);
  console.log(`\n  📁 Dossier: ${c.cyan}${outputDir}${c.reset}`);
  console.log(`  🎨 Style:   ${c.cyan}${creativeDirection.style}${c.reset}`);
  console.log(`  📋 Logs:    ${c.cyan}${outputDir}/logs/claude-cli.log${c.reset}`);
  console.log(`\n  Prévisualiser: ${c.yellow}cd clients/${clientName} && npm run dev${c.reset}\n`);
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

main().catch((err) => {
  log(`\n❌ Erreur: ${err.message}`, c.red);
  process.exit(1);
});
