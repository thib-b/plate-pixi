/**
 * Simple Color Utilities
 * Lightweight alternative to chroma-js for basic color operations
 */

/**
 * Convert HSL to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {number} Hex color (0xRRGGBB)
 */
export function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return parseInt(`0x${f(0)}${f(8)}${f(4)}`, 16);
}

/**
 * Generate a random color palette
 * @param {number} count - Number of colors (default: 8)
 * @returns {Object} { baseColor: number, colors: number[] }
 */
export function generateRandomPalette(count = 8) {
  // Pick a random base hue (0-360)
  const baseHue = Math.floor(Math.random() * 360);
  
  // Generate colors spread around the color wheel
  const colors = [];
  const baseColor = hslToHex(baseHue, 70, 50);
  
  for (let i = 0; i < count; i++) {
    const hueStep = 360 / Math.max(count, 3);
    const hue = (baseHue + (i * hueStep) + Math.random() * 20) % 360;
    const saturation = 60 + (Math.random() * 40);
    const lightness = 30 + (Math.random() * 50);
    
    const color = hslToHex(hue, saturation, lightness);
    colors.push(color);
  }
  
  return {
    baseColor,
    colors
  };
}

/**
 * Generate a palette with a specific base hue
 * @param {number} baseHue - Base hue (0-360)
 * @param {number} count - Number of colors
 * @returns {Object} { baseColor: number, colors: number[] }
 */
export function generatePaletteFromHue(baseHue, count = 8) {
  const colors = [];
  const baseColor = hslToHex(baseHue, 70, 50);
  
  for (let i = 0; i < count; i++) {
    const hueStep = 360 / Math.max(count, 3);
    const hue = (baseHue + (i * hueStep) + Math.random() * 20) % 360;
    const saturation = 60 + (Math.random() * 40);
    const lightness = 30 + (Math.random() * 50);
    
    const color = hslToHex(hue, saturation, lightness);
    colors.push(color);
  }
  
  return {
    baseColor,
    colors
  };
}

export default { hslToHex, generateRandomPalette, generatePaletteFromHue };
