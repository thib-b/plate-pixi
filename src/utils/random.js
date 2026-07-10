/**
 * Random Utility Functions
 * 
 * Common random number generation utilities for the plate simulation.
 */

/**
 * Generate a random number between 0 and 1
 * @returns {number} Random float in [0, 1)
 */
export function random() {
  return Math.random();
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer in [min, max]
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random float in [min, max)
 */
export function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random float between -max and max
 * @param {number} max - Maximum absolute value
 * @returns {number} Random float in [-max, max)
 */
export function randomSymmetric(max) {
  return (Math.random() * 2 - 1) * max;
}

/**
 * Generate a random angle in radians (0 to 2π)
 * @returns {number} Random angle in radians
 */
export function randomAngle() {
  return Math.random() * Math.PI * 2;
}

/**
 * Generate a random point within a circle
 * @param {number} radius - Radius of the circle
 * @returns {Object} { x, y } Random point within circle of given radius
 */
export function randomPointInCircle(radius) {
  const angle = randomAngle();
  const r = Math.sqrt(Math.random()) * radius; // Uniform distribution in circle
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r
  };
}

/**
 * Generate a random point on a circle
 * @param {number} radius - Radius of the circle
 * @returns {Object} { x, y } Random point on circle circumference
 */
export function randomPointOnCircle(radius) {
  const angle = randomAngle();
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

/**
 * Randomly choose an element from an array
 * @param {Array} array - Array to choose from
 * @returns {*} Random element from the array
 */
export function randomChoice(array) {
  if (!array || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array (does not mutate original)
 */
export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a random color from a palette
 * @param {Array} palette - Array of color values (0xRRGGBB format)
 * @returns {number} Random color from palette
 */
export function randomColor(palette) {
  return randomChoice(palette);
}

/**
 * Random boolean with optional probability
 * @param {number} probability - Probability of true (default 0.5)
 * @returns {boolean} Random boolean
 */
export function randomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

/**
 * Generate a normal distribution random number
 * @param {number} mean - Mean value
 * @param {number} stdDev - Standard deviation
 * @returns {number} Random number from normal distribution
 */
export function randomNormal(mean = 0, stdDev = 1) {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Avoid log(0)
  while (v === 0) v = Math.random();
  const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return normal * stdDev + mean;
}

/**
 * Seeded random number generator (for deterministic behavior)
 * @param {number} seed - Seed value
 * @returns {Function} Function that returns random numbers based on seed
 */
export function seededRandom(seed) {
  let value = seed || 0x89ABCDEF;
  return function() {
    value = Math.sin(value) * 10000;
    return value - Math.floor(value);
  };
}

export default {
  random,
  randomInt,
  randomInRange,
  randomSymmetric,
  randomAngle,
  randomPointInCircle,
  randomPointOnCircle,
  randomChoice,
  shuffleArray,
  randomColor,
  randomBoolean,
  randomNormal,
  seededRandom
};
