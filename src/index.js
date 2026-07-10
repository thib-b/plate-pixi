/**
 * platev3 - Core plate simulation
 * 
 * This is the main entry point for the PixiJS-based plate simulation.
 * It sets up the application, creates the plate manager, and starts the simulation.
 */

import * as PIXI from 'pixi.js';
import { PlateManager } from './core/PlateManager.js';
import { FOOD_DYE_COLORS } from './config/colors.js';

// Global references for debug access
window.plateManager = null;

/**
 * Main application class
 */
class PlateApp {
  constructor() {
    // Configuration
    this.config = {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1
    };
    
    // Create PixiJS application
    this.app = new PIXI.Application(this.config);
    
    // Add canvas to DOM
    document.getElementById('app').appendChild(this.app.view);
    
    // Create plate manager
    this.plateManager = new PlateManager(this.app);
    window.plateManager = this.plateManager;
    
    // Set up UI
    this.setupUI();
    
    // Set up event listeners
    this.setupEvents();
    
    // Start with one plate - random color
    const foodDyeColors = Object.values(FOOD_DYE_COLORS);
    const randomColor = foodDyeColors[Math.floor(Math.random() * foodDyeColors.length)];
    
    this.plateManager.addPlate({
      x: this.config.width / 2,
      y: this.config.height / 2,
      radius: 300,
      baseColor: randomColor,
      organismCount: 300,
      organismSize: 6
    });
    
    // Log initialization
    console.log('platev3 initialized', {
      width: this.config.width,
      height: this.config.height,
      resolution: this.config.resolution
    });
  }
  
  /**
   * Set up user interface updates
   */
  setupUI() {
    // Update stats display
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 100);
  }
  
  /**
   * Update statistics display
   */
  updateStats() {
    const fps = this.app.ticker.FPS.toFixed(1);
    const organismCount = this.plateManager.getTotalOrganismCount();
    const plateCount = this.plateManager.plates.size;
    
    document.getElementById('fps').textContent = fps;
    document.getElementById('organism-count').textContent = organismCount;
    document.getElementById('plate-count').textContent = plateCount;
  }
  
  /**
   * Set up event listeners
   */
  setupEvents() {
    // Handle window resize
    window.addEventListener('resize', () => this.onResize());
    
    // Handle visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.app.ticker.stop();
      } else {
        this.app.ticker.start();
      }
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }
  
  /**
   * Handle window resize
   */
  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.app.renderer.resize(width, height);
    this.config.width = width;
    this.config.height = height;
    
    console.log('Resized to', width, height);
  }
  
  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event) {
    // Press 'd' to toggle debug panel
    if (event.key === 'd') {
      const debug = document.getElementById('debug');
      debug.classList.toggle('active');
    }
    
    // Press '+' to add organisms
    if (event.key === '+' || event.key === '=') {
      this.plateManager.addOrganismsToFirstPlate(100);
    }
    
    // Press '-' to remove organisms
    if (event.key === '-') {
      this.plateManager.removeOrganismsFromFirstPlate(100);
    }
    
    // Press 'p' to add a plate
    if (event.key === 'p') {
      this.plateManager.addPlate({
        x: Math.random() * this.config.width,
        y: Math.random() * this.config.height,
        radius: 200,
        baseColor: FOOD_DYE_COLORS[Object.keys(FOOD_DYE_COLORS)[Math.floor(Math.random() * Object.keys(FOOD_DYE_COLORS).length)]],
        organismCount: 200
      });
    }
    
    // Press 'c' to clear all plates
    if (event.key === 'c') {
      this.plateManager.clearPlates();
    }
    
    // Press 'r' to reset first plate
    if (event.key === 'r') {
      this.plateManager.resetFirstPlate();
    }
  }
  
  /**
   * Clean up
   */
  destroy() {
    clearInterval(this.statsInterval);
    this.app.destroy(true);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing platev3...');
  
  try {
    const app = new PlateApp();
    window.plateApp = app;
    console.log('platev3 started successfully');
  } catch (error) {
    console.error('Failed to initialize platev3:', error);
    document.getElementById('app').innerHTML = `
      <div style="color: #ff0000; padding: 40px; font-family: monospace;">
        <h1>Error Loading platev3</h1>
        <pre>${error.message}</pre>
        <p>Check console for details.</p>
      </div>
    `;
  }
});
