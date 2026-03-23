# Live Storm Title Screen — Design Specification

**Date:** 2026-03-12
**Status:** Approved (Approach B selected)
**Branch:** `codex/ecumenopolis-fullscope`

## 1. Executive Summary

Replace the static hand-painted background image on the title screen with a live 3D R3F scene featuring:
- Volumetric storm clouds (7-octave FBM + turbulence, multi-layer)
- Rotating globe showing Earth → ecumenopolis transformation
- Procedural lightning (fullscreen shader plane + additive blending)
- Hypercane vortex spiral
- Curved arc bezel menu at bottom with parallelogram/hexagonal buttons
- Procedural SYNTHETERIA title text with glow animation (replaces painted logo)

The static `background.webp` and `bg_slices/center.webp` are **retired** from the title flow. The title screen becomes a living, breathing 3D scene that communicates the game's core identity: storm-powered machine consciousness on a planet-scale.

## 2. Approach: Standalone Title Canvas + Shared Shader Library (Approach B)

### Architecture

```
TitleScreen
├── <Canvas>                          ← NEW: R3F Canvas for title scene only
│   ├── <TitleCamera />               ← Fixed perspective, position [0, 0, 10]
│   ├── <TitleStormSphere />          ← BackSide sphere, 7-octave FBM storm
│   ├── <TitleGlobe />                ← Ecumenopolis growth shader
│   ├── <TitleLightning />            ← Fullscreen shader plane, additive
│   └── <TitleHypercane />            ← Cylinder with spiral shader
├── <TitleLogo />                     ← Procedural text overlay (React Native)
├── <BezelMenu />                     ← SVG arc + positioned buttons (React Native)
├── <NewGameModal />                  ← Existing component (React Native)
├── <SettingsOverlay />               ← Existing component (React Native)
└── <LoadingOverlay />                ← Existing component (React Native)
```

### Key Decisions

1. **Separate Canvas** from gameplay — title scene is independent of game Canvas
2. **Shared GLSL library** — extract `noise()`, `fbm()`, `turbulence()` into `src/rendering/shaders/noise.glsl` (imported as template literal strings)
3. **Merge existing storm with proposals** — the title storm combines:
   - Our existing `StormSky.tsx` wormhole glow + day/night cycle concept
   - Proposal 1's 7-octave FBM + turbulence function for richer clouds
   - Proposal 1's multi-layer storm system (3 layers with different speeds)
4. **No framer-motion** — all animations use `react-native-reanimated` + CSS transitions on web
5. **No Radix/shadcn** — keep existing React Native modal/overlay components
6. **SVG bezel menu** — works cross-platform via react-native-svg or inline SVG on web

## 3. Component Specifications

### 3.1 TitleStormSphere — Merged Storm System

**Source elements:**
- Our `StormSky.tsx`: wormhole glow at zenith, day/night brightness cycle, horizon glow, weather-driven color grade
- Proposal 1: 7-octave FBM, `turbulence()` function, multi-layer density (3 layers blended 40/30/30), atmospheric fresnel fade
- Proposal 4: intensity-parameterized multi-layer architecture (separate inner/middle/outer spheres)

**Merged shader design:**

```
Geometry: sphereGeometry(radius=8, segments=64)
Material: shaderMaterial, side=BackSide, transparent, depthWrite=false

Uniforms:
  uTime: float          — clock.elapsedTime
  uIntensity: float     — title screen uses fixed 0.7, ramps to 1.0 over 10s
  uWormholeGlow: float  — fixed 0.6 for title (perpetual twilight mood)

Fragment shader merges:
  1. noise() + fbm() from shared library (7 octaves, amplitude *= 0.45)
  2. turbulence() from P1 (4-octave absolute-value FBM)
  3. Three storm layers at different scales/speeds:
     - Layer 1: fbm(pos * 3.0 + t * 0.08) — broad cloud masses
     - Layer 2: fbm(pos * 5.0 - t * 0.12) — mid-detail counter-rotation
     - Layer 3: turbulence(pos * 2.0 + t * 0.05) — fine turbulent detail
  4. Density blend: layer1 * 0.4 + layer2 * 0.3 + layer3 * 0.3
  5. Color grade from our StormSky: dark cloud → light cloud mix with skyTintShift
  6. Wormhole glow at zenith from our StormSky (purple-white, pulsing)
  7. Atmospheric fresnel fade from P1 (edge brightening)
  8. Lightning flash integration from our StormSky (hash-based frequency)

Color palette (from UI_BRAND_AND_EXPERIENCE.md):
  - darkCloud: vec3(0.02, 0.03, 0.08) — deep graphite
  - stormCloud: vec3(0.12, 0.15, 0.20) — oil-dark blue
  - lightEdge: vec3(0.18, 0.22, 0.30) — steel highlight
  - Wormhole core: purple (0.35, 0.1, 0.55) blended by glow
```

**Why merge instead of replace:** Our existing StormSky has game-specific character — the wormhole glow, the day/night concept, the red-violet cataclysmic tint. The proposals have better cloud quality (more octaves, turbulence function). Merging gives us rich clouds that still feel like Syntheteria, not generic sci-fi.

### 3.2 TitleGlobe — Earth → Ecumenopolis

**Source:** Proposal 2's globe shader (geographic continents + city growth)

This is used nearly as-is from the proposal. The globe shader is the strongest element across all proposals.

```
Geometry: sphereGeometry(radius=2.5, segments=64)
Material: shaderMaterial

Uniforms:
  uTime: float
  uGrowth: float   — 0.0 → 1.0 over ~50 seconds (slow, dramatic)

Fragment shader:
  1. continentPattern() — lat/lon geographic positioning:
     - North America, South America, Europe/Africa, Asia, Australia
     - Each uses smoothstep distance from approximate center + fbm detail
  2. coastDetail from fbm(pos * 15.0) for irregular coastlines
  3. City growth pattern:
     - Cities spread from land first (growth * 2.0 on land)
     - Then overflow to ocean (growth * 2.0 - 1.0 on water)
     - Coast-first spread via citySpread logic
  4. Color palette adapted for Syntheteria brand:
     - Deep ocean: vec3(0.01, 0.03, 0.08)
     - Land: forest/plains/desert mix
     - City base: vec3(0.12, 0.13, 0.15) — industrial gray
     - City glow: vec3(0.4, 0.8, 0.95) — CYAN (signal/intelligence)
     - City infrastructure: add amber tint vec3(0.8, 0.6, 0.2) for power grid lines
  5. City lights flicker: fbm(pos * 40.0 + t * 0.2) with sin pulse
  6. Atmospheric fresnel rim: pow(1.0 - dot(normal, viewDir), 3.0)
  7. Cloud shadows: fbm(pos * 10.0 + t * 0.1) * 0.1

Brand adaptation from P4 analysis:
  - City glow uses CYAN (0.4, 0.8, 0.95) for tech/intelligence
  - Power infrastructure grid uses AMBER hints
  - This matches UI_BRAND_AND_EXPERIENCE.md color assignments
```

**Growth animation:** Title screen starts growth at 0 and slowly increments to 1.0 over ~50 seconds. If the player sits on the title screen, they watch Earth become an ecumenopolis. This is the lore — this is what happened to Earth before the colony missions.

**Rotation:** `meshRef.rotation.y += 0.002` per frame (slow, majestic)

### 3.3 TitleLightning — Fullscreen Shader Plane

**Source:** Proposal 1's lightning shader (fullscreen plane, additive blending)

```
Geometry: planeGeometry(15, 15)
Material: shaderMaterial, transparent, blending=AdditiveBlending, depthWrite=false
Position: [0, 0, 2] (in front of globe, behind camera)

Uniforms:
  uTime: float
  uFlash: float       — 0.0 to 1.0, decays at 0.85/frame
  uBoltStart: vec2    — randomized per flash
  uBoltEnd: vec2      — randomized per flash

Fragment shader:
  lightningBolt() function:
    - 8-segment jagged zigzag pattern
    - hash-based randomization per segment
    - Exponential falloff from bolt center (exp(-dist * 60.0))
    - Outer glow layer (exp(-dist * 15.0) * 0.3)
    - Smooth fade at bolt endpoints

  3 bolts rendered simultaneously:
    - Primary bolt at uBoltStart → uBoltEnd
    - Secondary at offset (+0.2, +0.1), 0.6 opacity
    - Tertiary at offset (-0.15, -0.05), 0.7 opacity

  Flash trigger: Math.random() > 0.97 per frame (~3% chance)
  Flash decay: flash *= 0.85 per frame (fast exponential)
  Bolt color: vec3(0.6, 0.9, 1.0) — cyan-white
```

**Why fullscreen plane over our existing LightningSystem:** The title screen doesn't need game-accurate bolt positions (strike points, rod captures, sim ticks). It needs dramatic visual effect. The fullscreen shader plane is cheaper (1 draw call) and produces a more cinematic result. Our existing `LightningSystem.tsx` with 3-pass glow bolts remains for gameplay.

### 3.4 TitleHypercane — Volumetric Storm Spiral

**Source:** Proposal 1's hypercane shader

```
Geometry: cylinderGeometry(innerRadius=1, outerRadius=1.5, height=2, segments=64, open=true)
Scale: [3, 0.5, 3] — flattened disc shape
Material: shaderMaterial, transparent, side=DoubleSide, blending=AdditiveBlending, depthWrite=false

Uniforms:
  uTime: float

Fragment shader:
  1. Spiral: angle + radius * 3.0 - uTime * 2.0
  2. Pattern: sin(spiral * 8.0) * 0.5 + 0.5
  3. Turbulence: fbm(pos * 4.0 + uTime * 0.5)
  4. Intensity mask: smoothstep at inner/outer radius edges + Y fade
  5. Color: storm gray (0.15, 0.20, 0.28) → glow (0.3, 0.5, 0.7)
  6. Alpha: intensity * 0.4

Rotation: meshRef.rotation.y += 0.3 * elapsedTime (visibly spinning)
```

### 3.5 TitleLogo — Procedural SYNTHETERIA Text

**Source:** Proposal 3's dark band + glow treatment, adapted to React Native

The hand-painted logo from `bg_slices/center.webp` is retired. The title text is now rendered as a React Native `<Text>` component with glow effects.

```tsx
// React Native implementation (not framer-motion)
<View style={styles.logoContainer}>
  {/* Dark band behind text for readability over 3D scene */}
  <View style={styles.darkBand} />

  {/* Main title */}
  <Text style={styles.titleText}>SYNTHETERIA</Text>

  {/* Subtitle */}
  <Text style={styles.subtitleText}>Machine Consciousness Awakens</Text>
</View>
```

**Glow effect on web:** CSS `text-shadow` with multiple layers:
```css
text-shadow:
  0 0 30px rgba(139, 230, 255, 0.8),
  0 0 60px rgba(139, 230, 255, 0.5),
  0 0 90px rgba(139, 230, 255, 0.3);
```

**Glow animation:** `react-native-reanimated` `useAnimatedStyle` oscillating text-shadow intensity (web) or opacity pulse (native).

**Dark band:** Semi-transparent gradient band behind logo for contrast:
```
background: linear-gradient(
  to bottom,
  transparent 0%,
  rgba(3, 7, 13, 0.85) 20%,
  rgba(3, 7, 13, 0.95) 50%,
  rgba(3, 7, 13, 0.85) 80%,
  transparent 100%
)
```

**Color:** `#8be6ff` (brand cyan) — matches `UI_BRAND_AND_EXPERIENCE.md` signal/focus color.

**Typography:** `font-mono`, uppercase, tracking `0.3em`, responsive sizes:
- Phone: 32px
- Tablet: 48px
- Desktop: 64-80px

### 3.6 BezelMenu — Curved Arc SVG Menu

**Source:** Proposal 3's hexagonal clip-path buttons on arc + Proposal 4's SVG bezel structure

The bottom of the viewport features a curved SVG arc with three menu buttons positioned along the curve.

```
Structure:
  <View style={absoluteBottom}>
    <Svg viewBox="0 0 1200 200">
      {/* Curved bezel fill */}
      <Path d="M 0,200 L 0,120 Q 600,20 1200,120 L 1200,200 Z"
            fill="rgba(15, 23, 42, 0.85)"
            stroke="rgba(139, 230, 255, 0.4)" />
      {/* Inner accent line */}
      <Path d="M 50,190 L 50,125 Q 600,35 1150,125 L 1150,190"
            fill="none"
            stroke="rgba(139, 230, 255, 0.2)" />
    </Svg>

    {/* Buttons positioned on the arc */}
    <NewGameButton />      — left arc, cyan border/glow, clipPath parallelogram
    <LoadGameButton />     — center arc (highest point), disabled when no saves
    <SettingsButton />     — right arc, amber border/glow (infrastructure color)
  </View>
```

**Button design (from P1/P3 synthesis):**
- Parallelogram clip-path: `polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)`
- Gradient fill: `linear-gradient(135deg, rgba(accent, 0.1), rgba(accent, 0.05))`
- Border: `2px solid rgba(accent, 0.4)`
- Hover: brighten gradient to 0.3/0.15, border to 0.8, translateY(-2px), box-shadow
- Press: scale(0.98) via reanimated spring

**Color assignments (from P1's brand-correct palette):**
- New Game: **cyan** `#8be6ff` — primary action, signal/intelligence
- Load Game: **slate** `#64748b` — secondary, disabled when no saves
- Settings: **amber** `#f6c56a` — infrastructure/configuration (per UI_BRAND_AND_EXPERIENCE.md)

**Staggered entrance animation:**
- Buttons fade-in with `translateY(30) → 0` using reanimated
- Staggered delay: New Game at 1.0s, Load Game at 1.2s, Settings at 1.4s

**Phone portrait layout:**
- Arc flattens (tighter curve, less height)
- Buttons may stack vertically if viewport width < 480px
- Safe area insets respected via `pb-safe`

### 3.7 Shared Shader Library

Extract common GLSL functions used by both title and gameplay into importable string constants.

```
src/rendering/shaders/
├── noise.ts        — hash(), noise(), fbm(), turbulence()
├── stormCommon.ts  — shared storm color palettes, density blend logic
└── index.ts        — re-exports
```

**noise.ts exports:**
```typescript
export const GLSL_HASH = `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
`;

export const GLSL_NOISE = `
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
`;

export const GLSL_FBM_7 = `
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 7; i++) {
      value += amplitude * noise(p);
      p *= 2.1;
      amplitude *= 0.45;
    }
    return value;
  }
`;

export const GLSL_TURBULENCE = `
  float turbulence(vec2 p) {
    float t = 0.0;
    float f = 1.0;
    for (int i = 0; i < 4; i++) {
      t += abs(fbm(p * f)) / f;
      f *= 2.0;
    }
    return t;
  }
`;
```

**Usage in title storm shader:**
```typescript
import { GLSL_HASH, GLSL_NOISE, GLSL_FBM_7, GLSL_TURBULENCE } from './shaders/noise';

const fragmentShader = `
  ${GLSL_HASH}
  ${GLSL_NOISE}
  ${GLSL_FBM_7}
  ${GLSL_TURBULENCE}

  // ... title-specific storm code
`;
```

**Migration path for gameplay:** `StormSky.tsx` can optionally adopt the shared noise library later, upgrading from 5-octave to 7-octave FBM if performance allows.

## 4. Scene Composition

### Camera
- `PerspectiveCamera` at position `[0, 0, 10]`, fov 45
- Fixed (no OrbitControls) — the scene is a backdrop, not interactive

### Lighting
- `ambientLight` intensity 0.2 — dim, most light comes from shaders
- `pointLight` at `[10, 10, 10]`, intensity 0.5, color `#8be6ff` (cyan) — rim light on globe

### Render order (back to front)
1. TitleStormSphere (radius 8, BackSide) — outermost, behind everything
2. TitleHypercane (scale [3, 0.5, 3]) — storm spiral at globe equator
3. TitleGlobe (radius 2.5) — center of composition
4. TitleLightning (plane at z=2) — additive, in front of globe

### 2D Overlay order (bottom to top)
1. Dark vignette overlay (subtle, `bg-[#02050b]/10`)
2. Logo dark band + SYNTHETERIA text (center of viewport)
3. Bezel menu SVG + buttons (bottom of viewport)
4. NewGameModal / SettingsOverlay / LoadingOverlay (when active)

## 5. Platform Adaptation Table

| Proposal Dependency | Our Replacement | Notes |
|---|---|---|
| `framer-motion` | `react-native-reanimated` + CSS transitions (web) | withSpring, withTiming for button anims |
| `framer-motion AnimatePresence` | Conditional rendering + reanimated layout anims | Or simple opacity transitions |
| Radix Dialog | Existing `NewGameModal` component | Already built, RN-compatible |
| Radix Tabs/Select/Slider/Switch | Existing RN form components | Keep `NewGameModal` as-is |
| shadcn/ui Button | `Pressable` + NativeWind classes | Already have HudButton pattern |
| `lucide-react` | SVG icons via `react-native-svg` or existing icon system | Minimal icon usage in title |
| Tailwind v4 CSS | NativeWind (Tailwind v3) | Already configured |
| `clipPath: polygon()` | SVG `<Path>` elements | Works cross-platform |
| `backdrop-blur` | NativeWind `backdrop-blur-sm` | Works on web + iOS, limited Android |
| `text-shadow` CSS | `Platform.OS === 'web'` conditional | Native uses shadow* props |
| `mix-blend-mode: screen` | Web-only via Platform check | Native fallback: opacity pulse |

## 6. What Gets Retired

These files/assets are no longer used in the title flow:

| Asset/Code | Status |
|---|---|
| `assets/ui/background.webp` | Retired from title (keep in repo for other uses) |
| `assets/ui/bg_slices/center.webp` | Retired from title |
| `assets/ui/buttons/new_game.png` | Retired — bezel buttons replace image buttons |
| `assets/ui/buttons/load_game.png` | Retired — bezel buttons replace image buttons |
| `assets/ui/buttons/settings.png` | Retired — bezel buttons replace image buttons |
| `HeroMenuButton` component in TitleScreen.tsx | Removed entirely |
| `useImageButtons` prop on TitleScreen | Removed |
| `useBackgroundImage` prop on TitleScreen | Removed |
| `uiMenuAssets` import in TitleScreen | Removed |
| Static `<Image source={bgSource}>` in TitleScreen | Replaced by `<Canvas>` |

**Not retired:**
- `assets/ui/mark.png` — may still be used elsewhere
- `SettingsOverlay`, `NewGameModal`, `LoadingOverlay` — kept, overlaid on Canvas
- `expo-device` detection — kept for responsive layout
- `getTitleMenuLayout()` — adapted for bezel menu button data

## 7. Growth Animation Sequence

When the player arrives at the title screen, this is what they see unfold over time:

| Time | Storm | Globe | Lightning | UI |
|---|---|---|---|---|
| 0-1s | Storm sphere visible, low intensity (0.3) | Globe visible, growth=0 (raw Earth) | Inactive | Dark, nothing visible yet |
| 1-2s | Intensity ramping (0.3→0.5) | Growth begins (0→0.02) | First flickers | Logo fades in with glow |
| 2-3s | Mid intensity (0.5→0.6) | Coastal cities appearing | Occasional bolts | Bezel arc slides up from bottom |
| 3-5s | Full intensity (0.6→0.7) | Cities spreading inland | Regular strikes | Buttons stagger in (New Game, Load, Settings) |
| 5-15s | Steady (0.7) | Growth 0.1→0.3 (major urbanization) | Steady rhythm | Full UI interactive |
| 15-30s | Steady with slow oscillation | Growth 0.3→0.6 (ocean platforms) | Occasional surges | — |
| 30-50s | Steady | Growth 0.6→1.0 (full ecumenopolis) | — | — |
| 50s+ | Steady | Growth=1.0 (fully urbanized, lights pulsing) | — | — |

## 8. File Plan

### New files to create:
```
src/rendering/shaders/noise.ts              — shared GLSL noise library
src/rendering/shaders/stormCommon.ts        — shared storm color/blend constants
src/rendering/shaders/index.ts              — re-exports
src/rendering/TitleStormSphere.tsx          — merged storm sky for title
src/rendering/TitleGlobe.tsx                — ecumenopolis globe
src/rendering/TitleLightning.tsx            — fullscreen lightning plane
src/rendering/TitleHypercane.tsx            — spiral storm vortex
src/rendering/TitleScene.tsx                — scene composition (camera, lights, all elements)
src/ui/TitleLogo.tsx                        — procedural title text + dark band
src/ui/BezelMenu.tsx                        — SVG arc + positioned buttons
```

### Files to modify:
```
src/ui/TitleScreen.tsx                      — Replace Image background with Canvas + TitleScene
                                              Remove HeroMenuButton, useBackgroundImage, useImageButtons
                                              Add TitleLogo overlay, BezelMenu overlay
                                              Keep NewGameModal, SettingsOverlay, LoadingOverlay
```

### Files to optionally migrate later:
```
src/rendering/StormSky.tsx                  — Can adopt shared noise library
src/rendering/LightningSystem.tsx           — Unchanged (gameplay-specific)
src/rendering/StormLighting.tsx             — Unchanged (gameplay-specific)
```

## 9. Testing Plan

### Component tests (Playwright CT):
- `TitleScreen.spec.tsx` — updated: verify Canvas renders, bezel buttons visible, interactions work
- `BezelMenu.spec.tsx` — new: verify SVG arc renders, button states (enabled/disabled), save count logic
- `TitleLogo.spec.tsx` — new: verify text renders, dark band visible

### Visual regression:
- Updated screenshots for title screen states (no saves, with saves, settings open, new game modal)

### E2E:
- `onboarding.spec.ts` — verify title → new game → loading → gameplay flow still works with Canvas title

### Unit tests:
- Shader string assembly tests (verify GLSL concatenation produces valid strings)

## 10. Performance Considerations

- **Title scene complexity:** 4 shader materials (storm sphere, globe, lightning plane, hypercane cylinder). All use FBM noise which is GPU-intensive.
- **Mobile mitigation:** Could reduce FBM octaves (7→5) on detected mobile via `expo-device`. Globe sphere segments (64→32) on phone.
- **Canvas cleanup:** When transitioning to game, the title Canvas unmounts entirely — no lingering GPU resources.
- **Suspense fallback:** Title Canvas wrapped in `<Suspense>` with the existing dark background color as fallback — no flash of white.

## 11. Accessibility

- Bezel buttons have `accessibilityRole="button"` and `accessibilityLabel`
- Logo text is semantic `<Text>` (screen reader accessible)
- Focus order: New Game → Load Game → Settings (left to right along arc)
- Reduced motion: When `prefers-reduced-motion`, skip glow oscillation and entrance animations; render final state immediately
- Touch targets: Each bezel button is minimum 48x24dp (parallelogram shape is visually larger)
- Contrast: Dark band behind logo ensures text readability over any storm state
