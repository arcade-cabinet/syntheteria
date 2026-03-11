# Syntheteria -- Materials & Economy

**Status:** Authoritative
**Supersedes:** `docs/design/MATERIALS.md`, `GDD-004` (materials sections), `GDD-006`, `GDD-012`
**Scope:** Complete specification of the physical cube economy -- resource philosophy, material hierarchy, extraction rates, compression mechanics, furnace recipes, building costs, cube physics, wall construction, machine assembly, economy pacing, raid scaling, patron shipments, AI economy, visual design, and all formulas.

**Config files:** `config/mining.json`, `config/furnace.json`, `config/cubeMaterials.json`, `config/buildings.json`, `config/economy.json`

**See also:**
- `docs/design/gameplay/MECHANICS.md` -- Section 4 for material quick-reference table (summarized from here)
- `docs/design/gameplay/COMBAT.md` -- cube weapon damage, wall HP, raid mechanics
- `docs/design/gameplay/VICTORY.md` -- Economic Victory (500 cubes, 4 types) and Colonial Victory (patron shipments)

---

## 1. Resource Philosophy

### 1.1 Why Physical Resources

In Syntheteria, resources are not abstract counters in a UI. They are **physical 0.5m rigid body cubes** that exist in the world, obey physics, can be stacked, carried, dropped, stolen, and destroyed. Your wealth is the pile of cubes sitting outside your base, visible to everyone.

This design choice has three consequences that drive the entire game:

1. **Scarcity drives expansion.** Ore deposits in your starting biome are finite. When they deplete, you must explore further, claim new territory, and defend longer supply lines. There is no "turtle and win" strategy -- the map forces you outward.

2. **Wealth is visible and vulnerable.** Every cube you stockpile is a target. Rival civilizations can see your pile, estimate your strength, and decide whether to raid. Hiding cubes underground or behind walls is a real strategic choice with real trade-offs (hidden cubes cannot be quickly accessed for crafting).

3. **Logistics are physical.** Moving cubes from a remote deposit to your furnace requires belts, worker bots, or manual carrying. Distance matters. Convoy protection matters. A severed supply line is an immediate economic crisis, not a percentage debuff.

### 1.2 Scarcity Pressure Curve

The map is designed so that easy resources deplete first, forcing progression through increasingly difficult extraction:

| Game Phase | Resource Access | Expansion Pressure |
|------------|----------------|-------------------|
| Early (0-10 min) | Rock and Scrap Iron deposits near spawn | None -- abundant nearby |
| Mid (10-30 min) | Copper visible on scanner, Silicon requires exploration | Moderate -- must venture out |
| Late (30-60 min) | Titanium in contested biomes, Rare Earth at map edges | High -- territory wars |
| Endgame (60+ min) | Gold scattered, Quantum Crystal one-time-only | Critical -- every deposit matters |

### 1.3 The Core Loop

```
Grind ore deposit --> Powder fills capacity gauge
    --> Compress (screen shake, pressure/heat HUD)
    --> Physical cube ejects
    --> Grab cube --> Carry to furnace hopper
    --> Tap furnace --> Radial menu --> Select recipe
    --> Furnace processes --> Item slides out
    --> Install on bot / Place in world / Feed to next machine
```

Every cube you compress faces a choice:
```
USE LOCALLY --> immediate benefit (wall, weapon, building, bot)
SHIP HOME   --> delayed benefit (blueprint, tech, reinforcement from patron)
```

This ship-or-spend tension is the Colonization model's core strategic lever.

### 1.4 Resource Sources

Materials come from multiple sources that unlock progressively:

**Primary: Ore Deposits** -- Geological formations protruding from terrain. Organic shapes (not cubes), visually distinct per material type. The main source for all nine raw materials. Finite per deposit, respawn on timers.

**Secondary: Enemy Salvage** -- Destroyed or captured enemy machines yield raw materials and occasionally components:
- **Components** -- may include items you cannot yet fabricate
- **Raw materials** -- scrap from destroyed machines (primarily Scrap Iron cubes)
- **Designs** -- reverse-engineer captured machines for blueprints (rare drop)

**Tertiary: Patron Shipments** -- Home planet patron sends pre-built components, blueprints, and reinforcement bots in exchange for cube shipments. See Section 12.

### 1.5 Supply Chain Logistics

Materials must be physically moved between locations. This creates a logistics layer that rewards automation and punishes overextension:

- **Manual carry** -- player or bot walks cubes one at a time. Slow but precise. Early game only.
- **Conveyor belts** -- automated cube transport. The primary logistics backbone.
- **Worker bot convoys** -- assigned carry routes between stockpiles, deposits, and machines.
- **Power infrastructure** -- lightning rods + copper wire cubes carry power between buildings.

Efficiency improves with better grabber tiers, faster belts, and optimized factory layouts. But every supply line is an attack surface -- belts can be cut, convoys ambushed, power lines severed.

---

## 2. Material Hierarchy

Nine raw materials and three processed materials form the economy. Each raw material is harvested from deposits, compressed into 0.5m physical cubes, and used for construction, crafting, trade, and combat. Processed materials are smelted from raw cubes -- they cannot be mined directly.

### 2.1 Master Material Table

| Material | Tier | Rarity | Deposit Freq | Grind Speed | Powder to Fill | Compress Time | Cube HP | Wall HP | Base Value | Carry Speed |
|----------|------|--------|-------------|-------------|----------------|---------------|---------|---------|------------|-------------|
| Rock | 1 | Abundant | 30% | 1.0x | 40 | 1.0s | 25 | 50 | 0.5 | 100% |
| Scrap Iron | 1 | Common | 25% | 0.8x | 60 | 1.5s | 50 | 100 | 1.0 | 85% |
| Copper | 2 | Moderate | 15% | 0.6x | 80 | 2.0s | 40 | 80 | 1.5 | 90% |
| Silicon | 2 | Rare | 10% | 0.4x | 100 | 2.5s | 30 | 60 | 2.0 | 95% |
| Carbon | 3 | Uncommon | 5% | 0.35x | 90 | 2.0s | 60 | 120 | 2.5 | 92% |
| Titanium | 3 | Very Rare | 5% | 0.3x | 120 | 3.5s | 150 | 300 | 5.0 | 70% |
| Rare Earth | 4 | Ultra Rare | 3% | 0.2x | 150 | 4.0s | 40 | 80 | 8.0 | 95% |
| Gold | 4 | Ultra Rare | 2% | 0.25x | 130 | 3.5s | 35 | 70 | 10.0 | 88% |
| Quantum Crystal | 5 | Legendary | 1% | 0.1x | 200 | 5.0s | 60 | 120 | 25.0 | 95% |

**Tier progression:** Higher tiers require better drill upgrades to extract. Tier 1 materials are available from game start. Each subsequent tier gates behind a drill upgrade that itself costs cubes from the previous tier, creating a natural tech ramp.

### 2.2 Processed Materials (Smelted, Not Mined)

Processed materials are created in the Smelter building by combining raw cubes. They cannot be found in deposits.

| Material | Recipe | Cube HP | Wall HP | Base Value |
|----------|--------|---------|---------|------------|
| Iron | 2x Scrap Iron cubes | 90 | 180 | 2.5 |
| Steel | 2x Iron + 1x Carbon cube | 200 | 400 | 8.0 |
| Advanced Alloy | 1x Titanium + 1x Rare Earth cube | 250 | 500 | 18.0 |

### 2.3 Material Property Definitions

Each material has five gameplay-relevant stat axes plus visual properties:

- **Hardness** -- determines wall HP multiplier and structural strength. Titanium (3.0) is six times harder than rock (0.5).
- **Weight** -- affects carry speed and stacking stability. Heavy cubes (titanium at 2.5) need wider base footprints for tall stacks.
- **Conductivity** -- determines suitability for power/signal wiring. Copper (1.0) is the primary conductor. Rock (0.0) cannot carry power at all.
- **Grind Speed** -- multiplier on extraction rate. Lower = harder to grind. Quantum Crystal at 0.1x takes 10x longer than Rock at 1.0x.
- **Powder to Fill** -- how much powder is needed to compress one cube. Higher = more grinding per cube.
- **Compress Time** -- duration of the compression animation. Longer for rarer materials.
- **Cube HP** -- hit points when a cube is loose (thrown, dropped, impacted).
- **Wall HP** -- hit points when a cube is placed as part of a wall structure.
- **Base Value** -- economic worth for trade, raid attractiveness, and victory condition progress.
- **Carry Speed** -- movement speed multiplier while carrying this cube type. Titanium at 70% makes you noticeably slower.

### 2.4 Material Descriptions and Strategic Roles

**Rock** -- The planet's base substrate. Everywhere. Cheap, fast to compress, weak. A wall of rock cubes stops a scout bot but crumbles under sustained fire. Good for bulk construction early game when nothing better is available. Later, rock becomes insulation material inside machine assemblies and disposable filler for siege walls you expect to lose. PBR: gray-brown base (RGB 140, 130, 115), roughness 0.85, metalness 0.05, granular sediment texture with hairline fracture lines.

**Scrap Iron** -- The remnant metal found across the planet's surface in slag heaps, ruin fields, and corroded surface plates. Your primary structural material through early and mid game. Stronger than rock, widely available, and the feedstock for smelting into proper iron. PBR: dark gray with orange-brown rust patches (RGB 110, 85, 65), roughness 0.75, metalness 0.7, rivet grid pattern, heavy rust wear.

**Iron** (Processed) -- Scrap iron cubes fed through a smelter produce iron cubes -- cleaner, stronger, and required for machine assembly. You never mine iron directly; you smelt it from scrap. This creates a natural production bottleneck that gates mid-game progression. PBR: clean metallic gray (RGB 175, 180, 190), roughness 0.3, metalness 0.9, brushed steel grain.

**Copper** -- Found in veins threading through cliff faces and ravine walls, identifiable by the distinctive green patina. Copper is the conductivity material -- required for any wiring, circuit construction, or power distribution. Without copper, you have machines with no way to connect them. PBR: warm orange-brown with green patina edges (base RGB 185, 115, 65), roughness 0.5, metalness 0.6, oxidation patterns procedurally generated per cube.

**Silicon** -- Glassy crystalline outcrops found in processor graveyards and crystal fields. Rare and fragile, but essential for electronics, signal processing, and compute components. Silicon cubes have a distinctive translucent quality. PBR: blue-gray (RGB 140, 155, 185), roughness 0.08, metalness 0.3, hex pattern, translucency 0.3, subtle internal glow (#8899cc).

**Titanium** -- The premium material. Dark metallic bands exposed in mountain faces and deep ravines. Extremely hard to find, extremely hard to harvest (requires Plasma Cutter or better), and extremely strong. A wall of titanium cubes is nearly impenetrable. PBR: bright cool silver (RGB 200, 205, 215), roughness 0.2, metalness 0.85, panel seams + bolt grid, iridescent purple-blue heat-wear tint.

**Carbon** -- Dark, sooty compressed layers found in cable forests and old foundries. Uncommon but strong, carbon is essential for steel production (iron + carbon) and lightweight armor. PBR: matte black, layered compressed texture.

**Rare Earth** -- Faintly glowing nodules found in underground cavities and rare surface exposures. Ultra-rare, essential for advanced electronics and endgame tech. PBR: faint cyan emissive glow, smooth surface with luminescent veins.

**Gold** -- Ultra-rare high-value material. Primarily used for patron shipments and endgame recipes. PBR: warm metallic gold.

**Quantum Crystal** -- The rarest material in the game. Legendary deposits never respawn. Required for victory-condition buildings and endgame tech. Over a minute to fill even with the best drill. PBR: deep purple emissive, crystalline structure.

### 2.5 Strategic Material Roles by Game Phase

```
Early Game:    Rock (bulk fill) + Scrap Iron (structure)
               Scrap is everywhere, rock even more so.
               Build ugly but functional walls and first furnace.

Mid Game:      Iron (strong structure) + Copper (wiring/power)
               Smelting scrap into iron doubles wall strength.
               Copper unlocks power connections between machines.

Late Game:     Silicon (electronics/signal) + Titanium (premium everything)
               Silicon enables compute network, advanced fabrication.
               Titanium walls and machines are nearly unbreakable.

Endgame:       Rare Earth + Gold (patron trade) + Quantum Crystal (victory)
               Rare materials fuel endgame tech and patron rewards.
               Every Quantum Crystal deposit on the map is precious.
```

---

## 3. Extraction & Mining

### 3.1 Design Goal

Grinding a deposit must feel like **physical labor**. Not instant, not boring -- satisfying in the way that breaking rocks in a good mining game feels. The player should feel the hardness of the material through timing and feedback. Target: **8-15 seconds** to fill capacity, scaling by drill tier and material hardness.

### 3.2 Extraction Rate Formula

```
effectiveRate = baseExtractionRate * drillTierMultiplier * oreGrindSpeed * biomeHarvestMod * weatherHarvestMod

ticksToFill = powderCapacity / effectiveRate
secondsToFill = ticksToFill / 60  (assuming 60 ticks per second)
```

- `baseExtractionRate` = 0.1 powder/tick (config: `mining.json > defaultExtractionRate`)
- `drillTierMultiplier` = per-tier multiplier from drill table
- `oreGrindSpeed` = per-material multiplier from master material table
- `biomeHarvestMod` = biome-specific bonus/penalty (config: `biomes.json`)
- `weatherHarvestMod` = storm/weather effect on extraction (config: `biomes.json`)

### 3.3 Drill Tier Table

| Tier | Name | Base Rate | Capacity | Mineable Types | Unlock Cost | Sound Level |
|------|------|-----------|----------|---------------|-------------|-------------|
| 1 | Salvage Grinder | 0.1/tick (1.0x) | 60 | Rock, Scrap Iron | Starting | Low |
| 2 | Diamond Drill | 0.2/tick (2.0x) | 100 | + Copper, Carbon | 4x Scrap Iron cubes | Medium |
| 3 | Plasma Cutter | 0.36/tick (3.6x) | 150 | + Silicon, Titanium | 2x Copper + 1x Silicon | High |
| 4 | Quantum Extractor | 0.6/tick (6.0x) | 250 | All (+ Rare Earth, Gold, Quantum Crystal) | 1x Titanium + 1x Rare Earth | Very High |

### 3.4 Sound Level and Aggro

Higher tier drills are louder, attracting enemies from farther away. This creates a stealth-vs-speed trade-off.

| Sound Level | Aggro Radius |
|-------------|-------------|
| Low | 8 units |
| Medium | 15 units |
| High | 25 units |
| Very High | 40 units |

### 3.5 Time-to-Fill Tables

**Tier 1 Drill (Salvage Grinder), capacity 60, base rate 0.10:**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.100 | 10.0 |
| Scrap Iron | 0.080 | 12.5 |

**Tier 2 Drill (Diamond Drill), capacity 100, base rate 0.20:**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.200 | 8.3 |
| Scrap Iron | 0.160 | 10.4 |
| Copper | 0.120 | 13.9 |
| Carbon | 0.070 | 23.8 |

**Tier 3 Drill (Plasma Cutter), capacity 150, base rate 0.36:**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.360 | 6.9 |
| Scrap Iron | 0.288 | 8.7 |
| Copper | 0.216 | 11.6 |
| Carbon | 0.126 | 19.8 |
| Silicon | 0.144 | 17.4 |
| Titanium | 0.108 | 23.1 |

**Tier 4 Drill (Quantum Extractor), capacity 250, base rate 0.60:**

| Material | Effective Rate | Seconds to Fill |
|----------|---------------|-----------------|
| Rock | 0.600 | 6.9 |
| Scrap Iron | 0.480 | 8.7 |
| Copper | 0.360 | 11.6 |
| Carbon | 0.210 | 19.8 |
| Silicon | 0.240 | 17.4 |
| Titanium | 0.180 | 23.1 |
| Rare Earth | 0.120 | 34.7 |
| Gold | 0.150 | 27.8 |
| Quantum Crystal | 0.060 | 69.4 |

**Design note:** Quantum Crystal takes over a minute to fill even with the best drill. This is intentional -- it is the most valuable material in the game. The player should feel its rarity through the grind time.

### 3.6 Deposit Yield, Depletion, and Respawn

Each deposit node contains a finite amount of powder. When depleted, the deposit crumbles.

| Deposit Type | Yield Range (powder) | Cubes per Deposit | Respawn Time | Respawn Location |
|-------------|---------------------|-------------------|--------------|------------------|
| Rock | 200-600 | 5-15 | 180s (3 min) | Same location |
| Scrap Iron | 180-450 | 3-7 | 300s (5 min) | Same location |
| Copper | 120-320 | 1.5-4 | 480s (8 min) | Same biome, shifted |
| Silicon | 80-250 | 0.8-2.5 | 600s (10 min) | Same biome, shifted |
| Carbon | 100-280 | 1.1-3.1 | 420s (7 min) | Same biome, shifted |
| Titanium | 60-180 | 0.5-1.5 | 900s (15 min) | Random in biome |
| Rare Earth | 30-100 | 0.2-0.7 | 1800s (30 min) | Random on map |
| Gold | 20-75 | 0.15-0.6 | 2400s (40 min) | Random on map |
| Quantum Crystal | 10-30 | 0.05-0.15 | Never | One-time only |

**Cubes per Deposit** = yield / powderToFill. Fractional means the last harvest may not yield enough for a full cube (leftover powder remains in player storage).

**Respawn behavior:**
- "Same location" -- deposit reappears at original coordinates. Allows permanent mining outposts.
- "Same biome, shifted" -- respawns within the same biome at a random offset (10-30 units). Prevents camping.
- "Random in biome" -- respawns anywhere within the biome. Requires scouting.
- "Random on map" -- respawns at any valid deposit location on the entire map. Drives exploration.
- "Never" -- Quantum Crystal deposits are one-time-only. Every crystal on the map is precious.

### 3.7 Depletion Visual Stages

| Remaining % | Visual |
|-------------|--------|
| 100% | Full size, pristine surface |
| 75% | Small surface cracks, fragments on ground |
| 50% | Noticeable size reduction, deep cracks, dimmer color |
| 25% | Heavily fragmented, nearly flat |
| 0% | Crumbles to dust (particle burst), scarred terrain |

### 3.8 Guaranteed Spawn Placement

Deposit placement guarantees the player can find resources immediately:

| Material | Min Distance from Spawn | Max Distance | Guaranteed Count within Range |
|----------|------------------------|-------------|-------------------------------|
| Rock | 5 | 15 | 3 |
| Scrap Iron | 8 | 20 | 2 |
| Copper | 30 | 60 | 1 (visible from spawn with scanner) |
| Silicon | 50 | 100 | 0 (requires exploration) |

### 3.9 Deposit Visual Design

Ore deposits are **organic, geological formations** -- not cubes, not abstract icons. They protrude from terrain, jut out of mountainsides, cluster in ravines:

| Deposit Type | Visual | Where Found |
|-------------|--------|-------------|
| Rock | Gray-brown geological formations, rough and angular | Everywhere on surface |
| Scrap Ore | Rusted metal sheets, bent rebar, corroded plates | Surface ruins, slag heaps |
| Copper Vein | Green-patina veins threading through rock | Cliff faces, ravine walls |
| Silicon Cluster | Glassy crystalline outcrops | Processor graveyards, crystal fields |
| Carbon Deposit | Dark, sooty compressed layers | Cable forests, old foundries |
| Titanium Seam | Dark metallic bands in mountain faces | Deep terrain, mountain bases |
| Rare Earth Node | Faintly glowing nodules | Underground cavities, rare surface |

Deposits have procedural geometry with distinct PBR materials per type. Veins have visible volume and deplete visually as you harvest (shrink, crack, crumble). Depleted veins leave behind scarred terrain.

---

## 4. Compression (Powder to Cube)

### 4.1 Design Goal

Compression is the **most satisfying micro-interaction** in the game. Every time you compress a cube, you should feel it. The 1-5 second duration is a reward moment, not downtime. It must have:
- Escalating screen shake
- Visual pressure/heat gauges
- Sound design crescendo
- Physical cube eject with bounce

### 4.2 Compression Timing Table

| Material | Powder Required | Duration | Screen Shake Peak | Eject Velocity |
|----------|----------------|----------|-------------------|----------------|
| Rock | 40 | 1.0s | 0.3 | 2.0 m/s |
| Scrap Iron | 60 | 1.5s | 0.5 | 1.8 m/s |
| Copper | 80 | 2.0s | 0.6 | 1.6 m/s |
| Carbon | 90 | 2.0s | 0.6 | 1.5 m/s |
| Silicon | 100 | 2.5s | 0.7 | 1.4 m/s |
| Titanium | 120 | 3.5s | 0.9 | 1.0 m/s |
| Rare Earth | 150 | 4.0s | 0.8 | 1.2 m/s |
| Gold | 130 | 3.5s | 0.85 | 1.1 m/s |
| Quantum Crystal | 200 | 5.0s | 1.0 | 0.8 m/s |

### 4.3 Screen Shake Curve

```
shakeIntensity(t) = peakIntensity * easeInQuad(t / duration)

where easeInQuad(x) = x * x
```

The shake starts barely noticeable and builds to peak at the moment of cube ejection. At t=duration, there is a sharp spike to 1.5x peak for exactly 2 frames (the "SLAM"), then instant drop to 0.

### 4.4 Pressure and Heat Gauges

**Pressure gauge** (left side of compression overlay):
```
pressure(t) = easeInCubic(t / duration)
```
Fills smoothly from 0% to 100%. Enters "red zone" (visual pulse + warning color) at 85%.

**Heat gauge** (right side):
```
heat(t) = easeInQuad((t - delay) / (duration - delay))
where delay = duration * 0.15
```
Heat starts slightly after pressure (delayed by 15% of duration), creating a staggered fill that feels more mechanical.

### 4.5 Sound Design Spec

| Phase | Duration | Sound |
|-------|----------|-------|
| Start | 0-20% | Low hydraulic whine, building |
| Build | 20-80% | Rising metallic groan, pressure hiss intensifying |
| Peak | 80-99% | High-pitched whine, steam venting |
| SLAM | Frame of completion | Heavy metallic SLAM + reverb tail (200ms) |
| Settle | Post-slam 500ms | Metallic ring-down, cube bounce clanks |

### 4.6 Compression Quality

| Condition | Quality Multiplier | Visual |
|-----------|-------------------|--------|
| Normal compression | 1.0x | Clean cube, full color |
| Took damage during compression | 0.7x | Cracked surface, dim color |
| Interrupted (enemy hit) | Fails | No cube, powder lost (50%) |
| Rushed (cancel early at 80%+) | 0.8x | Slightly deformed, rough texture |

Quality affects cube value in trade and wall HP: `effectiveHP = quality * baseHP`. A cracked titanium cube (0.7 * 300 = 210 wall HP) is still better than a clean scrap cube (100 wall HP).

### 4.7 Cube Eject Physics

```
ejectDirection = playerForward * 0.7 + Vector3.UP * 0.3  (normalized)
ejectSpeed = ejectVelocity from table above
bounceRestitution = 0.3  (low -- cubes thud, they don't ping-pong)
frictionCoefficient = 0.6  (settle quickly)
```

The cube physically pops out in front of the player, bounces once on the ground, and settles. Total settle time: ~1 second for heavy materials, ~1.5s for light materials.

### 4.8 Compression Particle Effects

| Material | Particle Style |
|----------|---------------|
| Rock | Brown-gray dust cloud, settles quickly |
| Scrap Iron | Orange-brown sparks + rust dust |
| Copper | Warm orange sparks with green-tinted edges |
| Silicon | Blue-white crystalline sparkle, slow fade |
| Titanium | Bright white flash + purple-blue afterglow sparks |
| Carbon | Dark sooty puffs with ember sparks |
| Rare Earth | Cyan glowing motes, float upward slowly |
| Gold | Warm golden sparks, bright flash |
| Quantum Crystal | Purple-white energy burst, lingering glow particles |

---

## 5. Cube Physics & Construction

### 5.1 Cubes as Rigid Bodies

Every material cube in the world is a 0.5m Rapier rigid body with a cuboid collider. Cubes are the fundamental unit of construction, storage, trade, and combat. There are no abstract resource counters. If you have 40 iron cubes, there are 40 physical iron cubes sitting somewhere in the world that enemies can see, steal, or destroy.

Rapier rigid body configuration per cube:
- Type: `dynamic` when loose (falls, rolls, can be pushed)
- Type: `kinematicPosition` when placed on grid (locked in position, immovable by physics)
- Collider: `cuboid(0.25, 0.25, 0.25)` -- half-extents for 0.5m cube
- Friction: 0.8 (cubes don't slide easily on surfaces)
- Restitution: 0.1 (minimal bounce -- heavy industrial materials)
- Mass: derived from `material.weight` (affects carry speed and throw distance)

**Cube interactions (via contextual radial menu):**
- `[GRAB]` -- magnet grab, carry it
- `[STACK]` -- place into a stack (snap grid)
- `[INFO]` -- show material type, quality, HP
- `[CRUSH]` -- break back into powder (lossy, ~50% recovery)

### 5.2 Snap Grid

Cubes align to a global 0.5m snap grid when placed near existing structures or flat ground. The grid exists everywhere but is invisible until the player enters placement mode.

```
Snap rules:
- Cube center within 0.3m of a grid point -> snap to that grid point
- Adjacent to an already-placed cube -> snap to the neighbor face
- On flat ground (slope < 15 degrees) -> snap to ground-level grid
- On steep terrain -> no snap (cube is loose, rolls downhill)
```

When entering placement mode (holding a cube with the Grabber and aiming at a valid surface), a ghost preview appears:
- Semi-transparent version of the cube at the snap position
- Green tint when placement is valid
- Red tint when blocked (overlapping another cube or collider)
- Wireframe grid lines visible on adjacent faces showing available expansion
- Material-specific ghost (shows what the actual cube will look like)

### 5.3 Stacking and Structural Stability

Cubes stack vertically. Gravity holds them in place. Stacking is the fundamental building action -- walls are stacks, towers are tall stacks, buildings are organized stacks.

```
Stacking physics:
- Max stable height: 8 cubes (4m) for unsupported column
- Buttressed columns (adjacent stacks providing lateral support): up to 16 cubes (8m)
- Center of mass calculation: per-column, recalculated when cubes added/removed
- Stability threshold: center of mass must remain within base footprint
- Material weight affects stability: heavy cubes (titanium, iron) need wider bases
```

### 5.4 Toppling

Towers topple when their center of mass exceeds the base support footprint. You cannot build a single-column tower 20 cubes high -- you need pyramidal or buttressed designs for height.

```
Toppling calculation (per column, per physics tick):

  centerOfMassX = sum(cube.weight * cube.gridX) / sum(cube.weight)
  centerOfMassZ = sum(cube.weight * cube.gridZ) / sum(cube.weight)

  baseSupportRadius = (number of ground-level cubes in connected group) * 0.25m

  if distance(centerOfMass.xz, baseCenter.xz) > baseSupportRadius:
    trigger topple event
    convert top N cubes from kinematic -> dynamic (they fall with physics)
    apply random angular impulse (tumbling)
    each cube takes fall damage: fallDamage = cube.weight * fallHeight * 10
```

Toppling is dramatic -- a tower of iron cubes collapsing creates a cascade of physics objects clanking and tumbling. Nearby entities take crush damage if hit.

### 5.5 Individual Cube HP and Damage

Each cube has individual HP based on its material hardness. Cubes in a wall are independently destructible.

```
Cube HP formula:
  cube.maxHp = material.hpPerCube * cube.quality
  cube.hp = cube.maxHp (when freshly compressed or smelted)

Damage application:
  cube.hp -= incomingDamage
  if cube.hp <= cube.maxHp * 0.5:
    cube.damaged = true       // visual: cracks appear
  if cube.hp <= 0:
    destroy cube
    spawn rubble (70% chance: 1 damaged cube of same material, quality 0.3-0.6)
    recalculate column stability (may trigger topple cascade)
```

### 5.6 Material Mixing

Walls and structures CAN mix materials. A rock foundation with iron upper walls is valid and sometimes strategically optimal (cheap base, strong where it matters):
- Seam lines between different materials are more pronounced (thicker normal map gap)
- Color contrast makes the material boundary obvious
- No structural penalty for mixing -- only cosmetic
- Mixed walls give defenders information: they can see where weak cubes are and prioritize repairs

---

## 6. Wall Building & Defense

### 6.1 Walls Are Just Cubes

There is no "wall" entity type. Walls are emergent structures created by stacking cubes in a line. A wall is defined by its geometry -- if cubes form a contiguous line at least 2 cubes long and at least 2 cubes tall, the game recognizes it as a wall for AI targeting and structural integrity calculations.

```
Wall recognition heuristic:
  For each group of contiguous placed cubes:
    if width >= 2 AND height >= 2:
      classify as "wall segment"
      register in defense graph for AI pathfinding
      enable wall integrity overlay when selected
```

This means wall design is freeform. Build L-shapes, zigzags, star forts, layered walls, walls with embedded copper wiring, walls with silicon windows that let signal through. The system does not constrain; it recognizes patterns.

### 6.2 Wall Strength

Wall strength is the sum of individual cube HPs along any cross-section:

```
Wall strength at a point:
  strengthAtColumn(x, z) = sum of cube.hp for all cubes at grid column (x, z)

Total wall integrity:
  wallIntegrity = min(strengthAtColumn for each column in wall)
  // The wall is only as strong as its weakest column
```

Meaningful defensive construction decisions:
- A 3-cube-thick rock wall (3 * 50 = 150 HP per column) is weaker than a single-cube iron wall (180 HP)
- But the rock wall is cheaper and wider, potentially absorbing more area damage
- Mixing a rock core with iron facing gives 50 + 180 = 230 HP at moderate cost

### 6.3 Blueprint Mode

For larger structures, the player can enter blueprint mode:
1. Open build menu -> select "Blueprint" -> select "Wall"
2. First-person view shifts to a projection overlay
3. Aim at ground to set wall start point -> click
4. Drag to set wall end point -> click
5. Set wall height (scroll or number key) -> confirm
6. Ghost cubes appear showing the planned wall outline
7. Assign a bot (or self) to the blueprint
8. Assigned bot carries cubes from nearest stockpile and fills blueprint
9. Bot prioritizes bottom row first, then each subsequent row (structural stability)
10. Unfilled blueprint positions show as wireframe outlines

### 6.4 Breach Mechanics

Attackers target the weakest cube in a wall section. Destroying individual cubes creates holes:

```
Attack targeting (AI):
1. Scan wall for lowest-HP cube at ground level
2. Concentrate fire on that cube
3. When cube destroyed -> hole in wall (1 cube gap)
4. If ground-level cube destroyed, check column stability
   - Cubes above may topple into the gap
   - Or may hold if adjacent columns provide lateral support
5. Once a hole exists, melee attackers path through it
6. Ranged attackers continue widening the breach
```

### 6.5 Rubble

When cubes in a wall are destroyed, they create rubble -- loose cubes and damaged cubes that scatter on the ground:
- 70% chance: spawn 1 damaged cube of same material (quality 0.3-0.6)
- 30% chance: nothing (material lost to damage)
- Damaged cubes can be re-compressed in a furnace to recover ~50% of material
- Rubble slows movement through a breached area
- After a siege, both attacker and defender can salvage rubble cubes

### 6.6 Doorways and Gates

Doorways are gaps intentionally left in walls -- a doorway is just a wall with a 1-cube-wide, 2-cube-tall gap. Basic: 1 wide, 2 tall. Wide: 2 wide, 2 tall (vehicle access). A door mechanism (2 iron + 1 copper) can be placed in a doorway for proximity-sensor opening/closing.

---

## 7. Machine Assembly

### 7.1 Machines from Cubes

Machines are assembled by placing specific cube types in specific spatial patterns in the world. When the pattern is complete, the cubes merge into a functional machine entity. You physically build the machine shape with cubes, and when the last cube clicks into place, the structure activates.

### 7.2 Assembly Patterns

Key machine assembly patterns (defined in `config/machineAssembly.json`):

**Furnace** (2x2x2): 4 iron (base) + 3 rock + 1 copper (top). The starter machine, provided free at game start.

**Lightning Rod** (1x1x6): 4 iron (base shaft) + 2 copper (conductor tip). Captures storm energy. Must be tall for efficiency.

**Smelter** (2x3x2): 8 iron + 2 rock + 2 copper. Higher-tier furnace for iron/steel production. Requires power.

**Fabrication Unit** (3x2x2): 8 iron + 2 copper + 2 silicon. Advanced crafting. Requires power.

**Outpost Core** (3x3x3): 12 iron + 5 copper + 2 silicon. Claims territory in a 20m radius. Requires power.

**Defense Turret** (2x2x2): 4 titanium + 2 silicon + 2 copper. Automated defense, range 12, 25 damage, 1.5s attack rate.

### 7.3 Assembly Process

1. Player places cubes matching a machine pattern
2. After each cube placement, system checks all rotations (0, 90, 180, 270 degrees around Y axis)
3. If pattern matches: brief activation animation (0.5s) with emissive pulse, particle burst, subtle camera shake
4. Individual cube entities are destroyed
5. Single machine entity spawns at pattern center with procedural panel-based mesh
6. Machine is now functional with hopper, output, and power connection

### 7.4 Disassembly

Machines can be dismantled via radial menu -> [DISMANTLE]. Takes 10 seconds. Cubes returned at original pattern positions with quality reduced by wear (quality * 0.85). Enables nomadic play -- tear down, relocate, rebuild.

---

## 8. Furnace Recipes

### 8.1 Tier 1: Salvage (Starting)

Available from game start. Requires only Scrap Iron and Rock cubes.

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Grabber Arm | 3x Scrap Iron | 10s | tool_grabber_t1 | Tool |
| Diamond Drill Bit | 4x Scrap Iron | 15s | tool_harvester_t2 | Tool |
| Scanner Lens | 2x Scrap Iron | 8s | tool_scanner_t1 | Tool |
| Basic Power Cell | 5x Scrap Iron | 20s | component_power_cell | Component |
| Repair Patch | 2x Scrap Iron | 5s | consumable_repair | Consumable |
| Rock Foundation | 4x Rock | 8s | building_foundation | Building |
| Scrap Wall Panel | 3x Scrap Iron + 2x Rock | 12s | building_wall_scrap | Building |
| Basic Miner Frame | 6x Scrap Iron | 25s | building_miner_t1 | Building |

### 8.2 Tier 2: Copper Processing (requires Harvester T2)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Wire Bundle | 2x Copper | 12s | component_wire_bundle | Component |
| Belt Segment | 3x Scrap Iron + 1x Copper | 15s | building_belt_segment | Building |
| Auto-Hopper | 4x Scrap Iron + 2x Copper | 20s | building_auto_hopper | Building |
| Grabber Mk2 | 3x Copper + 2x Scrap Iron | 15s | tool_grabber_t2 | Tool |
| Lightning Rod | 3x Copper + 2x Scrap Iron | 18s | building_lightning_rod | Building |
| Power Wire | 1x Copper | 8s | building_power_wire_x5 | Building |
| Signal Relay | 2x Copper + 1x Scrap Iron | 14s | building_signal_relay | Building |
| Copper Wall Panel | 4x Copper + 2x Rock | 16s | building_wall_copper | Building |

### 8.3 Tier 3: Silicon and Carbon (requires Harvester T2+)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Circuit Board | 2x Silicon + 1x Copper | 25s | component_circuit_board | Component |
| Battle Bot Chassis | 6x Scrap Iron + 2x Copper + 1x Silicon | 30s | unit_battle_bot | Unit |
| Scout Bot Chassis | 3x Scrap Iron + 1x Copper + 1x Silicon | 20s | unit_scout_bot | Unit |
| Worker Bot Chassis | 4x Scrap Iron + 2x Copper | 22s | unit_worker_bot | Unit |
| Hacking Module | 3x Silicon + 2x Copper | 30s | component_hacking_module | Component |
| Compute Core | 2x Silicon + 1x Carbon | 28s | component_compute_core | Component |
| Carbon Fiber Panel | 3x Carbon + 1x Scrap Iron | 20s | building_wall_carbon | Building |
| Smelter | 4x Scrap Iron + 2x Carbon + 1x Copper | 35s | building_smelter | Building |
| Refiner | 3x Silicon + 2x Copper + 2x Scrap Iron | 35s | building_refiner | Building |

### 8.4 Smelter Recipes (requires Smelter building)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Iron Cube | 2x Scrap Iron cubes | 15s | 1x Iron cube | Material |
| Steel Cube | 2x Iron + 1x Carbon cubes | 25s | 1x Steel cube | Material |
| Advanced Alloy Cube | 1x Titanium + 1x Rare Earth cubes | 30s | 1x Advanced Alloy cube | Material |

### 8.5 Tier 4: Titanium (requires Harvester T3+)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Plasma Cutter | 2x Titanium + 1x Silicon + 2x Copper | 30s | tool_harvester_t3 | Tool |
| Defense Turret | 3x Titanium + 2x Silicon + 3x Copper | 40s | building_turret | Building |
| Fortified Wall | 4x Titanium + 4x Scrap Iron | 25s | building_wall_titanium | Building |
| Outpost Core | 2x Titanium + 2x Silicon + 4x Copper + 4x Scrap Iron | 60s | building_outpost | Building |
| Heavy Bot Chassis | 5x Titanium + 3x Iron + 2x Silicon | 45s | unit_heavy_bot | Unit |
| Hacker Bot Chassis | 3x Silicon + 2x Copper + 1x Titanium | 35s | unit_hacker_bot | Unit |
| Formation Controller | 2x Silicon + 1x Titanium + 1x Copper | 25s | component_formation_ctrl | Component |
| Titan Armor Plate | 3x Titanium + 1x Carbon | 20s | component_titan_armor | Component |

### 8.6 Tier 5: Endgame (requires Harvester T4)

| Recipe | Inputs | Time | Output | Category |
|--------|--------|------|--------|----------|
| Quantum Extractor | 2x Rare Earth + 1x Gold + 2x Titanium | 50s | tool_harvester_t4 | Tool |
| Advanced Alloy Cube | 1x Titanium + 1x Rare Earth cubes | 30s | 1x Advanced Alloy cube | Material |
| Gravity Grabber | 2x Rare Earth + 1x Gold + 1x Silicon | 40s | tool_grabber_t4 | Tool |
| Signal Jammer | 3x Silicon + 2x Rare Earth + 1x Gold | 45s | building_signal_jammer | Building |
| Fusion Core | 1x Quantum Crystal + 2x Rare Earth + 1x Gold | 90s | component_fusion_core | Component |
| Titan-Class Bot | 8x Titanium + 4x Silicon + 2x Rare Earth + 1x Gold | 120s | unit_titan_bot | Unit |
| Teleporter Pad | 2x Quantum Crystal + 3x Rare Earth + 2x Gold | 180s | building_teleporter | Building |
| Planet Core Tap | 3x Quantum Crystal + 5x Titanium + 3x Rare Earth | 300s | building_core_tap | Building (victory) |

---

## 9. Building Costs

### 9.1 Production Buildings

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Notes |
|----------|-----------|---------------|------------|-----------|-------|
| Furnace (starter) | FREE | 0 | -- | 1 | Provided at game start |
| Basic Miner | 6x Scrap Iron | 2 | 15s | 1 | Auto-extracts from deposits |
| Smelter | 4x Scrap Iron + 2x Carbon + 1x Copper | 2 | 20s | 3 | Scrap -> Iron, Iron+Carbon -> Steel |
| Refiner | 3x Silicon + 2x Copper + 2x Scrap Iron | 2 | 20s | 3 | Processes rare materials |
| Fabrication Unit | 4x Iron + 2x Silicon + 2x Copper | 3 | 25s | 3 | Advanced crafting recipes |

### 9.2 Infrastructure

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Notes |
|----------|-----------|---------------|------------|-----------|-------|
| Belt Segment | 3x Scrap Iron + 1x Copper | 0 | 5s | 2 | Moves cubes at 2 u/s |
| Fast Belt | 4x Iron + 2x Copper | 1 | 8s | 4 | Moves cubes at 4 u/s |
| Express Belt | 4x Titanium + 3x Copper | 2 | 12s | 5 | Moves cubes at 8 u/s |
| Auto-Hopper | 4x Scrap Iron + 2x Copper | 0 | 10s | 2 | Belt -> furnace feeder |
| Lightning Rod | 3x Copper + 2x Scrap Iron | 0 (generates) | 12s | 2 | Generates power |
| Power Wire (x5) | 1x Copper | 0 | 3s | 2 | Carries power between buildings |
| Signal Relay | 2x Copper + 1x Scrap Iron | 1 | 10s | 2 | Extends signal/compute network |
| Signal Amplifier | 3x Silicon + 2x Copper | 3 | 18s | 3 | Boosts signal range 2x |

### 9.3 Defense

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Wall HP | Notes |
|----------|-----------|---------------|------------|-----------|---------|-------|
| Scrap Wall Panel | 3x Scrap Iron + 2x Rock | 0 | 8s | 1 | 150 | Cheapest wall |
| Copper Wall Panel | 4x Copper + 2x Rock | 0 | 10s | 2 | 240 | Conducts power through wall |
| Carbon Wall Panel | 3x Carbon + 1x Scrap Iron | 0 | 10s | 3 | 360 | Lightweight but strong |
| Titanium Wall Panel | 4x Titanium + 4x Scrap Iron | 0 | 15s | 4 | 900 | Nearly impenetrable |
| Cube Wall (stacked) | Cubes directly | 0 | Instant | 1 | Per-cube HP | Manual stacking |
| Turret | 3x Titanium + 2x Silicon + 3x Copper | 2 | 20s | 4 | 400 | Automated fire, range 12 |
| Bunker | 4x Titanium + 3x Iron + 2x Silicon | 2 | 25s | 4 | 800 | 3 garrison slots |
| Gate | 2x Iron + 1x Copper | 1 | 10s | 2 | 200 | Controllable passage |

### 9.4 Territory

| Building | Cube Cost | Power Required | Build Time | Tech Tier | Claim Radius | Notes |
|----------|-----------|---------------|------------|-----------|-------------|-------|
| Outpost Core | 2x Ti + 2x Si + 4x Cu + 4x Scrap | 1 | 30s | 4 | 15 | Claims territory |
| Outpost Upgrade | 3x Titanium + 2x Silicon | 2 | 20s | 5 | 25 | Expands claim radius |
| Underground Storage | 6x Rock + 4x Scrap Iron | 0 | 20s | 2 | -- | Hides 20 cubes from perception |
| Decoy Pile | 3x Rock | 0 | 8s | 1 | -- | Fake cubes, alerts on touch |

---

## 10. Economy Pacing

### 10.1 Value Generation by Game Phase

| Phase | Materials Available | Value/Minute (solo, no automation) |
|-------|--------------------|------------------------------------|
| Early (0-10 min) | Rock, Scrap Iron | ~3.0 value/min |
| Mid (10-30 min) | + Copper, Carbon, Silicon | ~6.0 value/min |
| Late (30-60 min) | + Titanium, Rare Earth | ~12.0 value/min |
| Endgame (60+ min) | + Gold, Quantum Crystal | ~20.0 value/min |

**With full automation (belts + auto-miners):** multiply by 3-5x.

### 10.2 Value/Minute Derivation (Early Game)

Player with Tier 1 drill, no automation:
1. Walk to scrap deposit (5 units away, speed 5 u/s) = 1s
2. Grind to capacity (60 powder at 0.08/tick) = 12.5s
3. Compress (1.5s)
4. Walk to furnace/stockpile (5 units) = 1s
5. Drop cube = 0.5s

**Total cycle: ~16.5 seconds per scrap cube (value 1.0)**

Per minute: 60 / 16.5 = **3.6 cubes/min = 3.6 value/min**

With some rock mixed in (faster grind, lower value):
- Rock cycle: ~12.5 seconds, value 0.5
- Average: ~3.0 value/min

### 10.3 Key Economic Milestones

| Milestone | Target Time | Cube Value Required |
|-----------|-------------|---------------------|
| First cube | 2 minutes | 1.0 |
| First tool crafted (Grabber) | 4 minutes | 3.0 spent |
| First automation (belt) | 12 minutes | 4.0 spent |
| First defense (wall) | 18 minutes | 5.0 spent |
| First combat bot | 35 minutes | ~15 spent |
| First territory claim (outpost) | 40 minutes | ~40 spent |
| Iron smelting operational | 50 minutes | ~20 spent |

### 10.4 Minute-by-Minute Projection (Solo, First 20 Minutes)

| Minute | Activity | Cubes Produced | Total Cubes | Total Value | Notes |
|--------|----------|---------------|-------------|-------------|-------|
| 0-1 | Tutorial. Walk to deposit. Start grinding. | 0 | 0 | 0 | Learning controls |
| 1-2 | Grind first scrap iron deposit. | 1 | 1 | 1.0 | First cube! |
| 2-3 | Compress. Carry to furnace. Start second. | 1 | 2 | 2.0 | Manual hauling |
| 3-4 | Third cube. Feed furnace 3x scrap -> Grabber. | 1 | 0 | 0 | Spent 3 cubes crafting |
| 4-5 | Grind + compress 2 cubes (faster with grabber). | 2 | 2 | 2.0 | Grabber helps |
| 5-6 | 2 more cubes. | 2 | 4 | 4.0 | Building stockpile |
| 6-7 | Feed furnace 4x scrap -> Diamond Drill. | 0 | 0 | 0 | Spent 4 cubes |
| 7-8 | Drill T2: now mining copper. First copper cube. | 2 | 2 | 2.5 | Mixed materials |
| 8-10 | Mining copper + scrap. 4 cubes produced. | 4 | 6 | 7.5 | Faster now |
| 10-12 | Craft belt + auto-hopper. Automation begins. | 0 | 2 | 2.5 | Spent 4 cubes |
| 12-15 | Belt running. Semi-automated. ~3 cubes/min. | 9 | 11 | 14.0 | Automation boost |
| 15-18 | Build scanner, explore. Find silicon. | 9 | 18 | 23.5 | Stockpile growing |
| 18-20 | First feral raid (wealth bracket: "Modest"). | 6 | 20 | 27.0 | Defense needed |

---

## 11. Wealth Brackets and Raid Scaling

### 11.1 Wealth Bracket Table

| Bracket | Total Cube Value | Raid Frequency | Max Raid Size |
|---------|-----------------|----------------|---------------|
| Destitute | 0-10 | No raids | -- |
| Poor | 11-30 | Every 10 min | 2 scouts |
| Modest | 31-80 | Every 7 min | 3 scouts + 1 soldier |
| Wealthy | 81-200 | Every 5 min | 4 soldiers + 1 heavy |
| Rich | 201-500 | Every 3 min | 6 soldiers + 2 heavy + 1 hacker |
| Opulent | 501+ | Every 2 min | 8 soldiers + 3 heavy + 2 hackers |

### 11.2 Raid Point Formula

```
raidPoints = totalVisibleCubeValue * 0.5 + buildingCount * 2 + techLevel * 10
raidInterval = max(120, 600 - raidPoints * 2) seconds
maxRaiders = min(15, floor(raidPoints / 15))
```

Note: cubes stored in Underground Storage are excluded from `totalVisibleCubeValue`. This makes hidden storage a strategic defense investment.

### 11.3 Stockpile Visibility and Raid Attractiveness

Large stockpiles attract raiders. Enemy AI runs a periodic stockpile scan and evaluates whether a raid is worth the risk:

```
Raid attractiveness:
  raidScore = stockpileValue * visibilityFactor - defenseEstimate

  visibilityFactor:
    1.0 if stockpile is on open ground (no walls)
    0.5 if stockpile is partially enclosed (walls on 2+ sides)
    0.2 if stockpile is fully enclosed (walls on all sides + roof)
    0.0 if stockpile is inside an active outpost with turrets

  defenseEstimate:
    sum of (wall.hp + turret.dps * 30 + patrol_bot.combat_rating)
    for all defenses within 10m of stockpile
```

### 11.4 Storage Strategy

**Open stockpile:** Cubes on the ground. Fast to grab, maximum vulnerability. Good for active build sites and low-value materials.

**Walled storage:** Cubes enclosed in a cube-built room. Must walk through doorway to access. Slower but protected from ranged attacks.

**Vault:** Fully enclosed structure with door mechanism (copper + iron). Locked access (requires circuit board key). Attackers must breach walls. Slowest access, maximum protection. Good for silicon, titanium, strategic reserves.

---

## 12. Furnace Throughput and Factory Layout

### 12.1 Furnace Stats

| Stat | Value |
|------|-------|
| Hopper capacity | 3 cubes (upgradeable to 5, then 8) |
| Processing speed | 1.0x (base) |
| Power required | 2 (when powered -- optional early game) |
| Powered speed bonus | 1.5x processing speed |
| Max queue depth | 1 recipe at a time |

### 12.2 Multi-Furnace Efficiency

Building multiple furnaces at a single base has diminishing returns on player attention:

| Furnace Count | Effective Throughput | Rationale |
|---------------|---------------------|-----------|
| 1 | 1.0x | Manual attention |
| 2 | 1.8x | Context-switching penalty |
| 3 | 2.4x | Harder to keep all fed |
| 4+ | 2.8x (cap) | Belt automation required |

With belts and auto-hoppers, this penalty disappears -- the system self-feeds.

### 12.3 Optimal Factory Layout (Early Game)

```
Deposit (10m) --[belt]--> Auto-Hopper --> Furnace --> Output
                                                   \--> Stockpile
```

**Throughput calculation:**
- Belt speed: 2 u/s
- Belt length: 10 units
- Transport time: 5 seconds per cube
- Furnace processing: 10-15 seconds (Tier 1 recipes)
- **Bottleneck: furnace processing time**
- With 1 belt feeding 1 furnace: 1 cube processed per 10-15 seconds
- Need 2 belts feeding 1 furnace for continuous operation

### 12.4 Base Agency and Per-Base Economics

Each settlement (base) is an autonomous agent with its own work queues, furnace capacity, and cube stockpile.

**Per-base resources:**

| Resource | Scope | Notes |
|----------|-------|-------|
| Cube stockpile | Per-base | Physical cubes at this base. Visible, raidable. |
| Furnace capacity | Per-base | Each base has its own furnace(s). |
| Work queue | Per-base | Harvest, transport, build, patrol, furnace scheduling |
| Bot roster | Per-base | Bots assigned to this base. "Phone home" when idle. |
| Power grid | Per-base | Lightning rods and wires are local to each base |

**Multi-base throughput scaling:**

| Bases Owned | Total Furnace Capacity | Notes |
|-------------|----------------------|-------|
| 1 (starter) | 1x | Single furnace, manual or single belt |
| 2 | 2x | Second base needs its own furnace built |
| 3 | 3x | Each base operates independently |
| 4+ | 4x+ | Linear scaling, transport logistics become bottleneck |

No diminishing returns on separate bases (unlike multiple furnaces at a single base). Each base's furnace operates independently with its own work queue.

### 12.5 Inter-Base Transport

Cubes must physically travel between bases. There is no teleportation or abstract resource sharing (until endgame Teleporter).

| Transport Method | Speed | Capacity | Risk |
|-----------------|-------|----------|------|
| Manual carry (player) | 5 u/s (with cube) | 1-8 cubes (by grabber tier) | Player is vulnerable while carrying |
| Worker bot convoy | 5 u/s | 4 cubes per worker | Convoy can be ambushed |
| Belt network | 2-8 u/s (by tier) | Continuous flow | Belt can be destroyed by raids |
| Teleporter pad (endgame) | Instant | 1 cube per 5s | Extremely expensive, requires power |

**Transport time formula:**
```
transportTime = distance / transportSpeed
cubesPerMinute = (capacity / transportTime) * 60
```

### 12.6 Supply Line Vulnerability

Inter-base belt networks and worker convoys create attack surfaces:

| Vulnerability | Effect of Disruption | Recovery |
|--------------|---------------------|----------|
| Belt segment destroyed | Flow stops until repaired | 1x Scrap Iron + 5s rebuild per segment |
| Worker bot destroyed | 4 cubes dropped on ground (lootable) | Must build replacement (22s + cost) |
| Road ambush | Cubes scattered, workers damaged | Manual collection, repair |
| Teleporter disabled | Instant transport lost | Requires power restoration |

Attacking supply lines is a legitimate strategy. A civ with 3 rich bases but poor inter-base logistics is fragile.

### 12.7 Base Work Queue Priority

Each base's autonomous agent schedules work in this priority order:

| Priority | Task | Condition |
|----------|------|-----------|
| 1 | Emergency repair | Any building below 25% HP |
| 2 | Furnace scheduling | Cubes in hopper, recipe selected |
| 3 | Harvest (assigned deposits) | Deposits in territory with available bots |
| 4 | Transport (to furnace) | Cubes at deposit, furnace has hopper space |
| 5 | Transport (inter-base) | Surplus cubes, other base needs materials |
| 6 | Build (queued buildings) | Materials available, build site ready |
| 7 | Patrol | Idle bots with no other work |
| 8 | Explore | Scout bots with no assigned patrol |

Bots always "phone home" to their nearest base when they have no active task. A destroyed base causes all its bots to reassign to the next nearest base, creating a temporary efficiency loss.

---

## 13. Patron Shipment Economy (Colonization Model)

> **Design Reference:** See COLONIZATION-MODEL.md for the full Colonization pivot rationale.

The primary economic relationship is between your colony and your home planet patron -- not between rival factions. You ship cubes home; your patron sends back blueprints, tech unlocks, and reinforcement units.

The otter hologram system (`otterTrade.ts`, `OtterRenderer.tsx`) serves as the home planet communication interface. Otter holograms deliver patron demands, accept shipments, and dispense rewards.

### 13.1 Patron Demand System

Each race's home planet patron periodically requests specific materials. Fulfilling demands earns favor and unlocks rewards. Ignoring demands reduces future support.

**Demand cycle:** Every 5 minutes of game time, the patron issues a new demand via otter hologram.

| Demand Tier | Cube Value Required | Deadline | Reward Tier |
|-------------|-------------------|----------|-------------|
| Minor | 5-15 value | 5 min | Tier 1 (components, repair packs) |
| Standard | 20-50 value | 8 min | Tier 2 (blueprints, tool upgrades) |
| Major | 60-150 value | 12 min | Tier 3 (reinforcement bots, unique buildings) |
| Critical | 200+ value | 15 min | Tier 4 (endgame tech, victory-path items) |

**Demand specificity by race patron:**

| Race | Patron Name | Priority Materials | Demand Flavor |
|------|-------------|-------------------|---------------|
| Reclaimers | Salvage Overseer | Scrap Iron, eWaste, Carbon | "Send salvage analysis data" |
| Volt Collective | Energy Directorate | Copper, Rare Earth, Gold | "We need power readings from these materials" |
| Signal Choir | Signal Prime | Silicon, Rare Earth, Quantum Crystal | "Communication substrate required" |
| Iron Creed | Forge Command | Titanium, Iron, Steel | "Engineering specimens for structural research" |

**Demand fulfillment formula:**
```
fulfillmentScore = sum(shippedCubeValue) / demandedValue
if fulfillmentScore >= 1.0: full reward
if fulfillmentScore >= 0.5: partial reward (50% of reward value)
if fulfillmentScore < 0.5: demand failed, patronFavor -= 10
```

### 13.2 Patron Favor

Favor determines what your patron is willing to send you.

| Favor Level | Range | Effect |
|-------------|-------|--------|
| Disfavored | -50 to -1 | No shipments. Patron threatens to cut support. |
| Neutral | 0-24 | Basic shipments only (Tier 1 rewards). |
| Trusted | 25-49 | Standard shipments (Tier 1-2 rewards). |
| Favored | 50-79 | Major shipments (Tier 1-3 rewards). |
| Essential | 80-100 | All rewards available. Independence path unlocks. |

**Favor gain/loss:**

| Action | Favor Change |
|--------|-------------|
| Fulfill minor demand | +5 |
| Fulfill standard demand | +10 |
| Fulfill major demand | +20 |
| Fulfill critical demand | +35 |
| Partial fulfillment (50%+) | Half of full reward |
| Fail demand (miss deadline) | -10 |
| Ignore demand (no cubes shipped) | -15 |
| Stop shipping entirely for 30+ min | -20 |

**Starting favor:** 15 (Neutral, close to Trusted)

### 13.3 Patron Reward Catalog

Rewards are received via otter hologram delivery -- a physical crate materializes at your base.

**Tier 1 Rewards (Neutral+):**

| Reward | Value | Notes |
|--------|-------|-------|
| Repair Pack x5 | 3 cubes | Heals 50 HP each |
| Wire Bundle x10 | 5 cubes | Saves crafting time |
| Power Cell x3 | 8 cubes | Pre-made components |
| Scout Bot (pre-built) | 10 cubes | Ready to deploy immediately |

**Tier 2 Rewards (Trusted+):**

| Reward | Value | Notes |
|--------|-------|-------|
| Diamond Drill Blueprint | 15 cubes | Unlocks Tier 2 harvester recipe |
| Belt Automation Blueprint | 12 cubes | Unlocks auto-hopper recipe |
| Copper Wall Blueprint | 10 cubes | Unlocks copper wall recipe |
| Worker Bot x2 (pre-built) | 18 cubes | Two workers, ready to assign |

**Tier 3 Rewards (Favored+):**

| Reward | Value | Notes |
|--------|-------|-------|
| Plasma Cutter Blueprint | 30 cubes | Unlocks Tier 3 harvester |
| Turret Blueprint | 25 cubes | Unlocks defense turret |
| Heavy Bot (pre-built) | 35 cubes | Single heavy, combat-ready |
| Smelter Blueprint | 20 cubes | Unlocks iron/steel production |
| Faction Unique Blueprint | 40 cubes | Race-specific unique building |

**Tier 4 Rewards (Essential):**

| Reward | Value | Notes |
|--------|-------|-------|
| Quantum Extractor Blueprint | 60 cubes | Unlocks Tier 4 harvester |
| Titan Bot (pre-built) | 80 cubes | The ultimate combat unit |
| Teleporter Blueprint | 100 cubes | Endgame logistics |
| Patron-Exclusive Blueprint | 50 cubes | Late-game tech only available through patron trade |

### 13.4 The Ship-or-Spend Tension

**Economic pressure curve:**

| Game Phase | Patron Demand Rate | Local Pressure | Optimal Ship % |
|------------|-------------------|----------------|----------------|
| Early (0-15 min) | 1 minor / 5 min | High (survival) | 10-20% |
| Mid (15-40 min) | 1 standard / 5 min | Medium (expansion) | 30-40% |
| Late (40-70 min) | 1 major / 5 min | Low (established) | 40-60% |
| Endgame (70+ min) | 1 critical / 5 min | Variable (war or peace) | 0-10% (self-sufficient) |

### 13.5 Patron Dependency Gradient

Independence is NOT a binary event. It is a **gradient** -- a natural economic transition as the colony's local production scales. There is no "declare independence" button. Robots don't revolt; they rationally shift resource allocation.

**3-Act progression:**

| Act | Colony State | Patron Shipping % | Local Production % | Patron Relationship |
|-----|-------------|-------------------|-------------------|---------------------|
| Act 1: Colonization | Dependent | 40-60% shipped home | Limited furnace recipes | Patron commands, colony obeys |
| Act 2: Factory | Transitioning | 15-30% shipped home | Local recipes replace shipments | Patron advises, colony evaluates |
| Act 3: Conquest | Self-sufficient | 0-10% shipped home | Full self-sufficiency | Patron is trade partner, not lifeline |

The patron WANTS a successful colony. Both sides benefit from continued trade. High patron favor in Act 3 unlocks patron-exclusive tech. Low patron favor reduces trade options but never results in punitive action.

### 13.6 Inter-Colony Trade

Trade between rival colonies on the machine planet is secondary to the patron economy. It uses physical cube exchange at neutral border points.

```
tradeRatio = offeredValue / requestedValue
fairTrade = tradeRatio >= 0.8 && tradeRatio <= 1.2
```

| Trade Acceptability | Ratio Range | AI Response |
|-------------------|-------------|-------------|
| Generous (player's favor) | < 0.8 | Always accept |
| Fair | 0.8 - 1.2 | Accept if opinion > -20 |
| Unfavorable (AI's favor) | 1.2 - 1.5 | Accept if opinion > +30 |
| Exploitative | > 1.5 | Reject, opinion -5 |

| Trade Action | Effect |
|-------------|--------|
| Complete fair trade | Both factions +10 opinion |
| Reject trade | -5 opinion |
| Ambush trade convoy | -50 opinion, immediate war declaration |
| Break trade agreement | -30 opinion, 10-minute trade embargo |

---

## 14. AI Economy

### 14.1 Difficulty Multipliers

| Difficulty | Harvest Rate | Build Speed | Starting Cubes | Peace Period | Aggression |
|-----------|-------------|-------------|---------------|-------------|------------|
| Peaceful | 0.5x | 0.5x | 10 | Infinite | Never attacks |
| Easy | 0.7x | 0.7x | 15 | 10 min | Low |
| Normal | 1.0x | 1.0x | 20 | 5 min | Medium |
| Hard | 1.3x | 1.2x | 30 | 3 min | High |
| Brutal | 1.6x | 1.5x | 50 | 1 min | Very High |

### 14.2 AI Build Order Targets

| Milestone | Easy | Normal | Hard | Brutal |
|-----------|------|--------|------|--------|
| First furnace operational | Start | Start | Start | Start |
| First 10 cubes stockpiled | 5 min | 3 min | 2 min | 1 min |
| First belt line | 8 min | 5 min | 3 min | 2 min |
| First outpost | 15 min | 8 min | 5 min | 3 min |
| First combat bot | 12 min | 7 min | 4 min | 2.5 min |
| First raid launched | Never | 12 min | 6 min | 3 min |
| Iron smelting | 20 min | 12 min | 8 min | 5 min |

### 14.3 AI Passive Cube Generation

Until full factory automation is implemented, AI factions generate cubes passively:

```
cubesPerMinute = baseCubeRate * difficultyMultiplier * territoryCount * factionEconomyBias

where:
  baseCubeRate = 2.0 cubes/minute
  difficultyMultiplier = from difficulty table
  territoryCount = max(1, outposts owned)
  factionEconomyBias = from civilizations.json governorBias.economy
```

**Example: Normal difficulty, Reclaimers (economy bias 1.5), 2 territories:**
```
cubesPerMinute = 2.0 * 1.0 * 2 * 1.5 = 6.0 cubes/min
```

**Critical implementation note:** Use `Math.max(1, Math.ceil(...))` to guarantee at least 1 cube per evaluation cycle. `Math.round()` produces 0 for small values.

### 14.4 AI Material Distribution

AI factions generate cubes of specific materials based on their biome and faction preferences:

| Faction | Scrap Iron | Copper | Silicon | Titanium | Other |
|---------|-----------|--------|---------|----------|-------|
| Reclaimers | 40% | 20% | 10% | 5% | 25% Rock |
| Volt Collective | 25% | 35% | 15% | 10% | 15% Carbon |
| Signal Choir | 15% | 30% | 35% | 5% | 15% Rare Earth |
| Iron Creed | 35% | 15% | 10% | 25% | 15% Rock |

### 14.5 Peace Period Mechanics

During the peace period:
- AI factions do not declare war on the player
- AI factions do not send raids against the player
- AI factions CAN fight each other (inter-AI peace is separate)
- Feral bots still spawn and attack normally
- AI builds economy, defense, and military during peace
- A countdown timer is visible on the HUD: "PEACE ENDS IN 3:00"
- When peace ends, AI re-evaluates all diplomatic stances immediately

### 14.6 AI Base Expansion

AI civs decide when to build a new base using this evaluation:

```
newBaseDesirability =
  (nearestUntappedDepositValue * 0.4) +
  (distanceFromExistingBase > 30 ? 0.3 : 0) +
  (currentBaseCapacityUtilization > 0.8 ? 0.3 : 0) -
  (militaryThreatAtLocation * 0.5) -
  (baseBuildCost / currentCubeStockpile * 0.3)
```

**New base establishment cost:**
- Outpost Core: 2x Ti + 2x Si + 4x Cu + 4x Scrap
- Furnace: FREE (one provided per outpost)
- Lightning Rod: 3x Cu + 2x Scrap
- Basic perimeter: ~10x Scrap Iron (walls)
- **Total minimum: ~30 cubes worth of materials**

**Base establishment timeline (AI, normal difficulty):**

| Time | Event |
|------|-------|
| T+0 | Outpost Core placed. Territory claimed. |
| T+30s | Furnace placed and operational. |
| T+60s | Lightning rod placed. Power online. |
| T+120s | First belt line to nearest deposit. |
| T+180s | First cubes being produced at new base. |
| T+300s | Basic wall perimeter. Base is "online." |

### 14.7 AI Patron Interaction

AI civilizations interact with their own home planet patrons using the same system:

```
aiShipmentDecision =
  if patronFavor < 25: prioritize shipments (need tech)
  if localThreat > 0.6: prioritize local use (need defense)
  if cubeStockpile > 100: ship surplus home
  default: ship (cubesPerMinute * 0.3) home, keep rest local
```

| Difficulty | AI Ship Efficiency | Patron Demand Discount |
|-----------|-------------------|----------------------|
| Peaceful | 10% shipped | 50% demand reduction |
| Easy | 20% shipped | 30% demand reduction |
| Normal | 30% shipped | No discount |
| Hard | 40% shipped | Demands arrive 20% faster |
| Brutal | 50% shipped | Demands arrive 40% faster, bonus rewards |

---

## 15. Visual Design

### 15.1 Cube Material Appearance

Each material type has a distinct PBR treatment defined in `config/cubeMaterials.json`. At a glance from 10+ meters, a player should identify material type by color and surface quality alone:

```
Rock:       Dull brown-gray, matte, no reflections
Scrap Iron: Dark rusty orange, rough, rust patches visible
Iron:       Clean silver-gray, reflective, brushed surface
Copper:     Warm orange with green patina edges, moderate shine
Silicon:    Blue-gray, glassy, faint internal glow
Titanium:   Bright silver, sharp reflections, purple-blue heat marks
Carbon:     Matte black, layered compressed texture
Rare Earth: Faint cyan glow, smooth with luminescent veins
Gold:       Warm metallic gold, high reflectivity
Quantum:    Deep purple emissive, crystalline
```

### 15.2 Seam Lines Between Placed Cubes

When cubes are placed adjacent to each other, subtle seam lines appear at the junction:
- 2px dark gap rendered via normal map depression at cube edges
- Gap color: slightly darker than average of adjacent material colors
- Different materials: gap widens to 4px, color shifts to near-black
- Seam lines are part of the cube's edge bevel (configured per material in `cubeMaterials.json`)

### 15.3 Damage Visualization

Cube damage is visible on each individual cube, providing at-a-glance wall integrity:

| HP % | Visual |
|------|--------|
| 100% | Pristine -- material as defined in PBR config |
| 75% | Light damage -- 1-2 hairline cracks in normal map |
| 50% | Moderate -- major cracks, reduced metalness (-0.2), increased roughness (+0.2) |
| 25% | Heavy -- deep cracks, fragments missing from edges, faint smoke particles |
| 0% | Destroyed -- cube shatters, rubble spawns, particle burst |

### 15.4 Wall Integrity Overlay

In "defense view" (a HUD mode) or when a wall is selected, cubes show a color overlay indicating remaining HP:
- 100-75% HP: Green tint (emissive #00ff44)
- 75-50% HP: Yellow tint (emissive #ffaa00)
- 50-25% HP: Orange tint (emissive #ff6600)
- 25-0% HP: Red tint (emissive #ff0000, pulsing)

### 15.5 Stockpile Glow

Large concentrations of valuable materials emit a faint environmental glow, visible from distance. Dual purpose: player can locate stockpiles at night, enemies can spot targets.

```
glowIntensity = sum(cubeValue) / 100
glowColor = weighted average of material glow colors in pile
glowRadius = sqrt(cubeCount) * 0.5m
```

Glow only activates when 5+ cubes of a single material type are within 2m. Point light placed at pile center with subtle pulsing (0.8-1.0 intensity oscillation, period 4 seconds).

---

## 16. Master Formula Reference

```
-- Extraction --
effectiveRate = baseExtractionRate * drillTierMultiplier * oreGrindSpeed * biomeHarvestMod * weatherHarvestMod
ticksToFill = powderCapacity / effectiveRate
secondsToFill = ticksToFill / 60

-- Compression --
shakeIntensity(t) = peakIntensity * (t / duration)^2
pressure(t) = (t / duration)^3
heat(t) = ((t - delay) / (duration - delay))^2, where delay = duration * 0.15
cubeQuality = 1.0 * damageModifier * rushModifier

-- Cube Value --
effectiveCubeValue = baseValue * quality
wallHP = hpPerCube * quality

-- Cube Physics --
cube.maxHp = material.hpPerCube * cube.quality
throwDamage = cube.weight * velocity * 5
fallDamage = cube.weight * fallHeight * 10

-- Wall Strength --
strengthAtColumn(x, z) = sum(cube.hp) for all cubes at grid column (x, z)
wallIntegrity = min(strengthAtColumn) across all columns

-- Stacking --
maxStableHeight = 8 cubes (unsupported), 16 cubes (buttressed)
baseSupportRadius = groundCubes * 0.25m

-- Wealth & Raids --
raidPoints = totalVisibleCubeValue * 0.5 + buildingCount * 2 + techLevel * 10
raidInterval = max(120, 600 - raidPoints * 2) seconds
maxRaiders = min(15, floor(raidPoints / 15))
raidScore = stockpileValue * visibilityFactor - defenseEstimate

-- AI Economy --
cubesPerMinute = baseCubeRate * difficultyMult * max(1, territories) * factionEconomyBias
cubesPerEval = max(1, ceil(cubesPerMinute * evalInterval / 60))

-- Trade --
tradeRatio = offeredTotalValue / requestedTotalValue
isFair = tradeRatio >= 0.8 && tradeRatio <= 1.2

-- Patron Shipments (Colonization Model) --
fulfillmentScore = sum(shippedCubeValue) / demandedValue
favorChange = if fulfillment >= 1.0 then +tierFavorGain, elif >= 0.5 then +tierFavorGain/2, else -10
optimalShipPercent = gamePhaseShipRate * (1 - localThreat)
aiShipDecision = if favor < 25 then prioritize_ship, elif threat > 0.6 then prioritize_local, else ship_surplus

-- Factory Throughput --
beltDeliveryTime = beltLength / beltSpeed
furnaceCycleTime = recipeTime / (1 + 0.5 * isPowered)
throughput = min(beltDeliveryRate, 1 / furnaceCycleTime)

-- Inter-Base Transport --
transportTime = distance / transportSpeed
cubesPerMinute = (capacity / transportTime) * 60
```

---

## 17. Config File References

All economy tuning values are externalized to JSON config files. Balance changes never require code changes.

### 17.1 config/mining.json

Controls extraction rates, drill tiers, ore types, and harvesting parameters.

```json
{
  "oreTypes": {
    "rock": { "hardness": 1, "grindSpeed": 1.0, "color": "#8B7355" },
    "scrap_iron": { "hardness": 2, "grindSpeed": 0.8, "color": "#8B4513" },
    "copper": { "hardness": 3, "grindSpeed": 0.6, "color": "#B87333" },
    "silicon": { "hardness": 4, "grindSpeed": 0.4, "color": "#A0A0C0" },
    "carbon": { "hardness": 3, "grindSpeed": 0.35, "color": "#333333" },
    "titanium": { "hardness": 5, "grindSpeed": 0.3, "color": "#C0C0C0" },
    "rare_earth": { "hardness": 6, "grindSpeed": 0.2, "color": "#44BBBB" },
    "gold": { "hardness": 5, "grindSpeed": 0.25, "color": "#FFD700" },
    "quantum_crystal": { "hardness": 8, "grindSpeed": 0.1, "color": "#8800FF" }
  },
  "defaultExtractionRate": 0.1,
  "drillTiers": { ... },
  "harvesting": { "defaultRange": 3.0, "defaultPowderCapacity": 60 }
}
```

### 17.2 config/furnace.json

Controls compression timing, feedback curves, cube eject physics, and furnace recipes.

```json
{
  "compression": {
    "cubeSize": 0.5,
    "configs": {
      "rock": { "powderRequired": 40, "compressionTime": 1.0 },
      "scrap_iron": { "powderRequired": 60, "compressionTime": 1.5 },
      ...
    },
    "screenShake": { "curveType": "easeInQuad", "slamMultiplier": 1.5, "slamFrames": 2 },
    "pressureGauge": { "curveType": "easeInCubic", "redZoneThreshold": 0.85 },
    "heatGauge": { "curveType": "easeInQuad", "delayPercent": 0.15 },
    "ejectPhysics": { "forwardWeight": 0.7, "upWeight": 0.3, "bounceRestitution": 0.3, "friction": 0.6 }
  }
}
```

### 17.3 config/economy.json

Controls wealth brackets, raid scaling, AI economy, trade ratios, and patron shipments.

```json
{
  "wealthBrackets": { ... },
  "raidPointFormula": {
    "cubeValueWeight": 0.5,
    "buildingWeight": 2.0,
    "techLevelWeight": 10.0,
    "raiderDivisor": 15,
    "maxRaiders": 15,
    "minIntervalSeconds": 120,
    "baseIntervalSeconds": 600,
    "intervalReductionPerPoint": 2
  },
  "aiEconomy": {
    "baseCubeRate": 2.0,
    "difficultyMultipliers": { "peaceful": 0.5, "easy": 0.7, "normal": 1.0, "hard": 1.3, "brutal": 1.6 },
    "peacePeriodSeconds": { "peaceful": null, "easy": 600, "normal": 300, "hard": 180, "brutal": 60 }
  },
  "trade": { "fairRatioMin": 0.8, "fairRatioMax": 1.2, ... },
  "patronShipments": {
    "demandCycleSeconds": 300,
    "demandTiers": { ... },
    "favor": { "startingFavor": 15, "minFavor": -50, "maxFavor": 100, ... },
    "patronPriorities": { ... }
  }
}
```

### 17.4 config/cubeMaterials.json

Controls per-material PBR treatment, gameplay stats (hardness, weight, conductivity), and visual properties. See Section 2.4 for material-level details.

### 17.5 Other Related Config Files

| Config File | Relevant Economy Data |
|------------|----------------------|
| `config/buildings.json` | Building costs, power requirements, build times |
| `config/technology.json` | Tech tree unlocks that gate drill tiers and recipes |
| `config/combat.json` | Damage values used in raid/wall balance calculations |
| `config/biomes.json` | `biomeHarvestMod` and `weatherHarvestMod` for extraction formula |
| `config/quests.json` | Otter hologram quest triggers tied to economy milestones |
