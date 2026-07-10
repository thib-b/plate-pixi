# platev3 - Project Review & Development Plan

*Last Updated: 2026-06-30*
*Reviewed by: Mistral Vibe (PixiJS Specialist)*

---

## 📊 EXECUTIVE SUMMARY

**platev3** is a **PixiJS-based 2D WebGL simulation** of organisms growing on petri dish plates. It represents the **third iteration** of this concept, following lessons learned from:
- ✅ **p5plates** (Canvas 2D) - Worked but didn't scale
- ❌ **Babylon.js attempt** - Complete failure (3 days, nothing working)  
- ❌ **Three.js attempt** - Abandoned early

**Current Status**: Core implementation is **~70% complete**. The simulation runs with organisms moving, depositing trails, and bouncing off plate boundaries. However, **critical performance optimizations and rendering polish are missing**.

**Technology**: PixiJS v7.3.0 (2D WebGL) with Vite bundler

---

## 🎯 PROJECT PURPOSE

**Primary Goal**: Foundation for:
1. **rq100 website** - Interactive plate visualizations for Robocobra Quartet's "The 100" album
2. **platedex mobile app** - Mobile plate exploration app

**Core Concept**: Simulate slime mold-like organisms that:
- Move around a circular plate
- Deposit trails (like pheromones)
- Sense and follow existing trails (highest concentration)
- Create organic, evolving patterns

---

## 🏗️ CURRENT ARCHITECTURE

### Project Structure

```
platev3/
├── package.json           # PixiJS v7.3.0 + Vite
├── README.md             # Comprehensive documentation
│
├── src/
│   ├── index.html        # Entry point with stats UI
│   ├── index.js          # Main app initialization (PlateApp)
│   │
│   ├── core/
│   │   ├── Plate.js       # ✅ Plate container & management
│   │   ├── PlateManager.js # ✅ Multiple plate coordination
│   │   ├── Organism.js    # ✅ Organism logic & rendering
│   │   ├── TrailSystem.js  # ✅ Trail grid & deposition
│   │   └── Sensor.js      # ❌ NOT YET CREATED (sensor logic in Organism)
│   │
│   ├── config/
│   │   ├── plates.js      # ✅ 100 plate definitions
│   │   └── colors.js      # ✅ Food dye color palette
│   │
│   ├── utils/
│   │   ├── random.js      # ✅ Random number generation
│   │   ├── geometry.js    # ✅ Geometric calculations
│   │   └── spatial.js     # ❌ PLACEHOLDER ONLY (no quadtree yet)
│   │
│   ├── rendering/        # ⚠️ EMPTY - Graphics created inline in core/
│   └── ui/               # ⚠️ PARTIAL - Controls & info panel
│
└── public/
    └── assets/            # Static assets (currently empty)
```

### Class Hierarchy

```
PlateApp (Main Entry)
└── PlateManager
    └── Plate (x100 possible)
        ├── PixI.Container (root)
        │   ├── Graphics (plate visual - agar)
        │   ├── TrailSystem
        │   │   └── Graphics (trail grid)
        │   └── Organism[] (500+ per plate)
        │       └── Graphics (organism body)
        └── TrailSystem (logic)
```

---

## ✅ WHAT'S WORKING

### Completed Features

1. **Core Simulation Loop** ✅
   - PixiJS Application initialized with proper config
   - Ticker-based update loop (60 FPS)
   - Pause/resume on tab visibility change

2. **Plate System** ✅
   - Multiple plates with independent configurations
   - Circular plate visual with agar appearance
   - Position, radius, color customization
   - Add/remove plates dynamically

3. **Organism System** ✅
   - 6 organism types: slime, crystal, bacteria, fungus, spark, blob
   - Each with unique visual rendering
   - Random walk movement
   - **Sensor-based trail following** (KEY FEATURE)
   - Boundary detection and bouncing

4. **Trail System** ✅
   - 2D grid for trail concentration storage
   - Bilinear interpolation for smooth sampling
   - Trail deposition from organisms
   - Decay over time

5. **Configuration** ✅
   - 100 predefined plate configurations
   - Food dye color palette
   - Simulation parameters externalized

6. **User Controls** ✅
   - Keyboard shortcuts:
     - `+` / `-` : Add/remove 100 organisms
     - `p` : Add random plate
     - `c` : Clear all plates
     - `r` : Reset first plate
     - `d` : Toggle debug panel
   - Real-time stats display (FPS, organism count, plate count)

7. **Responsive Design** ✅
   - Window resize handling
   - Full viewport rendering

---

## ⚠️ WHAT'S MISSING / NEEDS WORK

### Critical Issues (Blocking MVP)

| Priority | Issue | Impact | Files Affected |
|----------|-------|--------|----------------|
| **P0** | No object pooling | **Performance**: 500+ organisms creates GC pressure | Organism.js, Plate.js |
| **P0** | No spatial partitioning | **Performance**: O(n²) collision/sensor checks | utils/spatial.js (empty) |
| **P0** | Graphics redrawn every frame | **Performance**: CPU bottleneck on many organisms | Organism.js (updateGraphics) |
| **P1** | Trail rendering inefficient | **Visual**: Trail grid redraws entirely each frame | TrailSystem.js |
| **P1** | No GPU render groups | **Performance**: Transform calculations on CPU | PlateManager.js |
| **P2** | rendering/ directory empty | **Architecture**: Rendering logic mixed with core | All rendering should be separate |

### Missing Features

| Priority | Feature | Status | Notes |
|----------|---------|--------|-------|
| **P1** | Trail texture rendering | ❌ Not implemented | Currently using Graphics, should use Sprite/texture |
| **P2** | Growth patterns | ❌ Hardcoded | Config has growthPattern but not used |
| **P2** | Plate types from config | ⚠️ Partial | Plates.js has 100 configs but not fully utilized |
| **P3** | Mobile touch support | ❌ Not implemented | For platedex app |
| **P3** | Plate interaction (click/drag) | ❌ Not implemented | |
| **P3** | Save/load plate states | ❌ Not implemented | |
| **P3** | Export plate images | ❌ Not implemented | For rq100 website |

---

## 🔍 PIXIJS-SPECIFIC REVIEW

### ✅ What's Done Right

1. **Scene Graph Structure** ✅
   - Proper use of `Container` for grouping
   - Organisms and trails as children of plate containers
   - Root container in PlateManager for all plates

2. **Rendering Approach** ✅
   - Using `PIXI.Graphics` for vector drawing (appropriate for prototypes)
   - Direct canvas integration

3. **Update Loop** ✅
   - Using `app.ticker.add()` for frame updates
   - Delta time passed through for FPS independence

4. **Memory Management** ⚠️ Partial
   - `destroy()` methods implemented
   - But no object pooling yet

### ⚠️ Areas for Improvement (PixiJS Best Practices)

1. **Use Sprites Instead of Graphics for Static Shapes**
   - **Current**: Organisms redraw Graphics every frame
   - **Recommended**: Pre-render organism shapes to textures, use `Sprite`
   - **Benefit**: 10-100x faster rendering
   
2. **Implement Object Pooling**
   - **Current**: New Graphics created for each organism
   - **Recommended**: Pool Graphics/Sprites, reuse them
   - **Benefit**: Reduces GC pressure, improves FPS

3. **Use Render Groups**
   - **Current**: All transforms calculated on CPU each frame
   - **Recommended**: Mark plate containers as `isRenderGroup: true`
   - **Benefit**: GPU handles transform composition

4. **Implement Spatial Partitioning**
   - **Current**: O(n²) for sensor checks
   - **Recommended**: Use quadtree from `utils/spatial.js`
   - **Benefit**: O(log n) for proximity queries

5. **Texture-Based Trail Rendering**
   - **Current**: TrailSystem uses Graphics grid
   - **Recommended**: Render trail grid to texture, use Sprite
   - **Benefit**: Much faster, enables shader effects

6. **Use ParticleContainer for Organisms**
   - **Current**: Organisms are individual Containers with Graphics
   - **Recommended**: Use `ParticleContainer` with `Particle` instances
   - **Benefit**: Optimized for thousands of simple sprites

---

## 📈 PERFORMANCE ANALYSIS

### Current State

Based on the code review:

```
Organisms: 500
- Each frame: Graphics.clear() + redraw shape
- Each frame: Sensor sampling (3x bilinear interpolation)
- Each frame: Position update + boundary check
- Each frame: Trail deposition

Expected FPS: ~30-45 FPS (estimated, needs testing)
Target FPS: 60 FPS
```

### Bottlenecks

1. **Graphics Redrawing** (Highest Impact)
   - 500 organisms × Graphics.clear() + path drawing
   - **Solution**: Pre-render to textures, use Sprites

2. **Sensor System** (Medium Impact)
   - 500 organisms × 3 sensors × bilinear interpolation
   - **Solution**: Spatial partitioning to limit checks to nearby cells

3. **Transform Calculations** (Medium Impact)
   - All child transforms calculated on CPU
   - **Solution**: Use `isRenderGroup: true` on plate containers

4. **Memory Allocation** (Low-Medium Impact)
   - New objects created each frame
   - **Solution**: Object pooling

---

## 🎯 DEVELOPMENT PLAN

### Phase 1: Performance Critical Fixes (2-3 days)

**Goal**: Achieve 60 FPS with 1000+ organisms per plate

#### Task 1.1: Implement Object Pooling
- [ ] Create `OrganismPool` class in `utils/`
- [ ] Pre-allocate Graphics/Sprites at startup
- [ ] Reuse objects instead of creating/destroying
- [ ] **Acceptance**: GC pressure reduced, FPS improved

#### Task 1.2: Replace Graphics with Sprites
- [ ] Pre-render each organism type to texture
- [ ] Cache textures in `Organism` class
- [ ] Replace Graphics with Sprite in rendering
- [ ] **Acceptance**: Rendering 2-5x faster

#### Task 1.3: Implement Spatial Partitioning
- [ ] Complete `utils/spatial.js` with Quadtree
- [ ] Integrate with Organism sensing
- [ ] Only check trails in nearby cells
- [ ] **Acceptance**: Sensor checks reduced from O(n²) to O(log n)

#### Task 1.4: Enable Render Groups
- [ ] Add `isRenderGroup: true` to plate containers
- [ ] Test performance impact
- [ ] **Acceptance**: CPU usage reduced

#### Task 1.5: Optimize Trail Rendering
- [ ] Render trail grid to texture once per frame
- [ ] Use single Sprite for trail display
- [ ] **Acceptance**: Trail rendering no longer bottleneck

### Phase 2: Architecture Cleanup (1-2 days)

**Goal**: Separate rendering from simulation logic

#### Task 2.1: Create Rendering Layer
- [ ] Move rendering code from `core/` to `rendering/`
- [ ] Create `PlateRenderer.js`
- [ ] Create `OrganismRenderer.js`
- [ ] Create `TrailRenderer.js`
- [ ] **Acceptance**: Clear separation of concerns

#### Task 2.2: Create Sensor.js Class
- [ ] Extract sensor logic from Organism.js
- [ ] Centralize sensor calculations
- [ ] **Acceptance**: More maintainable code

#### Task 2.3: Complete Configuration System
- [ ] Fully integrate `config/plates.js`
- [ ] Add plate type selection
- [ ] **Acceptance**: All 100 plates usable

### Phase 3: Missing Features (2-3 days)

**Goal**: Complete MVP feature set

#### Task 3.1: Texture-Based Rendering
- [ ] Create organism texture atlas
- [ ] Use Sprite for all organisms
- [ ] **Acceptance**: Better performance, visual consistency

#### Task 3.2: Growth Patterns
- [ ] Implement radial growth
- [ ] Implement spiral growth
- [ ] Implement random growth
- [ ] **Acceptance**: Visual variety across plates

#### Task 3.3: Mobile Support
- [ ] Add touch event handling
- [ ] Test on iOS/Android via Capacitor
- [ ] **Acceptance**: Works on mobile devices

### Phase 4: Polish & Integration (1-2 days)

**Goal**: Production-ready for rq100 and platedex

#### Task 4.1: UI/UX Polish
- [ ] Better controls panel
- [ ] Plate selection interface
- [ ] Visual polish
- [ ] **Acceptance**: Professional appearance

#### Task 4.2: Integration API
- [ ] Document public API
- [ ] Create shared code package
- [ ] Test integration with platedex
- [ ] **Acceptance**: Ready for both projects

#### Task 4.3: Testing
- [ ] Performance tests (1000+ organisms)
- [ ] Mobile device testing
- [ ] Visual regression tests
- [ ] **Acceptance**: All tests pass

---

## 📅 SUGGESTED TIMELINE

| Phase | Duration | Deliverables | Dependencies |
|-------|----------|--------------|--------------|
| Phase 1 | 2-3 days | 60 FPS with 1000+ organisms | None |
| Phase 2 | 1-2 days | Clean architecture | Phase 1 |
| Phase 3 | 2-3 days | Complete features | Phase 2 |
| Phase 4 | 1-2 days | Production ready | Phase 3 |
| **Total** | **7-10 days** | MVP Complete | |

---

## 🚀 QUICK START (To Resume Work)

### Prerequisites
```bash
cd /Users/thib/dev/platev3
npm install
```

### Run Development Server
```bash
npm run dev
# Open http://localhost:5173
```

### Test Current State
1. Press `p` to add more plates
2. Press `+` / `-` to add/remove organisms
3. Press `d` to show debug stats
4. Verify FPS with 500 organisms

---

## 🔧 IMMEDIATE NEXT STEPS

### If You're Resuming Today:

1. **Test Current Performance**
   ```bash
   npm run dev
   # Add 500+ organisms, check FPS
   ```

2. **Profile with Chrome DevTools**
   - Open Chrome DevTools → Performance tab
   - Record 5-second profile
   - Identify bottlenecks

3. **Start with Highest Impact Fix**
   - **Recommendation**: Task 1.2 (Replace Graphics with Sprites)
   - This will give immediate, visible improvement

---

## 📚 KEY FILES TO UNDERSTAND

| File | Purpose | Priority | Notes |
|------|---------|----------|-------|
| `src/index.js` | Main app entry | High | Understand the initialization flow |
| `src/core/PlateManager.js` | Plate coordination | High | Central update loop |
| `src/core/Plate.js` | Single plate logic | High | Core simulation |
| `src/core/Organism.js` | Organism behavior | **CRITICAL** | Contains sensor logic & movement |
| `src/core/TrailSystem.js` | Trail grid | High | Deposition & sampling |
| `src/config/plates.js` | 100 plate configs | Medium | Defines plate varieties |
| `src/config/colors.js` | Color palette | Low | Food dye colors |
| `src/utils/random.js` | RNG utilities | Low | Helper functions |
| `src/utils/geometry.js` | Math utilities | Low | Geometry calculations |
| `src/utils/spatial.js` | **EMPTY** | **CRITICAL** | Needs quadtree implementation |

---

## 🎯 SUCCESS CRITERIA (MVP)

- [ ] 1000+ organisms per plate at 60 FPS
- [ ] Multiple plates (100 defined, 10+ on screen)
- [ ] Trail following behavior working
- [ ] Boundary handling correct
- [ ] Works on desktop and mobile
- [ ] Clean code architecture
- [ ] Ready for integration with rq100 and platedex

---

## 📝 NOTES & OBSERVATIONS

### Strengths
1. **Clean Architecture**: Good separation of concerns in core logic
2. **Well-Documented**: README is comprehensive
3. **Configurable**: Easy to customize plates and organisms
4. **PixiJS Well-Used**: Proper use of scene graph, tickers, containers
5. **Complete Simulation**: Trail following actually works!

### Areas for Improvement
1. **Performance**: The biggest blocker to scaling
2. **Rendering Architecture**: Graphics mixed with logic
3. **Mobile**: Needs touch support and testing
4. **Testing**: No automated tests yet
5. **Build**: Needs optimization for production

### Lessons from Previous Attempts
- p5plates: Canvas 2D didn't scale (performance)
- Babylon.js: 3D was overkill, learning curve too steep
- Three.js: Same issues as Babylon.js
- **PixiJS**: Sweet spot - 2D WebGL, good performance, simple API

---

## 🔗 RELATED PROJECTS

- **p5plates**: `/Users/thib/dev/p5plates/` - Reference implementation (Canvas 2D)
- **platesv2**: `/Users/thib/dev/platesv2/` - Previous attempt
- **platedex**: `/Users/thib/dev/platedex/` - Mobile app (consumer of platev3)
- **rq100**: `/Users/thib/dev/rq100/` - Website (consumer of platev3)
- **knowledge-base**: `/Users/thib/dev/knowledge-base/` - Project retrospective

---

## ✨ RECOMMENDATION

**Start with Phase 1, Task 1.2**: Replace Graphics with Sprites. This will:
1. Give immediate performance improvement
2. Help you understand the rendering architecture
3. Set up patterns for other optimizations

Once that's done, move to Task 1.1 (Object Pooling) and Task 1.3 (Spatial Partitioning).

The project is **very close** to being excellent - it just needs the performance work to match the great simulation logic already in place.
