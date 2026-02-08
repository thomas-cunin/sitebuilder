#!/usr/bin/env node

/**
 * Générateur de site client automatique
 * Usage: node scripts/generate-site.js "https://example.com" "nom-client"
 *    ou: npm run generate -- "https://example.com" "nom-client"
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyzeDesign } from './analyze-design.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, '..');

// Couleurs terminal
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${c.reset}`);
}

function logStep(emoji, msg) {
  console.log(`${c.blue}${emoji} ${msg}${c.reset}`);
}

async function main() {
  const args = process.argv.slice(2);

  // Parser les options
  const skipDesign = args.includes('--no-design') || args.includes('--fast');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 2) {
    log('\nUsage: node scripts/generate-site.js <url-ou-description> <nom-client> [options]\n', c.red);
    log('Options:');
    log('  --no-design, --fast   Skip l\'analyse design (plus rapide)\n');
    log('Exemples:');
    log('  node scripts/generate-site.js "https://plombier-paris.fr" "plombier-dupont"');
    log('  node scripts/generate-site.js "Boulangerie artisanale à Lyon" "boulangerie-martin"');
    log('  node scripts/generate-site.js "https://example.com" "client" --fast\n');
    process.exit(1);
  }

  const [source, clientName] = filteredArgs;
  const outputDir = join(TEMPLATE_DIR, 'clients', clientName);

  log('\n' + '━'.repeat(55), c.blue);
  log(`  Génération du site: ${c.green}${clientName}${c.blue}`, c.blue);
  log('━'.repeat(55) + '\n', c.blue);

  // Vérifier si le dossier existe
  if (existsSync(outputDir)) {
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

  // Créer le dossier et copier le template
  logStep('📁', 'Création du dossier client...');
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, 'data'), { recursive: true });

  logStep('📋', 'Copie du template...');
  const filesToCopy = [
    'src', 'public', 'package.json', 'astro.config.mjs',
    'tailwind.config.mjs', 'tsconfig.json', 'Dockerfile', '.gitignore'
  ];

  for (const file of filesToCopy) {
    const src = join(TEMPLATE_DIR, file);
    const dest = join(outputDir, file);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
    }
  }

  // Copier pages.json (structure standard qui ne change pas)
  const pagesJsonSrc = join(TEMPLATE_DIR, 'data', 'pages.json');
  if (existsSync(pagesJsonSrc)) {
    cpSync(pagesJsonSrc, join(outputDir, 'data', 'pages.json'));
  }

  // Phase 1: Analyse du design (si URL fournie et pas --no-design)
  let designResult = null;
  const isUrl = source.startsWith('http://') || source.startsWith('https://');

  if (isUrl && !skipDesign) {
    logStep('🎨', 'Phase 1: Analyse du design...');
    try {
      designResult = await analyzeDesign(source, outputDir);
    } catch (error) {
      log(`⚠ Analyse design échouée: ${error.message}`, c.yellow);
    }
  } else if (skipDesign) {
    log('⏭ Analyse design ignorée (--fast)', c.yellow);
  }

  // Construire les infos de design pour le prompt
  let designContext = '';
  let themeColors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6'
  };

  if (designResult?.config) {
    themeColors = {
      primary: designResult.config.colors?.primary || themeColors.primary,
      secondary: designResult.config.colors?.secondary || themeColors.secondary
    };
    designContext = `
DESIGN ANALYSÉ depuis le site source:
- Couleur primaire: ${themeColors.primary}
- Couleur secondaire: ${themeColors.secondary}
- Style: ${designResult.config.style?.type || 'modern'} / ${designResult.config.style?.mood || 'professional'}
- UI: ${designResult.config.ui?.borderRadius || 'medium'} corners, ${designResult.config.ui?.shadows || 'subtle'} shadows

UTILISE CES COULEURS dans site.json > theme.`;
  }

  logStep('📝', 'Phase 2: Génération du contenu...');

  // Prompt pour Claude
  const prompt = `Tu dois générer les fichiers JSON de configuration pour un site vitrine client.

**Source client:** ${source}
${designContext}

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
    "fr": { "title": "...", "subtitle": "...", "popular": "Recommandé", "cta": "Choisir", "perMonth": "/jour" },
    "en": { "title": "...", "subtitle": "...", "popular": "Recommended", "cta": "Choose", "perMonth": "/day" },
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
    { "name": "Tech1", "logo": "" },
    { "name": "Tech2", "logo": "" },
    { "name": "Tech3", "logo": "" }
  ],
  "testimonials": { "avatars": {} }
}
\`\`\`

INSTRUCTIONS CRITIQUES:
- Adapte le contenu au secteur d'activité du client
- Textes professionnels et convaincants
- Prix réalistes pour le secteur
- Témoignages avec noms/entreprises crédibles
- NE MODIFIE PAS la structure JSON, remplis uniquement les valeurs
- Écris les 4 fichiers MAINTENANT avec Write`;

  logStep('🤖', 'Lancement de Claude Code...\n');

  // Écrire le prompt dans un fichier temporaire pour éviter les problèmes d'échappement shell
  const promptFile = join(outputDir, '.prompt.txt');
  writeFileSync(promptFile, prompt);

  // Lancer Claude avec le prompt depuis un fichier
  const claude = spawn('/bin/bash', [
    '-c',
    `claude --dangerously-skip-permissions -p "$(cat '${promptFile}')" --output-format text`
  ], {
    cwd: outputDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  let output = '';

  claude.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    // Afficher les points de progression
    process.stdout.write(c.green + '.' + c.reset);
  });

  claude.stderr.on('data', (data) => {
    // Ignorer les warnings, afficher les erreurs
    const text = data.toString();
    if (text.includes('error') || text.includes('Error')) {
      console.error(c.red + text + c.reset);
    }
  });

  await new Promise((resolve, reject) => {
    claude.on('close', (code) => {
      console.log('\n');
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Claude exited with code ${code}`));
      }
    });
    claude.on('error', reject);
  });

  // Vérifier les fichiers
  const requiredFiles = ['site.json', 'content.json', 'navigation.json', 'media.json'];
  const missingFiles = requiredFiles.filter(f => !existsSync(join(outputDir, 'data', f)));

  if (missingFiles.length > 0) {
    log(`❌ Fichiers manquants: ${missingFiles.join(', ')}`, c.red);
    log('Relance la commande ou crée les fichiers manuellement.', c.yellow);
    process.exit(1);
  }

  log('✓ Fichiers JSON générés', c.green);

  // npm install
  logStep('📦', 'Installation des dépendances...');
  await runCommand('npm', ['install', '--silent'], outputDir);

  // Build
  logStep('🔨', 'Build du site statique...');
  await runCommand('npm', ['run', 'build'], outputDir);

  // Succès
  console.log('\n' + c.green + '━'.repeat(55));
  console.log('  ✅ Site généré avec succès !');
  console.log('━'.repeat(55) + c.reset + '\n');

  console.log(`  📁 Dossier: ${c.cyan}${outputDir}${c.reset}`);
  console.log(`  🌐 Site:    ${c.cyan}${outputDir}/dist/${c.reset}\n`);

  console.log('  Commandes:');
  console.log(`    cd clients/${clientName} && npm run dev    ${c.yellow}# Prévisualiser${c.reset}`);
  console.log(`    cd clients/${clientName} && npm run build  ${c.yellow}# Rebuilder${c.reset}\n`);
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
