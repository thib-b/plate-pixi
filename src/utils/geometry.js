/**
 * Geometry Utility Functions
 * 
 * Common geometric calculations for the plate simulation.
 */

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} Distance between points
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance between two points (faster, no sqrt)
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} Squared distance between points
 */
export function distanceSquared(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Check if a point is within a circle
 * @param {number} px - Point x
 * @param {number} py - Point y
 * @param {number} cx - Circle center x
 * @param {number} cy - Circle center y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if point is within circle
 */
export function pointInCircle(px, py, cx, cy, radius) {
  return distanceSquared(px, py, cx, cy) <= radius * radius;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation (find t given value between a and b)
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} value - Value to find position of
 * @returns {number} Interpolation factor t
 */
export function inverseLerp(a, b, value) {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/**
 * Remap a value from one range to another
 * @param {number} value - Value to remap
 * @param {number} fromMin - Source range min
 * @param {number} fromMax - Source range max
 * @param {number} toMin - Target range min
 * @param {number} toMax - Target range max
 * @param {boolean} clampResult - Whether to clamp result to target range
 * @returns {number} Remapped value
 */
export function remap(value, fromMin, fromMax, toMin, toMax, clampResult = false) {
  const t = inverseLerp(fromMin, fromMax, value);
  const result = lerp(toMin, toMax, t);
  return clampResult ? clamp(result, toMin, toMax) : result;
}

/**
 * Calculate the angle between two points in radians
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} Angle in radians
 */
export function angleBetweenPoints(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Get a point at a given angle and distance from a center
 * @param {number} cx - Center x
 * @param {number} cy - Center y
 * @param {number} angle - Angle in radians
 * @param {number} distance - Distance from center
 * @returns {Object} { x, y }
 */
export function pointAtAngle(cx, cy, angle, distance) {
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance
  };
}

/**
 * Calculate centroid of multiple points
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @returns {Object} { x, y } Centroid point
 */
export function centroid(points) {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  
  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

/**
 * Calculate bounds of multiple points
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @returns {Object} { minX, minY, maxX, maxY, width, height }
 */
export function bounds(points) {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if two circles overlap
 * @param {number} x1 - First circle center x
 * @param {number} y1 - First circle center y
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle center x
 * @param {number} y2 - Second circle center y
 * @param {number} r2 - Second circle radius
 * @returns {boolean} True if circles overlap
 */
export function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  const distSq = distanceSquared(x1, y1, x2, y2);
  const sumRadii = r1 + r2;
  return distSq <= sumRadii * sumRadii;
}

/**
 * Get closest point on a line segment to a given point
 * @param {number} px - Point x
 * @param {number} py - Point y
 * @param {number} x1 - Line segment start x
 * @param {number} y1 - Line segment start y
 * @param {number} x2 - Line segment end x
 * @param {number} y2 - Line segment end y
 * @returns {Object} { x, y, t } Closest point and parameter t (0-1 along segment)
 */
export function closestPointOnLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return { x: x1, y: y1, t: 0 };
  }
  
  const t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  const clampedT = clamp(t, 0, 1);
  
  return {
    x: x1 + dx * clampedT,
    y: y1 + dy * clampedT,
    t: clampedT
  };
}

export default {
  degreesToRadians,
  radiansToDegrees,
  distance,
  distanceSquared,
  pointInCircle,
  clamp,
  lerp,
  inverseLerp,
  remap,
  angleBetweenPoints,
  pointAtAngle,
  centroid,
  bounds,
  circlesOverlap,
  closestPointOnLineSegment
};
