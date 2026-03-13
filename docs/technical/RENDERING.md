---
title: "Rendering"
domain: technical
status: canonical
last_updated: 2026-03-13
summary: "39 R3F renderers — storm system, floor zones, instanced structures, particles, post-processing"
depends_on:
  - "ARCHITECTURE.md"
  - "WORLD_SYSTEMS.md"
planned_work:
  - "Floor fills entire viewport — no void edges"
  - "Storm/wormhole VFX coherence"
  - "Construction animation stages"
---

# Rendering

All rendering uses React Three Fiber (R3F) declarative components inside a single `<Canvas>` in `GameScene.tsx`. Renderers consume system state — they do not invent gameplay logic.

## Storm Visual System

The perpetual storm is the single most important visual element. It powers all infrastructure via lightning rods, is the source of cultist abilities, contains the wormhole (the narrative endpoint), and creates the atmosphere. Storm intensity fluctuates mechanically (sine wave + surges) and affects gameplay.

### Five Rendering Layers

#### Layer 1: Storm Sky Dome

Component: `StormSky.tsx`

- Sphere geometry (radius 200) with BackSide rendering
- Noise-based cloud layer (3 octaves)
- Wormhole glow at zenith (pulsing purple)
- Random lightning flash (step function)

Storm intensity drives:
- Cloud darkening/lightening
- Cloud movement speed
- Flash frequency
- Color grade shift per profile

#### Layer 2: Rain / Debris Particle System

Component: `StormParticles.tsx`

**Rain particles:**
- 800-2000 elongated line segments at ~45 degrees (wind drift)
- Speed: 15-25 world units/sec, length: 0.3-0.6 world units
- Color: `#8be6ff` at 20-35% opacity (cyan-tinted, matching signal color language)
- Density scales with storm intensity
- Wind predominantly from north (storm comes from cultist territory)

**Debris particles (during surges, intensity > 0.85):**
- 20-60 larger particles (0.1-0.3 world units) tumbling through view
- Dark gray-brown, opaque
- Slower than rain, more horizontal trajectory
- Represent torn metal, shingles, dust clouds

Implementation: Three.js `Points` with `BufferGeometry` and custom `ShaderMaterial` for GPU-driven animation. Zero per-particle CPU updates.

#### Layer 3: Lightning Bolts

Component: `LightningBolt.tsx`, managed by `LightningSystem`

Three bolt types sharing the same geometry generator:

| Type | Frequency | Color | Purpose |
|---|---|---|---|
| Ambient distant | 8-20s (stable) → 3-8s (cataclysmic) | White-blue | Atmosphere, sky dome flash |
| Rod capture | Tied to power generation spikes | Amber `#f6c56a` | Visible energy capture |
| Cultist (future) | Combat-triggered | Red-white | Danger, screen flash, camera shake |

Bolt geometry: segmented line with random displacement (Lichtenberg fractal, 6-10 segments). Duration: 120-200ms visible with 80ms afterglow. Accompanied by transient `pointLight` intensity spike.

#### Layer 4: Storm-Reactive Lighting

Component: `StormLighting.tsx`

| Light | Property | Formula |
|---|---|---|
| Ambient | intensity | `0.25 + stormIntensity * 0.35` |
| Ambient | color | Cold blue-gray `#1a1a2e` → warm purple `#2a1a3e` |
| Directional | intensity | `0.3 + stormIntensity * 0.5` |
| Directional | color | Purple-white `#9966cc` (wormhole light, not sunlight) |
| Directional | position | From wormhole (zenith, slightly north) — there is no sun |
| Lightning flash | intensity | 3-5, white-blue, 200ms duration |

#### Layer 5: Ground-Level Weather Effects

Component: `GroundFog.tsx`

- Low-lying translucent planes at Y=0.1 scattered across floors, breach edges, exposed service decks
- Opacity scales with storm intensity
- Slowly drift in wind direction
- Stronger near breach edges and exposed sectors
- Instanced translucent planes with UV-scrolling noise texture

Optional rain splash impacts (performance-gated): small circular ripple effects on exposed floors, GPU particle system.

### Storm Profiles

Each storm profile has a distinct visual identity:

| Profile | Sky Color | Cloud Speed | Rain Density | Lightning Freq | Wormhole |
|---|---|---|---|---|---|
| **Stable** | Cool blue-gray | Slow drift | Light drizzle, 800 particles | Every 15-20s distant | Dim, slow pulse |
| **Volatile** | Purple-gray | Moderate churn | Steady rain, 1400 particles | Every 5-10s, some rod captures | Moderate glow, rhythmic pulse |
| **Cataclysmic** | Deep red-violet | Rapid roil | Driving sheets, 2000 particles + debris | Every 3-5s, frequent rod captures | Bright, erratic pulse, visible tendrils |

### Storm State Source

All weather renderers read from `getStormIntensity()` (exported from `power.ts`) and the active world session's `stormProfile`. No new game state needed — the mechanical storm system already runs.

## Floor Rendering

Floors are zone-driven and material-driven, not dependent on visible floor-tile GLBs:

| Zone Type | Surface Language |
|---|---|
| Core / command sectors | Sealed concrete, painted service decks |
| Fabrication / storage / power | Reinforced plate, industrial metal |
| Corridors and transit spines | Walkway grid, diamond plate |
| Breach zones | Damaged, exposed substrate |

Floor material source: curated presets from photorealistic PBR textures (concrete, diamond-plate, walkway, painted-metal families). Floor tile GLBs are optional accents.

## Structure Rendering

City structures use the 91-GLB structural kit via instanced rendering:

- `InstancedCubeRenderer` — instanced cube rendering for the physical cube economy
- `CityInteriorRenderer` — GLB-backed structural rendering consuming the city model manifest
- Instanced rendering for repeated structural elements (walls, columns, details)

## Renderer Inventory

All renderers live under `src/rendering/` and are wired into `GameScene.tsx`.

### World / Environment
- `StormSky.tsx` — sky dome with cloud noise, wormhole glow, lightning flash
- `StormParticles.tsx` — GPU-instanced rain and debris particles
- `StormLighting.tsx` — storm-reactive ambient and directional lighting
- `LightningBolt.tsx` — procedural lightning bolt geometry
- `GroundFog.tsx` — low-lying atmospheric fog planes
- `StructuralFloorRenderer.tsx` — zone-based procedural floor surfaces
- `HDRIEnvironment.tsx` — HDRI environment map with storm-reactive intensities

### Structures / City
- `CityInteriorRenderer.tsx` — GLB-backed city structural rendering
- `InstancedCubeRenderer.tsx` — instanced cube economy rendering
- `BuildingGenerator.tsx` — procedural building geometry
- `PlacementPreview.tsx` — ghost preview for structure placement

### Units / Characters
- `BotGenerator.tsx` — procedural bot geometry
- `OtterRenderer.tsx` — otter hologram patron rendering (deprecated in favor of HologramRenderer)
- `HologramRenderer.tsx` — holographic patron AI visualization
- `SelectionHighlight.tsx` — selected entity visual indicator

### Materials
- `MaterialFactory.ts` — JSON-driven PBR material generation
- `BeltMaterial.tsx` — conveyor belt animated material
- `NormalMapComposer.ts` — procedural normal map composition
- `PanelGeometry.ts` — procedural panel geometry generation

### Particles / Effects
- Particle systems for combat, fabrication, harvesting feedback
- Emissive glow effects for power infrastructure

### UI / Overlay
- `FreeCubeRenderer.tsx` — debug/free cube visualization (replaced by InstancedCubeRenderer)

## Performance

### Budget

Target: 60fps on mid-range phone (iPhone 12 class).

| System | Budget |
|---|---|
| Rain particles | GPU-instanced Points, zero CPU per-particle work |
| Lightning bolts | 1-2 active at any time, <100 vertices each |
| Storm sky | Single full-screen shader pass |
| Ground fog | <50 instanced planes |
| Lighting updates | 3 light property lerps per frame |
| **Total weather GPU** | **~2ms per frame** |

### Techniques

- **Frustum culling** — Three.js automatic frustum culling for all mesh objects
- **Instanced rendering** — InstancedMesh for repeated structures (walls, columns, cubes)
- **LOD** — level-of-detail switching based on camera distance (planned)
- **GPU particles** — custom ShaderMaterial for zero-CPU particle animation
- **Quality tiers** — GPU detection and mobile throttling system adjusts particle counts, shadow quality, and effect density

### Quality Tier System

The quality tier system detects GPU capability and adjusts rendering:

- Particle density scaled by tier
- Shadow map resolution gated by tier
- Post-processing effects toggled per tier
- Mobile devices get reduced particle counts and simpler shaders

## UI Implications

The storm visual system directly affects UI decisions:

- HUD panel backdrop opacity must account for bright lightning flashes
- The resource strip showing storm percentage becomes meaningful when the player can see the intensity
- The wormhole glow creates a natural "north star" orientation cue, reducing minimap dependency
- Storm intensity affects unit visibility (heavier rain = harder to see distant units) — this justifies zoom tier design
