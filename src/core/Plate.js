/**
 * Plate Class
 * 
 * Represents a single petri dish/agar plate with organisms growing on it.
 * This is the main simulation container.
 */

import * as PIXI from 'pixi.js';
import { Organism } from './Organism.js';
import { TrailSystem } from './TrailSystem.js';
import { AGAR_COLORS, FOOD_DYE_COLORS } from '../config/colors.js';
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
      organismSize: 1,
      organismSpeed: 0.5,
      trailWeight: 1.0,
      decayRate: 0,
      sensorAngle: 45,
      sensorDistance: 30, // Increased for better trail detection
      depositAmount: 5,
      growthPattern: 'radial',
      trailCellSize: 4, // Larger cells for more visible trails
      growthDuration: 600, // 10 minutes (600 seconds) for plate to stabilize
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
    this.age = 0; // Time since creation (in seconds)
    this.growthProgress = 0; // 0-1
    this.isGrowing = true;
    this.isFinished = false; // Plate is finished when all organisms are dead
    
    // Track start time for accurate time-based aging
    this.startTime = Date.now();
    
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
    
    // Draw the agar base with plate color (semi-transparent)
    // This tint matches the general color theme of the organisms
    g.beginFill(this.config.baseColor, AGAR_COLORS.baseAlpha);
    g.drawCircle(0, 0, this.config.radius);
    g.endFill();
    
    // Draw the plate edge - light grey outline representing the physical plate
    // Thin stroke at slightly larger radius
    const plateEdgeRadius = this.config.radius * 1.02;
    g.lineStyle(2, 0xF0F0F0, 0.8); // Lighter grey, thinner (2px), more opaque
    g.drawCircle(0, 0, plateEdgeRadius);
    
    // Draw border on top - dark outline at the agar edge
    g.lineStyle(AGAR_COLORS.borderWidth, AGAR_COLORS.border, AGAR_COLORS.borderAlpha);
    g.drawCircle(0, 0, this.config.radius);
    
    return g;
  }
  
  /**
   * Create initial organisms
   * @param {number} count - Number of organisms to create
   */
  createOrganisms(count) {
    // Distribute organisms across 3 seed points with different colors
    const seedCount = 3;
    const organismsPerSeed = Math.ceil(count / seedCount);
    
    // Pre-calculate random seed positions ONCE - anywhere on the plate
    const seedPositions = [];
    for (let i = 0; i < seedCount; i++) {
      const seedAngle = Math.random() * Math.PI * 2;
      const seedDistance = Math.random() * this.config.radius * 0.9; // Anywhere up to 90% of radius
      seedPositions.push({
        x: Math.cos(seedAngle) * seedDistance,
        y: Math.sin(seedAngle) * seedDistance
      });
    }
    
    // Pass the same seed position to all organisms in that seed
    for (let seedIndex = 0; seedIndex < seedCount; seedIndex++) {
      for (let i = 0; i < organismsPerSeed; i++) {
        this.addOrganism(seedIndex, seedPositions[seedIndex]);
      }
    }
  }
  
  /**
   * Add a single organism to the plate
   * @returns {Organism} The new organism
   */
  addOrganism(seedIndex = 0, seedPosition = null) {
    // Multi-seed growth: 3 starting points at random positions near center
    // seedPosition is pre-calculated in createOrganisms to ensure all organisms
    // in the same seed share the same center point
    
    let centerX, centerY;
    if (seedPosition) {
      // Use the pre-calculated seed position
      centerX = seedPosition.x;
      centerY = seedPosition.y;
    } else {
      // Fallback: generate random position (for addOrganisms called directly)
      const seedAngle = Math.random() * Math.PI * 2;
      const seedDistance = Math.random() * this.config.radius * 0.9; // Anywhere on plate
      centerX = Math.cos(seedAngle) * seedDistance;
      centerY = Math.sin(seedAngle) * seedDistance;
    }
    
    // Random position near this seed point
    const angle = Math.random() * Math.PI * 2;
    const offsetRadius = this.config.radius * 0.2 * 0.2; // Small cluster around seed
    const x = centerX + Math.cos(angle) * offsetRadius;
    const y = centerY + Math.sin(angle) * offsetRadius;
    
    // Each seed has its own color from the food dye palette
    const foodDyeColors = Object.values(FOOD_DYE_COLORS);
    const seedColor = foodDyeColors[seedIndex % foodDyeColors.length];
    
    const organismConfig = {
      size: this.config.organismSize,
      speed: this.config.organismSpeed * 0.2, // Much slower for growth patterns
      sensorAngle: this.config.sensorAngle,
      sensorDistance: this.config.sensorDistance * 1.5, // Longer sensors for better trail detection
      trailWeight: this.config.trailWeight * 3, // Heavier trails for stronger reinforcement
      color: seedColor, // Each seed has its own color
      organismType: this.config.organismType,
      // Individual lifespan - random within plate's growth duration
      lifespan: this.config.growthDuration * (0.5 + Math.random() * 0.5),
      // Growth-specific parameters
      growthMode: true,
      seedIndex: seedIndex
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
    // Distribute new organisms across 3 seed points
    const seedCount = 3;
    const organismsPerSeed = Math.ceil(count / seedCount);
    
    // Pre-calculate random seed positions for new organisms - anywhere on plate
    const seedPositions = [];
    for (let i = 0; i < seedCount; i++) {
      const seedAngle = Math.random() * Math.PI * 2;
      const seedDistance = Math.random() * this.config.radius * 0.9; // Anywhere up to 90% of radius
      seedPositions.push({
        x: Math.cos(seedAngle) * seedDistance,
        y: Math.sin(seedAngle) * seedDistance
      });
    }
    
    for (let seedIndex = 0; seedIndex < seedCount; seedIndex++) {
      for (let i = 0; i < organismsPerSeed; i++) {
        this.addOrganism(seedIndex, seedPositions[seedIndex]);
      }
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
    
    // Update age based on actual time elapsed (not delta frames)
    this.age = (Date.now() - this.startTime) / 1000;
    
    // Calculate growth progress (0-1) based on growthDuration (default 600s = 10 min)
    this.growthProgress = Math.min(this.age / this.config.growthDuration, 1);
    
    // Update each organism - they now manage their own lifespan
    this.organisms.forEach(organism => {
      organism.update(
        delta,
        0, 0, // Plate center relative to organism
        this.config.radius,
        this.trailSystem
      );
      
      // Deposit trail with organism's color (only if alive)
      if (organism.isAlive()) {
        const deposit = organism.getTrailDeposit();
        this.trailSystem.deposit(
          organism.x,
          organism.y,
          deposit,
          organism.config.color  // Pass organism's color for colored trails
        );
      }
    });
    
    // Check if all organisms are dead - plate is finished
    const allDead = this.organisms.every(org => !org.isAlive());
    if (allDead && !this.isFinished) {
      this.isFinished = true;
      this.isGrowing = false;
      console.log('Plate finished - all organisms have died');
    }
    
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
    this.isFinished = false;
    this.startTime = Date.now();
    
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
   * Check if plate is finished (all organisms dead)
   * @returns {boolean}
   */
  getIsFinished() {
    return this.isFinished;
  }
  
  /**
   * Get count of alive organisms
   * @returns {number}
   */
  getAliveOrganismCount() {
    return this.organisms.filter(org => org.isAlive()).length;
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
