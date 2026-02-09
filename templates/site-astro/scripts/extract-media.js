#!/usr/bin/env node

/**
 * Extract media (logo, hero images) from a source website
 *
 * Usage: node scripts/extract-media.js "https://example.com" [output-dir]
 */

import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs';
import { dirname, join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Download an image from URL to local path
 * @param {string} url - Image URL
 * @param {string} destPath - Destination file path
 * @returns {Promise<boolean>} - Success status
 */
async function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, { timeout: 10000 }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          downloadImage(response.headers.location, destPath).then(resolve);
          return;
        }

        if (response.statusCode !== 200) {
          console.log(`  ${c.yellow}⚠ HTTP ${response.statusCode} for ${url}${c.reset}`);
          resolve(false);
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('image') && !contentType.includes('svg')) {
          console.log(`  ${c.yellow}⚠ Not an image: ${contentType}${c.reset}`);
          resolve(false);
          return;
        }

        const file = createWriteStream(destPath);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(true);
        });

        file.on('error', (err) => {
          file.close();
          console.log(`  ${c.yellow}⚠ Write error: ${err.message}${c.reset}`);
          resolve(false);
        });
      });

      request.on('error', (err) => {
        console.log(`  ${c.yellow}⚠ Download error: ${err.message}${c.reset}`);
        resolve(false);
      });

      request.on('timeout', () => {
        request.destroy();
        console.log(`  ${c.yellow}⚠ Download timeout${c.reset}`);
        resolve(false);
      });

    } catch (err) {
      console.log(`  ${c.yellow}⚠ Error: ${err.message}${c.reset}`);
      resolve(false);
    }
  });
}

/**
 * Find logo image on the page
 * @param {import('puppeteer').Page} page
 * @param {string} baseUrl
 * @returns {Promise<string|null>}
 */
async function findLogoImage(page, baseUrl) {
  const logoSelectors = [
    // Common logo selectors
    'header img[src*="logo"]',
    'header img[alt*="logo"]',
    'header img[class*="logo"]',
    'img[id*="logo"]',
    'img[class*="logo"]',
    '.logo img',
    '#logo img',
    '[class*="brand"] img',
    'nav img:first-of-type',
    'header a:first-of-type img',
    'header svg',
    '.logo svg',
    // Link with logo
    'a[href="/"] img',
    'a[href="./"] img',
  ];

  for (const selector of logoSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        // Check if it's an SVG
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'svg') {
          // Get SVG content
          const svgContent = await element.evaluate(el => el.outerHTML);
          return { type: 'svg', content: svgContent };
        }

        // Get image src
        const src = await element.evaluate(el => el.src || el.getAttribute('src'));
        if (src) {
          // Convert relative URL to absolute
          const absoluteUrl = new URL(src, baseUrl).href;
          return { type: 'image', url: absoluteUrl };
        }
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  return null;
}

/**
 * Find hero/main image on the page
 * @param {import('puppeteer').Page} page
 * @param {string} baseUrl
 * @returns {Promise<string|null>}
 */
async function findHeroImage(page, baseUrl) {
  const heroSelectors = [
    // Common hero selectors
    '[class*="hero"] img',
    '[id*="hero"] img',
    'section:first-of-type img',
    'main img:first-of-type',
    '.banner img',
    '[class*="banner"] img',
    '[class*="jumbotron"] img',
    // Background images
    '[class*="hero"]',
    '[id*="hero"]',
    'section:first-of-type',
  ];

  // First try to find regular img elements
  for (const selector of heroSelectors.slice(0, 8)) {
    try {
      const element = await page.$(selector);
      if (element) {
        const src = await element.evaluate(el => el.src || el.getAttribute('src'));
        if (src) {
          // Check if it's a valid image (not a small icon)
          const dimensions = await element.evaluate(el => ({
            width: el.naturalWidth || el.width,
            height: el.naturalHeight || el.height
          }));

          // Only consider images larger than 200x100
          if (dimensions.width > 200 || dimensions.height > 100) {
            const absoluteUrl = new URL(src, baseUrl).href;
            return { type: 'image', url: absoluteUrl };
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }

  // Try to find background images
  for (const selector of heroSelectors.slice(8)) {
    try {
      const element = await page.$(selector);
      if (element) {
        const bgImage = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundImage;
          if (bg && bg !== 'none') {
            const match = bg.match(/url\(['"]?([^'"]+)['"]?\)/);
            return match ? match[1] : null;
          }
          return null;
        });

        if (bgImage) {
          const absoluteUrl = new URL(bgImage, baseUrl).href;
          return { type: 'image', url: absoluteUrl };
        }
      }
    } catch (e) {
      // Continue
    }
  }

  return null;
}

/**
 * Find all significant images on the page
 * @param {import('puppeteer').Page} page
 * @param {string} baseUrl
 * @returns {Promise<Array<{url: string, alt: string, width: number, height: number}>>}
 */
async function findAllImages(page, baseUrl) {
  const images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map(img => ({
      src: img.src || img.getAttribute('src'),
      alt: img.alt || '',
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height
    })).filter(img => img.src && (img.width > 100 || img.height > 100));
  });

  return images.map(img => ({
    url: new URL(img.src, baseUrl).href,
    alt: img.alt,
    width: img.width,
    height: img.height
  })).slice(0, 10); // Limit to 10 images
}

/**
 * Get file extension from URL or content type
 */
function getImageExtension(url, defaultExt = '.png') {
  const urlPath = new URL(url).pathname;
  const ext = extname(urlPath).toLowerCase();

  const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
  if (validExts.includes(ext)) {
    return ext;
  }

  return defaultExt;
}

/**
 * Main extraction function
 * @param {string} url - Source website URL
 * @param {string} outputDir - Output directory for images
 * @returns {Promise<{logo: string|null, hero: string|null, images: string[]}>}
 */
export async function extractImagesFromSource(url, outputDir) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.log(`${c.yellow}⚠ Not a URL, skipping media extraction${c.reset}`);
    return { logo: null, hero: null, images: [] };
  }

  const imagesDir = join(outputDir, 'public', 'images');
  const extractedDir = join(imagesDir, 'extracted');

  // Ensure directories exist
  mkdirSync(extractedDir, { recursive: true });

  console.log(`${c.blue}🖼️  Extracting media from source...${c.reset}`);

  const result = {
    logo: null,
    hero: null,
    images: []
  };

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for images to load
    await new Promise(r => setTimeout(r, 2000));

    // Find and download logo
    const logoInfo = await findLogoImage(page, url);
    if (logoInfo) {
      if (logoInfo.type === 'svg') {
        const logoPath = join(extractedDir, 'logo.svg');
        writeFileSync(logoPath, logoInfo.content);
        result.logo = '/images/extracted/logo.svg';
        console.log(`  ${c.green}✓${c.reset} Logo (SVG) extracted`);
      } else if (logoInfo.url) {
        const ext = getImageExtension(logoInfo.url, '.png');
        const logoPath = join(extractedDir, `logo${ext}`);
        const success = await downloadImage(logoInfo.url, logoPath);
        if (success) {
          result.logo = `/images/extracted/logo${ext}`;
          console.log(`  ${c.green}✓${c.reset} Logo downloaded`);
        }
      }
    } else {
      console.log(`  ${c.yellow}⚠${c.reset} No logo found`);
    }

    // Find and download hero image
    const heroInfo = await findHeroImage(page, url);
    if (heroInfo && heroInfo.url) {
      const ext = getImageExtension(heroInfo.url, '.jpg');
      const heroPath = join(extractedDir, `hero${ext}`);
      const success = await downloadImage(heroInfo.url, heroPath);
      if (success) {
        result.hero = `/images/extracted/hero${ext}`;
        console.log(`  ${c.green}✓${c.reset} Hero image downloaded`);
      }
    } else {
      console.log(`  ${c.yellow}⚠${c.reset} No hero image found`);
    }

    // Find and download other significant images
    const allImages = await findAllImages(page, url);
    let downloadedCount = 0;

    for (let i = 0; i < Math.min(allImages.length, 5); i++) {
      const img = allImages[i];
      if (img.url === heroInfo?.url || img.url === logoInfo?.url) continue;

      const ext = getImageExtension(img.url, '.jpg');
      const imgPath = join(extractedDir, `image-${i + 1}${ext}`);
      const success = await downloadImage(img.url, imgPath);

      if (success) {
        result.images.push(`/images/extracted/image-${i + 1}${ext}`);
        downloadedCount++;
      }
    }

    if (downloadedCount > 0) {
      console.log(`  ${c.green}✓${c.reset} ${downloadedCount} additional images downloaded`);
    }

  } catch (error) {
    console.log(`${c.yellow}⚠ Media extraction error: ${error.message}${c.reset}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Save extraction results
  const manifestPath = join(extractedDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(result, null, 2));

  return result;
}

// Direct execution
if (process.argv[1].includes('extract-media')) {
  const url = process.argv[2];
  const outputDir = process.argv[3] || './temp-extraction';

  if (!url) {
    console.log('Usage: node scripts/extract-media.js <url> [output-dir]');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });
  extractImagesFromSource(url, outputDir).then(result => {
    console.log('\n✅ Extraction terminée');
    console.log(JSON.stringify(result, null, 2));
  });
}
