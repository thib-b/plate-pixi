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
   * Create the initial trail grid
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   * @returns {Array} 2D array initialized to 0
   */
  createGrid(width, height) {
    const grid = [];
    for (let x = 0; x < width; x++) {
      grid[x] = [];
      for (let y = 0; y < height; y++) {
        grid[x][y] = 0;
      }
    }
    return grid;
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
  deposit(x, y, amount = 1) {
    // Convert world coordinates to grid coordinates
    // Grid is centered at (0,0), so we need to offset by half the grid size
    const gridX = Math.floor(x / this.options.cellSize + this.gridWidth / 2);
    const gridY = Math.floor(y / this.options.cellSize + this.gridHeight / 2);
    
    // Check bounds
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return;
    }
    
    // Add to the grid, clamping to max value
    this.grid[gridX][gridY] = clamp(
      this.grid[gridX][gridY] + amount,
      0,
      this.options.maxValue
    );
    
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
    // Convert world coordinates to grid coordinates with center offset
    const gridX = Math.floor(x / this.options.cellSize + this.gridWidth / 2);
    const gridY = Math.floor(y / this.options.cellSize + this.gridHeight / 2);
    
    // Check bounds
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return 0;
    }
    
    return this.grid[gridX][gridY];
  }
  
  /**
   * Get trail value with interpolation (smoother sampling)
   * @param {number} x - X position (in world coordinates)
   * @param {number} y - Y position (in world coordinates)
   * @returns {number} Interpolated trail density value
   */
  getValueInterpolated(x, y) {
    const cellSize = this.options.cellSize;
    const invCellSize = 1 / cellSize;
    
    // Convert to grid coordinates (float) with center offset
    const gridX = x * invCellSize + this.gridWidth / 2;
    const gridY = y * invCellSize + this.gridHeight / 2;
    
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
    return this.grid[gridX][gridY];
  }
  
  /**
   * Get the entire trail grid (for debugging/serialization)
   * @returns {Array} 2D array of trail values
   */
  getGrid() {
    return this.grid;
  }
  
  /**
   * Get a copy of the trail grid as a flat array (for efficient processing)
   * @returns {Float64Array} Flat array of trail values
   */
  getFlatGrid() {
    const flat = new Float64Array(this.gridWidth * this.gridHeight);
    let i = 0;
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        flat[i++] = this.grid[x][y];
      }
    }
    return flat;
  }
  
  /**
   * Update the trail system (apply decay)
   * @param {number} delta - Time delta in seconds
   * @param {number} decayRate - Decay rate to apply (overrides default if provided)
   */
  update(delta, decayRate = null) {
    const rate = decayRate !== null ? decayRate : this.options.decayRate;
    
    // Apply decay to all cells
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.grid[x][y] = Math.max(0, this.grid[x][y] - rate * delta * 60);
      }
    }
    
    // Mark for rendering update
    this.needsRender = true;
  }
  
  /**
   * Clear all trails
   */
  clear() {
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.grid[x][y] = 0;
      }
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
    const color = this.options.color;
    const alpha = this.options.alpha;
    
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const value = this.grid[x][y];
        if (value === 0) continue;
        
        // Calculate normalized value (0-1)
        const normalized = value / maxValue;
        
        // Calculate alpha based on value
        const trailAlpha = normalized * alpha;
        
        // Draw rectangle for this cell
        // Center the grid at (0,0) world coordinates
        this.trailGraphics.beginFill(color, trailAlpha);
        this.trailGraphics.drawRect(
          x * cellSize - (this.gridWidth * cellSize) / 2,
          y * cellSize - (this.gridHeight * cellSize) / 2,
          cellSize,
          cellSize
        );
        this.trailGraphics.endFill();
      }
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
    return this.grid[gridX][gridY];
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
    this.grid[gridX][gridY] = clamp(value, 0, this.options.maxValue);
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
