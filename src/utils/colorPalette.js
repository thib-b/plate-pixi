/**
 * Color Palette Utilities
 * 
 * Generates cohesive color palettes using Chroma.js
 */

import chroma from 'chroma-js';

/**
 * Generate a color palette from a random base hue
 * @param {number} count - Number of colors in the palette (default: 8)
 * @returns {Object} { baseColor: number, colors: number[] }
 *   baseColor is the main hue in hex format
 *   colors is an array of hex color values
 */
export function generateRandomPalette(count = 8) {
  // Pick a random base hue (0-360)
  const baseHue = Math.floor(Math.random() * 360);
  
  // Generate colors using analogous scheme with variations in saturation and lightness
  const colors = [];
  const baseColor = chroma.hsl(baseHue, 0.7, 0.5).hex();
  
  for (let i = 0; i < count; i++) {
    // Vary hue slightly for each color in the palette
    const hueVariation = ((i / count) * 60) - 30; // ±30 degrees from base
    const hue = (baseHue + hueVariation + 360) % 360;
    
    // Vary saturation and lightness for more diversity
    const saturation = 0.6 + (Math.random() * 0.3);
    const lightness = 0.4 + (Math.random() * 0.3);
    
    const color = chroma.hsl(hue, saturation, lightness).hex();
    colors.push(color);
  }
  
  return {
    baseColor: parseInt(baseColor.replace('#', ''), 16),
    colors: colors.map(c => parseInt(c.replace('#', ''), 16))
  };
}

/**
 * Generate a palette with a specific base color
 * @param {number|string} baseColor - Base color in hex (0xRRGGBB or '#RRGGBB')
 * @param {number} count - Number of colors in the palette
 * @returns {Object} { baseColor: number, colors: number[] }
 */
export function generatePaletteFromBase(baseColor, count = 8) {
  const base = typeof baseColor === 'number' 
    ? chroma(baseColor).hex() 
    : baseColor;
  
  const baseHsl = chroma(base).hsl();
  const colors = [];
  
  for (let i = 0; i < count; i++) {
    const hueVariation = ((i / count) * 60) - 30;
    const hue = (baseHsl[0] + hueVariation + 360) % 360;
    const saturation = Math.max(0.3, baseHsl[1] * (0.8 + Math.random() * 0.4));
    const lightness = Math.max(0.2, baseHsl[2] * (0.8 + Math.random() * 0.4));
    
    const color = chroma.hsl(hue, saturation, lightness).hex();
    colors.push(parseInt(color.replace('#', ''), 16));
  }
  
  return {
    baseColor: parseInt(base.replace('#', ''), 16),
    colors: colors
  };
}

export default { generateRandomPalette, generatePaletteFromBase };
