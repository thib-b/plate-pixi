/**
 * Organism Class
 * 
 * Represents a single organism growing on a plate.
 * Based on the slime mold behavior from p5plates.
 */

import * as PIXI from 'pixi.js';
import { random, randomInRange } from '../utils/random.js';
import { degreesToRadians } from '../utils/geometry.js';

/**
 * Organism class - a single entity that moves and deposits trails
 */
export class Organism {
  /**
   * Create a new organism
   * @param {Object} config - Organism configuration
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {number} plateX - Plate center x (for relative positioning)
   * @param {number} plateY - Plate center y (for relative positioning)
   */
  constructor(config, x, y, plateX, plateY) {
    // Configuration from plate
    this.config = {
      size: 8,
      speed: 0.5,
      sensorAngle: 45,
      sensorDistance: 20,
      trailWeight: 1.0,
      color: 0xFFFFFF,
      organismType: 'slime',
      ...config
    };
    
    // Position and velocity
    this.x = x;
    this.y = y;
    this.vx = randomInRange(-0.5, 0.5);
    this.vy = randomInRange(-0.5, 0.5);
    
    // Plate reference for boundary checking
    this.plateX = plateX;
    this.plateY = plateY;
    this.plateRadius = 300; // Will be set by plate
    
    // Color from background image - will be set after construction
    this.color = this.config.color;
    this.organismType = this.config.organismType;
    this.sourceColor = null; // Color of the cell this organism spawned from
    
    // Color-based movement
    this.colorSimilarityThreshold = this.config.colorSimilarityThreshold || 2000;
    this.currentCellColor = null; // Color of the cell the organism is currently in
    
    // Debug: check for NaN values
    if (isNaN(this.config.size) || isNaN(this.config.trailWeight)) {
      console.error('NaN in organism config!', this.config);
    }
    
    // Sensor values (for slime mold behavior)
    this.sensors = {
      left: 0,
      center: 0,
      right: 0
    };
    
    // Trail deposition
    this.trailWeight = this.config.trailWeight;
    this.lastTrailPosition = null;
    
    // Random variation for uniqueness
    this.variation = random();
    
    // Individual aging
    this.birthTime = Date.now();
    this.lifespan = this.config.lifespan || 600; // Default 600ms for testing, will be set by plate
    
    // Death state
    this.isDead = false;
    
    // Create PixiJS graphics for rendering
    this.graphics = this.createGraphics();
    this.graphics.alpha = 0; // Hide particles, show only trails
    
    // Set initial position of the Graphics object
    this.graphics.x = this.x;
    this.graphics.y = this.y;
  }
  
  /**
   * Create the graphics object for this organism
   * @returns {PIXI.Graphics} PixiJS graphics object
   */
  createGraphics() {
    const g = new PIXI.Graphics();
    this.updateGraphics(g);
    return g;
  }
  
  /**
   * Update the graphics to match current state
   * @param {PIXI.Graphics} g - Graphics object to update
   */
  updateGraphics(g) {
    g.clear();
    
    switch (this.organismType) {
      case 'slime':
        this.drawSlime(g);
        break;
      case 'crystal':
        this.drawCrystal(g);
        break;
      case 'bacteria':
        this.drawBacteria(g);
        break;
      case 'fungus':
        this.drawFungus(g);
        break;
      case 'spark':
        this.drawSpark(g);
        break;
      case 'blob':
      default:
        this.drawBlob(g);
        break;
    }
  }
  
  /**
   * Draw slime organism (blobby, organic)
   */
  drawSlime(g) {
    const size = this.size;
    
    // Main body
    g.beginFill(this.color);
    g.drawCircle(0, 0, size);
    
    // Add some organic variation
    const variation = this.size * 0.2 * Math.sin(Date.now() * 0.001 + this.variation * 10);
    g.drawCircle(size * 0.3, 0, size * 0.4 + variation);
    g.drawCircle(-size * 0.3, 0, size * 0.4 - variation);
    g.endFill();
  }
  
  /**
   * Draw crystal organism (geometric)
   */
  drawCrystal(g) {
    const size = this.size * 1.5;
    
    g.beginFill(this.color);
    // Hexagon shape
    g.moveTo(size, 0);
    for (let i = 1; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      g.lineTo(x, y);
    }
    g.endFill();
  }
  
  /**
   * Draw bacteria organism (small dot)
   */
  drawBacteria(g) {
    const size = this.size * 0.6;
    
    g.beginFill(this.color);
    g.drawCircle(0, 0, size);
    g.endFill();
  }
  
  /**
   * Draw fungus organism (mycelium node)
   */
  drawFungus(g) {
    const size = this.size * 1.2;
    
    g.beginFill(this.color);
    g.drawCircle(0, 0, size);
    
    // Add tendrils
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + this.variation * Math.PI * 2;
      const length = size * 0.8;
      const x = Math.cos(angle) * length;
      const y = Math.sin(angle) * length;
      g.moveTo(0, 0);
      g.lineTo(x, y);
    }
    g.endFill();
  }
  
  /**
   * Draw spark organism (point of light)
   */
  drawSpark(g) {
    const size = this.size * 0.5;
    
    // Glow effect - just draw two circles with different alpha
    // Outer glow
    g.beginFill(this.color, 0.8);
    g.drawCircle(0, 0, size);
    g.endFill();
    
    // Inner glow
    g.beginFill(0xFFFFFF, 0.5);
    g.drawCircle(0, 0, size * 0.5);
    g.endFill();
  }
  
  /**
   * Draw blob organism (irregular shape)
   */
  drawBlob(g) {
    const size = this.size;
    const points = 8 + Math.floor(this.variation * 5);
    
    g.beginFill(this.color);
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2 + this.variation * Math.PI * 2;
      const radius = size * (0.7 + this.variation * 0.3);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
      }
    }
    g.endFill();
  }
  
  /**
   * Update organism state
   * @param {number} delta - Time delta in seconds
   * @param {number} plateX - Plate center x
   * @param {number} plateY - Plate center y
   * @param {number} plateRadius - Plate radius for boundary checking
   * @param {TrailSystem} trailSystem - Trail system for sensing and depositing
   */
  update(delta, plateX, plateY, plateRadius, trailSystem) {
    // Update plate reference
    this.plateX = plateX;
    this.plateY = plateY;
    this.plateRadius = plateRadius;
    
    // Store trail system reference for sensing
    this.trailSystem = trailSystem;
    
    // Calculate individual age and progress
    this.individualAge = (Date.now() - this.birthTime) / 1000; // age in seconds
    this.individualProgress = Math.min(this.individualAge / this.lifespan, 1);
    
    // Check for death based on individual lifespan
    if (!this.isDead && this.individualProgress >= 1) {
      this.isDead = true;
      this.vx = 0;
      this.vy = 0;
      this.graphics.alpha = 0; // Make the particle disappear
    }
    
    if (this.isDead) {
      return; // Skip the rest of the update for dead organisms
    }
    
    // Sense environment
    this.sense();
    
    // Apply movement based on sensors (slime mold behavior)
    this.move(delta);
    
    // Check boundaries
    this.checkBoundaries();
    
    // Update graphics position - THIS IS THE FIX
    // Set the Graphics object's position to the organism's coordinates
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    
    // Update graphics appearance
    this.updateGraphics(this.graphics);
  }
  
  /**
   * Sense the environment using virtual sensors
   * Uses the trailSystem to sample trail values at sensor positions
   */
  sense() {
    if (!this.trailSystem) return;
    
    const { sensorAngle, sensorDistance } = this.config;
    const angleRad = degreesToRadians(sensorAngle);
    
    // Three sensors: left, center, right
    const directions = [
      { angle: -angleRad, name: 'left' },
      { angle: 0, name: 'center' },
      { angle: angleRad, name: 'right' }
    ];
    
    directions.forEach(dir => {
      // Calculate sensor position relative to organism
      // Sensors extend from the organism in the direction it's facing, offset by sensor angle
      const organismAngle = Math.atan2(this.vy, this.vx);
      const sensorAngle = organismAngle + dir.angle;
      
      // Sensor position in world coordinates
      const sx = this.x + Math.cos(sensorAngle) * sensorDistance;
      const sy = this.y + Math.sin(sensorAngle) * sensorDistance;
      
      // Sample trail value at sensor position using bilinear interpolation
      const value = this.trailSystem.getValueInterpolated(sx, sy);
      
      // Normalize to 0-1 range based on max possible value
      this.sensors[dir.name] = value / this.trailSystem.options.maxValue;
    });
  }
  
  /**
   * Move based on sensor readings
   * @param {number} delta - Time delta in seconds
   */
  move(delta) {
    const { speed } = this.config;
    
    // Calculate speed multiplier based on individual progress
    // At progress=0, speedMultiplier=1 (full speed)
    // At progress=1, speedMultiplier=0 (stopped)
    const speedMultiplier = 1 - this.individualProgress;
    const effectiveSpeed = speed * speedMultiplier;
    
    // If plate is finished, don't move at all
    if (this.growthProgress >= 1) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    
    // Simple decision logic with high randomness:
    const { left, center, right } = this.sensors;
    const maxSensorValue = this.trailSystem.options.maxValue;
    
    const currentAngle = Math.atan2(this.vy, this.vx);
    
    // Trail following with lower thresholds for more exploration
    // But avoid areas with very high trail density (already well-traveled)
    const centerTrailValue = center * maxSensorValue; // Denormalize to actual value
    const avoidThreshold = maxSensorValue * 0.8; // Avoid areas above 80% of max
    
    if (centerTrailValue > avoidThreshold) {
      // High trail density ahead - turn away to explore untraveled areas
      const turnAmount = degreesToRadians(45 + Math.random() * 90); // 45-135 degree turn
      this.vx = Math.cos(currentAngle + turnAmount) * effectiveSpeed;
      this.vy = Math.sin(currentAngle + turnAmount) * effectiveSpeed;
    } else if (center > left * 1.05 && center > right * 1.05) {
      // Trail ahead - continue straight with slight forward boost and small random variation
      const randomVariation = degreesToRadians((Math.random() - 0.5) * 20);
      this.vx = Math.cos(currentAngle + randomVariation) * effectiveSpeed * 1.05;
      this.vy = Math.sin(currentAngle + randomVariation) * effectiveSpeed * 1.05;
    } else if (left > right * 1.02) {
      // Trail to left - turn left with randomness
      const turnAmount = degreesToRadians(20 + Math.random() * 20);
      this.vx = Math.cos(currentAngle + turnAmount) * effectiveSpeed;
      this.vy = Math.sin(currentAngle + turnAmount) * effectiveSpeed;
    } else if (right > left * 1.02) {
      // Trail to right - turn right with randomness
      const turnAmount = degreesToRadians(20 + Math.random() * 20);
      this.vx = Math.cos(currentAngle - turnAmount) * effectiveSpeed;
      this.vy = Math.sin(currentAngle - turnAmount) * effectiveSpeed;
    } else {
      // No strong trail - highly random movement
      // Add significant random direction change
      const randomTurn = degreesToRadians((Math.random() - 0.5) * 120); // ±60 degrees
      this.vx = Math.cos(currentAngle + randomTurn) * effectiveSpeed;
      this.vy = Math.sin(currentAngle + randomTurn) * effectiveSpeed;
    }
    
    // Limit speed
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > effectiveSpeed * 2) {
      this.vx = (this.vx / currentSpeed) * effectiveSpeed * 2;
      this.vy = (this.vy / currentSpeed) * effectiveSpeed * 2;
    }
    
    // Calculate target position
    const targetX = this.x + this.vx * delta * 5;
    const targetY = this.y + this.vy * delta * 5;
    
    // Check if movement is allowed based on color similarity
    if (this.canMoveToPosition(targetX, targetY)) {
      // Apply velocity - REDUCED multiplier for slower, more organic growth
      this.x = targetX;
      this.y = targetY;
      
      // Update organism color to match the new cell's background color
      if (this.trailSystem && this.trailSystem.grid) {
        const gridX = Math.floor(this.x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
        const gridY = Math.floor(this.y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
        if (gridX >= 0 && gridX < this.trailSystem.gridWidth && 
            gridY >= 0 && gridY < this.trailSystem.gridHeight) {
          this.color = this.trailSystem.grid.colors[this.trailSystem.getIndex(gridX, gridY)];
        }
      }
    } else {
      // Movement not allowed - try a random direction
      // Try up to 5 random directions
      let foundValidDirection = false;
      for (let i = 0; i < 5; i++) {
        const randomAngle = Math.random() * Math.PI * 2;
        const testX = this.x + Math.cos(randomAngle) * effectiveSpeed * delta * 5;
        const testY = this.y + Math.sin(randomAngle) * effectiveSpeed * delta * 5;
        
        if (this.canMoveToPosition(testX, testY)) {
          this.x = testX;
          this.y = testY;
          this.vx = Math.cos(randomAngle) * effectiveSpeed;
          this.vy = Math.sin(randomAngle) * effectiveSpeed;
          
          // Update organism color to match the new cell's background color
          if (this.trailSystem && this.trailSystem.grid) {
            const gridX = Math.floor(this.x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
            const gridY = Math.floor(this.y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
            if (gridX >= 0 && gridX < this.trailSystem.gridWidth && 
                gridY >= 0 && gridY < this.trailSystem.gridHeight) {
              this.color = this.trailSystem.grid.colors[this.trailSystem.getIndex(gridX, gridY)];
            }
          }
          
          foundValidDirection = true;
          break;
        }
      }
      
      // If no valid direction found, don't move
      if (!foundValidDirection) {
        this.vx = 0;
        this.vy = 0;
      }
    }
  }
  
  /**
   * Check and handle plate boundaries
   */
  checkBoundaries() {
    const dx = this.x - this.plateX;
    const dy = this.y - this.plateY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // If outside plate, bounce
    if (dist > this.plateRadius) {
      // Normal vector (from plate center to organism)
      const nx = dx / dist;
      const ny = dy / dist;
      
      // Reflect velocity
      const dot = this.vx * nx + this.vy * ny;
      this.vx = this.vx - 2 * dot * nx;
      this.vy = this.vy - 2 * dot * ny;
      
      // Reposition to just inside boundary
      this.x = this.plateX + nx * (this.plateRadius - 1);
      this.y = this.plateY + ny * (this.plateRadius - 1);
      
      // Add small random perturbation
      this.vx += (Math.random() - 0.5) * 0.5;
      this.vy += (Math.random() - 0.5) * 0.5;
    }
  }
  
  /**
   * Get current trail deposit
   * @returns {number} Trail weight to deposit
   */
  getTrailDeposit() {
    // Ensure all values are valid numbers
    const trailWeight = isNaN(this.trailWeight) || !isFinite(this.trailWeight) ? 1 : this.trailWeight;
    const size = isNaN(this.size) || !isFinite(this.size) ? 1 : this.size;
    
    // Increased deposition for stronger trail reinforcement
    return trailWeight * size * 0.5;
  }
  
  /**
   * Get graphics object for rendering
   * @returns {PIXI.Graphics} PixiJS graphics
   */
  getGraphics() {
    return this.graphics;
  }
  
  /**
   * Check if organism is alive
   * @returns {boolean}
   */
  isAlive() {
    return !this.isDead;
  }
  
  /**
   * Reset organism state
   */
  reset() {
    this.isDead = false;
    this.graphics.alpha = 1;
    this.birthTime = Date.now();
    this.vx = randomInRange(-0.5, 0.5);
    this.vy = randomInRange(-0.5, 0.5);
  }
  
  /**
   * Set the organism's color based on the background image cell it's on
   * @param {number} color - The color from the background image (0xRRGGBB)
   */
  setSourceColor(color) {
    this.sourceColor = color;
    this.color = color;
  }

  /**
   * Calculate color distance between two colors
   * Uses CIE76 delta-E approximation for better perceptual matching
   * @param {number} color1 - First color (0xRRGGBB)
   * @param {number} color2 - Second color (0xRRGGBB)
   * @returns {number} Color distance (lower = more similar)
   */
  colorDistance(color1, color2) {
    // Extract RGB
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;
    
    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;
    
    // Simple RGB distance (faster, good enough for our purposes)
    // Using squared distance to avoid sqrt calculation
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return dr * dr + dg * dg + db * db;
  }

  /**
   * Check if two colors are similar (within threshold)
   * @param {number} color1 - First color (0xRRGGBB)
   * @param {number} color2 - Second color (0xRRGGBB)
   * @param {number} threshold - Maximum squared distance for similarity (default: small value)
   * @returns {boolean} True if colors are similar
   */
  colorsSimilar(color1, color2, threshold = 2000) {
    return this.colorDistance(color1, color2) < threshold;
  }

  /**
   * Get grid color at current position
   * @returns {number|null} Color as 0xRRGGBB or null
   */
  getCurrentCellColor() {
    if (this.trailSystem && this.trailSystem.grid) {
      const gridX = Math.floor(this.x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
      const gridY = Math.floor(this.y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
      if (gridX >= 0 && gridX < this.trailSystem.gridWidth && 
          gridY >= 0 && gridY < this.trailSystem.gridHeight) {
        return this.trailSystem.grid.colors[this.trailSystem.getIndex(gridX, gridY)];
      }
    }
    return null;
  }

  /**
   * Get grid color at a target position
   * @param {number} x - Target x position
   * @param {number} y - Target y position
   * @returns {number|null} Color as 0xRRGGBB or null
   */
  getTargetCellColor(x, y) {
    if (this.trailSystem && this.trailSystem.grid) {
      const gridX = Math.floor(x * this.trailSystem.invCellSize + this.trailSystem.offsetX);
      const gridY = Math.floor(y * this.trailSystem.invCellSize + this.trailSystem.offsetY);
      if (gridX >= 0 && gridX < this.trailSystem.gridWidth && 
          gridY >= 0 && gridY < this.trailSystem.gridHeight) {
        return this.trailSystem.grid.colors[this.trailSystem.getIndex(gridX, gridY)];
      }
    }
    return null;
  }

  /**
   * Check if movement to target position is allowed based on color similarity
   * @param {number} targetX - Target x position
   * @param {number} targetY - Target y position
   * @returns {boolean} True if movement is allowed
   */
  canMoveToPosition(targetX, targetY) {
    if (!this.trailSystem || !this.trailSystem.grid) {
      return true; // No grid, allow any movement
    }
    
    const currentColor = this.getCurrentCellColor();
    const targetColor = this.getTargetCellColor(targetX, targetY);
    
    // If we can't get colors, allow movement
    if (currentColor === null || targetColor === null) {
      return true;
    }
    
    // Check color similarity
    return this.colorsSimilar(currentColor, targetColor, this.colorSimilarityThreshold);
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
  }
}

export default Organism;
