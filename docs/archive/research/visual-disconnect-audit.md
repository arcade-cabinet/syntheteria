# Visual Disconnect Audit — Every Problem Found

## Critical Issues

### 1. StormSky SHOULD NOT be in the game Canvas
**Current:** `<StormSky />` renders a sky dome INSIDE the gameplay Canvas.
**Should be:** NO sky dome in gameplay. The viewport IS the game board filling 100%.
The storm sky is for the LANDING PAGE only (the R3F globe).
Lightning strikes should be visual effects hitting the game board, not a sky shader.
**Fix:** Remove `<StormSky />` from the gameplay Canvas in App.tsx.

### 2. Building model is MASSIVELY oversized
**Current:** `UnitRenderer.tsx` uses `BUILDING_SCALE = 0.8` for building GLBs.
The GLB models (Space Colony pack) are 2+ meters at native scale.
At 0.8x scale on a 2m tile = building fills entire tile and towers over everything.
**Should be:** Buildings should be small set pieces INSIDE labyrinth rooms, not
dominating the viewport. Scale should be ~0.2-0.3 or use instanced box geometry
sized to tile dimensions.
**Fix:** Reduce BUILDING_SCALE dramatically or use tile-sized geometry.

### 3. Floor tiles are bright green squares — wrong aesthetic
**Current:** `CityRenderer.tsx` uses `MeshStandardMaterial({ color: 0x0a1a12 })` for floors
but the floor appears bright green/cyan in the screenshot.
**Should be:** Dark industrial concrete/metal floors. The "circuit board" accent
traces should be the ONLY green — the floor itself should be dark grey/brown.
**Fix:** Floor material color should be dark (0x111111 or 0x0a0a0a).
Possibly use PBR concrete textures from public/assets/textures/pbr/.

### 4. No sense of labyrinth density
**Current:** Scattered rectangles with gaps. The camera zoom level (40) shows too
much empty space. The labyrinth walls are Box geometries but they're not forming
a visually coherent city structure.
**Should be:** Dense corridors and rooms like the original `CityRenderer` which
had a circuit-board aesthetic with glowing traces on top of dark walls.
**Fix:** Camera zoom needs to be closer (25-30). Wall color needs to be darker.
The ratio of wall-to-floor needs to create a DENSE feeling, not scattered blocks.

### 5. Camera too far / wrong angle
**Current:** `initialZoom = 40`, camera looks down from steep angle.
**Should be:** Closer zoom (~25), slight tilt for 2.5D perspective feel.
The player should feel INSIDE the labyrinth, not floating above a debug view.

### 6. No terrain underneath — just black void
**Current:** Between the floor tiles and walls, there's pure black.
**Should be:** A ground plane filling the entire board area with a dark material.
The labyrinth sits ON something, not floating in void.

### 7. Narration doesn't auto-advance
**Current:** "tap to continue" waits forever. No auto-advance, no fade transitions.
**Should be:** Text fades in (typewriter), holds for 2-3 seconds, then automatically
fades to next frame. Tap/click SKIPS the auto-advance (not required to advance).
The intro should feel like waking up from a dream, not reading a slideshow.

## Silent Fallback Patterns (still present)

### Bare catch blocks (9 found):
- `src/audio/music.ts` — 4x bare `catch {}`
- `src/audio/ambience.ts` — 3x bare `catch {}`
- `src/db/persistence.ts` — 1x bare `catch {}`
- `src/rendering/CityRenderer.tsx` — 1x bare `catch {}`

### ?? fallback defaults (10 found):
- `src/input/selection.ts` — 4x `?? ""`
- `src/input/UnitInput.tsx` — 1x `?? ""`
- `src/input/controlGroups.ts` — 1x `?? []`
- `src/rendering/UnitRenderer.tsx` — 1x `?? ""`
- `src/ui/GameUI.tsx` — 2x `?? ""`
- `src/ui/game/NarrativeOverlay.tsx` — 1x `?? ""`

## Missing Wiring (from previous audit, may still apply)

- Radial menu: verify it actually appears on right-click
- Building placement: verify ghost preview works
- Scavenging: verify visual indicators show
- Save/Load: verify buttons exist and work

## Date: 2026-03-25
