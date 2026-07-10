/**
 * PlateManager Class
 * 
 * Manages multiple plate instances, coordinates updates, and handles
 * plate creation, removal, and lifecycle.
 */

import * as PIXI from 'pixi.js';
import { Plate } from './Plate.js';
import { generatePlateConfig } from '../config/plates.js';

/**
 * PlateManager class - manages all plates in the simulation
 */
export class PlateManager {
  /**
   * Create a new plate manager
   * @param {PIXI.Application} app - PixiJS application instance
   * @param {Object} options - Optional configuration
   * @param {number} [options.maxPlates=10] - Maximum number of plates
   * @param {number} [options.autoGrow=true] - Whether plates grow automatically
   */
  constructor(app, options = {}) {
    this.app = app;
    
    // Configuration
    this.options = {
      maxPlates: 10,
      autoGrow: true,
      ...options
    };
    
    // Store all plates in a Map (for efficient lookup by ID)
    this.plates = new Map();
    
    // Track next ID for plates
    this.nextId = 0;
    
    // Root container for all plates
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
    
    // Track first plate for convenience
    this.firstPlate = null;
    
    // Statistics
    this.totalOrganismCount = 0;
    this.totalTrailCount = 0;
    
    // State
    this.isRunning = true;
    this.isPaused = false;
    
    // Set up update loop
    this.setupUpdateLoop();
  }
  
  /**
   * Set up the main update loop
   */
  setupUpdateLoop() {
    this.app.ticker.add((delta) => this.update(delta));
  }
  
  /**
   * Add a new plate
   * @param {Object} config - Plate configuration
   * @returns {Plate} The new plate instance
   */
  addPlate(config = {}) {
    // Check if we've reached max plates
    if (this.plates.size >= this.options.maxPlates) {
      console.warn(`Max plates (${this.options.maxPlates}) reached`);
      return null;
    }
    
    // Generate a unique ID
    const id = this.nextId++;
    
    // Merge with default config
    const plateConfig = {
      id,
      ...config
    };
    
    // Create the plate
    const plate = new Plate(plateConfig, this.container);
    
    // Store in map
    this.plates.set(id, plate);
    
    // Update first plate reference
    if (this.firstPlate === null) {
      this.firstPlate = plate;
    }
    
    // Log
    console.log(`Added plate ${id}`, plateConfig);
    
    return plate;
  }
  
  /**
   * Add multiple plates at once
   * @param {number} count - Number of plates to add
   * @param {Object} config - Base configuration for all plates
   * @returns {Array} Array of created plates
   */
  addPlates(count, config = {}) {
    const plates = [];
    for (let i = 0; i < count; i++) {
      const plate = this.addPlate({
        ...config,
        // Vary positions for multiple plates
        x: config.x + (Math.random() - 0.5) * 200,
        y: config.y + (Math.random() - 0.5) * 200
      });
      if (plate) {
        plates.push(plate);
      }
    }
    return plates;
  }
  
  /**
   * Remove a plate by ID
   * @param {number} id - Plate ID to remove
   * @returns {boolean} True if plate was removed
   */
  removePlate(id) {
    const plate = this.plates.get(id);
    if (!plate) {
      return false;
    }
    
    // Clean up
    plate.destroy();
    this.container.removeChild(plate.getContainer());
    
    // Remove from map
    this.plates.delete(id);
    
    // Update first plate reference
    if (this.firstPlate && this.firstPlate.id === id) {
      this.firstPlate = this.plates.values().next().value || null;
    }
    
    console.log(`Removed plate ${id}`);
    return true;
  }
  
  /**
   * Remove all plates
   */
  clearPlates() {
    for (const [id, plate] of this.plates) {
      plate.destroy();
      this.container.removeChild(plate.getContainer());
    }
    this.plates.clear();
    this.firstPlate = null;
    this.nextId = 0;
    this.totalOrganismCount = 0;
    this.totalTrailCount = 0;
    console.log('Cleared all plates');
  }
  
  /**
   * Get a plate by ID
   * @param {number} id - Plate ID
   * @returns {Plate|null} The plate or null if not found
   */
  getPlate(id) {
    return this.plates.get(id) || null;
  }
  
  /**
   * Get the first plate (for convenience)
   * @returns {Plate|null} The first plate or null
   */
  getFirstPlate() {
    return this.firstPlate;
  }
  
  /**
   * Get all plates as an array
   * @returns {Array} Array of all plates
   */
  getAllPlates() {
    return Array.from(this.plates.values());
  }
  
  /**
   * Get the number of plates
   * @returns {number}
   */
  getPlateCount() {
    return this.plates.size;
  }
  
  /**
   * Get total organism count across all plates
   * @returns {number}
   */
  getTotalOrganismCount() {
    let count = 0;
    for (const plate of this.plates.values()) {
      count += plate.getOrganismCount();
    }
    return count;
  }
  
  /**
   * Add organisms to the first plate
   * @param {number} count - Number of organisms to add
   */
  addOrganismsToFirstPlate(count) {
    if (this.firstPlate) {
      this.firstPlate.addOrganisms(count);
    }
  }
  
  /**
   * Remove organisms from the first plate
   * @param {number} count - Number of organisms to remove
   */
  removeOrganismsFromFirstPlate(count) {
    if (this.firstPlate) {
      this.firstPlate.removeOrganisms(count);
    }
  }
  
  /**
   * Reset the first plate
   */
  resetFirstPlate() {
    if (this.firstPlate) {
      this.firstPlate.reset();
    }
  }
  
  /**
   * Reset all plates
   */
  resetAllPlates() {
    for (const plate of this.plates.values()) {
      plate.reset();
    }
  }
  
  /**
   * Set whether all plates are growing
   * @param {boolean} growing - Whether plates should grow
   */
  setAllGrowing(growing) {
    for (const plate of this.plates.values()) {
      plate.setGrowing(growing);
    }
  }
  
  /**
   * Set whether the simulation is paused
   * @param {boolean} paused - Whether to pause
   */
  setPaused(paused) {
    this.isPaused = paused;
  }
  
  /**
   * Toggle pause state
   */
  togglePaused() {
    this.isPaused = !this.isPaused;
  }
  
  /**
   * Set whether the simulation is running
   * @param {boolean} running - Whether to run
   */
  setRunning(running) {
    this.isRunning = running;
  }
  
  /**
   * Get the root container for all plates
   * @returns {PIXI.Container}
   */
  getContainer() {
    return this.container;
  }
  
  /**
   * Add a plate using a predefined configuration from the 100 plates
   * @param {number} plateId - Plate ID from the 100 plates (1-100)
   * @returns {Plate} The new plate
   */
  addPredefinedPlate(plateId) {
    const config = generatePlateConfig(plateId);
    return this.addPlate({
      ...config,
      // Center in the view
      x: this.app.screen.width / 2,
      y: this.app.screen.height / 2
    });
  }
  
  /**
   * Add multiple predefined plates
   * @param {Array<number>} plateIds - Array of plate IDs to add
   * @returns {Array} Array of created plates
   */
  addPredefinedPlates(plateIds) {
    const plates = [];
    for (const id of plateIds) {
      const plate = this.addPredefinedPlate(id);
      if (plate) {
        plates.push(plate);
      }
    }
    return plates;
  }
  
  /**
   * Update all plates
   * @param {number} delta - Time delta in seconds
   */
  update(delta) {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    // Update all plates
    for (const plate of this.plates.values()) {
      plate.update(delta);
    }
    
    // Update statistics
    this.totalOrganismCount = this.getTotalOrganismCount();
  }
  
  /**
   * Update rendering for all trail systems
   */
  updateTrailRendering() {
    for (const plate of this.plates.values()) {
      if (plate.trailSystem) {
        plate.trailSystem.updateRendering();
      }
    }
  }
  
  /**
   * Set trail rendering enabled/disabled for all plates
   * @param {boolean} enabled - Whether trail rendering is enabled
   */
  setTrailRenderingEnabled(enabled) {
    for (const plate of this.plates.values()) {
      if (plate.trailSystem) {
        plate.trailSystem.setRenderingEnabled(enabled);
      }
    }
  }
  
  /**
   * Set options for all plates' trail systems
   * @param {Object} options - Trail system options
   */
  setTrailOptions(options) {
    for (const plate of this.plates.values()) {
      if (plate.trailSystem) {
        Object.assign(plate.trailSystem.options, options);
      }
    }
  }
  
  /**
   * Set decay rate for all plates
   * @param {number} rate - Decay rate
   */
  setDecayRate(rate) {
    for (const plate of this.plates.values()) {
      if (plate.trailSystem) {
        plate.trailSystem.options.decayRate = rate;
      }
    }
  }
  
  /**
   * Find plate at a given position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Plate|null} The plate at that position or null
   */
  getPlateAt(x, y) {
    for (const plate of this.plates.values()) {
      const plateX = plate.getPosition().x;
      const plateY = plate.getPosition().y;
      const radius = plate.getRadius();
      
      const dx = x - plateX;
      const dy = y - plateY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= radius * radius) {
        return plate;
      }
    }
    return null;
  }
  
  /**
   * Clean up all resources
   */
  destroy() {
    this.clearPlates();
    
    if (this.container) {
      this.container.destroy(true);
    }
    
    // Remove from ticker
    this.app.ticker.remove(this.update);
  }
}

export default PlateManager;
