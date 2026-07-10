/**
 * Color Palette Utilities
 * 
 * Generates cohesive color palettes using Chroma.js
 */

import chroma from 'chroma-js';

/**
 * Generate a color palette from a random base hue with more variety
 * Uses a combination of complementary and analogous colors for a balanced palette
 * @param {number} count - Number of colors in the palette (default: 8)
 * @returns {Object} { baseColor: number, colors: number[] }
 *   baseColor is the main hue in hex format
 *   colors is an array of hex color values
 */
export function generateRandomPalette(count = 8) {
  // Pick a random base hue (0-360)
  const baseHue = Math.floor(Math.random() * 360);
  
  // Generate colors spread around the color wheel for more variety
  // This creates a more balanced, complementary palette
  const colors = [];
  const baseColor = chroma.hsl(baseHue, 0.7, 0.5).hex();
  
  for (let i = 0; i < count; i++) {
    // Spread hues evenly around the color wheel (0-360 degrees)
    // This gives us complementary/triadic colors instead of just analogous
    const hueStep = 360 / Math.max(count, 3); // At least 3 steps for triadic
    const hue = (baseHue + (i * hueStep) + Math.random() * 20) % 360;
    
    // Vary saturation and lightness for more diversity
    const saturation = 0.6 + (Math.random() * 0.4);
    const lightness = 0.3 + (Math.random() * 0.5);
    
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
