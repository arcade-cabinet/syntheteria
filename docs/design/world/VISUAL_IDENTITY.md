# Syntheteria — Visual Identity Reference

**Status:** Canonical
**Scope:** Consolidated reference for all visual identity content — art direction, faction
aesthetics, cube materials, environment visuals, alien/NPC visuals, shader effects, and
implementation notes. Drawn from RACES.md, MATERIALS.md, ENVIRONMENT.md, ALIENS.md,
LORE_OVERVIEW.md, config/factionVisuals.json, config/cubeMaterials.json,
config/rendering.json, and all source files under src/rendering/.

See also:
- `docs/design/world/RACES.md` — faction lore and mechanical identity (contains the Visual
  Identity tables this document was compiled from)
- `docs/design/gameplay/MATERIALS.md` — cube economy and material hierarchy
- `docs/design/world/ENVIRONMENT.md` — biome and weather gameplay specs (contains terrain
  color values and visual descriptions)
- `docs/design/world/ALIENS.md` — Ferrovore and Residual biology and behavior

---

## 1. Art Direction

### 1.1 Core Principle: Industrial Mechanical PBR

Every surface in Syntheteria should feel like a machine. NOT flat-shaded cartoon blocks.
The entire aesthetic is built on one rule: **this planet is made of metal and everything
on it is also made of metal**.

Art direction pillars:

- **Panels, bolts, vents.** All manufactured surfaces are panel-based. Chamfered edges,
  recessed insets, visible bolt heads, vent slots, seam lines. No smooth curves except
  on high-tech faction (Signal Choir) and alien life.
- **Wear and patina are honest.** Rust means the thing has been here a long time. Green
  patina means copper. Scorch marks mean combat. Surfaces tell their own stories.
- **Faction materials are PBR-accurate.** Reclaimers: rusted iron (roughness 0.85).
  Volt Collective: mirror chrome (roughness 0.08). Signal Choir: anodized aluminum with
  iridescence. Iron Creed: brushed steel (visible machining lines).
- **No MeshLambertMaterial anywhere.** All surfaces use MeshStandardMaterial with proper
  metalness and roughness channels so they respond correctly to the HDRI environment
  and the storm sky's flickering light.
- **Physical cubes are 0.5m, not toy blocks.** The cube material PBR treatment makes each
  cube type immediately identifiable by visual texture before the player reads the label.

### 1.2 Material Stack

Every surface is built from this layered system:

```
Base PBR (MeshStandardMaterial)
  + config/materials.json         (roughness, metalness, base color per ore type)
  + config/factionVisuals.json    (per-faction palette: primary, accent, emissive)
  + Normal map (NormalMapComposer: bolts, seams, vents, hex patterns — RNM blending)
  + Wear/damage overlay           (DecalRenderer: crack, rust, scorch, moss decals)
  = Final surface
```

Cube materials additionally draw from:
- `config/cubeMaterials.json` — game balance values (durability, weight)
- `src/rendering/materials/cubePBRMaterials.json` — PBR texture set assignments
- `config/textureMapping.json` — source library paths for each texture set

### 1.3 PBR Texture Library

All textures are sourced from the 2DPhotorealistic 1K-JPG library at:
`/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/`

Each material uses: Color, Metalness, NormalGL, Roughness, and optionally Displacement.
Non-metallic materials (stone, concrete) use AmbientOcclusion instead of Metalness.

Texture sets in use:

| Material ID | Texture Set | Notes |
|-------------|-------------|-------|
| iron | Metal038 | Dark industrial iron |
| copper | Metal035 | Warm copper/bronze |
| stone | Concrete032 | Rough dark concrete |
| carbon | Metal036 | Dark dense polished |
| steel | MetalPlates009 | Clean brushed steel |
| alloy | DiamondPlate001 | Industrial diamond plate |
| reinforced_concrete | Concrete028 | Industrial paneled |
| titanium | Metal023 | Bright silver chrome |
| silicon | Concrete012 | Cool blue-gray (no metalness map) |
| rock (ore deposit) | Rock034 | Rough gray stone |
| terrain (inner) | MetalWalkway004 | Dense grating, city center |
| terrain (outer) | MetalWalkway008 | Wider grating, periphery |

---

## 2. Faction Visual Identity

### 2.1 Overview Table

| Faction | Primary Material | Metalness | Roughness | Emissive Color | Locomotion | Chassis | Head | Arm |
|---------|-----------------|-----------|-----------|---------------|------------|---------|------|-----|
| Reclaimers | Rusted iron | 0.7 | 0.85 | `#00ffaa` teal-green | Treads | Angular, asymmetric | Dome (repurposed camera housing) | Clamp/crane |
| Volt Collective | Chrome | 1.0 | 0.08 | `#4169E1` electric blue, `#FF4500` orange-red | Hover | Sleek, aerodynamic | Visor (horizontal sensor strip) | Probe/antenna |
| Signal Choir | Anodized aluminum | 0.8 | 0.2 | `#9370DB` purple, `#00CED1` turquoise | Spider legs (6) | Rounded, smooth | Antenna cluster (multi-antenna dome) | Tendril (thin, flexible) |
| Iron Creed | Brushed steel | 0.9 | 0.3 | `#DAA520` goldenrod | Quad tracks | Blocky, heavily armored | Sensor array (flat rectangular, lens dots) | Heavy arms (pistons) |

### 2.2 Reclaimers

**Visual motto:** No two units look identical.

| Property | Value |
|----------|-------|
| Primary color | `#8B4513` (saddle brown) |
| Accent color | `#DAA520` (golden yellow) |
| Secondary color | `#A0926B` (tan) |
| Primary material | Rusted iron (metalness: 0.7, roughness: 0.85) |
| Accent material | Oxidized copper (metalness: 0.6, roughness: 0.5) |
| Emissive color | `#00ffaa` teal-green |
| Rust level | 0.4–0.6 (intentionally weathered) |
| Bolt pattern | Corners (mismatched across panels) |
| Panel inset | 0.01 |
| Vent slots | 0 (no vents — they'd clog with scrap) |
| Seam lines | 2 |

**Distinguishing feature:** Mismatched panels — each unit appears assembled from salvage.
Different panels have different corrosion states, some patches brighter (recently replaced),
some darker (original). Clamp arms are asymmetric, often with one larger than the other.
Emissive `#00ffaa` teal glow at sensor eyes.

**Material treatment:** `rustLevel` 0.4–0.6 drives surface appearance. Scorch marks and
rust decals accumulate faster on Reclaimer units. Treads show heavy mud/scrap accumulation.

### 2.3 Volt Collective

**Visual motto:** Every surface crackles.

| Property | Value |
|----------|-------|
| Primary color | `#4169E1` (royal blue) |
| Accent color | `#FF4500` (orange-red) |
| Primary material | Chrome (metalness: 1.0, roughness: 0.08) |
| Accent material | Heat-blued titanium (metalness: 0.85, roughness: 0.25) |
| Emissive glow | 0.3 baseline; flares to 0.8 during Overcharge |
| Locomotion | Hover — leaves scorch marks on terrain beneath |

**Distinguishing feature:** Visible electrical arcs between body panels. Units crackle and
hum. The near-mirror chrome surface picks up environment reflections strongly — storm
lightning reflects as full-intensity flashes across the body. Single horizontal visor eye
glows blue-white. During Overcharge: entire body emissive intensity spikes to 0.8, arcs
become brighter, orange-red accent channels pulse.

**Material treatment:** `metalness: 1.0, roughness: 0.08` requires a strong HDRI
environment to look correct — flat light makes chrome look grey. The storm sky
provides the dynamic lighting the chrome needs.

### 2.4 Signal Choir

**Visual motto:** Surfaces shimmer with data.

| Property | Value |
|----------|-------|
| Primary color | `#9370DB` (medium purple) |
| Accent color | `#00CED1` (dark turquoise) |
| Primary material | Anodized aluminum (metalness: 0.8, roughness: 0.2) |
| Accent material | Matte carbon (metalness: 0.1, roughness: 0.95) |
| Anodized | true — rainbow iridescence on surfaces |
| Locomotion | 6 thin articulated spider legs, silent movement |

**Distinguishing feature:** Thin glowing data-stream lines connecting nearby units — like
visible network traffic made physical. Surfaces shimmer with holographic interference
patterns (iridescent rainbow color shift that changes with viewing angle). Antenna cluster
head: 5–7 thin antennae radiating from a central dome, with tiny emissive tips. Tendril
arms are segmented, articulated in non-mechanical ways — the only faction whose limb
movement suggests something biological.

**Material treatment:** Anodized effect achieved via emissive tint + low roughness
combination. The purple base color under 0.2 roughness creates the characteristic
signal choir "wet paint" shimmer. Carbon accent material provides strong visual contrast
(matte black against iridescent body).

### 2.5 Iron Creed

**Visual motto:** Visible bolt heads on every panel.

| Property | Value |
|----------|-------|
| Primary color | `#708090` (slate grey) |
| Accent color | `#FFD700` (gold) |
| Primary material | Brushed steel (metalness: 0.9, roughness: 0.3) |
| Accent material | Scorched metal (metalness: 0.7, roughness: 0.8) |
| Emissive color | `#DAA520` goldenrod |
| Brushed metal | true — visible machining lines on all surfaces |
| Locomotion | 4 independent track pods |

**Distinguishing feature:** Thickest silhouette of any race — Iron Creed units look like
armored fighting vehicles, not humanoid robots. The sensor array head is flat-fronted
with a rectangular grid of small lens circles rather than a single eye. Heavy pistons
visible on arm joints. All panels have "grid" bolt pattern with gold accent bolts. The
golden emissive on bolt heads makes Iron Creed identifiable from any distance.

**Material treatment:** `metalness: 0.9, roughness: 0.3` gives the characteristic
"brushed steel" look — metallic reflections but not mirror-smooth. Machining line effect
in normal map. Scorched metal accent (roughness: 0.8) on tread housings and heavy arm
joints creates dark contrast against the polished body.

### 2.6 Player Bot

The player starts as a damaged, faction-less robot. Visual identity:

| Property | Value |
|----------|-------|
| Primary color | `#7B6B4F` (dark tan) |
| Secondary color | `#A0926B` (tan) |
| Accent color | `#DAA520` (gold) |
| Emissive color | `#443300` (dim orange) |
| Metalness | 0.6 |
| Roughness | 0.7 |
| Rust level | 0.5 (heavily worn) |
| Bolt pattern | Corners |
| Seam lines | 2 |

The player bot is intentionally generic — it reads as "unknown faction" or "pre-faction
foundry build". Its visual treatment drifts toward Reclaimers as the game progresses
and the player accumulates battle damage.

---

## 3. Cube Material Visuals

### 3.1 Overview

Physical resource cubes are 0.5m rigid bodies. Each material type has a distinct visual
treatment so the player can identify cube types by sight at a distance. All cubes use
`MeshStandardMaterial` with PBR textures from the 2DPhotorealistic library.

Selection highlight: green tint (`#4CFF99` approximately, from instance color `0.3, 1.0, 0.7`).

### 3.2 Per-Material Visual Treatment

| Material | Display Name | Texture Set | Metalness | Roughness | Fallback Color | Visual Character |
|----------|-------------|-------------|-----------|-----------|----------------|-----------------|
| rock | Rock | Rock034 | 0.05 | 0.90 | `#8B7355` | Rough gray-brown stone, no reflections |
| scrap_iron | Scrap Iron | Metal038 | 0.70 | 0.55 | `#8B4513` | Orange-brown rusted metal, mottled |
| scrap_metal | Scrap Metal | Metal007 | 0.60 | 0.60 | `#666666` | Medium grey worn metal |
| iron | Iron | Metal038 | 0.85 | 0.40 | `#888888` | Dark industrial iron, slight sheen |
| copper | Copper | Metal035 | 0.95 | 0.30 | `#b87333` | Warm copper tone, higher reflectivity |
| silicon | Silicon | Concrete012 | 0.15 | 0.70 | `#A0A0C0` | Cool blue-gray, matte crystalline |
| titanium | Titanium | Metal023 | 0.90 | 0.20 | `#C0C0C0` | Bright silver, near-chrome |
| stone | Stone | Concrete032 | 0.05 | 0.90 | `#808080` | Medium grey rough concrete |
| carbon | Carbon | Metal036 | 0.30 | 0.60 | `#333333` | Very dark, nearly black, low gloss |
| steel | Steel | MetalPlates009 | 0.90 | 0.25 | `#c0c0c0` | Light brushed steel with plate lines |
| alloy | Alloy | DiamondPlate001 | 0.88 | 0.35 | `#a0a0b0` | Industrial diamond plate pattern |
| reinforced_concrete | Reinforced Concrete | Concrete028 | 0.10 | 0.85 | `#a0a0a0` | Grey paneled concrete |
| refined_metal | Refined Metal | MetalPlates009 | 0.85 | 0.35 | `#aaaaaa` | Polished steel plates |
| copper_ingot | Copper Ingot | Metal035 | 0.95 | 0.25 | `#cc8844` | Brighter copper than raw ore cubes |
| advanced_alloy | Advanced Alloy | DiamondPlate001 | 0.92 | 0.20 | `#b0b0c0` | High-shine diamond plate |

### 3.3 Game Balance Color Values

From `config/cubeMaterials.json` (game balance, not rendering):

| Material | Hex Color | Glow Color | Category |
|----------|-----------|-----------|----------|
| scrap | `#6b5b3d` | `#887755` | metal |
| iron | `#8a8a8a` | `#99aacc` | metal |
| copper | `#b87333` | `#dd8844` | metal |
| steel | `#aaaabc` | `#bbccdd` | metal |
| titanium | `#c0c0d0` | `#ddddff` | metal |
| concrete | `#888888` | `#aaaaaa` | mineral |
| composite | `#446644` | `#66aa66` | advanced |
| silicon | `#556688` | `#4488cc` | electronic |
| circuit | `#228844` | `#00ff88` | electronic |
| processor | `#334455` | `#00e5ff` | electronic |
| polymer | `#445544` | `#66aa66` | organic |
| crystal | `#88aacc` | `#aaddff` | rare |
| power_core | `#aaaa22` | `#ffff44` | rare |

### 3.4 Ore Deposit Visuals

Raw ore deposits (not cubes — organic-looking geological formations) are generated by
`src/rendering/procgen/OreDepositGenerator.ts`. They use noise-displaced geometry, NOT
box shapes. Visual configs embedded in the generator:

| Ore Type | Primary Color | Secondary Color | Emissive | Metalness | Roughness | Shape |
|----------|--------------|----------------|----------|-----------|-----------|-------|
| rock | `#8B7355` | `#6B5B45` | none | 0.05 | 0.95 | Noise-displaced boulders |
| scrap_iron | `#8B4513` | `#5A3010` | `#331100` dim | 0.60 | 0.75 | Corroded metal chunks + panel fragments |
| copper | `#B87333` | `#4A8B5E` green patina | `#2A4A30` | 0.85 | 0.35 | Metallic veins with green patches |
| silicon | `#A0A0C0` | `#C0C0E0` | `#6060AA` blue | 0.30 | 0.10 | Crystalline octahedrons/tetrahedrons |
| titanium | `#C0C0C0` | `#D8D8E8` | `#888899` subtle | 0.95 | 0.15 | Smooth metallic with geometric facets |

**Depletion:** Deposits visually shrink as they are harvested. Scale factor ranges from
1.0 (full) to 0.15 (nearly exhausted). Deposits never fully vanish — a small stub
remains to indicate a depleted vein.

---

## 4. Environment Visuals

### 4.1 The Sky: Perpetual Storm

The sky of Ferrathis is always overcast. No day/night cycle is visible. The wormhole
pulses at the zenith through storm clouds. Implemented in `src/rendering/StormSky.tsx`.

**Storm sky shader colors:**
- Dark cloud: `rgb(5, 5, 10)` — near-black with a cool blue undertone
- Light cloud: `rgb(20, 15, 30)` — dim purple-grey highlights in cloud peaks
- Multi-octave noise drives the cloud pattern (3 scales at 0.1/0.15/0.2 animation speeds)

**Wormhole at zenith:**
- Glow color: `rgb(77, 26, 128)` purple, smoothstepped toward zenith
- Pulsation: 0.8 Hz sine wave (config: `wormholePulseRate: 0.8`)
- Glow radius: 0.3 (config: `wormholeGlowRadius: 0.3`)
- Only visible at the top of the sky sphere — not on the horizon

**Lightning flashes:**
- Flash color: `rgb(153, 179, 255)` blue-white
- Flash threshold: 0.997 (config: `lightningFlashThreshold`) — rare, abrupt
- Flash rate: 4.0 Hz sampling (config: `lightningFlashRate`)
- Appears as a full-sky brightness spike, not a bolt

**Sky sphere:** radius 200, 32 segments, `BackSide` so the player is inside it.

### 4.2 Terrain

Ferrathis terrain uses two PBR MetalWalkway textures tiled at UV repeat 40:

| Zone | Texture | Metalness | Roughness | Normal Scale | EnvMap |
|------|---------|-----------|-----------|--------------|--------|
| Inner (city center) | MetalWalkway004 (dense grating) | 0.70 | 0.50 | 0.8 | 0.8 |
| Outer (periphery) | MetalWalkway008 (wider grating) | 0.65 | 0.55 | 0.7 | 0.7 |

The terrain reads as an industrial metal floor — walkways, grating, and exposed structural
plates — not dirt or rock. This reinforces the machine-planet concept: even the ground is
manufactured.

### 4.3 Biome Visual Identities

Each biome has a terrain color tint and characteristic visual features:

| Biome | Terrain Color | Character | Visual Features |
|-------|--------------|-----------|-----------------|
| Foundry Plains (Rust Plains) | `#8B6914` rusty gold-brown | Flat scorched metal plating | Scrap piles, corroded machinery, flat belt-friendly surface |
| Slag Heaps (Scrap Hills) | `#6B5B3A` dark brown-grey | Rolling industrial waste hills | Slag mounds 3–5m tall, toxic pools (bright green), narrow passes |
| Cable Forest | `#2A3A2A` dark green-black | Dense vertical cables 50m tall | Cable canopy blocks sky, extreme shadow, copper veins at base |
| Processor Graveyards (Signal Plateau) | `#6A5ACD` purple-blue | Dead server racks to horizon | Processor towers, silicon outcrops, EMP shimmer zones |
| Storm Spine (Chrome Ridge) | `#A0A0B0` silver-grey | Bare reflective chrome rock | Cliff faces, exposed chrome veins, maximum lightning exposure |

**Water variants:**
- Deep water: impassable barrier
- Shallow water: hazardous, conducts lightning

### 4.4 Environmental Hazards: Visuals

| Hazard | Visual Description |
|--------|-------------------|
| Acid Pool | Bubbling green-yellow liquid with surface caustic shimmer |
| Magnetic Anomaly | Shimmering air distortion — heat-haze effect with slight purple tint |
| Thermal Vent | Orange glow from ground cracks, particle smoke upward |
| Rubble Field | Collapsed structure debris, grey-brown irregular mesh chunks |
| Sinkhole (warning) | Ground texture cracks appear, dust particles rising |

### 4.5 Weather Visual States

| State | Sky | Visibility | Lightning | Special Visual |
|-------|-----|------------|-----------|---------------|
| Clear | Normal storm sky | 100% | None | Solar glint on chrome surfaces |
| Overcast | Darker, purple-grey density increases | 70% | None | Very dark in Cable Forest (25% vis) |
| Storm | Maximum cloud turbulence | 40% | Bright flashes, 5%/tick risk | Chrome Ridge surfaces reflect 3x lightning intensity |
| EM Surge | Glitching sky, purple-green fringe artifacts | 30% | 15%/tick risk, continuous arcs | Navigation markers flicker/hide |
| Acid Rain | Yellow-green tint in precipitation | 50% | Rare flashes | Iron/scrap cubes develop surface rust decals faster |

**Storm intensity visual ramp:** intensity 0.0→1.0 modulates lightning flash brightness.
A storm that just started has dim, sparse flashes; peak intensity has constant near-blinding
white pulses.

### 4.6 Scorch Marks and Decals

`src/rendering/DecalRenderer.tsx` applies world-space decals from `config/rendering.json`:

| Decal Type | Color | Emissive | Opacity | Triggers |
|------------|-------|----------|---------|----------|
| crack | `#222222` near-black | None | 0.8 | HP drops below 50% on any structure |
| rust | `#8b4513` saddle brown | None | 0.7 | Structure age > 60 ticks exposed to moisture |
| scorch | `#111111` near-black | `#ff4400` orange glow | 0.85 | Lightning strikes, combat explosions |
| moss | `#2d5a27` dark green | `#001100` dim | 0.6 | Age in humid / acid-adjacent biomes |

Scorch marks fade after 30 seconds. Rust and crack decals are permanent. Maximum 100
decals simultaneously.

---

## 5. Building PBR Treatments

From `config/rendering.json` — `buildingPBR`:

| Building Type | Texture | Metalness | Roughness | Tint |
|---------------|---------|-----------|-----------|------|
| Conduit | carbon | 0.40 | 0.60 | `#2a2a3e` dark blue-grey |
| Network node | steel | 0.85 | 0.30 | `#3a3a4e` |
| Tower | iron | 0.90 | 0.25 | `#4a4a60` blue-grey |
| Ruin | rust | 0.50 | 0.85 | `#5a4a3a` brown |
| Wall | reinforced_concrete | 0.10 | 0.85 | `#3a3a3a` near-black |
| Lightning rod | steel | 0.95 | 0.15 | `#8888aa` silver-blue |
| Fabrication | iron | 0.70 | 0.45 | `#666677` |
| Miner | rust | 0.60 | 0.75 | `#887766` |
| Processor | reinforced_concrete | 0.20 | 0.75 | `#777777` grey |

**Processor glow colors** (emissive on active machine windows):
- Smelter: `#ff6600` orange
- Refiner: `#0066ff` blue
- Separator: `#00ff66` green

**City color scheme** (from `config/rendering.json` — cityColors):

| Structure | Base Color | Accent Color |
|-----------|-----------|--------------|
| Conduit | `#1a1a2e` very dark blue | `#00e5ff` cyan |
| Network node | `#16213e` dark navy | `#00ff88` green |
| Tower | `#0f3460` dark blue | `#00e5ff` cyan |
| Ruin | `#2a2a2a` dark grey | `#334433` dim green |
| Wall | `#1a1a1a` near-black | `#003344` dim cyan |

This makes the player's base read as dark industrial machinery with cyan/green electronic
accents — the city is dark metal, the electrical systems glow.

---

## 6. Procedural Geometry Systems

### 6.1 PanelGeometry

`src/rendering/procgen/PanelGeometry.ts` — generates beveled rectangular panels.

Configurable per-panel:
- `bevelSize` — chamfer on edges (default 0.02)
- `insetDepth` — recessed center panel (default 0.01)
- `insetMargin` — border fraction (default 0.08)
- `boltPattern` — "corners" | "edges" | "grid" | "none"
- `boltRadius` — bolt head size (default 0.015)
- `ventSlots` — horizontal cuts through panel face
- `seamLines` — panel join seam lines across face

Panels combine into boxes with `createBoxFromPanels()`, where each face can have independent
panel options. This is the foundational geometry for bots, buildings, and machine housings.

**Design rule:** bevel + inset is the minimum visual detail on any panel-based surface.
A panel without inset looks like a plain box. A panel with inset looks like a machine.

### 6.2 BotGenerator

`src/rendering/procgen/BotGenerator.ts` — assembles complete bot meshes from parts.

Bot composition:
1. **Chassis** — primary body block (panel box, faction-styled)
2. **Head** — mounted above chassis (faction head style: dome/visor/antenna_cluster/sensor_array)
3. **Arms** — left and right (clamp/probe/tendril/heavy_arm styles)
4. **Locomotion** — treads/hover/legs/tracks assembled below chassis
5. **Antenna** — optional signal/sensor antenna on head

Deterministic: same (botType, faction, seed) always produces identical mesh. Seeded
variations within faction style ensure no two units are pixel-identical but all read as
the same faction.

### 6.3 NormalMapComposer

`src/rendering/materials/NormalMapComposer.ts` — runtime normal map blending using
Reoriented Normal Mapping (RNM).

Blends three layers:
1. **Base** — material normal map (from PBR texture set)
2. **Detail** — high-frequency surface micro-detail (bolts, seams, vents, hex patterns)
3. **Damage** — runtime damage scratches, progressive as HP decreases

RNM technique correctly combines tangent-space normals without the flattening artifacts
of naive linear blending. Uses a WebGLRenderTarget for GPU-side composition.

---

## 7. Special Shader Effects

### 7.1 Holographic Projections

Otter holograms (quest guides) use a custom `ShaderMaterial` in
`src/rendering/HolographicShader.ts` and are rendered by `src/rendering/HologramRenderer.tsx`.

**Visual anatomy:**
1. **Emitter pad** — dark cylinder (radius 0.3m, height 0.05m) with cyan emissive edge glow
2. **Projection cone** — faint transparent cone (radius 0.25m, height 0.5m) from pad upward
3. **Holographic sprite** — billboard quad using custom shader
4. **Dissolution particles** — 4 small translucent squares drifting upward per hologram

**Shader properties:**
- Base color tint: `#00ffaa` cyan-green (55% mix with sprite texture)
- Base alpha: sprite alpha × 0.7 × opacity uniform
- Scroll speed: 2.0 rad/s upward
- Scan line frequency: 80 lines per UV unit
- Fresnel power: 2.0 (strong edge glow)
- Flicker frequency: 6.0 Hz with per-entity seed
- Flicker amplitude: ±4% opacity (very subtle, not distracting)
- Glitch band: ~every 2 seconds, thin horizontal band with `#4CFF99` color shift
- Float oscillation: ±0.04 world units, 1.5 Hz sine

**Billboard:** quad always faces camera (vertex shader extracts camera-right and camera-up
from modelViewMatrix). Writes no depth (`depthWrite: false`) — always composites over scene.

**Weather interaction:** hologram opacity degrades in bad weather (from
`config/rendering.json` → `stormSky` and `ENVIRONMENT.md` shipment effects table):
- Clear: full opacity
- Overcast: slight static (flicker seed range widens)
- Storm: intermittent flickering (opacity drops to 0.4–0.8)
- EM Surge: hologram goes offline (opacity = 0)
- Acid Rain: yellow-tinted distortion (tint shifts toward `#FFDD88`)

### 7.2 Fog of War

`src/rendering/shaders/fogShader.ts` — renders the fog-of-war overlay.

Visual states:
- **Hidden** (undiscovered): fully dark, `exploredDarkness: 0.6` falloff at edge
- **Explored** (visited but not currently visible): 60% darkened
- **Visible** (currently in range): full brightness

Grid resolution: 2.0m cells. Edge blend radius: 3.0m (smooth fog edge, not pixelated).

Default vision range: 15m. Camera bonus: +10m (player sees further).

### 7.3 Selection Highlight

Selected/hovered objects use `src/rendering/SelectionHighlight.tsx`. Cubes get an
instance-color green tint (`rgb(0.3, 1.0, 0.7)`). Other objects get an emissive overlay.

### 7.4 Stockpile Glow

`src/rendering/StockpileGlow.tsx` — cube piles above threshold get a subtle ambient glow
to help the player spot wealth from a distance. Glow color matches the dominant material
in the pile.

---

## 8. Alien and NPC Visuals

### 8.1 Ferrovores (Native Fauna)

Ferrovores are visually distinct from all robot factions. They are biological — silicon-
crystal life forms — not manufactured. Key visual rules:
- **No panels, bolts, seams, or chrome.** Ferrovore surfaces are organic crystalline forms.
- **Bioluminescence.** Piezoelectric nervous system glows in patterns: green for calm,
  amber for alert, red for aggressive.
- **Faceted crystal geometry.** Bodies are icosahedral/octahedral base shapes with organic
  growth protrusions. No right angles.
- **Translucency.** Crystal lattice structure is partially transparent, showing internal
  glow through the body.

Ferrovore unit types (visual scale reference):

| Type | Visual Scale | Threat Color |
|------|-------------|--------------|
| Crystal Mite | Insect-sized (0.2m) | Green |
| Scout | Dog-sized (0.8m) | Green/Amber |
| Raider | Wolf-sized (1.5m) | Amber |
| Guard | Bear-sized (2.5m) | Amber/Red |
| Pack Alpha | Horse-sized (3m) | Red |
| Deep Sleeper | Giant (6–8m) | Red/Purple |

**Hive visual markers:** crystalline chimney vents on surface (visible above ground as the
only early warning). Vents glow orange when Ferrovores are in raid-readiness state.

### 8.2 Residuals (Indigenous Machine Consciousness)

Residuals are ancient Von Neumann constructor bodies reanimated by the substrate
consciousness. They predate all four robot factions by 3 billion years.

Visual character:
- **Ancient, weathered metal.** 3 billion years of oxidation. Every surface is maximally
  corroded — far beyond anything the player can achieve with rust decals.
- **Archaic geometry.** No bevel, no bolt pattern, no panel system. Solid cast shapes with
  primitive tool marks — machined but by a process no robot colonist recognizes.
- **No emissive.** Residuals have no power glow, no sensor eyes, no status lights. They
  do not announce themselves visually. Their presence is sudden and silent.
- **Wrong scale.** Most Residual bodies are either very small (maintenance crawlers,
  0.3–0.5m) or very large (Sentinel, 4–6m). Nothing is human-robot-scale.
- **Core glow exception:** at maximum threat state, a deep amber glow pulses from internal
  gaps in the body — the substrate consciousness shining through. Slow pulse, 0.3 Hz.

### 8.3 Otter Holograms (Quest Guide Projections)

Otters are not physical creatures. They are holographic avatars projected by SABLE
(the Reclaimers' home-planet patron AI) through emitter pads placed in the world.

See section 7.1 for shader details. Visual key points:
- The emitter pad makes clear the otter is a projection, not a creature
- The cyan-green holographic shader is consistent across all otter appearances
- Sprite: `SOURCE_WIDTH: 786 × SOURCE_HEIGHT: 691` sprite sheet, 1.0m world height
- Animated: idle (20 frames at 8 fps) and walk (8 frames at 8 fps) cycles
- Scale: 1.0m tall, proportionally wide — visible but not scene-dominating

---

## 9. Performance and Implementation Notes

### 9.1 Instanced Cube Rendering

`src/rendering/InstancedCubeManager.ts` manages batched cube rendering.

- Each material type gets one `InstancedMesh` — one GPU draw call per material
- Default max: 10,000 instances per material
- Cube geometry: shared `BoxGeometry(0.5, 0.5, 0.5)` — single geometry object
- `frustumCulled: false` on instanced mesh (instances span the whole world)
- Shadow: `castShadow: true, receiveShadow: true`
- Color attribute: per-instance `Float32Array` for selection highlight tinting
- Dirty tracking: `matricesDirty` and `colorsDirty` flags prevent unnecessary GPU uploads
- Swap-and-pop removal: O(1) instance removal without gaps

Performance target: 5,000+ cubes at 60fps on mobile WebGL.

### 9.2 Quality Tiers

`src/rendering/QualityTier.ts` — GPU detection drives rendering quality.

| Tier | Shadow Map | Max Particles | LOD Distances | Instanced Batch | Render Distance | AA | Post |
|------|-----------|--------------|--------------|-----------------|-----------------|----|----|
| high | 1024 | 500 | 20/50/100m | 100 | 200m | yes | yes |
| medium | 512 | 200 | 15/35/70m | 64 | 120m | yes | no |
| low | 256 | 80 | 10/25/50m | 32 | 80m | no | no |

### 9.3 MaterialFactory Patterns

`src/rendering/materials/MaterialFactory.ts`:

- Materials are cached by name — identical requests return the same object
- Textures load asynchronously; materials immediately return with placeholder textures
  that are swapped to real textures once loaded
- `createVariant()` clones a base material and applies color multiply, roughness delta,
  and metalness delta — used for faction-tinted variants of shared textures
- Dispose: full cleanup of all GPU textures and materials on scene teardown

**Import pattern:**
```typescript
import { materialFactory } from "./materials/MaterialFactory";
const mat = materialFactory.createMaterial("iron", IRON_TEXTURES, {
  metalness: 0.85,
  roughness: 0.4,
});
```

### 9.4 Zero MeshLambertMaterial Policy

`MeshLambertMaterial` is forbidden in the codebase. It does not support metalness,
roughness, or environment map reflections. All materials must be `MeshStandardMaterial`
or `ShaderMaterial`. CI enforces this: `npx jest --no-cache` fails if
MeshLambertMaterial is found.

---

## 10. Implementation Status

### Implemented and Wired

| System | File | Status |
|--------|------|--------|
| PBR MaterialFactory | `src/rendering/materials/MaterialFactory.ts` | Complete |
| Cube PBR materials | `src/rendering/materials/CubeMaterialProvider.tsx` | Complete |
| Instanced cube rendering | `src/rendering/InstancedCubeManager.ts` | Complete |
| Holographic shader | `src/rendering/HolographicShader.ts` | Complete |
| Hologram renderer | `src/rendering/HologramRenderer.tsx` | Complete |
| Storm sky shader | `src/rendering/StormSky.tsx` | Complete |
| Terrain PBR | `src/rendering/TerrainPBR.tsx` | Complete |
| Normal map composer | `src/rendering/materials/NormalMapComposer.ts` | Complete |
| Decal renderer | `src/rendering/DecalRenderer.tsx` | Complete |
| Fog of war renderer | `src/rendering/FogOfWarRenderer.tsx` | Complete |
| Selection highlight | `src/rendering/SelectionHighlight.tsx` | Complete |
| Ore deposit generator | `src/rendering/procgen/OreDepositGenerator.ts` | Complete |
| Panel geometry | `src/rendering/procgen/PanelGeometry.ts` | Complete |
| Bot generator | `src/rendering/procgen/BotGenerator.ts` | Complete |
| Building generator | `src/rendering/procgen/BuildingGenerator.ts` | Complete |
| Quality tier system | `src/rendering/QualityTier.ts` | Complete |
| Post processing | `src/rendering/PostProcessing.tsx` | Complete |

### Implemented but Not Wired to Live R3F Scene

| System | File | Gap |
|--------|------|-----|
| PanelGeometry → bot rendering | `BotGenerator.ts` exists | Not connected to `BotMeshProvider.tsx` in live scene |
| InstancedCubeRenderer → R3F scene | `InstancedCubeRenderer.tsx` exists | Not connected to Koota cube traits |
| MaterialFactory → JSON-driven specs | `MaterialFactory.ts` accepts JSON specs | Config wiring not complete for all building types |

---

## Config Quick Reference

| Config File | Visual Content |
|-------------|---------------|
| `config/factionVisuals.json` | Per-faction chassis/head/arm/locomotion styles, colors, metalness, roughness flags |
| `config/cubeMaterials.json` | Cube material game balance — name, value, color, glowColor, durability, weight |
| `config/rendering.json` | LOD distances, shadow sizes, quality tiers, storm sky params, unit/city colors, building PBR treatments, decal configs, fog of war params, terrain PBR config |
| `config/textureMapping.json` | Texture set assignments per material ID, source library paths, file lists |
| `config/materials.json` | Base PBR params (metalness, roughness, color) for ore types |
| `src/rendering/materials/cubePBRMaterials.json` | Full PBR config per cube material: texture paths, prefixes, metalness/roughness/displacement |
