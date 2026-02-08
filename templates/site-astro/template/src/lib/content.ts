// Import des données JSON
import siteData from '../../data/site.json';
import navigationData from '../../data/navigation.json';
import pagesData from '../../data/pages.json';
import contentData from '../../data/content.json';
import mediaData from '../../data/media.json';

// Types
export type Lang = 'fr' | 'en';

// Helpers pour accéder au contenu traduit
export function t(section: keyof typeof contentData, key: string, lang: Lang): string {
  const sectionData = contentData[section] as Record<string, unknown>;
  const langData = sectionData[lang] as Record<string, unknown> | undefined;

  if (langData && key in langData) {
    return langData[key] as string;
  }

  // Fallback vers français
  const frData = sectionData['fr'] as Record<string, unknown> | undefined;
  if (frData && key in frData) {
    return frData[key] as string;
  }

  return key;
}

// Accès aux données
export const site = siteData;
export const nav = navigationData;
export const pages = pagesData;
export const content = contentData;
export const media = mediaData;

// Helper pour les items traduits (services, testimonials, etc.)
export function getLocalizedText(
  obj: { fr: string; en: string } | Record<string, string>,
  lang: Lang
): string {
  return obj[lang] || obj['fr'] || '';
}

// Obtenir la navigation traduite
export function getNavLinks(lang: Lang) {
  return navigationData.header.links.map((link) => ({
    ...link,
    label: t('nav', link.id, lang),
  }));
}

// Obtenir les services traduits
export function getServices(lang: Lang) {
  return contentData.services.items.map((item) => ({
    icon: item.icon,
    title: getLocalizedText(item.title, lang),
    description: getLocalizedText(item.description, lang),
  }));
}

// Obtenir les témoignages traduits
export function getTestimonials(lang: Lang) {
  return contentData.testimonials.items.map((item) => ({
    content: getLocalizedText(item.content, lang),
    author: item.author,
    role: item.role,
    company: item.company,
    rating: item.rating,
  }));
}

// Obtenir les tarifs traduits
export function getPricing(lang: Lang) {
  return contentData.pricing.items.map((item) => ({
    name: item.name,
    price: item.price,
    description: getLocalizedText(item.description, lang),
    features: item.features[lang] || item.features['fr'],
    popular: item.popular,
  }));
}

// Obtenir la FAQ traduite
export function getFAQ(lang: Lang) {
  return contentData.faq.items.map((item) => ({
    question: getLocalizedText(item.question, lang),
    answer: getLocalizedText(item.answer, lang),
  }));
}

// Obtenir le SEO de la page
export function getPageSEO(pageId: keyof typeof pagesData, lang: Lang) {
  const page = pagesData[pageId];
  return {
    title: page.seo.title[lang] || page.seo.title['fr'],
    description: page.seo.description[lang] || page.seo.description['fr'],
  };
}
