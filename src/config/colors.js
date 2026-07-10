/**
 * Color Configuration
 * 
 * Food dye color palette based on thib's physical agar plate experiments.
 * These colors should match the bright, saturated look of the physical plates.
 */

// Food dye colors - bright and saturated
// These are the primary colors used in thib's physical plate art
export const FOOD_DYE_COLORS = {
  // Primary colors
  red: 0xFF0000,
  orange: 0xFF8C00,
  yellow: 0xFFFF00,
  green: 0x00FF00,
  blue: 0x0000FF,
  purple: 0x800080,
  pink: 0xFF0080,
  cyan: 0x00FFFF,
  
  // Brighter variations
  brightRed: 0xFF5733,
  brightOrange: 0xFF8C33,
  brightYellow: 0xFFD733,
  brightGreen: 0x33FF57,
  brightBlue: 0x338CFF,
  brightPurple: 0x8C33FF,
  brightPink: 0xFF338C,
  brightCyan: 0x33FFFF,
  
  // Neon variations
  neonRed: 0xFF1E00,
  neonOrange: 0xFF5E00,
  neonYellow: 0xFFF900,
  neonGreen: 0x00FF0D,
  neonBlue: 0x00B4FF,
  neonPurple: 0x9D00FF,
  neonPink: 0xFF00AA,
  
  // Pastel variations (for subtler plates)
  pastelRed: 0xFF9AA2,
  pastelOrange: 0xFFB75E,
  pastelYellow: 0xFFE388,
  pastelGreen: 0xA7FF8A,
  pastelBlue: 0x8AA2FF,
  pastelPurple: 0xC388FF,
  pastelPink: 0xFF8AC3,
};

// Agar plate styling
export const AGAR_COLORS = {
  // Base agar color (slightly translucent)
  base: 0xFFFFFF,
  baseAlpha: 0.15,
  
  // Border color
  border: 0x333333,
  borderAlpha: 1,
  borderWidth: 2,
  
  // Background (the plate itself)
  background: 0x1a1a2e,
};

// Trail colors
export const TRAIL_COLORS = {
  default: 0xFFFFFF,
  defaultAlpha: 0.5,
  fadeRate: 0.01, // How quickly trails fade
};

// Convert hex to PIXI-compatible number
// (PixiJS expects 0xRRGGBB format, which is what we have)
export function getPixiColor(hexString) {
  if (typeof hexString === 'string') {
    return parseInt(hexString.replace('#', ''), 16);
  }
  return hexString;
}

// Get a random color from the food dye palette
export function getRandomFoodDyeColor() {
  const colors = Object.values(FOOD_DYE_COLORS);
  return colors[Math.floor(Math.random() * colors.length)];
}

// Create a color palette for a plate
export function createPlatePalette(baseColorIndex = 0) {
  const allColors = Object.values(FOOD_DYE_COLORS);
  const baseColor = allColors[baseColorIndex % allColors.length];
  
  // Create variations of the base color
  return {
    primary: baseColor,
    secondary: allColors[(baseColorIndex + 2) % allColors.length],
    accent: allColors[(baseColorIndex + 5) % allColors.length],
    trail: 0xFFFFFF,
  };
}
