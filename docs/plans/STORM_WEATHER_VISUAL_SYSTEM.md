# Storm & Weather Visual System — Syntheteria

## The Problem

The perpetual storm is the single most important visual element in Syntheteria. It:
- Powers all infrastructure via lightning rods
- Is the source of cultist supernatural abilities
- Contains the wormhole — the narrative endpoint
- Creates the post-apocalyptic atmosphere
- Fluctuates mechanically (sine wave + surges) affecting gameplay

**Currently**: the sky is flat black (`#050505`). `StormSky.tsx` exists with a shader dome and basic wormhole glow but is not rendered. There are no particles, no rain, no lightning bolts, no weather overlays. The storm exists only as a number in `power.ts`.

## What Must Exist

### Layer 1: Storm Sky Dome (exists, needs wiring + enhancement)

`StormSky.tsx` already has:
- Sphere geometry (radius 200) with BackSide rendering
- Noise-based cloud layer (3 octaves)
- Wormhole glow at zenith (pulsing purple)
- Random lightning flash (step function)

**Needs:**
- Integration into `App.tsx` world scene
- Storm intensity uniform fed from `getStormIntensity()` — clouds darken/lighten, wormhole pulses harder during surges
- Cloud movement speed tied to storm intensity
- Flash frequency increases with intensity
- Color grade shift: stable → cool blue-gray, volatile → warm purple-amber, cataclysmic → deep red-violet

### Layer 2: Rain / Debris Particle System (new)

A GPU-instanced particle system covering the camera viewport.

**Rain particles:**
- 800-2000 elongated line segments falling at ~45° angle (wind drift)
- Speed: 15-25 world units/sec, length: 0.3-0.6 world units
- Color: `#8be6ff` at 20-35% opacity — cyan-tinted to match signal color language
- Density scales with `stormIntensity`: stable = sparse drizzle, cataclysmic = driving sheets
- Wind direction: predominantly from north (where cultists are — storm comes FROM them)

**Debris particles (during surges):**
- 20-60 larger particles (0.1-0.3 world units) tumbling through view
- Only spawn when `stormIntensity > 0.85`
- Color: dark gray-brown, opaque
- Slower than rain, more horizontal trajectory
- Represent torn metal, shingles, dust clouds

**Implementation:** `StormParticles.tsx` using Three.js `Points` with `BufferGeometry` and custom `ShaderMaterial` for GPU-driven animation. No per-particle CPU updates.

### Layer 3: Lightning Bolts (new)

Three types of lightning, all sharing the same bolt geometry generator but differing in purpose:

**Ambient distant strikes:**
- Random bolts hitting the terrain 40-80 world units from camera
- Frequency: every 8-20 seconds (stable) → every 3-8 seconds (cataclysmic)
- Brief white-blue flash on sky dome (already partially in StormSky shader)
- Bolt geometry: segmented line with random displacement (Lichtenberg fractal, 6-10 segments)
- Duration: 120-200ms visible, with 80ms afterglow
- Accompanied by ambient light flash (brief `pointLight` intensity spike)

**Rod capture strikes:**
- When a lightning rod captures energy (surge events), a bolt visually connects sky to rod
- Bolt targets the rod's world position
- Amber-tinted (`#f6c56a`) to match power color language
- Thicker than ambient strikes, branching
- Rod model should briefly pulse/glow on capture
- Frequency: tied to power generation spikes in `updateStormIntensity`

**Cultist lightning (future):**
- Called down by cultist enemies in combat
- Targets player units
- Red-white tinted to match danger color
- Most dramatic — multi-branch, screen flash, camera shake
- Placeholder hook now, full implementation when cultist AI exists

**Implementation:** `LightningBolt.tsx` — procedural line geometry with emissive material, spawned by a `LightningSystem` that reads storm state and rod positions.

### Layer 4: Storm-Reactive Lighting (enhancement to existing)

Current scene lighting in `App.tsx`:
```tsx
<ambientLight intensity={0.5} />
<directionalLight position={[10, 20, 10]} intensity={1} castShadow />
```

This is static and wrong for a perpetual storm world. Needs:

- **Ambient light** intensity: `0.25 + stormIntensity * 0.35` (darker when calm, brighter during surges from lightning glow)
- **Ambient color**: shifts from cold blue-gray (`#1a1a2e`) at low intensity to warm purple (`#2a1a3e`) at high intensity
- **Directional light**: should come from the wormhole position (zenith, slightly north), not a fixed sun position — there IS no sun
- **Directional intensity**: `0.3 + stormIntensity * 0.5` — the wormhole is the primary "light source"
- **Directional color**: purple-white (`#9966cc`) — wormhole light, not sunlight
- **Lightning flash light**: transient `pointLight` at bolt strike position, 200ms duration, white-blue, intensity 3-5

**Implementation:** `StormLighting.tsx` — reads `getStormIntensity()` per frame, interpolates light properties.

### Layer 5: Ground-Level Weather Effects (new)

**Mist/fog patches:**
- Low-lying translucent planes at Y=0.1 scattered across terrain
- Opacity scales with storm intensity
- Slowly drift in wind direction
- Stronger near water biomes
- Add depth and break up the terrain flatness

**Rain splash impacts (optional, performance-gated):**
- Small circular ripple effects on terrain at random positions
- Only visible at tactical zoom tier
- GPU particle system, low priority

**Implementation:** `GroundFog.tsx` — instanced translucent planes with UV-scrolling noise texture.

## Storm Profile Visual Identity

Each storm profile should look and feel different:

| Profile | Sky Color | Cloud Speed | Rain Density | Lightning | Wormhole |
|---------|-----------|-------------|--------------|-----------|----------|
| **Stable** | Cool blue-gray | Slow drift | Light drizzle, 800 particles | Every 15-20s distant | Dim, slow pulse |
| **Volatile** | Purple-gray | Moderate churn | Steady rain, 1400 particles | Every 5-10s, some rod captures | Moderate glow, rhythmic pulse |
| **Cataclysmic** | Deep red-violet | Rapid roil | Driving sheets, 2000 particles + debris | Every 3-5s, frequent rod captures | Bright, erratic pulse, visible tendrils |

## Integration Points

### Where These Wire Into App.tsx

```tsx
// Inside the world scene:
<StormSky stormIntensity={stormIntensity} stormProfile={stormProfile} />
<StormLighting stormIntensity={stormIntensity} />
<StormParticles stormIntensity={stormIntensity} cameraPosition={cameraPos} />
<LandscapeProps />  {/* also not wired — debris/rocks/trees */}
<TerrainRenderer />
<CityRenderer />
<UnitRenderer />
<LightningSystem stormIntensity={stormIntensity} rods={rodPositions} />
<GroundFog stormIntensity={stormIntensity} />
```

### Reading Storm State

All weather renderers read from `getStormIntensity()` (already exported from `power.ts`) and the active world session's `stormProfile`. No new game state needed — the mechanical storm system already runs.

### Performance Budget

Target: 60fps on mid-range phone (iPhone 12 class).

- Rain particles: GPU-instanced Points, zero CPU per-particle work
- Lightning bolts: 1-2 active at any time, <100 vertices each
- Storm sky: single full-screen shader pass (already exists)
- Ground fog: <50 instanced planes
- Lighting updates: 3 light property lerps per frame

Total weather GPU budget: ~2ms per frame. Well within budget.

## Implementation Order

1. **Wire StormSky + LandscapeProps** into App.tsx (10 minutes, instant visual improvement)
2. **StormLighting** — reactive ambient/directional (30 minutes)
3. **StormParticles** — rain + debris (2 hours)
4. **LightningBolt** — ambient distant strikes + rod captures (2 hours)
5. **GroundFog** — atmospheric depth (1 hour)
6. **Storm profile visual differentiation** — color/speed/density per profile (1 hour)

## Connection to UI Design

The storm visual system directly affects UI decisions:
- HUD transparency must account for bright lightning flashes — panels need sufficient backdrop opacity
- The resource strip showing "Storm 78%" becomes meaningful when the player can SEE that intensity
- The wormhole glow in the sky creates a natural "north star" orientation cue — reduces minimap dependency
- Storm intensity affects unit visibility (heavier rain = harder to see distant units) — this is a game mechanic that justifies zoom tier design
