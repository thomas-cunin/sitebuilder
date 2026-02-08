# Scraping Strategy

## Vue d'ensemble

L'étape 1 du pipeline extrait toutes les données nécessaires du site source :
- Structure et contenu textuel
- Images et assets visuels
- Screenshots pour l'analyse Vision IA
- Navigation et formulaires

---

## Stack technique

| Outil | Rôle |
|---|---|
| **Playwright** | Rendu JavaScript, screenshots, crawl SPA |
| **Cheerio** | Parsing HTML rapide post-rendu |
| **@mozilla/readability** | Extraction contenu principal |
| **sharp** | Téléchargement et optimisation images |
| **colorthief** | Extraction couleurs dominantes |
| **jsdom** | DOM virtuel pour Readability |

---

## Stratégie de crawl

### 1. Découverte des pages

```typescript
async function discoverPages(startUrl: string, maxPages = 50): Promise<string[]> {
  const visited = new Set<string>()
  const toVisit = [startUrl]
  const domain = new URL(startUrl).hostname

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift()!
    if (visited.has(url)) continue

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })

    visited.add(url)

    // Extraire tous les liens internes
    const links = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => a.href)
    )

    for (const link of links) {
      try {
        const linkUrl = new URL(link)
        if (linkUrl.hostname === domain && !visited.has(link)) {
          toVisit.push(link)
        }
      } catch {}
    }

    await page.close()
  }

  return Array.from(visited)
}
```

### 2. Limites

- **Max 50 pages** par site
- **Timeout 30s** par page
- **Respecter robots.txt** (optionnel mais recommandé)
- **Délai 500ms** entre les pages (éviter surcharge)

---

## Extraction par page

Pour chaque page découverte :

### 1. Métadonnées

```typescript
const title = await page.title()
const metaDescription = await page.$eval(
  'meta[name="description"]',
  (el) => el.getAttribute('content')
).catch(() => null)
```

### 2. Headings (structure sémantique)

```typescript
const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
  elements.map((el) => ({
    level: parseInt(el.tagName.charAt(1)),
    text: el.textContent?.trim() || '',
  }))
)
```

### 3. Sections de contenu

Utiliser Readability pour extraire le contenu principal, puis segmenter :

```typescript
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

const html = await page.content()
const dom = new JSDOM(html)
const reader = new Readability(dom.window.document)
const article = reader.parse()

// Segmentation par headings h2
const sections = segmentByHeadings(article?.content || '', 2)
```

### 4. Classification des sections

Chaque section est classifiée automatiquement :

```typescript
type SectionType =
  | 'hero'         // Premier bloc avec titre + image/vidéo
  | 'content'      // Texte long, articles
  | 'features'     // Liste de features avec icônes
  | 'testimonials' // Citations clients
  | 'cta'          // Call-to-action
  | 'faq'          // Questions/réponses
  | 'gallery'      // Grille d'images
  | 'contact'      // Formulaire de contact
  | 'other'        // Non classifié

function classifySection(section: string): SectionType {
  // Heuristiques basées sur le contenu et la structure
  if (isFirstSection && hasLargeImage) return 'hero'
  if (hasQuotes && hasNames) return 'testimonials'
  if (hasQuestionAnswer) return 'faq'
  // ...
}
```

---

## Screenshots pour Vision IA

### Pourquoi 1072×1072

C'est la résolution optimale pour l'API Vision de Claude (1.15 mégapixels). Au-delà, les images sont redimensionnées et on perd en qualité d'analyse.

### Capture

```typescript
async function captureScreenshots(page: Page, projectId: string, slug: string) {
  // 1. Screenshot hero (above the fold)
  const heroBuffer = await page.screenshot({ type: 'png' })
  await storage.upload(
    'scraped-assets',
    `${projectId}/screenshots/${slug}-hero.png`,
    heroBuffer,
    'image/png'
  )

  // 2. Screenshot full-page
  const fullPageBuffer = await page.screenshot({ fullPage: true, type: 'png' })

  // 3. Découpage en tiles 1072×1072
  const tiles = await splitIntoTiles(fullPageBuffer, 1072, 1072)

  const tileUrls: string[] = []
  for (const [index, tile] of tiles.entries()) {
    const key = `${projectId}/screenshots/${slug}-tile-${index}.png`
    await storage.upload('scraped-assets', key, tile, 'image/png')
    tileUrls.push(key)
  }

  return {
    hero: `${projectId}/screenshots/${slug}-hero.png`,
    tiles: tileUrls,
  }
}
```

### Découpage en tiles

```typescript
import sharp from 'sharp'

async function splitIntoTiles(
  imageBuffer: Buffer,
  tileWidth: number,
  tileHeight: number
): Promise<Buffer[]> {
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  const tiles: Buffer[] = []
  const cols = Math.ceil(metadata.width! / tileWidth)
  const rows = Math.ceil(metadata.height! / tileHeight)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * tileWidth
      const top = row * tileHeight
      const width = Math.min(tileWidth, metadata.width! - left)
      const height = Math.min(tileHeight, metadata.height! - top)

      const tile = await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .toBuffer()

      tiles.push(tile)
    }
  }

  return tiles
}
```

---

## Extraction des images

```typescript
async function extractImages(page: Page, projectId: string): Promise<string[]> {
  const images = await page.$$eval('img[src]', (imgs) =>
    imgs.map((img) => ({
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }))
  )

  const savedUrls: string[] = []

  for (const img of images) {
    // Ignorer les images trop petites (icônes, tracking pixels)
    if (img.width < 100 || img.height < 100) continue

    try {
      const response = await fetch(img.src)
      const buffer = Buffer.from(await response.arrayBuffer())

      // Optimiser avec sharp
      const optimized = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      const key = `${projectId}/images/${generateSlug(img.src)}.jpg`
      await storage.upload('scraped-assets', key, optimized, 'image/jpeg')
      savedUrls.push(key)
    } catch (e) {
      console.warn(`Failed to download image: ${img.src}`)
    }
  }

  return savedUrls
}
```

---

## Extraction des formulaires

```typescript
interface FormField {
  name: string
  type: string
  label: string | null
  required: boolean
  options?: string[] // Pour select
}

interface FormData {
  id: string
  action: string | null
  method: string
  fields: FormField[]
}

async function extractForms(page: Page): Promise<FormData[]> {
  return page.$$eval('form', (forms) =>
    forms.map((form, index) => ({
      id: form.id || `form-${index}`,
      action: form.action || null,
      method: form.method || 'GET',
      fields: Array.from(form.querySelectorAll('input, select, textarea'))
        .filter((el) => el.name && el.type !== 'hidden')
        .map((el) => ({
          name: el.name,
          type: el.type || 'text',
          label: findLabel(el)?.textContent?.trim() || null,
          required: el.required,
          options: el.tagName === 'SELECT'
            ? Array.from(el.options).map(o => o.text)
            : undefined,
        })),
    }))
  )
}
```

---

## Extraction navigation

```typescript
interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

async function extractNavigation(page: Page) {
  const header = await extractNavFromSelector(page, 'header nav, nav.main-nav')
  const footer = await extractNavFromSelector(page, 'footer nav, footer ul')

  return { header, footer }
}

async function extractNavFromSelector(
  page: Page,
  selector: string
): Promise<NavItem[]> {
  return page.$$eval(`${selector} a`, (links) =>
    links.map((a) => ({
      label: a.textContent?.trim() || '',
      href: a.href,
    }))
  )
}
```

---

## Extraction couleurs et fonts

### Couleurs dominantes

```typescript
import ColorThief from 'colorthief'

async function extractColors(screenshotBuffer: Buffer): Promise<string[]> {
  const colorThief = new ColorThief()
  const palette = await colorThief.getPalette(screenshotBuffer, 5)

  return palette.map(([r, g, b]) =>
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  )
}
```

### Fonts

```typescript
async function extractFonts(page: Page): Promise<string[]> {
  const fonts = await page.evaluate(() => {
    const fontFamilies = new Set<string>()

    document.querySelectorAll('*').forEach((el) => {
      const style = window.getComputedStyle(el)
      const fontFamily = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
      if (fontFamily) fontFamilies.add(fontFamily)
    })

    return Array.from(fontFamilies)
  })

  return fonts
}
```

---

## Schéma Zod de l'artefact

```typescript
import { z } from 'zod'

export const ScrapingArtifactSchema = z.object({
  sourceUrl: z.string().url(),
  scrapedAt: z.string().datetime(),
  pages: z.array(z.object({
    url: z.string(),
    title: z.string(),
    metaDescription: z.string().nullable(),
    headings: z.array(z.object({
      level: z.number().min(1).max(6),
      text: z.string(),
    })),
    sections: z.array(z.object({
      type: z.enum([
        'hero', 'content', 'features', 'testimonials',
        'cta', 'faq', 'gallery', 'contact', 'other'
      ]),
      heading: z.string().nullable(),
      text: z.string(),
      images: z.array(z.string()),
    })),
    forms: z.array(z.object({
      id: z.string(),
      action: z.string().nullable(),
      method: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        label: z.string().nullable(),
        required: z.boolean(),
      })),
    })),
    links: z.array(z.object({
      href: z.string(),
      text: z.string(),
      isInternal: z.boolean(),
    })),
    screenshots: z.object({
      hero: z.string(),
      tiles: z.array(z.string()),
    }),
  })),
  navigation: z.object({
    header: z.array(z.object({
      label: z.string(),
      href: z.string(),
      children: z.array(z.any()).optional(),
    })),
    footer: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })),
  }),
  assets: z.object({
    logo: z.string().nullable(),
    favicon: z.string().nullable(),
    colors: z.array(z.string()),
    fonts: z.array(z.string()),
  }),
})

export type ScrapingArtifact = z.infer<typeof ScrapingArtifactSchema>
```

---

## Gestion des erreurs

| Erreur | Comportement |
|---|---|
| **Page inaccessible** | Skip + log warning |
| **Timeout** | Skip + log warning |
| **Anti-bot détecté** | Retry avec delay, puis skip |
| **Image introuvable** | Skip image + log warning |
| **Parsing échoue** | Continuer avec données partielles |

Le scraping est **best-effort** : on récupère ce qu'on peut, les étapes suivantes s'adaptent aux données manquantes.
