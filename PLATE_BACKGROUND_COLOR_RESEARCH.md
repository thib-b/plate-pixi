# Plate Background Color Research

## Problem Statement
Current approach (70% between darkest and median color) isn't producing satisfying plate background colors. Images typically have:
- **Strong colorful backgrounds** (the agar/plate color we want)
- **White, grey, or greenish moulds/colonies** (foreground that we want to ignore)

We need better methods to extract the **plate/agar background color** while ignoring the foreground mould colors.

---

## Recommended Approaches

### 1. Edge/Corner Sampling (Simplest & Most Reliable)

**Concept:** The plate background is most visible at the edges and corners of the image, away from the central mould growth.

**Implementation:**
```javascript
function getPlateBackgroundColor(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  
  // Sample points along the edges (avoiding center where mould grows)
  const edgeWidth = 10; // px from edge
  const samplePoints = [];
  
  // Top and bottom borders
  for (let x = 0; x < image.width; x += 10) {
    samplePoints.push({ x, y: edgeWidth });
    samplePoints.push({ x, y: image.height - edgeWidth - 1 });
  }
  
  // Left and right borders
  for (let y = edgeWidth; y < image.height - edgeWidth; y += 10) {
    samplePoints.push({ x: edgeWidth, y });
    samplePoints.push({ x: image.width - edgeWidth - 1, y });
  }
  
  const colors = [];
  const lightThreshold = 200; // Filter out light colors (likely mould)
  const saturationThreshold = 50; // Minimum saturation
  
  samplePoints.forEach(({ x, y }) => {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const [r, g, b] = pixel;
    
    // Calculate brightness and saturation
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max * 100;
    
    // Only keep colors that are dark enough and saturated enough
    if (brightness < lightThreshold && saturation > saturationThreshold) {
      colors.push({ r, g, b, brightness });
    }
  });
  
  if (colors.length === 0) {
    // Fallback: return darkest color from edges
    return getDarkestColorFromEdges(image);
  }
  
  // Find the most frequent color (or darkest among candidates)
  return findMostFrequentOrDarkest(colors);
}
```

**Pros:** Simple, no dependencies, directly targets plate edges
**Cons:** Requires careful threshold tuning

---

### 2. Vibrant.js (Best Library Option)

**Concept:** JavaScript port of Android's Palette class. Extracts semantic color roles including:
- `Vibrant` - Most vibrant color
- `Muted` - Most muted color  
- `DarkVibrant` - Vibrant but dark
- `DarkMuted` - Muted and dark
- `LightVibrant` - Vibrant but light
- `LightMuted` - Muted and light

For plate backgrounds, **`DarkMuted` or `DarkVibrant`** would likely be the agar color.

**Installation:**
```bash
npm install node-vibrant
# or use CDN: https://cdn.jsdelivr.net/npm/node-vibrant@3.1.6/dist/vibrant.min.js
```

**Usage:**
```javascript
import Vibrant from 'node-vibrant';

async function getBackgroundColor(imageUrl) {
  const img = await loadImage(imageUrl);
  const palette = await Vibrant.from(img).getPalette();
  
  // For plate backgrounds, try these in order:
  const candidates = [
    'DarkMuted',
    'DarkVibrant', 
    'Muted',
    'Vibrant'
  ];
  
  for (const swatchName of candidates) {
    const swatch = palette[swatchName];
    if (swatch && !isLightColor(swatch.getRgb())) {
      return swatch.getHex();
    }
  }
  
  // Fallback
  return palette.DarkMuted?.getHex() || palette.Vibrant?.getHex() || '#888888';
}

function isLightColor([r, g, b]) {
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}
```

**Pros:** Semantic color roles, handles complexity automatically
**Cons:** Larger library (~50KB), slightly slower
**Links:** https://github.com/jariz/vibrant.js/

---

### 3. Color Thief

**Concept:** Extracts a color palette using median cut algorithm. Returns an array of colors sorted by frequency.

**Installation:**
```bash
npm install colorthief
```

**Usage:**
```javascript
import ColorThief from 'colorthief';

function getPlateColor(image) {
  const colorThief = new ColorThief();
  const palette = colorThief.getPalette(image, 5); // Get 5 colors
  
  // Filter out light colors (likely mould)
  const darkColors = palette.filter(color => {
    const [r, g, b] = color;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 200;
  });
  
  // Return darkest color, or most frequent dark color
  if (darkColors.length > 0) {
    // Sort by brightness (darkest first)
    darkColors.sort((a, b) => {
      const brightA = (a[0] * 299 + a[1] * 587 + a[2] * 114) / 1000;
      const brightB = (b[0] * 299 + b[1] * 587 + b[2] * 114) / 1000;
      return brightA - brightB;
    });
    return darkColors[0];
  }
  
  // Fallback to darkest of all colors
  return getDarkestFromPalette(palette);
}
```

**Pros:** Lightweight (~3KB), fast, simple API
**Cons:** Doesn't distinguish background/foreground, just frequency
**Links:** https://lokeshdhakar.com/projects/color-thief/

---

### 4. Custom K-means Clustering (Most Accurate)

**Concept:** Use K-means clustering to group image pixels into color clusters, then identify the background cluster.

For plate images, we expect:
- 1-2 large clusters: background/agar colors
- Several smaller clusters: mould colors

The **largest cluster by pixel count** that is **not light-colored** is likely the plate background.

**Implementation libraries:**
- `dominate-color-js` (K-means++)
- Custom implementation with `simple-statistics` for centroid calculation

**Pros:** Mathematically robust, can handle complex images
**Cons:** More complex to implement, performance considerations

---

### 5. Hybrid Approach (Recommended)

Combine edge sampling with library-based palette extraction:

```javascript
async function getPlateBackgroundColor(image) {
  // Step 1: Try edge sampling (fast, usually correct)
  const edgeColor = getColorFromEdges(image);
  if (edgeColor && !isLightColor(edgeColor)) {
    return edgeColor;
  }
  
  // Step 2: Fall back to Vibrant.js for semantic colors
  const palette = await getVibrantPalette(image);
  return getBestBackgroundCandidate(palette);
}
```

---

## Comparison Table

| Method | Size | Speed | Accuracy | Best For |
|--------|------|-------|----------|----------|
| Edge Sampling | 0KB | ⚡⚡⚡ | ⭐⭐⭐ | Simple, fast solution |
| Vibrant.js | ~50KB | ⚡⚡ | ⭐⭐⭐⭐ | Semantic color roles |
| Color Thief | ~3KB | ⚡⚡⚡ | ⭐⭐⭐ | Lightweight extraction |
| K-means | ~10KB | ⚡ | ⭐⭐⭐⭐⭐ | Mathematical precision |

---

## Specific Recommendation for Plate Images

Given your images have:
- Strong, uniform background colors (agar)
- Central foreground (mould colonies)
- Mould is typically white/grey/greenish (light colors)

**Best approach:** 

1. **Primary:** Edge/corner sampling with brightness filtering
2. **Fallback:** Vibrant.js `DarkMuted` swatch
3. **Final fallback:** Darkest color from full image

This gives you:
- Speed of edge sampling for most cases
- Robustness of semantic extraction when edge sampling fails
- Guaranteed result with darkest color fallback

---

## Implementation Example

Here's a complete implementation you can drop into your project:

```javascript
// utils/colorExtraction.js

/**
 * Extract plate background color from image
 * @param {HTMLImageElement} image
 * @returns {Promise<string>} Hex color
 */
export async function getPlateBackgroundColor(image) {
  // Try edge sampling first (synchronous, fast)
  const edgeColor = extractFromEdges(image);
  if (edgeColor) {
    return edgeColor;
  }
  
  // Fall back to full image analysis
  return extractDarkestColor(image);
}

/**
 * Extract color from image edges
 */
function extractFromEdges(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  
  const sampleRadius = 20; // Sample this many pixels from each edge
  const step = 5; // Sample every N pixels
  const colors = [];
  
  // Sample all four edges
  for (let x = 0; x < image.width; x += step) {
    // Top edge
    for (let y = 0; y < sampleRadius && y < image.height; y += step) {
      addSample(ctx, x, y, colors);
    }
    // Bottom edge
    for (let y = image.height - sampleRadius; y < image.height; y += step) {
      addSample(ctx, x, y, colors);
    }
  }
  
  for (let y = 0; y < image.height; y += step) {
    // Left edge
    for (let x = 0; x < sampleRadius && x < image.width; x += step) {
      addSample(ctx, x, y, colors);
    }
    // Right edge
    for (let x = image.width - sampleRadius; x < image.width; x += step) {
      addSample(ctx, x, y, colors);
    }
  }
  
  if (colors.length === 0) return null;
  
  // Filter: only keep dark, saturated colors
  const filtered = colors.filter(c => c.brightness < 200 && c.saturation > 30);
  
  if (filtered.length > 0) {
    // Return the most frequent color
    return mostFrequentColor(filtered);
  }
  
  // Return darkest color from edge samples
  return rgbToHex(darkestColor(colors));
}

function addSample(ctx, x, y, colors) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const [r, g, b] = pixel;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max * 100;
  colors.push({ r, g, b, brightness, saturation });
}

function mostFrequentColor(colors) {
  const colorStrings = colors.map(c => `${c.r},${c.g},${c.b}`);
  const counts = {};
  colorStrings.forEach(cs => counts[cs] = (counts[cs] || 0) + 1);
  const mostFrequent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const [r, g, b] = mostFrequent.split(',').map(Number);
  return rgbToHex([r, g, b]);
}

function darkestColor(colors) {
  return colors.sort((a, b) => a.brightness - b.brightness)[0];
}

function extractDarkestColor(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height).data;
  let minBrightness = Infinity;
  let darkest = [0, 0, 0];
  
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < minBrightness) {
      minBrightness = brightness;
      darkest = [r, g, b];
    }
  }
  
  return rgbToHex(darkest);
}

function rgbToHex([r, g, b]) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
```

---

## Next Steps

1. **Try the edge sampling approach first** - It's simple, fast, and should work well for plate images
2. **Tune the thresholds** - Adjust `brightness < 200` and `saturation > 30` based on your images
3. **Consider Vibrant.js** if edge sampling doesn't work consistently - it provides more sophisticated analysis

Would you like me to implement one of these approaches in your codebase?