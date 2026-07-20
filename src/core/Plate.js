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
      organismCount: 0, // Disabled initial spawn - using dynamic spawning only
      organismType: 'slime',
      organismSize: 1,
      organismSpeed: 0.5,
      trailWeight: 1.0,
      decayRate: 0,
      sensorAngle: 45,
      sensorDistance: 30, // Increased for better trail detection
      depositAmount: 5,
      growthPattern: 'radial',
      trailCellSize: 4, // Trail cell size (balanced between detail and performance)
      growthDuration: 60, // Target completion time: 60 seconds for 100% coverage
      spawnBaseProbability: 0.05, // Base spawn probability per frame (moderate for controlled start)
      spawnTrailThreshold: 5, // Max trail value for spawning (find untrailed areas)
      palette: null, // Color palette for organisms (will be set by config)
      colorSimilarityThreshold: 2000, // Squared RGB distance for similar colors
      growthSpeed: 1.0, // Unified speed multiplier: start at normal, catch up via schedule
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
    
    // Background image support
    this.backgroundImage = null;
    this.backgroundImageUrl = config.backgroundImageUrl || this.getRandomPlateImage();
    console.log('Selected plate image:', this.backgroundImageUrl);
    this.backgroundImageLoaded = false; // Flag to track if image is loaded
    
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
    
    // Spawn tracking
    this.spawnSites = []; // Array of { x, y, color } for tracking spawn locations
    this.spawnAttempts = 0;
    this.maxSpawnAttemptsPerFrame = 10; // Limit attempts to find untrailed spot
    
    // Available spawning spots - grid cells that are NOT yet trailed
    // This is a Set of grid indices (using grid coordinates from TrailSystem)
    // This ensures we always spawn in known untrailed locations instead of random guessing
    this.availableSpawnSpots = new Set();
    
    // Coverage tracking for color-based growth
    this.targetCoverage = 1.0; // 100% coverage target
    this.currentCoverage = 0;
    
    // Add organisms to container
    this.organisms.forEach(org => {
      this.container.addChild(org.getGraphics());
    });
    
    // Load background image automatically
    this.loadBackgroundImageAndSetColor();
    
    // For debug access
    this.id = config.id || Math.floor(Math.random() * 10000);
    
    // Initialize available spawn spots after trail system is created
    this.initializeAvailableSpawnSpots();
  }
  
  /**
   * Initialize the available spawn spots set with all grid cells
   * that are below the trail threshold (i.e., not yet significantly trailed)
   */
  initializeAvailableSpawnSpots() {
    if (!this.trailSystem || !this.trailSystem.grid) {
      return;
    }
    
    this.availableSpawnSpots.clear();
    const threshold = this.trailSystem.options.maxValue * 0.1; // 10% of max
    const totalCells = this.trailSystem.gridWidth * this.trailSystem.gridHeight;
    
    for (let i = 0; i < totalCells; i++) {
      if (this.trailSystem.grid.values[i] <= threshold) {
        this.availableSpawnSpots.add(i);
      }
    }
    
    console.log(`Initialized ${this.availableSpawnSpots.size} available spawn spots out of ${totalCells} total cells`);
  }
  
  /**
   * Update available spawn spots when trail is deposited
   * Remove a grid cell from available spots if its trail value exceeds the threshold
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   */
  updateAvailableSpawnSpots(gridX, gridY) {
    if (!this.trailSystem || !this.trailSystem.grid) {
      return;
    }
    
    const threshold = this.trailSystem.options.maxValue * 0.1; // 10% of max
    const index = this.trailSystem.getIndex(gridX, gridY);
    const value = this.trailSystem.grid.values[index];
    
    if (value > threshold) {
      this.availableSpawnSpots.delete(index);
    }
  }
  
  /**
   * Get a random available spawn spot and convert it to world coordinates
   * @returns {Object|null} { x, y, gridX, gridY } or null if no spots available
   */
  getRandomAvailableSpawnSpot() {
    if (this.availableSpawnSpots.size === 0) {
      return null;
    }
    
    // Convert Set to array for random selection
    const spotIndices = Array.from(this.availableSpawnSpots);
    const randomIndex = Math.floor(Math.random() * spotIndices.length);
    const gridIndex = spotIndices[randomIndex];
    
    // Convert flat grid index to 2D coordinates
    const gridY = Math.floor(gridIndex / this.trailSystem.gridWidth);
    const gridX = gridIndex - gridY * this.trailSystem.gridWidth;
    
    // Convert grid coordinates to world coordinates
    const x = (gridX - this.trailSystem.offsetX) * this.trailSystem.options.cellSize;
    const y = (gridY - this.trailSystem.offsetY) * this.trailSystem.options.cellSize;
    
    return { x, y, gridX, gridY, gridIndex };
  }
  
  /**
   * Check if a grid cell is in available spawn spots
   * @param {number} gridX - Grid X coordinate
   * @param {number} gridY - Grid Y coordinate
   * @returns {boolean}
   */
  isSpotAvailable(gridX, gridY) {
    if (!this.trailSystem || !this.trailSystem.grid) {
      return true;
    }
    const index = this.trailSystem.getIndex(gridX, gridY);
    return this.availableSpawnSpots.has(index);
  }
  
  /**
   * Remove a circular area around a spawn point from available spawn spots
   * This prevents spawning too close to existing spawn locations
   * @param {number} x - World x position of spawn center
   * @param {number} y - World y position of spawn center
   * @param {number} radius - Radius of area to clear (in world units, default: 5% of plate radius)
   */
  removeSpawnAreaFromAvailable(x, y, radius = null) {
    if (!this.trailSystem || !this.trailSystem.grid) {
      return;
    }
    
    const clearRadius = radius || this.config.radius * 0.05;
    const clearRadiusSquared = clearRadius * clearRadius;
    
    // Convert world position to grid coordinates
    const centerGridX = Math.floor(x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
    const centerGridY = Math.floor(y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
    
    // Iterate through nearby grid cells in a square area
    const searchRadius = Math.ceil(clearRadius / this.trailSystem.options.cellSize);
    const minX = Math.max(0, centerGridX - searchRadius);
    const maxX = Math.min(this.trailSystem.gridWidth - 1, centerGridX + searchRadius);
    const minY = Math.max(0, centerGridY - searchRadius);
    const maxY = Math.min(this.trailSystem.gridHeight - 1, centerGridY + searchRadius);
    
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        // Convert grid to world to check distance
        const wx = (gx - this.trailSystem.offsetX) * this.trailSystem.options.cellSize;
        const wy = (gy - this.trailSystem.offsetY) * this.trailSystem.options.cellSize;
        
        const dx = wx - x;
        const dy = wy - y;
        const distSquared = dx * dx + dy * dy;
        
        // If within the clear radius, remove from available spots
        if (distSquared <= clearRadiusSquared) {
          const index = this.trailSystem.getIndex(gx, gy);
          this.availableSpawnSpots.delete(index);
        }
      }
    }
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
    
    // Get background color from image at spawn position
    let spawnColor = this.config.baseColor; // Fallback to plate color
    if (this.trailSystem && this.trailSystem.grid) {
      // Get color from the grid at this position
      spawnColor = this.getGridColorAt(x, y) || this.config.baseColor;
    }
    
    const organismConfig = {
      size: this.config.organismSize,
      speed: this.config.organismSpeed * 0.2 * this.config.growthSpeed, // Much slower for growth patterns, multiplied by growthSpeed
      sensorAngle: this.config.sensorAngle,
      sensorDistance: this.config.sensorDistance * 1.5, // Longer sensors for better trail detection
      trailWeight: this.config.trailWeight * 3, // Heavier trails for stronger reinforcement
      color: spawnColor, // Use background image color
      organismType: this.config.organismType,
      colorSimilarityThreshold: this.config.colorSimilarityThreshold,
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
   * Try to spawn a new organism at a random untrailed location
   * Uses the availableSpawnSpots mechanism to always spawn in known untrailed areas
   * @param {number} spawnMultiplier - How many times to attempt spawning (default 1)
   * @returns {boolean} True if at least one spawn was successful
   */
  trySpawnNewOrganism(spawnMultiplier = 1) {
    // Don't spawn until image is loaded
    if (!this.backgroundImageLoaded) {
      return false;
    }
    
    // Calculate current coverage
    this.calculateCoverage();
    
    // Stop spawning if we've reached target coverage
    if (this.hasReachedTargetCoverage()) {
      return false;
    }
    
    // Time-based spawning: calculate how much we should have grown by now
    // to finish at the target duration
    const targetDuration = this.config.growthDuration || 600; // Default 10 minutes
    const timeElapsed = this.age;
    const progressTarget = Math.min(timeElapsed / targetDuration, 1);
    const targetCoverageAtThisTime = this.targetCoverage * progressTarget;
    
    // If we're behind schedule, spawn more aggressively
    // If we're ahead, spawn less
    const behindSchedule = this.currentCoverage < targetCoverageAtThisTime;
    const scheduleFactor = behindSchedule ? 1.5 : 0.5; // Boost when behind
    
    // Debug logging - also show available spawn spots count
    if (Math.floor(this.age) % 5 === 0) { // Log every 5 seconds for 60s target
      console.log(`[${timeElapsed.toFixed(0)}s/${this.config.growthDuration}s] Coverage: ${(this.currentCoverage * 100).toFixed(1)}% | Target: ${(targetCoverageAtThisTime * 100).toFixed(1)}% | ${behindSchedule ? 'BEHIND' : 'AHEAD'} schedule | Available spots: ${this.availableSpawnSpots.size}`);
    }
    
    // Calculate spawn probability based on schedule, organism count, and growthSpeed
    // Note: We don't use coverageFactor here because availableSpawnSpots already ensures
    // we only spawn in untrailed areas. The spawning slows down naturally as availableSpots shrinks.
    const aliveCount = this.getAliveOrganismCount();
    const minOrganisms = 50; // Minimum number of alive organisms we want
    const organismFactor = aliveCount < minOrganisms ? 2 : (1 - Math.min(aliveCount / 500, 1));
    
    // Base probability adjusted for schedule and growthSpeed
    // growthSpeed affects both spawning rate and movement speed
    // Available spots count provides natural slowdown as plate fills
    const availableSpotsFactor = Math.min(this.availableSpawnSpots.size / (this.trailSystem.gridWidth * this.trailSystem.gridHeight), 1);
    const baseSpawnProbability = this.config.spawnBaseProbability * 2 * Math.max(organismFactor, 1) * scheduleFactor * this.config.growthSpeed * (0.3 + availableSpotsFactor * 0.7);
    
    // Try multiple spawns based on multiplier
    let anySpawned = false;
    for (let attempt = 0; attempt < spawnMultiplier; attempt++) {
      // Check if we should attempt a spawn this time
      if (Math.random() >= baseSpawnProbability) {
        continue; // Skip this attempt
      }
      
      // Use the available spawn spots mechanism - get a known untrailed spot
      let spawnSpot = this.getRandomAvailableSpawnSpot();
      
      // If no available spots, we can't spawn (plate is full)
      if (!spawnSpot) {
        // Re-initialize available spots in case there's a discrepancy
        // (this can happen if spots were removed but trails decayed)
        this.initializeAvailableSpawnSpots();
        const retrySpot = this.getRandomAvailableSpawnSpot();
        if (!retrySpot) {
          continue; // No spots available, skip this attempt
        }
        spawnSpot = retrySpot;
      }
      
      // Use the known available spot
      let x = spawnSpot.x;
      let y = spawnSpot.y;
      
      // Remove this spawn spot and nearby area from available spots
      // since we're about to spawn organisms here which will create trails
      this.removeSpawnAreaFromAvailable(x, y);
      
      // Spawn a group of organisms at this position
      // Moderate group size for controlled growth
      const baseSpawnCount = 50 + Math.floor(Math.random() * 51); // 50-100 organisms
      const spawnCount = Math.floor(baseSpawnCount * this.config.growthSpeed);
      
      for (let i = 0; i < spawnCount; i++) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDistance = Math.random() * this.config.radius * 0.05;
        const spawnX = x + Math.cos(offsetAngle) * offsetDistance;
        const spawnY = y + Math.sin(offsetAngle) * offsetDistance;
        
        let spawnColor = this.config.baseColor;
        if (this.trailSystem && this.trailSystem.grid) {
          spawnColor = this.getGridColorAt(spawnX, spawnY) || this.config.baseColor;
        }
        
        const spawnConfig = {
          size: this.config.organismSize,
          speed: this.config.organismSpeed * 0.2 * this.config.growthSpeed,
          sensorAngle: this.config.sensorAngle,
          sensorDistance: this.config.sensorDistance * 1.5,
          trailWeight: this.config.trailWeight * 3,
          color: spawnColor,
          organismType: this.config.organismType,
          colorSimilarityThreshold: this.config.colorSimilarityThreshold,
          lifespan: this.config.growthDuration * (0.5 + Math.random() * 0.5),
          growthMode: true,
          seedIndex: this.spawnSites.length
        };
        
        const organism = new Organism(spawnConfig, spawnX, spawnY, 0, 0);
        organism.x = spawnX;
        organism.y = spawnY;
        this.organisms.push(organism);
        this.container.addChild(organism.getGraphics());
      }
      
      const centerColor = this.trailSystem && this.trailSystem.grid
        ? this.getGridColorAt(x, y) || this.config.baseColor
        : this.config.baseColor;
      this.spawnSites.push({ x, y, color: centerColor, count: spawnCount });
      
      anySpawned = true;
    }
    
    return anySpawned;
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
      
      // Deposit trail with the cell's background color (only if alive AND image is loaded)
      if (organism.isAlive() && this.backgroundImageLoaded) {
        const deposit = organism.getTrailDeposit();
        // Get the cell's color from the grid
        const cellColor = this.getGridColorAt(organism.x, organism.y) || this.config.baseColor;
        this.trailSystem.deposit(
          organism.x,
          organism.y,
          deposit,
          cellColor  // Pass the cell's background color from the image
        );
        
        // Update available spawn spots - check if this deposit made the cell no longer available
        if (this.trailSystem) {
          const gridX = Math.floor(organism.x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
          const gridY = Math.floor(organism.y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
          this.updateAvailableSpawnSpots(gridX, gridY);
        }
        
        // Log 1% of deposits for debugging
        //if (Math.random() < 0.01) {console.debug('Deposit:', {x: organism.x.toFixed(1), y: organism.y.toFixed(1), color: cellColor.toString(16), deposit}); }
      }
    });
    
    // Try to spawn new organisms at untrailed locations
    // Use dynamic multiplier based on how behind schedule we are
    const timeElapsed = this.age;
    const progressTarget = Math.min(timeElapsed / this.config.growthDuration, 1);
    const targetCoverageAtThisTime = this.targetCoverage * progressTarget;
    const behindSchedule = this.currentCoverage < targetCoverageAtThisTime;
    // If behind, spawn more aggressively (up to 3x multiplier when behind)
    const coverageGap = targetCoverageAtThisTime - this.currentCoverage;
    const spawnMultiplier = behindSchedule ? Math.max(1, Math.min(3, 1 + Math.floor(coverageGap * 2))) : 1;
    this.trySpawnNewOrganism(spawnMultiplier);
    
    // Check if plate is finished based on coverage
    this.calculateCoverage();
    if (this.hasReachedTargetCoverage() && !this.isFinished) {
      this.isFinished = true;
      this.isGrowing = false;
      console.log('Plate finished - reached target coverage');
    }
    
    // Update trail system (apply decay)
    this.trailSystem.update(delta, this.config.decayRate);
    
    // After decay, some cells might have dropped below threshold and become available again
    // Re-initialize the available spawn spots to pick up any newly available cells
    // Only do this occasionally to avoid performance overhead
    if (this.config.decayRate > 0 && Math.random() < 0.1) { // 10% chance per frame to recheck
      this.initializeAvailableSpawnSpots();
    }
    
    // Update plate visual based on growth
    this.updatePlateVisual();
  }
  
  /**
   * Update plate visual based on growth progress
   */
  updatePlateVisual() {
    // Set constant alpha - no pulsing effect
    this.plateVisual.alpha = AGAR_COLORS.baseAlpha;
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
    this.spawnSites = []; // Reset spawn tracking
    this.availableSpawnSpots.clear(); // Clear available spawn spots
    
    // Re-initialize available spawn spots
    this.initializeAvailableSpawnSpots();
    
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
   * Calculate current plate coverage (percentage of cells with trails)
   * @returns {number} Coverage as 0-1
   */
  calculateCoverage() {
    if (!this.trailSystem) return 0;
    
    const grid = this.trailSystem.grid;
    const totalCells = grid.width * grid.height;
    let coveredCells = 0;
    
    // Count cells with trail density above a small threshold
    const threshold = this.trailSystem.options.maxValue * 0.01; // 1% of max
    
    for (let i = 0; i < totalCells; i++) {
      if (grid.values[i] > threshold) {
        coveredCells++;
      }
    }
    
    this.currentCoverage = coveredCells / totalCells;
    return this.currentCoverage;
  }

  /**
   * Check if plate has reached target coverage
   * @returns {boolean}
   */
  hasReachedTargetCoverage() {
    return this.currentCoverage >= this.targetCoverage;
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
   * Load a background image for this plate
   * Trails will reveal this image based on density
   * @param {HTMLImageElement|ImageData|string} image - Image element, ImageData, or URL
   */
  async loadBackgroundImage(image) {
    if (typeof image === 'string') {
      // Load from URL
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });
      this.backgroundImage = img;
    } else {
      this.backgroundImage = image;
    }
    
    if (this.trailSystem) {
      this.trailSystem.loadBackgroundImage(this.backgroundImage);
    }
  }

  /**
   * Clear the background image
   */
  clearBackgroundImage() {
    this.backgroundImage = null;
    this.backgroundImageUrl = null;
    if (this.trailSystem) {
      this.trailSystem.clearBackgroundImage();
    }
  }

  /**
   * Check if background image mode is enabled
   * @returns {boolean}
   */
  hasBackgroundImage() {
    return this.backgroundImage !== null;
  }

  /**
   * Get color from trail system grid at world position
   * @param {number} x - World x position
   * @param {number} y - World y position
   * @returns {number|null} Color as 0xRRGGBB or null if out of bounds
   */
  getGridColorAt(x, y) {
    if (!this.trailSystem || !this.trailSystem.grid) {
      return null;
    }
    
    // Convert world coordinates to grid coordinates
    const gridX = Math.floor(x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
    const gridY = Math.floor(y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
    
    // Check bounds
    if (gridX < 0 || gridX >= this.trailSystem.gridWidth || 
        gridY < 0 || gridY >= this.trailSystem.gridHeight) {
      return null;
    }
    
    return this.trailSystem.grid.colors[this.trailSystem.getIndex(gridX, gridY)];
  }

  /**
   * Load background image and set plate color using Color Thief
   */
  async loadBackgroundImageAndSetColor() {
    try {
      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = this.backgroundImageUrl;
      });
      
      this.backgroundImage = img;
      
      // Use Color Thief to extract the 4 main colors from the image
      const { getPaletteSync } = await import('colorthief');
      const palette = getPaletteSync(img, { colorCount: 4 }); // Get 4 main colors
      console.log('Color Thief palette (4 main colors):', palette.map(c => ({
        rgb: [c._r || c.r || 0, c._g || c.g || 0, c._b || c.b || 0],
        hex: c.hex(),
        population: c.population || 0
      })));
      
      // Find the darkest/most vibrant color from the palette
      // Calculate brightness and saturation for each color, then score them
      const scoredColors = palette.map(color => {
        const r = color._r || color.r || 0;
        const g = color._g || color.g || 0;
        const b = color._b || color.b || 0;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max * 100;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Score: darkest + most vibrant
        // Lower brightness = better (darker), higher saturation = better (more vibrant)
        // We want to maximize (saturation - brightness) to get dark vibrant colors
        const score = saturation - brightness;
        
        return { color, r, g, b, saturation, brightness, score };
      });
      
      // Sort by score (highest first) = most vibrant and darkest
      scoredColors.sort((a, b) => b.score - a.score);
      
      const best = scoredColors[0];
      const plateColor = this.rgbToHex([best.r, best.g, best.b]);
      
      console.log(`Selected darkest/most vibrant: [${best.r},${best.g},${best.b}] hex: ${plateColor.toString(16)} ` +
        `score: ${best.score.toFixed(1)} (sat: ${best.saturation.toFixed(1)}%, bright: ${best.brightness.toFixed(1)})`);
      
      // Update plate visual color
      console.log('Setting plate color to:', plateColor, 'hex:', plateColor.toString(16));
      this.updatePlateColor(plateColor);
      
      // Store the image reference
      this.backgroundImage = img;
      
      // Load image colors into trail system grid
      if (this.trailSystem) {
        console.log('Loading image colors into trail system');
        this.trailSystem.loadImageColors(img);
      } else {
        console.warn('TrailSystem not available when loading image colors');
      }
      
      // Mark as loaded
      this.backgroundImageLoaded = true;
      
      // Re-initialize available spawn spots after image is loaded
      // (trail system grid may have been updated with image colors)
      this.initializeAvailableSpawnSpots();
      
    } catch (error) {
      console.error('Failed to load background image:', error);
      // Fallback: mark as loaded so spawning can proceed with default colors
      this.backgroundImageLoaded = true;
      // Still initialize available spawn spots
      this.initializeAvailableSpawnSpots();
    }
  }

  /**
   * Analyze an image and find both its darkest and average colors
   * @param {HTMLImageElement} img - The image to analyze
   * @returns {Object} Object with darkestColor and averageColor as 0xRRGGBB
   */
  getDarkestAndAverageColorFromImage(img) {
    // Create a canvas to sample the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to a reasonable size for sampling
    const sampleWidth = Math.min(img.width, 200);
    const sampleHeight = Math.min(img.height, 200);
    
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    
    // Draw the image scaled down
    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    
    // Track darkest and accumulate for average
    let minBrightness = Infinity;
    let darkestR = 0, darkestG = 0, darkestB = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Accumulate for average
      totalR += r;
      totalG += g;
      totalB += b;
      pixelCount++;
      
      // Calculate brightness (perceived luminance)
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      
      if (brightness < minBrightness) {
        minBrightness = brightness;
        darkestR = r;
        darkestG = g;
        darkestB = b;
      }
    }
    
    // Calculate average color
    const avgR = Math.round(totalR / pixelCount);
    const avgG = Math.round(totalG / pixelCount);
    const avgB = Math.round(totalB / pixelCount);
    
    // Convert to hex colors
    const darkestColor = (darkestR << 16) | (darkestG << 8) | darkestB;
    const averageColor = (avgR << 16) | (avgG << 8) | avgB;
    
    return { darkestColor, averageColor };
  }

  /**
   * Find the darkest color of an image based on brightness
   * @param {HTMLImageElement} img - The image to analyze
   * @returns {number} The darkest color as 0xRRGGBB
   */
  getDarkestColorFromImage(img) {
    // Create a canvas to sample the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const sampleWidth = Math.min(img.width, 200);
    const sampleHeight = Math.min(img.height, 200);
    
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    
    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    
    let minBrightness = Infinity;
    let darkestR = 0, darkestG = 0, darkestB = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      
      if (brightness < minBrightness) {
        minBrightness = brightness;
        darkestR = r;
        darkestG = g;
        darkestB = b;
      }
    }
    
    return (darkestR << 16) | (darkestG << 8) | darkestB;
  }

  /**
   * Find the median color of an image based on brightness
   * The median is less affected by outliers than the average
   * @param {HTMLImageElement} img - The image to analyze
   * @returns {number} The median color as 0xRRGGBB
   */
  getMedianColorFromImage(img) {
    // Create a canvas to sample the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to a reasonable size for sampling
    const sampleWidth = Math.min(img.width, 200);
    const sampleHeight = Math.min(img.height, 200);
    
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    
    // Draw the image scaled down
    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    
    // Collect all pixels with their brightness and RGB values
    const pixels = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      pixels.push({ r, g, b, brightness });
    }
    
    // Sort pixels by brightness
    pixels.sort((a, b) => a.brightness - b.brightness);
    
    // Find the median pixel
    const midIndex = Math.floor(pixels.length / 2);
    const medianPixel = pixels[midIndex];
    
    // Return median color
    return (medianPixel.r << 16) | (medianPixel.g << 8) | medianPixel.b;
  }

  /**
   * Blend two colors together
   * @param {number} color1 - First color (0xRRGGBB)
   * @param {number} color2 - Second color (0xRRGGBB)
   * @param {number} weight1 - Weight for color1 (0-1)
   * @param {number} weight2 - Weight for color2 (0-1)
   * @returns {number} Blended color (0xRRGGBB)
   */
  blendColors(color1, color2, weight1, weight2) {
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;
    
    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;
    
    const r = Math.round(r1 * weight1 + r2 * weight2);
    const g = Math.round(g1 * weight1 + g2 * weight2);
    const b = Math.round(b1 * weight1 + b2 * weight2);
    
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Update the plate visual color
   * @param {number} color - New color as 0xRRGGBB
   */
  updatePlateColor(color) {
    this.config.baseColor = color;
    
    if (this.plateVisual) {
      // Clear and redraw the plate visual with new color
      this.container.removeChild(this.plateVisual);
      this.plateVisual.destroy(true);
      this.plateVisual = this.createPlateVisual();
      this.container.addChildAt(this.plateVisual, 0); // Add behind trails
    }
    
    // Update trail system default color
    if (this.trailSystem) {
      this.trailSystem.options.color = color;
    }
  }

  /**
   * Convert RGB array to hex color
   * @param {number[]} rgb - RGB color as [r, g, b]
   * @returns {number} Hex color as 0xRRGGBB
   */
  rgbToHex([r, g, b]) {
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get a random plate image URL from available assets
   * @returns {string} Random plate image path
   */
  getRandomPlateImage() {
    const plateImages = [
      '/assets/plate1.png',
      '/assets/plate2.png',
      '/assets/plate3.png',
      '/assets/plate4.png',
      '/assets/plate5.png'
    ];
    const randomIndex = Math.floor(Math.random() * plateImages.length);
    const selected = plateImages[randomIndex];
    console.log(`Random plate selected: ${selected} (index ${randomIndex})`);
    return selected;
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
