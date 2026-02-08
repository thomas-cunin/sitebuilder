import { readFileSync, existsSync } from 'fs';

// Lire les couleurs depuis site.json si disponible
let primaryColor = '#3b82f6';
let secondaryColor = '#8b5cf6';

try {
  const sitePath = './data/site.json';
  if (existsSync(sitePath)) {
    const siteData = JSON.parse(readFileSync(sitePath, 'utf-8'));
    primaryColor = siteData.theme?.primaryColor || primaryColor;
    secondaryColor = siteData.theme?.secondaryColor || secondaryColor;
  }
} catch (e) {
  // Utiliser les couleurs par défaut
}

/**
 * Génère une palette de couleurs à partir d'une couleur de base
 */
function generateColorPalette(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return {};

  return {
    50: adjustBrightness(hex, 0.95),
    100: adjustBrightness(hex, 0.9),
    200: adjustBrightness(hex, 0.75),
    300: adjustBrightness(hex, 0.6),
    400: adjustBrightness(hex, 0.3),
    500: hex,
    600: adjustBrightness(hex, -0.1),
    700: adjustBrightness(hex, -0.25),
    800: adjustBrightness(hex, -0.4),
    900: adjustBrightness(hex, -0.55),
    950: adjustBrightness(hex, -0.7),
  };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function adjustBrightness(hex, factor) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  if (factor > 0) {
    // Éclaircir: mélanger avec blanc
    return rgbToHex(
      rgb.r + (255 - rgb.r) * factor,
      rgb.g + (255 - rgb.g) * factor,
      rgb.b + (255 - rgb.b) * factor
    );
  } else {
    // Assombrir: mélanger avec noir
    return rgbToHex(
      rgb.r * (1 + factor),
      rgb.g * (1 + factor),
      rgb.b * (1 + factor)
    );
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Couleurs générées dynamiquement depuis site.json
        primary: generateColorPalette(primaryColor),
        secondary: generateColorPalette(secondaryColor),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
