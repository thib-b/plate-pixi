/**
 * Plate Configurations
 * 
 * Definitions for all 100 plates in "The 100" album.
 * Each plate represents one track and has unique visual characteristics.
 */

import { FOOD_DYE_COLORS } from './colors.js';

// Growth pattern types
export const GROWTH_PATTERNS = {
  RADIAL: 'radial',           // Organisms spread outward from center
  SPIRAL: 'spiral',           // Spiral growth pattern
  RANDOM: 'random',           // Random walk
  BRANCHING: 'branching',     // Tree-like branching
  WAVE: 'wave',               // Wave-like propagation
  CLUSTER: 'cluster',         // Forms clusters
  VORTEX: 'vortex',           // Swirling vortex
  PULSE: 'pulse',             // Pulsing from center
};

// Organism types (visual styles)
export const ORGANISM_TYPES = {
  SLIME: 'slime',             // Blobby, organic shapes
  CRYSTAL: 'crystal',         // Geometric, angular
  BACTERIA: 'bacteria',       // Small, round dots
  FUNGUS: 'fungus',           // Mycelium-like networks
  SPARK: 'spark',             // Point-like, bright
  BLOB: 'blob',               // Irregular shapes
};

// Default plate configuration
export const DEFAULT_PLATE_CONFIG = {
  radius: 300,
  organismCount: 500,
  baseColor: FOOD_DYE_COLORS.brightRed,
  growthPattern: GROWTH_PATTERNS.RADIAL,
  organismType: ORGANISM_TYPES.SLIME,
  organismSize: 8,
  organismSpeed: 0.5,
  trailWeight: 1.0,
  decayRate: 0.01,
  sensorAngle: 45,
  sensorDistance: 20,
  depositAmount: 5,
};

/**
 * Generate a unique plate configuration
 * @param {number} id - Plate ID (1-100)
 * @returns {Object} Plate configuration
 */
export function generatePlateConfig(id) {
  const colors = Object.values(FOOD_DYE_COLORS);
  const patterns = Object.values(GROWTH_PATTERNS);
  const organismTypes = Object.values(ORGANISM_TYPES);
  
  // Use ID to seed random values (deterministic)
  const seed = id;
  const random = (max = 1) => {
    return ((seed * 9301 + 49297) % 233280) / 233280 * max;
  };
  
  return {
    id,
    name: `Track ${id}`,
    // Visual properties
    radius: 300,
    baseColor: colors[Math.floor(random() * colors.length)],
    
    // Organism properties
    organismCount: 300 + Math.floor(random() * 700), // 300-1000
    organismType: organismTypes[Math.floor(random() * organismTypes.length)],
    organismSize: 4 + Math.floor(random() * 8), // 4-12
    organismSpeed: 0.3 + random() * 0.7, // 0.3-1.0
    
    // Growth pattern
    growthPattern: patterns[Math.floor(random() * patterns.length)],
    
    // Trail properties
    trailWeight: 0.5 + random() * 1.5, // 0.5-2.0
    decayRate: 0.005 + random() * 0.015, // 0.005-0.02
    
    // Sensor properties (for slime mold behavior)
    sensorAngle: 30 + Math.floor(random() * 60), // 30-90 degrees
    sensorDistance: 15 + Math.floor(random() * 20), // 15-35
    depositAmount: 3 + Math.floor(random() * 8), // 3-10
    
    // Audio mapping (will be mapped to actual track)
    audioFile: `track_${id}.mp3`,
    duration: 180 + Math.floor(random() * 300), // 3-8 minutes
  };
}

/**
 * Generate configurations for all 100 plates
 * @returns {Array} Array of 100 plate configurations
 */
export function generateAllPlateConfigs() {
  const configs = [];
  for (let i = 1; i <= 100; i++) {
    configs.push(generatePlateConfig(i));
  }
  return configs;
}

/**
 * Pre-defined plate configurations for specific tracks
 * (Can be used instead of generated configs for more control)
 */
export const PREDEFINED_PLATES = {
  // Track 1 - "Flew Close" from Living Isn't Easy
  // (Example - can be customized based on actual track characteristics)
  1: {
    id: 1,
    name: "Flew Close",
    radius: 300,
    baseColor: FOOD_DYE_COLORS.brightRed,
    organismCount: 800,
    organismType: ORGANISM_TYPES.SLIME,
    organismSize: 6,
    organismSpeed: 0.6,
    growthPattern: GROWTH_PATTERNS.RADIAL,
    trailWeight: 1.2,
    decayRate: 0.01,
    sensorAngle: 45,
    sensorDistance: 20,
    depositAmount: 5,
    audioFile: 'track_1.mp3',
    duration: 240,
  },
  
  // More predefined plates can be added here
  // For now, we'll use generated configs for the rest
};

/**
 * Get plate configuration by ID
 * @param {number} id - Plate ID
 * @returns {Object} Plate configuration
 */
export function getPlateConfig(id) {
  if (PREDEFINED_PLATES[id]) {
    return PREDEFINED_PLATES[id];
  }
  return generatePlateConfig(id);
}

/**
 * Get all plate configurations
 * @returns {Array} Array of plate configurations
 */
export function getAllPlateConfigs() {
  // For plates with predefined configs, use those
  // For others, generate
  const configs = [];
  for (let i = 1; i <= 100; i++) {
    configs.push(getPlateConfig(i));
  }
  return configs;
}

// Export pre-generated configs for immediate use
export const PLATES = getAllPlateConfigs();
