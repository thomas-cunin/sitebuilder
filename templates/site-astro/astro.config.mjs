import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Charger la config du site
import siteData from './data/site.json' with { type: 'json' };

export default defineConfig({
  site: siteData.url,
  integrations: [
    tailwind(),
    sitemap({
      i18n: {
        defaultLocale: siteData.defaultLang,
        locales: Object.fromEntries(
          siteData.langs.map((l) => [l, l === 'fr' ? 'fr-FR' : 'en-US'])
        ),
      },
    }),
  ],
  output: 'static',
  i18n: {
    defaultLocale: siteData.defaultLang,
    locales: siteData.langs,
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
