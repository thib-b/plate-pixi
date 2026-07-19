/**
 * TrailSystem Class
 * 
 * Manages the trail deposition and visualization system for organisms.
 * Inspired by the p5plates slime mold simulation, but optimized for PixiJS.
 * 
 * The trail system maintains a 2D grid of trail density values that organisms
 * deposit as they move. Organisms sense these trails to guide their movement.
 */

import * as PIXI from 'pixi.js';
import { TRAIL_COLORS } from '../config/colors.js';
import { clamp, distanceSquared } from '../utils/geometry.js';

/**
 * Blend two colors together
 * @param {number} color1 - First color (0xRRGGBB)
 * @param {number} color2 - Second color (0xRRGGBB)
 * @param {number} weight1 - Weight for color1 (0-1)
 * @param {number} weight2 - Weight for color2 (0-1)
 * @returns {number} Blended color (0xRRGGBB)
 */
function blendColors(color1, color2, weight1, weight2) {
  // Extract RGB components
  const r1 = (color1 >> 16) & 0xFF;
  const g1 = (color1 >> 8) & 0xFF;
  const b1 = color1 & 0xFF;
  
  const r2 = (color2 >> 16) & 0xFF;
  const g2 = (color2 >> 8) & 0xFF;
  const b2 = color2 & 0xFF;
  
  // Blend each channel
  const r = Math.round(r1 * weight1 + r2 * weight2);
  const g = Math.round(g1 * weight1 + g2 * weight2);
  const b = Math.round(b1 * weight1 + b2 * weight2);
  
  // Combine back to hex
  return (r << 16) | (g << 8) | b;
}

/**
 * TrailSystem class - manages trail data and rendering
 */
export class TrailSystem {
  /**
   * Create a new trail system
   * @param {number} width - Width of the trail grid
   * @param {number} height - Height of the trail grid
   * @param {Object} options - Optional configuration
   * @param {number} [options.cellSize=4] - Size of each grid cell in pixels
   * @param {number} [options.decayRate=0.01] - How quickly trails decay per second
   * @param {number} [options.maxValue=100] - Maximum trail value
   * @param {number} [options.color=0xFFFFFF] - Trail color
   * @param {number} [options.alpha=0.5] - Trail base alpha
   */
  constructor(width, height, options = {}) {
    // Configuration (apply defaults first so options can override)
    this.options = {
      cellSize: 8,
      decayRate: 0.001, // Much slower decay for persistent trails
      maxValue: 100, // Lower max so trails reach visible levels faster
      color: TRAIL_COLORS.default,
      alpha: 0.8, // More visible trails
      fadeRate: TRAIL_COLORS.fadeRate * 0.5, // Slower fade
      ...options
    };
    
    // Grid dimensions in cells - width/height are in pixels, divide by cellSize
    this.gridWidth = Math.ceil(width / this.options.cellSize);
    this.gridHeight = Math.ceil(height / this.options.cellSize);
    
    // Pre-calculate constants for performance
    this.invCellSize = 1 / this.options.cellSize;
    this.offsetX = this.gridWidth / 2;
    this.offsetY = this.gridHeight / 2;
    this.renderOffsetX = (this.gridWidth * this.options.cellSize) / 2;
    this.renderOffsetY = (this.gridHeight * this.options.cellSize) / 2;
    
    // Background image mode flag
    this.backgroundImageMode = false;
    
    // Trail data: 2D array of density values (0-maxValue)
    this.grid = this.createGrid(this.gridWidth, this.gridHeight);
    
    // PixiJS rendering
    this.container = new PIXI.Container();
    this.renderer = null;
    this.texture = null;
    this.sprite = null;
    
    // Track if rendering is enabled (can be disabled for performance)
    this.renderingEnabled = true;
    
    // For efficient rendering, we'll use a single sprite with a dynamically 
    // updated texture. This is more efficient than many small sprites.
    this.setupRendering();
  }
  
  /**
   * Create the initial trail grid as flat typed arrays
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @returns {Object} Object with values (Float32Array) and colors (Uint32Array)
   */
  createGrid(width, height) {
    const cellCount = width * height;
    const values = new Float32Array(cellCount);
    const colors = new Uint32Array(cellCount);
    const defaultColor = this.options.color;
    
    for (let i = 0; i < cellCount; i++) {
      values[i] = 0;
      colors[i] = defaultColor;
    }
    
    return { values, colors, width, height };
  }
  
  /**
   * Load image colors into grid without enabling background mode
   * This allows organisms to deposit trails in colors from the image
   * @param {HTMLImageElement|ImageData} imageData - Image to load
   */
  loadImageColors(imageData) {
    // Create temporary canvas to process the image
    const canvas = document.createElement('canvas');
    canvas.width = this.gridWidth;
    canvas.height = this.gridHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw the image scaled to fit the grid
    if (imageData instanceof HTMLImageElement) {
      ctx.drawImage(imageData, 0, 0, this.gridWidth, this.gridHeight);
    } else if (imageData instanceof ImageData) {
      ctx.putImageData(imageData, 0, 0);
    } else {
      console.error('Unsupported image format for loadImageColors');
      return;
    }
    
    // Extract pixel data
    const imageDataObj = ctx.getImageData(0, 0, this.gridWidth, this.gridHeight);
    const data = imageDataObj.data;
    
    // Store colors from image into grid
    for (let i = 0; i < this.gridWidth * this.gridHeight; i++) {
      const y = Math.floor(i / this.gridWidth);
      const x = i - y * this.gridWidth;
      const pixelIndex = (y * this.gridWidth + x) * 4;
      
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      
      // Convert RGB (0-255) to hex color (0xRRGGBB)
      this.grid.colors[i] = (r << 16) | (g << 8) | b;
    }
    
    this.needsRender = true;
  }

  /**
   * Enable background image mode with a loaded image
   * In this mode, trails reveal the underlying image based on density
   * @param {HTMLImageElement|ImageData} imageData - Image to load
   */
  loadBackgroundImage(imageData) {
    // Create temporary canvas to process the image
    const canvas = document.createElement('canvas');
    canvas.width = this.gridWidth;
    canvas.height = this.gridHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw the image scaled to fit the grid
    if (imageData instanceof HTMLImageElement) {
      ctx.drawImage(imageData, 0, 0, this.gridWidth, this.gridHeight);
    } else if (imageData instanceof ImageData) {
      ctx.putImageData(imageData, 0, 0);
    } else {
      console.error('Unsupported image format for loadBackgroundImage');
      return;
    }
    
    // Extract pixel data
    const imageDataObj = ctx.getImageData(0, 0, this.gridWidth, this.gridHeight);
    const data = imageDataObj.data;
    
    // Store colors from image into grid
    for (let i = 0; i < this.gridWidth * this.gridHeight; i++) {
      const y = Math.floor(i / this.gridWidth);
      const x = i - y * this.gridWidth;
      const pixelIndex = (y * this.gridWidth + x) * 4;
      
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      
      // Convert RGB (0-255) to hex color (0xRRGGBB)
      this.grid.colors[i] = (r << 16) | (g << 8) | b;
    }
    
    // Clear trail values to start fresh
    for (let i = 0; i < this.grid.values.length; i++) {
      this.grid.values[i] = 0;
    }
    
    // Enable background image mode
    this.backgroundImageMode = true;
    
    this.needsRender = true;
  }
  
  /**
   * Clear the background image and return to normal trail rendering
   */
  clearBackgroundImage() {
    // Reset to default color for all cells
    const defaultColor = this.options.color;
    const totalCells = this.gridWidth * this.gridHeight;
    
    for (let i = 0; i < totalCells; i++) {
      this.grid.colors[i] = defaultColor;
    }
    
    // Clear trail values
    for (let i = 0; i < totalCells; i++) {
      this.grid.values[i] = 0;
    }
    
    // Disable background image mode
    this.backgroundImageMode = false;
    
    this.needsRender = true;
  }
  
  /**
   * Set up PixiJS rendering for trails
   */
  setupRendering() {
    // For now, we'll use a simple approach: render trails as a grid of small rectangles
    // This can be optimized later using a render texture or custom shader
    
    // Clear any existing renderer
    if (this.renderer) {
      this.renderer.destroy(true);
    }
    
    // Create a container for trail graphics
    this.trailGraphics = new PIXI.Graphics();
    this.container.addChild(this.trailGraphics);
  }
  
  /**
   * Deposit trail at a given position
   * @param {number} x - X position (in world coordinates)
   * @param {number} y - Y position (in world coordinates)
   * @param {number} amount - Amount to deposit (default 1)
   */
  deposit(x, y, amount = 1, color = null) {
    // Convert world coordinates to grid coordinates using pre-calculated constants
    const gridX = Math.floor(x * this.invCellSize + this.offsetX);
    const gridY = Math.floor(y * this.invCellSize + this.offsetY);
    
    // Check bounds
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return;
    }
    
    const index = this.getIndex(gridX, gridY);
    const currentValue = this.grid.values[index];
    const currentColor = this.grid.colors[index];
    
    // Add to the grid, clamping to max value
    const newValue = clamp(currentValue + amount, 0, this.options.maxValue);
    this.grid.values[index] = newValue;
    
    // Update color if provided and not in background image mode
    // In background image mode, colors are fixed (the background image)
    // and only the density (value) changes to reveal the image
    if (!this.backgroundImageMode && color !== null && color !== undefined) {
      if (newValue <= amount) {
        // First deposit or small addition - use new color
        this.grid.colors[index] = color;
      } else {
        // Blend existing color with new color based on relative contribution
        // More deposits of same color = that color dominates
        // Mix of colors = blend
        const existingWeight = (newValue - amount) / newValue;
        const newWeight = amount / newValue;
        this.grid.colors[index] = blendColors(currentColor, color, existingWeight, newWeight);
      }
    }
    
    // Mark that we need to update rendering
    this.needsRender = true;
  }
  
  /**
   * Get trail value at a given position
   * @param {number} x - X position (in world coordinates)
   * @param {number} y - Y position (in world coordinates)
   * @returns {number} Trail density value (0-maxValue)
   */
  getValue(x, y) {
    // Convert world coordinates to grid coordinates using pre-calculated constants
    const gridX = Math.floor(x * this.invCellSize + this.offsetX);
    const gridY = Math.floor(y * this.invCellSize + this.offsetY);
    
    // Check bounds
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return 0;
    }
    
    return this.grid.values[this.getIndex(gridX, gridY)];
  }

  /**
   * Get the background color at a given position (in background image mode)
   * @param {number} x - X position (in world coordinates)
   * @param {number} y - Y position (in world coordinates)
   * @returns {number|null} Color as 0xRRGGBB, or null if out of bounds
   */
  getBackgroundColor(x, y) {
    // Convert world coordinates to grid coordinates
    const gridX = Math.floor(x * this.invCellSize + this.offsetX);
    const gridY = Math.floor(y * this.invCellSize + this.offsetY);
    
    // Check bounds
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return null;
    }
    
    return this.grid.colors[this.getIndex(gridX, gridY)];
  }
  
  /**
   * Get trail value with interpolation (smoother sampling)
   * @param {number} x - X position (in world coordinates)
   * @param {number} y - Y position (in world coordinates)
   * @returns {number} Interpolated trail density value
   */
  getValueInterpolated(x, y) {
    // Convert to grid coordinates (float) using pre-calculated constants
    const gridX = x * this.invCellSize + this.offsetX;
    const gridY = y * this.invCellSize + this.offsetY;
    
    // Get integer grid coordinates
    const x0 = Math.floor(gridX);
    const y0 = Math.floor(gridY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    // Get fractional parts
    const fx = gridX - x0;
    const fy = gridY - y0;
    
    // Get the four corner values
    const v00 = this.getValueRaw(x0, y0);
    const v10 = this.getValueRaw(x1, y0);
    const v01 = this.getValueRaw(x0, y1);
    const v11 = this.getValueRaw(x1, y1);
    
    // Bilinear interpolation
    const top = v00 + (v10 - v00) * fx;
    const bottom = v01 + (v11 - v01) * fx;
    return top + (bottom - top) * fy;
  }
  
  /**
   * Get raw grid value without bounds checking
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {number} Trail value or 0 if out of bounds
   */
  getValueRaw(gridX, gridY) {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return 0;
    }
    return this.grid.values[this.getIndex(gridX, gridY)];
  }
  
  /**
   * Convert grid coordinates to flat array index
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {number} Flat array index
   */
  getIndex(gridX, gridY) {
    return gridY * this.gridWidth + gridX;
  }

  /**
   * Get the entire trail grid (for debugging/serialization)
   * @returns {Object} Grid object with values and colors arrays
   */
  getGrid() {
    return this.grid;
  }
  
  /**
   * Get a copy of the trail grid values as a flat array
   * @returns {Float32Array} Flat array of trail values
   */
  getFlatGrid() {
    // Return a copy of the values array
    return new Float32Array(this.grid.values);
  }
  
  /**
   * Update the trail system (apply decay)
   * @param {number} delta - Time delta in seconds
   * @param {number} decayRate - Decay rate to apply (overrides default if provided)
   */
  update(delta, decayRate = null) {
    const rate = decayRate !== null ? decayRate : this.options.decayRate;
    const decayAmount = rate * delta * 60;
    
    if (decayAmount <= 0) return;
    
    // Apply decay to all cells using flat array
    const totalCells = this.gridWidth * this.gridHeight;
    for (let i = 0; i < totalCells; i++) {
      this.grid.values[i] = Math.max(0, this.grid.values[i] - decayAmount);
    }
    
    // Mark for rendering update
    this.needsRender = true;
  }
  
  /**
   * Clear all trails
   */
  clear() {
    const totalCells = this.gridWidth * this.gridHeight;
    const defaultColor = this.options.color;
    for (let i = 0; i < totalCells; i++) {
      this.grid.values[i] = 0;
      this.grid.colors[i] = defaultColor;
    }
    this.needsRender = true;
  }
  
  /**
   * Update the visual representation of trails
   */
  updateRendering() {
    if (!this.renderingEnabled || !this.needsRender) return;
    
    this.needsRender = false;
    
    // Clear existing graphics
    this.trailGraphics.clear();
    
    // Render trails as a grid of rectangles
    const cellSize = this.options.cellSize;
    const maxValue = this.options.maxValue;
    const alpha = this.options.alpha;
    
    const totalCells = this.gridWidth * this.gridHeight;
    
    for (let i = 0; i < totalCells; i++) {
      const value = this.grid.values[i];
      
      // Skip empty cells in normal mode
      if (!this.backgroundImageMode && value === 0) continue;
      
      // Calculate grid coordinates from flat index
      const y = Math.floor(i / this.gridWidth);
      const x = i - y * this.gridWidth;
      const color = this.grid.colors[i];
      
      // Calculate normalized value (0-1)
      const normalized = value / maxValue;
      
      // In background image mode: use background color with alpha based on trail density
      // Higher trail density = more opaque = background more visible
      const trailAlpha = normalized * alpha;
      
      // Draw rectangle for this cell with its color
      // Center the grid at (0,0) world coordinates using pre-calculated offsets
      this.trailGraphics.beginFill(color, trailAlpha);
      this.trailGraphics.drawRect(
        x * cellSize - this.renderOffsetX,
        y * cellSize - this.renderOffsetY,
        cellSize,
        cellSize
      );
      this.trailGraphics.endFill();
    }
  }
  
  /**
   * Enable or disable rendering
   * @param {boolean} enabled - Whether rendering is enabled
   */
  setRenderingEnabled(enabled) {
    this.renderingEnabled = enabled;
    if (enabled) {
      this.needsRender = true;
    }
  }
  
  /**
   * Get the PixiJS container for this trail system
   * @returns {PIXI.Container}
   */
  getContainer() {
    return this.container;
  }
  
  /**
   * Get trail value at a specific grid cell
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {number} Trail value
   */
  getGridValue(gridX, gridY) {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return 0;
    }
    return this.grid.values[this.getIndex(gridX, gridY)];
  }
  
  /**
   * Set trail value at a specific grid cell
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @param {number} value - Value to set
   */
  setGridValue(gridX, gridY, value) {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return;
    }
    this.grid.values[this.getIndex(gridX, gridY)] = clamp(value, 0, this.options.maxValue);
    this.needsRender = true;
  }
  
  /**
   * Get the dimensions of the trail grid
   * @returns {Object} { width, height }
   */
  getDimensions() {
    return {
      width: this.gridWidth,
      height: this.gridHeight
    };
  }
  
  /**
   * Resize the trail grid
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.gridWidth = Math.ceil(width);
    this.gridHeight = Math.ceil(height);
    this.grid = this.createGrid(this.gridWidth, this.gridHeight);
    // Re-calculate constants after resize
    this.invCellSize = 1 / this.options.cellSize;
    this.offsetX = this.gridWidth / 2;
    this.offsetY = this.gridHeight / 2;
    this.renderOffsetX = (this.gridWidth * this.options.cellSize) / 2;
    this.renderOffsetY = (this.gridHeight * this.options.cellSize) / 2;
    this.needsRender = true;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.trailGraphics) {
      this.trailGraphics.destroy(true);
    }
    if (this.container) {
      this.container.destroy(true);
    }
    if (this.sprite) {
      this.sprite.destroy(true);
    }
    if (this.texture) {
      this.texture.destroy(true);
    }
    this.grid = null;
  }
}

export default TrailSystem;
