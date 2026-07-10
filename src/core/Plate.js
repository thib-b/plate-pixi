/**
 * Plate Class
 * 
 * Represents a single petri dish/agar plate with organisms growing on it.
 * This is the main simulation container.
 */

import * as PIXI from 'pixi.js';
import { Organism } from './Organism.js';
import { TrailSystem } from './TrailSystem.js';
import { AGAR_COLORS } from '../config/colors.js';
import { randomInRange } from '../utils/random.js';

/**
 * Plate class - a single petri dish simulation
 */
export class Plate {
  /**
   * Create a new plate
   * @param {Object} config - Plate configuration
   * @param {PIXI.Container} parentContainer - PixiJS container to add to
   */
  constructor(config, parentContainer) {
    // Store configuration
    this.config = {
      x: 400,
      y: 300,
      radius: 300,
      baseColor: 0xFFFFFF,
      organismCount: 300,
      organismType: 'slime',
      organismSize: 6,
      organismSpeed: 0.5,
      trailWeight: 1.0,
      decayRate: 0.01,
      sensorAngle: 45,
      sensorDistance: 30, // Increased for better trail detection
      depositAmount: 5,
      growthPattern: 'radial',
      trailCellSize: 8, // Larger cells for more visible trails
      ...config
    };
    
    // PixiJS container for this plate
    this.container = new PIXI.Container();
    this.container.x = this.config.x;
    this.container.y = this.config.y;
    parentContainer.addChild(this.container);
    
    // Create plate visual (the agar)
    this.plateVisual = this.createPlateVisual();
    this.container.addChild(this.plateVisual);
    
    // Create trail system with larger cells for visible trails
    // Use the plate's base color for trails
    this.trailSystem = new TrailSystem(
      this.config.radius * 2, 
      this.config.radius * 2,
      { 
        cellSize: this.config.trailCellSize || 8,
        color: this.config.baseColor,
        alpha: 0.8
      }
    );
    this.container.addChild(this.trailSystem.getContainer());
    
    // Create organisms
    this.organisms = [];
    this.createOrganisms(this.config.organismCount);
    
    // State
    this.age = 0; // Time since creation
    this.growthProgress = 0; // 0-1
    this.isGrowing = true;
    
    // Add organisms to container
    this.organisms.forEach(org => {
      this.container.addChild(org.getGraphics());
    });
    
    // For debug access
    this.id = config.id || Math.floor(Math.random() * 10000);
  }
  
  /**
   * Create the visual representation of the plate (agar)
   * @returns {PIXI.Graphics} Plate visual
   */
  createPlateVisual() {
    const g = new PIXI.Graphics();
    
    // Draw the agar base (semi-transparent white)
    g.beginFill(AGAR_COLORS.base, AGAR_COLORS.baseAlpha);
    g.drawCircle(0, 0, this.config.radius);
    g.endFill();
    
    // Draw border - use a slightly smaller circle for the outline
    // This ensures the border is visible on top of the fill
    g.lineStyle(AGAR_COLORS.borderWidth, AGAR_COLORS.border, AGAR_COLORS.borderAlpha);
    g.drawCircle(0, 0, this.config.radius);
    
    return g;
  }
  
  /**
   * Create initial organisms
   * @param {number} count - Number of organisms to create
   */
  createOrganisms(count) {
    for (let i = 0; i < count; i++) {
      this.addOrganism();
    }
  }
  
  /**
   * Add a single organism to the plate
   * @returns {Organism} The new organism
   */
  addOrganism() {
    // Grow from center: start organisms near the center (small radius)
    // This creates organic growth patterns outward
    const angle = Math.random() * Math.PI * 2;
    const startRadius = this.config.radius * 0.1; // Start near center (10% of radius)
    const x = Math.cos(angle) * startRadius;
    const y = Math.sin(angle) * startRadius;
    
    const organismConfig = {
      size: this.config.organismSize,
      speed: this.config.organismSpeed * 0.2, // Much slower for growth patterns
      sensorAngle: this.config.sensorAngle,
      sensorDistance: this.config.sensorDistance * 1.5, // Longer sensors for better trail detection
      trailWeight: this.config.trailWeight * 3, // Heavier trails for stronger reinforcement
      color: this.config.baseColor,
      organismType: this.config.organismType,
      // Growth-specific parameters
      growthMode: true
    };
    
    // Pass plate center position (0,0 in plate local coordinates)
    const organism = new Organism(
      organismConfig,
      x, y,
      0, 0  // Plate center is at (0,0) in plate local coordinates
    );
    
    // Position relative to plate container
    organism.x = x;
    organism.y = y;
    
    this.organisms.push(organism);
    this.container.addChild(organism.getGraphics());
    
    return organism;
  }
  
  /**
   * Remove an organism from the plate
   * @param {Organism} organism - Organism to remove
   */
  removeOrganism(organism) {
    const index = this.organisms.indexOf(organism);
    if (index !== -1) {
      organism.destroy();
      this.organisms.splice(index, 1);
      this.container.removeChild(organism.getGraphics());
    }
  }
  
  /**
   * Add multiple organisms
   * @param {number} count - Number to add
   */
  addOrganisms(count) {
    for (let i = 0; i < count; i++) {
      this.addOrganism();
    }
  }
  
  /**
   * Remove multiple organisms
   * @param {number} count - Number to remove
   */
  removeOrganisms(count) {
    for (let i = 0; i < Math.min(count, this.organisms.length); i++) {
      this.removeOrganism(this.organisms[0]);
    }
  }
  
  /**
   * Update the plate simulation
   * @param {number} delta - Time delta in seconds
   */
  update(delta) {
    if (!this.isGrowing) return;
    
    // Update age
    this.age += delta;
    
    // Calculate growth progress (0-1) based on a target growth time
    const growthTime = 60; // 60 seconds to fully grow
    this.growthProgress = Math.min(this.age / growthTime, 1);
    
    // Update each organism
    this.organisms.forEach(organism => {
      organism.update(
        delta,
        0, 0, // Plate center relative to organism
        this.config.radius,
        this.trailSystem
      );
      
      // Deposit trail
      const deposit = organism.getTrailDeposit();
      this.trailSystem.deposit(
        organism.x,
        organism.y,
        deposit
      );
    });
    
    // Update trail system (apply decay)
    this.trailSystem.update(delta, this.config.decayRate);
    
    // Update plate visual based on growth
    this.updatePlateVisual();
  }
  
  /**
   * Update plate visual based on growth progress
   */
  updatePlateVisual() {
    // Could change color, opacity, etc. based on growth
    // For now, just a simple pulse effect
    const pulse = Math.sin(this.age * 2) * 0.05 + 0.95;
    this.plateVisual.alpha = AGAR_COLORS.baseAlpha * pulse;
  }
  
  /**
   * Reset the plate
   */
  reset() {
    // Clear existing organisms
    this.organisms.forEach(org => org.destroy());
    this.organisms = [];
    
    // Clear trails
    this.trailSystem.clear();
    
    // Reset state
    this.age = 0;
    this.growthProgress = 0;
    this.isGrowing = true;
    
    // Create new organisms
    this.createOrganisms(this.config.organismCount);
  }
  
  /**
   * Get plate container (for adding to PixiJS scene)
   * @returns {PIXI.Container}
   */
  getContainer() {
    return this.container;
  }
  
  /**
   * Get plate position
   * @returns {Object} { x, y }
   */
  getPosition() {
    return { x: this.config.x, y: this.config.y };
  }
  
  /**
   * Set plate position
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.config.x = x;
    this.config.y = y;
    this.container.x = x;
    this.container.y = y;
  }
  
  /**
   * Get plate radius
   * @returns {number}
   */
  getRadius() {
    return this.config.radius;
  }
  
  /**
   * Set plate radius
   * @param {number} radius
   */
  setRadius(radius) {
    this.config.radius = radius;
    this.updatePlateVisual();
  }
  
  /**
   * Get organism count
   * @returns {number}
   */
  getOrganismCount() {
    return this.organisms.length;
  }
  
  /**
   * Get growth progress (0-1)
   * @returns {number}
   */
  getGrowthProgress() {
    return this.growthProgress;
  }
  
  /**
   * Set whether plate is growing
   * @param {boolean} growing
   */
  setGrowing(growing) {
    this.isGrowing = growing;
  }
  
  /**
   * Get configuration
   * @returns {Object}
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Clean up
   */
  destroy() {
    this.organisms.forEach(org => org.destroy());
    this.organisms = [];
    
    if (this.plateVisual) {
      this.plateVisual.destroy();
    }
    
    if (this.trailSystem) {
      this.trailSystem.destroy();
    }
    
    if (this.container) {
      this.container.destroy();
    }
  }
}

export default Plate;
