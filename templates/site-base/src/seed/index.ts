/**
 * Seed script for initializing the database with demo content
 * Run with: npm run seed
 *
 * This script will be customized during generation based on scraped content.
 */

import { getPayload } from 'payload'
import config from '@payload-config'

async function seed() {
  console.log('🌱 Starting seed...')

  const payload = await getPayload({ config })

  // Check if data already exists
  const existingPages = await payload.find({
    collection: 'pages',
    limit: 1,
  })

  if (existingPages.docs.length > 0) {
    console.log('⚠️  Data already exists, skipping seed.')
    console.log('   To reseed, delete the database first.')
    process.exit(0)
  }

  // Create Settings
  console.log('📝 Creating settings...')
  await payload.updateGlobal({
    slug: 'settings',
    data: {
      site: {
        name: 'Mon Site',
        tagline: 'Bienvenue sur mon site web',
      },
      contact: {
        email: 'contact@example.com',
        phone: '+33 1 23 45 67 89',
        address: '123 Rue de la Paix\n75001 Paris\nFrance',
      },
      footer: {
        copyright: '© {year} Mon Site. Tous droits réservés.',
        showPoweredBy: true,
      },
    },
  })

  // Create Navigation
  console.log('🧭 Creating navigation...')
  await payload.create({
    collection: 'navigation',
    data: {
      name: 'Header Navigation',
      location: 'header',
      items: [
        { label: 'Accueil', type: 'page', page: null, openInNewTab: false },
        { label: 'Services', type: 'anchor', anchor: '#services', openInNewTab: false },
        { label: 'À propos', type: 'anchor', anchor: '#about', openInNewTab: false },
        { label: 'Contact', type: 'anchor', anchor: '#contact', openInNewTab: false },
      ],
    },
  })

  await payload.create({
    collection: 'navigation',
    data: {
      name: 'Footer Navigation',
      location: 'footer',
      items: [
        { label: 'Mentions légales', type: 'page', page: null, openInNewTab: false },
        { label: 'Politique de confidentialité', type: 'page', page: null, openInNewTab: false },
      ],
    },
  })

  // Create Home Page
  console.log('🏠 Creating home page...')
  await payload.create({
    collection: 'pages',
    data: {
      title: 'Accueil',
      slug: '/',
      status: 'published',
      sections: [
        {
          blockType: 'hero',
          headline: 'Bienvenue sur Mon Site',
          subheadline:
            'Nous vous accompagnons dans vos projets avec passion et expertise.',
          primaryCta: {
            label: 'Découvrir nos services',
            link: '#services',
          },
          secondaryCta: {
            label: 'Nous contacter',
            link: '#contact',
          },
          alignment: 'center',
          overlay: true,
        },
        {
          blockType: 'features',
          title: 'Nos Points Forts',
          subtitle:
            'Découvrez ce qui nous distingue et pourquoi nos clients nous font confiance.',
          features: [
            {
              icon: 'star',
              title: 'Excellence',
              description:
                'Nous visons l\'excellence dans chaque projet que nous entreprenons.',
            },
            {
              icon: 'users',
              title: 'Équipe expérimentée',
              description:
                'Une équipe de professionnels passionnés à votre service.',
            },
            {
              icon: 'zap',
              title: 'Rapidité',
              description:
                'Des délais respectés et une réactivité à toute épreuve.',
            },
          ],
          columns: '3',
        },
        {
          blockType: 'cta',
          title: 'Prêt à démarrer votre projet ?',
          description:
            'Contactez-nous dès maintenant pour discuter de vos besoins.',
          primaryButton: {
            label: 'Demander un devis',
            link: '#contact',
          },
          style: 'gradient',
          alignment: 'center',
        },
      ],
      meta: {
        title: 'Accueil | Mon Site',
        description: 'Bienvenue sur Mon Site - Nous vous accompagnons dans vos projets.',
      },
    },
  })

  console.log('✅ Seed completed successfully!')
  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
