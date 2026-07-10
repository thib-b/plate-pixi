# platev3 - PixiJS Plate Simulation

*Project: Core plate simulation engine*  
*Technology: PixiJS (2D WebGL)*  
*Status: Core Implementation Complete - Ready for Testing*  
*Purpose: Foundation for rq100 website and platedex mobile app*  
*Last Updated: 2026-06-30*

---

## Project Overview

**platev3** is the **third iteration** of the plate simulation project, using **PixiJS** as the rendering technology. This is a **fresh start** that learns from the failures of Babylon.js and Three.js attempts, while building on the success of p5plates.

### Why PixiJS?

After three attempts with different technologies:
- **p5plates** (Canvas 2D): ✅ Worked but **didn't scale** (performance issues)
- **Babylon.js** (3D WebGL): ❌ **Complete failure** (3 days, nothing working)
- **Three.js** (3D WebGL): ❌ **Abandoned early** (same trajectory)

**PixiJS** was chosen because:
1. **2D WebGL** - GPU-accelerated but designed for 2D (not 3D overkill)
2. **Sprite-based** - Perfect for organism visualization
3. **Simple API** - Easier than 3D engines, similar to p5.js
4. **High performance** - Can handle thousands of sprites at 60 FPS
5. **Mobile compatible** - Works in Capacitor WebView
6. **Browser compatible** - Works in all modern browsers

**See**: [plate-simulation-retrospective.md](../../knowledge-base/projects/plate-simulation-retrospective.md) for full analysis.

---

## Project Structure

```
platev3/
├── README.md              # This file - project overview
├── package.json            # Dependencies and scripts
├── .gitignore             # Git ignore rules
│
├── src/
│   ├── index.html          # Entry point
│   ├── index.js            # Main initialization
│   │
│   ├── core/               # Core simulation logic (SHARED with platedex)
│   │   ├── Plate.js        # Plate class
│   │   ├── Organism.js     # Organism class
│   │   ├── GrowthEngine.js # Growth simulation
│   │   ├── TrailSystem.js  # Trail deposition and fading
│   │   └── Sensor.js       # Sensor system for organisms
│   │
│   ├── config/            # Configuration files (SHARED)
│   │   ├── plates.js       # 100 plate definitions
│   │   ├── colors.js       # Food dye color palette
│   │   └── params.js       # Simulation parameters
│   │
│   ├── utils/              # Utility functions (SHARED)
│   │   ├── random.js       # Random number generation
│   │   ├── color.js        # Color manipulation
│   │   ├── geometry.js     # Geometric calculations
│   │   └── spatial.js      # Spatial partitioning (quadtree)
│   │
│   ├── rendering/         # PixiJS rendering
│   │   ├── PlateRenderer.js # Plate rendering
│   │   ├── OrganismRenderer.js # Organism rendering
│   │   └── TrailRenderer.js # Trail rendering
│   │
│   ├── scenes/             # Different scenes/views
│   │   ├── SinglePlate.js   # Single plate view
│   │   ├── GridView.js      # Multiple plates grid
│   │   └── CloseUpView.js   # Close-up/zoom view
│   │
│   └── ui/                 # User interface
│       ├── Controls.js     # UI controls
│       ├── InfoPanel.js    # Information display
│       └── styles.css      # UI styling
│
├── public/                # Static assets
│   └── assets/             # Images, textures
│
└── tests/                 # Test files
    └── ...
```

---

## Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Navigate to platev3 directory
cd /Users/thib/dev/platev3

# Initialize project
npm init -y

# Install PixiJS
npm install pixi.js

# Optional: Install TypeScript for type safety
npm install typescript @types/node --save-dev
npx tsc --init

# Start development
# (For now, just open src/index.html in browser)
# Later: npm install vite --save-dev for proper dev server
```

---

## Architecture

### Core Design Principles

1. **Separation of Concerns**
   - Simulation logic separate from rendering
   - Business logic separate from UI
   - Data separate from presentation

2. **Shared Code**
   - Core simulation (core/, config/, utils/) shared with platedex
   - Rendering specific to platev3 (or can be adapted for platedex)

3. **Performance First**
   - Spatial partitioning from day one
   - Object pooling
   - Efficient rendering

4. **Progressive Enhancement**
   - Start with one plate working
   - Add features incrementally
   - Test performance at each step

### Class Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        App                              │
└─────────────────┬─────────────────────┬────────────────┘
                  │                     │
                  ▼                     ▼
        ┌─────────────────┐     ┌─────────────────┐
        │   PlateManager  │     │   Renderer      │
        │                 │     │                 │
        │ - plates: Map   │     │ - app: PIXIApp  │
        │ - currentPlate  │     │ - container:    │
        │ - addPlate()    │     │   PIXI.Container│
        │ - removePlate() │     │ - setup()      │
        └────────┬────────┘     │ - render()     │
                 │               └─────────────────┘
                 │                         │
                 ▼                         ▼
    ┌────────────────────────┐    ┌────────────────────┐
    │        Plate            │    │    GrowthEngine    │
    │                         │    │                    │
    │ - organisms: Organism[] │    │ - timer: number    │
    │ - trails: Trail[]       │    │ - update()         │
    │ - baseColor: string     │    │ - start()          │
    │ - addOrganism()        │    │ - pause()          │
    │ - update()             │    └────────────────────┘
    └────────────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │        Organism          │
        │                         │
        │ - x, y: number          │
        │ - vx, vy: number        │
        │ - size: number          │
        │ - color: string         │
        │ - sensors: Sensor[]     │
        │ - update()             │
        │ - draw()               │
        └────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 days)

**Goal**: One working plate with basic organisms

- [x] Set up PixiJS project structure
- [x] Create core Plate class
- [x] Create basic Organism class
- [x] Implement simple movement (random walk)
- [x] Render organisms on plate
- [ ] Test with 500+ organisms (performance check)

**Success Criteria**:
- One plate renders correctly
- 500 organisms move smoothly at 60 FPS
- Visual aesthetic matches physical plates

### Phase 2: Core Simulation (2-3 days)

**Goal**: Complete the simulation logic from p5plates

- [x] Port trail system from p5plates (TrailSystem.js)
- [x] Implement sensor-based movement
- [x] Add boundary handling (circular plate)
- [ ] Implement growth patterns
- [x] Add multiple plate types (via config/plates.js)

**Success Criteria**:
- Organisms follow and deposit trails
- Sensor-based movement works
- Boundary handling works correctly
- Multiple plate types render uniquely

### Phase 3: Optimization & Polish (2-3 days)

**Goal**: Production-ready performance and visuals

- [ ] Implement spatial partitioning (quadtree)
- [ ] Add object pooling
- [ ] Optimize trail rendering
- [ ] Add food dye color palette
- [ ] Polish visual appearance
- [ ] Test on mobile devices

**Success Criteria**:
- 1000+ organisms at 60 FPS
- Works well on mobile devices
- Visual quality matches thib's physical plates

### Phase 4: Integration Ready (1-2 days)

**Goal**: Prepare for rq100 and platedex integration

- [ ] Finalize shared code structure
- [ ] Create 100 plate configurations
- [ ] Document API for consumers
- [ ] Set up build process
- [ ] Create demo page

**Success Criteria**:
- platev3 can be imported as a module
- All 100 plates defined and working
- Ready for rq100 website integration
- Ready for platedex mobile app integration

---

## Key Differences from Previous Attempts

| Aspect | p5plates | Babylon.js | Three.js | **platev3** |
|--------|----------|------------|----------|--------------|
| **Tech** | Canvas 2D | 3D WebGL | 3D WebGL | **PixiJS (2D WebGL)** |
| **Abstraction** | 2D | 3D | 3D | **2D** |
| **Performance** | ❌ Poor at scale | ❌ Never worked | ❌ Unknown | **✅ Optimized from start** |
| **Complexity** | Low | High | High | **Medium (right level)** |
| **Time to Prototype** | Hours | 3 days | 0.5 day | **1-2 days** |

---

## Code Examples

### Basic Plate Setup

```javascript
// src/index.js
import * as PIXI from 'pixi.js';

// Create the application
const app = new PIXI.Application({
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e,
  antialias: true
});

// Add canvas to DOM
document.body.appendChild(app.view);

// Create a plate (circular)
const plate = new PIXI.Graphics();
plate.beginFill(0xffffff, 0.1);
plate.drawCircle(400, 300, 300);
plate.endFill();
app.stage.addChild(plate);

// Create organisms
const organisms = [];
for (let i = 0; i < 500; i++) {
  const organism = new PIXI.Graphics();
  organism.beginFill(0xff0000);
  organism.drawCircle(0, 0, 5);
  organism.endFill();
  organism.x = Math.random() * 800;
  organism.y = Math.random() * 600;
  app.stage.addChild(organism);
  organisms.push(organism);
}

// Animation loop
app.ticker.add(() => {
  // Update all organisms
  organisms.forEach(org => {
    org.x += (Math.random() - 0.5) * 2;
    org.y += (Math.random() - 0.5) * 2;
    
    // Keep within plate
    const dx = org.x - 400;
    const dy = org.y - 300;
    if (dx*dx + dy*dy > 300*300) {
      org.x -= dx * 0.1;
      org.y -= dy * 0.1;
    }
  });
});
```

### Optimized Version with Object Pooling

```javascript
// src/core/OrganismPool.js
class OrganismPool {
  constructor(size, texture) {
    this.pool = [];
    this.texture = texture;
    
    // Pre-create organisms
    for (let i = 0; i < size; i++) {
      const organism = new PIXI.Sprite(texture);
      organism.visible = false;
      this.pool.push(organism);
    }
  }
  
  acquire() {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].visible) {
        this.pool[i].visible = true;
        return this.pool[i];
      }
    }
    // Create new if pool exhausted
    const organism = new PIXI.Sprite(this.texture);
    organism.visible = true;
    this.pool.push(organism);
    return organism;
  }
  
  release(organism) {
    organism.visible = false;
  }
}
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS | 60 | Stable under load |
| Organisms per plate | 1000+ | At 60 FPS |
| Total plates | 100 | All loaded |
| Memory | < 200MB | With all assets |
| Load time | < 2s | First plate |
| Mobile FPS | 60 | On mid-range devices |

---

## Testing Strategy

### Performance Tests
```javascript
// Test with different organism counts
function performanceTest(count) {
  const organisms = [];
  for (let i = 0; i < count; i++) {
    const org = createOrganism();
    organisms.push(org);
  }
  
  let frames = 0;
  let start = performance.now();
  
  const testLoop = () => {
    updateOrganisms(organisms);
    renderOrganisms(organisms);
    frames++;
    
    const elapsed = performance.now() - start;
    if (elapsed >= 5000) { // 5 seconds
      const fps = (frames / elapsed) * 1000;
      console.log(`FPS with ${count} organisms: ${fps.toFixed(1)}`);
      return;
    }
    
    requestAnimationFrame(testLoop);
  };
  
  requestAnimationFrame(testLoop);
}

// Run tests
performanceTest(100);
performanceTest(500);
performanceTest(1000);
performanceTest(2000);
```

### Visual Regression Tests
- Screenshot comparisons for plate rendering
- Trail pattern verification
- Color accuracy checks

### Unit Tests
- Organism behavior
- Plate boundary handling
- Trail deposition logic
- Sensor calculations

---

## Integration with Other Projects

### Shared with platedex (Mobile App)

platev3's `src/core/`, `src/config/`, and `src/utils/` will be **shared** with the platedex mobile app:

```
platev3/
└── src/
    ├── core/        # ← SHARED
    ├── config/      # ← SHARED
    ├── utils/       # ← SHARED
    ├── rendering/   # platev3-specific (PixiJS)
    └── scenes/      # platev3-specific

platedex/
└── src/
    ├── shared/      # ← IMPORTS from platev3 (or symlink)
    ├── mobile/      # platedex-specific
    └── ...
```

**Sharing Strategy Options:**
1. **Symlinks**: `ln -s ../../platev3/src/core platedex/src/shared/core`
2. **NPM Package**: Publish as `@robocobra/plate-core`
3. **Monorepo**: Use workspaces
4. **Copy**: Copy files (not recommended)

### Used by rq100 (Website)

rq100 will use platev3 for:
- Interactive plate visualizations
- Album cover close-up views
- Single plate demonstrations
- Background animations

---

## Success Criteria

### MVP (Minimum Viable Product)
- [ ] One plate with 500+ organisms rendering at 60 FPS
- [ ] Basic organism movement
- [ ] Circular plate boundary
- [ ] Visual aesthetic matching physical plates

### V1.0 (First Release)
- [ ] All MVP features
- [ ] Trail system working
- [ ] Sensor-based movement
- [ ] 100 unique plate configurations
- [ ] Performance optimized
- [ ] Mobile compatible

### V2.0 (Future Enhancements)
- [ ] Spatial partitioning for better performance
- [ ] Advanced growth patterns
- [ ] Interactive controls
- [ ] Save/load plate states
- [ ] Export plate images

---

## Troubleshooting

### Common Issues

1. **Performance Problems**
   - Check: Too many draw calls (use `PIXI.BatchRenderer`)
   - Check: Too many active sprites (use object pooling)
   - Check: Complex calculations on main thread (use Web Workers)
   - Solution: Profile with Chrome DevTools

2. **Visual Glitches**
   - Check: Z-index ordering (PixiJS uses `zIndex` property)
   - Check: Blend modes (for transparency)
   - Solution: Enable `PIXI.settings.SORTABLE_CHILDREN = true`

3. **Mobile Issues**
   - Check: Touch events working
   - Check: Retina display scaling
   - Check: Memory usage
   - Solution: Test on actual devices, not just emulators

---

## Resources

- [PixiJS Documentation](https://pixijs.com/)
- [PixiJS Examples](https://pixijs.com/examples)
- [PixiJS GitHub](https://github.com/pixijs/pixi.js)
- [p5plates Project](../p5plates/) - Reference implementation
- [Knowledge Base](../../knowledge-base/) - Project context

---

## Current Status & Next Steps

**Current Status**: Core implementation is ~70% complete. See [PROJECT_REVIEW_AND_PLAN.md](PROJECT_REVIEW_AND_PLAN.md) for detailed review and roadmap.

This project is **ready for testing**. To begin:

1. **Install dependencies** and run:
   ```bash
   cd /Users/thib/dev/platev3
   npm install
   npm run dev
   ```
   Then open `http://localhost:5173` in your browser.

2. **Test with 500+ organisms** - Verify performance meets targets (60 FPS)
3. **Test sensor-based movement** - Organisms should follow trails
4. **Test trail decay** - Trails should fade over time
5. **Test boundary handling** - Organisms should stay within circular plate
6. **Test multiple plates** - Add multiple plates with 'p' key
7. **Coordinate with platedex** - Share core classes (core/, config/, utils/)

---

*platev3 represents our third attempt at plate simulation, but the first with the right technology and lessons learned from previous attempts.*
