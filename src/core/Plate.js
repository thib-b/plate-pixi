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
      growthDuration: 60, // 60 seconds for testing
      spawnBaseProbability: 0.01, // Base spawn probability per frame
      spawnTrailThreshold: 5, // Max trail value for spawning (find untrailed areas)
      palette: null, // Color palette for organisms (will be set by config)
      colorSimilarityThreshold: 2000, // Squared RGB distance for similar colors
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
    this.backgroundImageUrl = config.backgroundImageUrl || 'assets/plate1.png';
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
    
    // Coverage tracking for color-based growth
    this.targetCoverage = 0.8; // 80% coverage target
    this.currentCoverage = 0;
    
    // Add organisms to container
    this.organisms.forEach(org => {
      this.container.addChild(org.getGraphics());
    });
    
    // Load background image automatically
    this.loadBackgroundImageAndSetColor();
    
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
    
    // Get background color from image at spawn position
    let spawnColor = this.config.baseColor; // Fallback to plate color
    if (this.trailSystem && this.trailSystem.grid) {
      // Get color from the grid at this position
      spawnColor = this.getGridColorAt(x, y) || this.config.baseColor;
    }
    
    const organismConfig = {
      size: this.config.organismSize,
      speed: this.config.organismSpeed * 0.2, // Much slower for growth patterns
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
   * @returns {boolean} True if spawn was successful
   */
  trySpawnNewOrganism() {
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
    
    // Calculate spawn probability based on growth progress
    // Probability decays as plate ages: higher early, lower later
    const spawnProbability = this.config.spawnBaseProbability * (1 - this.growthProgress);
    
    // Check if we should attempt a spawn
    if (Math.random() >= spawnProbability) {
      return false;
    }
    
    // Try to find an untrailed location
    for (let attempt = 0; attempt < this.maxSpawnAttemptsPerFrame; attempt++) {
      // Generate random position within plate radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.config.radius * 0.9; // Within 90% of radius
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      // Check if this location has low trail density
      const trailValue = this.trailSystem.getValueInterpolated(x, y);
      if (trailValue <= this.config.spawnTrailThreshold) {
        // Found a good spot - spawn a group of organisms (50-150)
        // Get background color from image at spawn position
        const spawnCount = 50 + Math.floor(Math.random() * 101); // 50-150 organisms
        
        // Spawn multiple organisms at this location
        for (let i = 0; i < spawnCount; i++) {
          // Small random offset from spawn center
          const offsetAngle = Math.random() * Math.PI * 2;
          const offsetDistance = Math.random() * this.config.radius * 0.05; // 5% of radius spread
          const spawnX = x + Math.cos(offsetAngle) * offsetDistance;
          const spawnY = y + Math.sin(offsetAngle) * offsetDistance;
          
          // Get background color at spawn position from grid
          let spawnColor = this.config.baseColor;
          if (this.trailSystem && this.trailSystem.grid) {
            spawnColor = this.getGridColorAt(spawnX, spawnY) || this.config.baseColor;
          }
          
          const spawnConfig = {
            size: this.config.organismSize,
            speed: this.config.organismSpeed * 0.2,
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
          
          const organism = new Organism(
            spawnConfig,
            spawnX, spawnY,
            0, 0
          );
          
          organism.x = spawnX;
          organism.y = spawnY;
          
          this.organisms.push(organism);
          this.container.addChild(organism.getGraphics());
        }
        
        // Track spawn site - use color of the center position
        const centerColor = this.trailSystem && this.trailSystem.grid
          ? this.getGridColorAt(x, y) || this.config.baseColor 
          : this.config.baseColor;
        this.spawnSites.push({ x, y, color: centerColor, count: spawnCount });
        
        return true;
      }
    }
    
    return false;
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
        if (Math.random() < 0.01) { // Log 1% of deposits for debugging
          console.log('Deposit:', {x: organism.x.toFixed(1), y: organism.y.toFixed(1), color: cellColor.toString(16), deposit});
        }
      }
    });
    
    // Try to spawn new organisms at untrailed locations
    this.trySpawnNewOrganism();
    
    // Check if all organisms are dead - plate is finished
    // Only mark finished if we've had spawn sites and all organisms are dead
    if (this.spawnSites.length > 0 && this.organisms.every(org => !org.isAlive()) && !this.isFinished) {
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
   * Load background image and set plate color to 70% darkest + 30% median
   */
  async loadBackgroundImageAndSetColor() {
    console.log('Starting to load background image...');
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
      
      // Get both median and darkest colors
      const medianColor = this.getMedianColorFromImage(img);
      const darkestColor = this.getDarkestColorFromImage(img);
      
      // Blend: 70% darkest, 30% median (closer to darkest)
      const plateColor = this.blendColors(darkestColor, medianColor, 0.7, 0.3);
      
      // Update plate visual color
      this.updatePlateColor(plateColor);
      
      // Store the image reference
      this.backgroundImage = img;
      
      // Instead of loading image colors, manually set a test pattern
      // This bypasses any image loading issues
      if (this.trailSystem && this.trailSystem.grid) {
        const grid = this.trailSystem.grid;
        const totalCells = grid.width * grid.height;
        
        for (let i = 0; i < totalCells; i++) {
          const y = Math.floor(i / grid.width);
          const x = i % grid.width;
          const normX = x / grid.width;
          const normY = y / grid.height;
          
          // Create 4 distinct colored quadrants
          let r, g, b;
          if (normX < 0.5 && normY < 0.5) {
            r = 255; g = 0; b = 0;      // RED (0xFF0000)
          } else if (normX >= 0.5 && normY < 0.5) {
            r = 0; g = 255; b = 0;      // GREEN (0x00FF00)
          } else if (normX < 0.5 && normY >= 0.5) {
            r = 0; g = 0; b = 255;      // BLUE (0x0000FF)
          } else {
            r = 255; g = 255; b = 0;    // YELLOW (0xFFFF00)
          }
          grid.colors[i] = (r << 16) | (g << 8) | b;
        }
        // Also force the center cell to be bright red for easy testing
        const centerIndex = this.trailSystem.getIndex(
          Math.floor(grid.width / 2),
          Math.floor(grid.height / 2)
        );
        grid.colors[centerIndex] = 0xFF0000; // Bright red
        
        // Mark that rendering needs to be updated
        this.trailSystem.needsRender = true;
        
        console.log('Test pattern applied to grid', {
          topLeft: grid.colors[0].toString(16),
          topRight: grid.colors[Math.floor(grid.width / 2)].toString(16),
          center: grid.colors[centerIndex].toString(16),
          gridWidth: grid.width,
          gridHeight: grid.height
        });
      }
      
      // Mark as loaded
      this.backgroundImageLoaded = true;
      
    } catch (error) {
      console.error('Failed to load background image:', error);
      // Fallback: mark as loaded so spawning can proceed with default colors
      this.backgroundImageLoaded = true;
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
