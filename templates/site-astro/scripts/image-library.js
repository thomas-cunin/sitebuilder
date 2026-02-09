#!/usr/bin/env node

/**
 * Image library integration for Unsplash and Pexels
 *
 * Usage: node scripts/image-library.js "search keywords" [output-dir] [count]
 */

import { existsSync, mkdirSync, writeFileSync, createWriteStream, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Make HTTPS request and return JSON
 */
function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download image from URL
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 30000 }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
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
        reject(err);
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Search Unsplash for images
 * @param {string} query - Search keywords
 * @param {number} count - Number of images to fetch
 * @returns {Promise<Array<{id: string, url: string, thumb: string, photographer: string, photographerUrl: string, source: string}>>}
 */
async function searchUnsplash(query, count = 5) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.log(`  ${c.yellow}⚠ UNSPLASH_ACCESS_KEY not set${c.reset}`);
    return [];
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

    const response = await httpsGetJson(url, {
      'Authorization': `Client-ID ${accessKey}`
    });

    if (response.status === 403) {
      console.log(`  ${c.yellow}⚠ Unsplash rate limit reached${c.reset}`);
      return [];
    }

    if (response.status !== 200 || !response.data.results) {
      console.log(`  ${c.yellow}⚠ Unsplash API error: ${response.status}${c.reset}`);
      return [];
    }

    return response.data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      width: photo.width,
      height: photo.height,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      source: 'unsplash',
      sourceUrl: photo.links.html,
      altDescription: photo.alt_description || query
    }));

  } catch (error) {
    console.log(`  ${c.yellow}⚠ Unsplash error: ${error.message}${c.reset}`);
    return [];
  }
}

/**
 * Search Pexels for images (fallback)
 * @param {string} query - Search keywords
 * @param {number} count - Number of images to fetch
 * @returns {Promise<Array>}
 */
async function searchPexels(query, count = 5) {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.log(`  ${c.yellow}⚠ PEXELS_API_KEY not set${c.reset}`);
    return [];
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

    const response = await httpsGetJson(url, {
      'Authorization': apiKey
    });

    if (response.status === 429) {
      console.log(`  ${c.yellow}⚠ Pexels rate limit reached${c.reset}`);
      return [];
    }

    if (response.status !== 200 || !response.data.photos) {
      console.log(`  ${c.yellow}⚠ Pexels API error: ${response.status}${c.reset}`);
      return [];
    }

    return response.data.photos.map(photo => ({
      id: String(photo.id),
      url: photo.src.large,
      thumb: photo.src.tiny,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      source: 'pexels',
      sourceUrl: photo.url,
      altDescription: photo.alt || query
    }));

  } catch (error) {
    console.log(`  ${c.yellow}⚠ Pexels error: ${error.message}${c.reset}`);
    return [];
  }
}

/**
 * Search images from available sources (Unsplash first, then Pexels as fallback)
 * @param {string} keywords - Search keywords
 * @param {number} count - Number of images needed
 * @returns {Promise<Array>}
 */
export async function searchImages(keywords, count = 5) {
  console.log(`  ${c.blue}🔍 Searching for "${keywords}"...${c.reset}`);

  // Try Unsplash first
  let images = await searchUnsplash(keywords, count);

  // Fallback to Pexels if needed
  if (images.length < count) {
    const needed = count - images.length;
    console.log(`  ${c.cyan}→ Trying Pexels for ${needed} more images...${c.reset}`);
    const pexelsImages = await searchPexels(keywords, needed);
    images = images.concat(pexelsImages);
  }

  console.log(`  ${c.green}✓${c.reset} Found ${images.length} images`);
  return images;
}

/**
 * Download image from library and save to output directory
 * @param {object} imageInfo - Image info object from search
 * @param {string} destPath - Destination file path
 * @returns {Promise<boolean>}
 */
export async function downloadLibraryImage(imageInfo, destPath) {
  try {
    await downloadImage(imageInfo.url, destPath);
    return true;
  } catch (error) {
    console.log(`  ${c.yellow}⚠ Failed to download: ${error.message}${c.reset}`);
    return false;
  }
}

/**
 * Save attribution information for legal compliance
 * @param {Array} images - Array of downloaded image info objects
 * @param {string} outputDir - Output directory
 */
export function saveAttributions(images, outputDir) {
  const attributions = images.map(img => ({
    filename: img.filename,
    photographer: img.photographer,
    photographerUrl: img.photographerUrl,
    source: img.source,
    sourceUrl: img.sourceUrl,
    license: img.source === 'unsplash' ? 'Unsplash License' : 'Pexels License'
  }));

  const attributionPath = join(outputDir, 'image-credits.json');
  writeFileSync(attributionPath, JSON.stringify(attributions, null, 2));

  // Also create a markdown file for human reading
  const mdContent = `# Image Credits

This site uses images from free stock photo services. Attribution:

${attributions.map(a => `- **${a.filename}**: Photo by [${a.photographer}](${a.photographerUrl}) on [${a.source === 'unsplash' ? 'Unsplash' : 'Pexels'}](${a.sourceUrl})`).join('\n')}

## Licenses

- Unsplash images are free to use under the [Unsplash License](https://unsplash.com/license)
- Pexels images are free to use under the [Pexels License](https://www.pexels.com/license/)
`;

  const mdPath = join(outputDir, 'IMAGE-CREDITS.md');
  writeFileSync(mdPath, mdContent);

  return attributions;
}

/**
 * Search and download images for a specific use case
 * @param {string} keywords - Search keywords
 * @param {string} outputDir - Output directory for downloaded images
 * @param {object} options - Options
 * @returns {Promise<{images: Array, attributions: Array}>}
 */
export async function fetchImagesForSite(keywords, outputDir, options = {}) {
  const { count = 5, category = 'general' } = options;

  const imagesDir = join(outputDir, 'public', 'images', 'library');
  mkdirSync(imagesDir, { recursive: true });

  console.log(`${c.blue}📷 Fetching stock images...${c.reset}`);

  // Search for images
  const searchResults = await searchImages(keywords, count);

  if (searchResults.length === 0) {
    console.log(`  ${c.yellow}⚠ No images found, using placeholders${c.reset}`);
    return { images: [], attributions: [] };
  }

  // Download images
  const downloadedImages = [];

  for (let i = 0; i < searchResults.length; i++) {
    const img = searchResults[i];
    const filename = `${category}-${i + 1}.jpg`;
    const destPath = join(imagesDir, filename);

    const success = await downloadLibraryImage(img, destPath);

    if (success) {
      downloadedImages.push({
        ...img,
        filename,
        localPath: `/images/library/${filename}`
      });
      console.log(`  ${c.green}✓${c.reset} Downloaded ${filename}`);
    }
  }

  // Save attributions
  const attributions = saveAttributions(downloadedImages, imagesDir);

  return {
    images: downloadedImages,
    attributions
  };
}

/**
 * Generate placeholder SVG when no images are available
 * @param {string} text - Text to display
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {string} - SVG content
 */
export function generatePlaceholderSVG(text = 'Image', width = 800, height = 600) {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <rect x="10%" y="10%" width="80%" height="80%" fill="#e5e7eb" rx="8"/>
  <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="24" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
}

/**
 * Create placeholder images when API keys are not available
 * @param {string} outputDir - Output directory
 * @param {Array<{name: string, text: string}>} placeholders - Placeholder definitions
 */
export function createPlaceholders(outputDir, placeholders) {
  const imagesDir = join(outputDir, 'public', 'images', 'placeholders');
  mkdirSync(imagesDir, { recursive: true });

  for (const p of placeholders) {
    const svg = generatePlaceholderSVG(p.text, p.width || 800, p.height || 600);
    writeFileSync(join(imagesDir, `${p.name}.svg`), svg);
  }

  console.log(`  ${c.cyan}→ Created ${placeholders.length} placeholder images${c.reset}`);
}

// Direct execution
if (process.argv[1].includes('image-library')) {
  const keywords = process.argv[2];
  const outputDir = process.argv[3] || './temp-images';
  const count = parseInt(process.argv[4]) || 5;

  if (!keywords) {
    console.log('Usage: node scripts/image-library.js "keywords" [output-dir] [count]');
    console.log('\nEnvironment variables needed:');
    console.log('  UNSPLASH_ACCESS_KEY - Get from https://unsplash.com/developers');
    console.log('  PEXELS_API_KEY - Get from https://www.pexels.com/api/');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  fetchImagesForSite(keywords, outputDir, { count }).then(result => {
    console.log('\n✅ Image fetch complete');
    console.log(`Downloaded: ${result.images.length} images`);
    if (result.images.length > 0) {
      console.log(`Credits saved to: ${outputDir}/public/images/library/IMAGE-CREDITS.md`);
    }
  });
}
