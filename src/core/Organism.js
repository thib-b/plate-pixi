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
    
    // State
    this.size = this.config.size;
    this.color = this.config.color;
    this.organismType = this.config.organismType;
    
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
    
    // Create PixiJS graphics for rendering
    this.graphics = this.createGraphics();
    
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
    const turnSpeed = speed * 0.5;
    
    // Simple decision logic (like p5plates):
    // If center has highest value, go straight
    // If left > right, turn left
    // If right > left, turn right
    
    const { left, center, right } = this.sensors;
    
    if (center > left && center > right) {
      // Continue straight - slight forward bias
      this.vx *= 1.02;
      this.vy *= 1.02;
    } else if (left > right) {
      // Turn left
      const angle = Math.atan2(this.vy, this.vx);
      this.vx = Math.cos(angle + degreesToRadians(10)) * speed;
      this.vy = Math.sin(angle + degreesToRadians(10)) * speed;
    } else if (right > left) {
      // Turn right
      const angle = Math.atan2(this.vy, this.vx);
      this.vx = Math.cos(angle - degreesToRadians(10)) * speed;
      this.vy = Math.sin(angle - degreesToRadians(10)) * speed;
    } else {
      // Equal - slight random movement
      this.vx += (Math.random() - 0.5) * turnSpeed;
      this.vy += (Math.random() - 0.5) * turnSpeed;
    }
    
    // Limit speed
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > speed * 2) {
      this.vx = (this.vx / currentSpeed) * speed * 2;
      this.vy = (this.vy / currentSpeed) * speed * 2;
    }
    
    // Apply velocity
    this.x += this.vx * delta * 60; // Multiply by 60 for FPS independence
    this.y += this.vy * delta * 60;
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
    return this.trailWeight * this.size * 0.1;
  }
  
  /**
   * Get graphics object for rendering
   * @returns {PIXI.Graphics} PixiJS graphics
   */
  getGraphics() {
    return this.graphics;
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
