#!/usr/bin/env node

/**
 * Script pour initialiser un nouveau site client
 * Usage: npm run new-site
 *
 * Ce script pose des questions interactives et génère les fichiers JSON de configuration.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { createInterface } from 'readline';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dataDir = join(rootDir, 'data');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n🚀 Création d\'un nouveau site client\n');
  console.log('─'.repeat(50));

  // Infos de base
  const siteName = await ask('Nom de l\'entreprise: ');
  const siteUrl = await ask('URL du site (ex: https://example.com): ');
  const email = await ask('Email de contact: ');
  const phone = await ask('Téléphone: ');

  console.log('\n📍 Adresse');
  const street = await ask('  Rue: ');
  const city = await ask('  Ville: ');
  const zip = await ask('  Code postal: ');

  console.log('\n🔗 Réseaux sociaux (laisser vide si non applicable)');
  const facebook = await ask('  Facebook URL: ');
  const instagram = await ask('  Instagram URL: ');
  const linkedin = await ask('  LinkedIn URL: ');

  console.log('\n🎨 Thème');
  const primaryColor = (await ask('  Couleur primaire (hex, défaut: #0ea5e9): ')) || '#0ea5e9';
  const secondaryColor = (await ask('  Couleur secondaire (hex, défaut: #d946ef): ')) || '#d946ef';

  console.log('\n📊 Analytics (optionnel)');
  const plausible = await ask('  Domaine Plausible: ');
  const ga = await ask('  ID Google Analytics: ');

  // Générer site.json
  const siteConfig = {
    name: siteName,
    url: siteUrl || 'https://example.com',
    defaultLang: 'fr',
    langs: ['fr', 'en'],
    contact: {
      email: email || 'contact@example.com',
      phone: phone || '+33 1 23 45 67 89',
      address: {
        street: street || '123 Rue Example',
        city: city || 'Paris',
        zip: zip || '75001',
        country: 'France',
      },
    },
    social: {
      facebook: facebook || '',
      instagram: instagram || '',
      linkedin: linkedin || '',
      twitter: '',
    },
    seo: {
      titleTemplate: `%s | ${siteName}`,
      defaultImage: '/images/og-default.jpg',
    },
    analytics: {
      plausible: plausible || '',
      googleAnalytics: ga || '',
    },
    theme: {
      primaryColor,
      secondaryColor,
    },
  };

  // Sauvegarder
  writeFileSync(join(dataDir, 'site.json'), JSON.stringify(siteConfig, null, 2));

  console.log('\n✅ Configuration sauvegardée dans data/site.json');
  console.log('\n📝 Prochaines étapes:');
  console.log('  1. Modifier data/content.json pour le contenu');
  console.log('  2. Modifier data/navigation.json pour la navigation');
  console.log('  3. Ajouter les images dans public/images/');
  console.log('  4. Lancer npm run dev pour prévisualiser');
  console.log('  5. Lancer npm run build pour générer le site');
  console.log('');

  rl.close();
}

main().catch(console.error);
