# Core Mechanics

The authoritative reference for Syntheteria's moment-to-moment gameplay systems. Covers every mechanic from grinding ore to defending cube stockpiles.

**Config files:** `config/mining.json`, `config/furnace.json`, `config/cubeMaterials.json`, `config/machineAssembly.json`, `config/buildings.json`, `config/quests.json`, `config/technology.json`

**See also (interface):** `docs/design/interface/INTERACTION.md` (radial action menus for furnace/ore/cube/belt, FPS controls, build mode), `docs/design/interface/UI.md` §5.2 (CoreLoopHUD -- powder gauge, compression bar, furnace status), `docs/design/interface/ONBOARDING.md` (how these mechanics are introduced to new players)

See also: `docs/design/gameplay/AUDIO.md` -- grinding SFX, compression sound design (hydraulic press crescendo), cube pickup/drop/place sounds, belt clank, furnace roar, machine hums.

---

## 1. Design Philosophy

Syntheteria is a first-person 4X where every resource is a physical object in the world. There are no abstract counters, no hidden inventories, no teleporting materials. Your wealth is the pile of cubes sitting outside your base, visible to everyone -- enemies included.

This creates three design pressures that drive every system in the game:

1. **Physicality.** You grind ore with your arm. You feel the screen shake when you compress powder into a cube. You carry that cube to a furnace and drop it in a hopper. The cube clanks. The furnace glows. A tool slides out. Every step is tangible.

2. **Visibility.** Because resources are physical cubes, wealth is visible. A player with 40 iron cubes has 40 iron cubes sitting somewhere in the world. Enemies can see them. Allies can see them. This transforms logistics and defense from abstract optimization into spatial, tactical decisions.

3. **Stakes.** Physical cubes can be stolen, destroyed, or lost. A raid on your stockpile is not a number going down -- it is an enemy bot grabbing your cubes and running. Walls matter because they physically block access. Belts matter because they move cubes out of danger. Every automation investment reduces exposure.

The result: a factory game where the factory IS the strategy.

---

## 2. The Core Loop

```
Grind ore deposit --> Powder fills capacity gauge
    --> Compress (screen shake, pressure/heat HUD)
    --> Physical cube ejects
    --> Grab cube --> Carry to furnace hopper
    --> Tap furnace --> Radial menu --> Select recipe
    --> Furnace processes --> Item slides out
    --> Install on bot / Place in world / Feed to next machine
```

Every step is first-person. Every intermediate product is a physical object. The loop scales from manual early-game (carry one cube at a time) to automated late-game (belts feed hoppers, bots fill blueprints, outpost networks span the map).

---

## 3. Material States

Materials exist in three physical states:

### 3.1 Raw Deposits (Organic Shapes)

Ore veins are organic geological formations -- not cubes, not icons. They protrude from terrain, jut out of mountainsides, cluster in ravines.

| Deposit Type | Visual | Where Found |
|-------------|--------|-------------|
| Rock | Gray-brown geological rubble | Everywhere on surface |
| Scrap Ore | Rusted metal sheets, bent rebar, corroded plates | Surface ruins, slag heaps |
| Copper Vein | Green-patina veins threading through rock | Cliff faces, ravine walls |
| Silicon Cluster | Glassy crystalline outcrops | Processor graveyards |
| Titanium Seam | Dark metallic bands in mountain faces | Deep terrain, mountain bases |

Visual design principles:
- Rough, procedural geometry -- never cubes at this stage
- Distinct PBR materials per type (metallic/roughness/color differentiate at a glance)
- Veins deplete visually as you harvest (shrink, crack, crumble)
- Depleted veins leave behind scarred terrain

**Depletion stages:**

| Remaining | Visual State |
|-----------|-------------|
| 100% | Full size, pristine |
| 75% | Small cracks, fragments on ground nearby |
| 50% | Visible volume reduction, deeper cracks |
| 25% | Heavily fragmented, nearly flat, dim color |
| 0% | Crumbles to dust (particle burst), scarred terrain patch remains |

**Deposit placement** is configured in `config/mining.json`:

```jsonc
// config/mining.json (excerpt)
{
  "scrap_ore": {
    "frequency": 0.4,
    "clusterSize": [3, 8],
    "yieldPerNode": [80, 150],
    "spawnZones": ["ruins", "slag_heaps", "surface"],
    "minElevation": 0,
    "maxElevation": 20,
    "visual": {
      "meshType": "organic_rubble",
      "scale": [0.8, 1.5],
      "material": "rusted_metal"
    }
  },
  "copper_vein": {
    "frequency": 0.25,
    "clusterSize": [2, 5],
    "yieldPerNode": [50, 100],
    "spawnZones": ["cliff_face", "ravine", "mountain"],
    "minElevation": 3,
    "maxElevation": 40
  },
  "silicon_cluster": {
    "frequency": 0.15,
    "clusterSize": [1, 4],
    "yieldPerNode": [30, 80],
    "spawnZones": ["processor_graveyard", "crystal_field"]
  },
  "titanium_seam": {
    "frequency": 0.08,
    "clusterSize": [1, 3],
    "yieldPerNode": [20, 60],
    "spawnZones": ["mountain_base", "deep_ravine"],
    "minElevation": 10,
    "maxElevation": 50
  }
}
```

### 3.2 Powder (Internal State)

When you grind a deposit, the material becomes powder stored internally in your bot:

- Not visible in the world -- it is inside you
- Shown on HUD as a capacity bar with material color
- Each material type has its own powder color and icon
- Bot can carry limited powder (upgradeable capacity, default 100)
- Powder is volatile -- you lose some if you take damage before compressing

### 3.3 Cubes (Physical World Objects)

Compressed powder becomes a cube -- a physical rigid body in the world:

- 0.5m per side (grabbable scale)
- Rapier rigid body with cuboid collider
- Distinct PBR material per type
- Stackable (snap-to-grid when placed)
- Interactable (click --> radial menu: `[GRAB] [STACK] [INFO] [CRUSH]`)

---

## 4. Material Types & Properties

Twelve material types (9 raw + 3 processed) with distinct strategic roles. Raw materials are defined in `config/mining.json` and `config/cubeMaterials.json`. Processed materials come from furnace smelting (`config/furnace.json`).

See `docs/design/gameplay/MATERIALS.md` for the complete economy specification including extraction rates, compression timings, furnace recipes, wall HP, and economic pacing.

### 4.1 Material Table

**Raw materials** (harvestable from ore deposits):

| Material | Rarity | Grind Speed | Powder to Fill | Compress Time | Cube HP | Wall HP | Cube Value | Carry Speed |
|----------|--------|-------------|----------------|---------------|---------|---------|------------|-------------|
| **Rock** | Abundant | 1.0x | 40 | 1.0s | 25 | 50 | 0.5 | 100% |
| **Scrap Iron** | Common | 0.8x | 60 | 1.5s | 50 | 100 | 1.0 | 85% |
| **Copper** | Moderate | 0.6x | 80 | 2.0s | 40 | 80 | 1.5 | 90% |
| **Carbon** | Uncommon | 0.35x | 90 | 2.0s | 60 | 120 | 2.5 | 92% |
| **Silicon** | Rare | 0.4x | 100 | 2.5s | 30 | 60 | 2.0 | 95% |
| **Titanium** | Very Rare | 0.3x | 120 | 3.5s | 150 | 300 | 5.0 | 70% |
| **Rare Earth** | Ultra Rare | 0.2x | 150 | 4.0s | 40 | 80 | 8.0 | 95% |
| **Gold** | Ultra Rare | 0.25x | 130 | 3.5s | 35 | 70 | 10.0 | 88% |
| **Quantum Crystal** | Legendary | 0.1x | 200 | 5.0s | 60 | 120 | 25.0 | 95% |

**Processed materials** (smelted from raw cubes -- cannot be mined directly):

| Material | Recipe | Cube HP | Wall HP | Cube Value |
|----------|--------|---------|---------|------------|
| **Iron** | 2x Scrap Iron (smelter, 15s) | 90 | 180 | 3.0 |
| **Steel** | 2x Iron + 1x Carbon (smelter, 25s) | 200 | 400 | 6.0 |
| **Advanced Alloy** | 1x Titanium + 1x Rare Earth (smelter, 30s) | 250 | 500 | 12.0 |

**Compression values confirmed against `config/furnace.json` compression configs.**

### 4.2 Material Roles

**Rock** -- The planet's base substrate. Everywhere. Cheap, fast to compress, weak. A wall of rock cubes stops a scout bot but crumbles under sustained fire. Good for bulk construction early game. Later used as insulation filler and disposable siege walls.

**Scrap Iron** -- Remnant metal found across slag heaps, ruin fields, and corroded plates. The primary structural material through early and mid game. The feedstock for smelting into Iron (2 scrap iron --> 1 iron).

**Copper** -- Found in veins threading cliff faces, identifiable by green patina. The conductivity material -- required for wiring, circuits, and power distribution. Without copper, machines have no way to connect to power or signal.

**Carbon** -- Dark fibrous material found in carbonized terrain veins. Lightweight but strong. Required for carbon fiber construction, compute cores, and the Iron-to-Steel smelting chain.

**Silicon** -- Glassy crystalline outcrops in processor graveyards. Rare and fragile but essential for electronics, signal processing, and compute. Has a distinctive translucent quality. Required for most mid-game circuit recipes.

**Titanium** -- Dark metallic bands in mountain faces and deep ravines. Extremely hard to find, requires Plasma Cutter (Tier 3) to harvest, and extremely strong. A wall of titanium is nearly impenetrable. The primary endgame structural material before Advanced Alloy.

**Rare Earth** -- Teal-tinted crystalline deposits found near ancient machine sites. Required for quantum electronics, EMP effects, and the Advanced Alloy recipe. Limited total deposits per map.

**Gold** -- Dense yellow metalite, found in small veins near ancient machine ruins. Highest economic value per raw cube. Heavy, slow to extract, irreplaceable. Often used as the cost anchor for endgame buildings.

**Quantum Crystal** -- Violet crystalline formations, the rarest material on the planet. Found only at Planet Core Access Points, guarded by Ancient Machines. Required for the Convergence Device and teleporter pad. A single Quantum Crystal cube is worth more than a dozen iron cubes.

**Iron** (Processed) -- Smelted from 2x Scrap Iron. Cleaner, stronger, required for most mid-game machine assembly. You never mine iron directly -- it must be smelted, creating a natural production bottleneck gating mid-game progression.

**Steel** (Processed) -- Smelted from 2x Iron + 1x Carbon. The best mid-game structural material. Steel walls at 200 HP/cube represent a major upgrade from iron's 90 HP/cube. Requires the smelter chain to be fully operational.

**Advanced Alloy** (Processed) -- Smelted from 1x Titanium + 1x Rare Earth. The premium endgame material. Walls of Advanced Alloy are nearly fortress-grade. Costs require access to both Titanium veins (contested mountain biomes) and Rare Earth deposits (ancient machine territory).

### 4.3 Strategic Progression

```
Early Game:  Rock (bulk fill) + Scrap Iron (structure)
Mid Game:    Iron (strong structure) + Copper (wiring) + Carbon (compute/carbon fiber)
Late Game:   Silicon (electronics) + Titanium (fortress walls) + Steel (endgame standard)
Endgame:     Rare Earth + Gold (premium buildings) + Quantum Crystal (Convergence Device)
             Advanced Alloy (ultimate walls)
```

### 4.4 PBR Visual Identity

Each material has a distinct PBR treatment in `config/cubeMaterials.json`. At a glance from 10+ meters, material type is identifiable by color and surface quality alone:

| Material | Appearance |
|----------|-----------|
| Rock | Dull brown-gray, matte, no reflections |
| Scrap Iron | Dark rusty orange, rough, rust patches visible |
| Copper | Warm orange with green patina edges, moderate shine |
| Carbon | Matte black with fibrous texture, absorbs light |
| Silicon | Blue-gray, glassy, faint internal glow |
| Titanium | Bright silver, sharp reflections, purple-blue heat marks |
| Rare Earth | Teal-cyan with inner luminescence |
| Gold | High-gloss warm yellow, mirror reflective |
| Quantum Crystal | Deep violet, subsurface scatter, pulsing emission |
| Iron | Clean silver-gray, reflective, brushed surface |
| Steel | Darker silver with directional tool marks, higher roughness at edges |
| Advanced Alloy | Platinum-silver, iridescent micro-faceting |

### 4.5 Cube HP & Damage

Each cube has individual HP based on its material hardness:

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

Damage states (visual):

| HP Range | Visual |
|----------|--------|
| 100% | Pristine -- material as defined in PBR config |
| 75% | Light damage -- 1-2 hairline cracks in normal map |
| 50% | Moderate -- major cracks, reduced metalness (-0.2), increased roughness (+0.2) |
| 25% | Heavy -- deep cracks, fragments missing, faint smoke particles |
| 0% | Destroyed -- cube shatters, rubble spawns, particle burst |

---

## 5. Harvesting & Grinding

### 5.1 Harvester Tool

Your first and only tool at game start. Not equippable from a menu -- it IS your arm.

**Mechanic:**
1. Walk up to an ore deposit (within 2m range)
2. Crosshair changes to grinding indicator when aimed at a harvestable deposit
3. Hold primary action -- grinding animation + particles
4. Powder particles spiral from deposit into your bot (vacuum effect)
5. Deposit visually depletes (cracks, shrinks, fragments break off)
6. HUD capacity bar fills with material-colored powder
7. When deposit is fully mined, it crumbles and disappears

### 5.2 Harvester Tiers

Unlocked through the tech tree / furnace recipes:

| Tier | Name | Speed | Ore Types | Unlock Cost |
|------|------|-------|-----------|-------------|
| 1 | Salvage Grinder | 1x | Rock, Scrap only | Starting |
| 2 | Diamond Drill | 2x | Rock, Scrap, Copper, Carbon | 4x Scrap Cubes |
| 3 | Plasma Cutter | 3x | All common ores | 2x Copper + 1x Silicon |
| 4 | Quantum Extractor | 5x | All ores including Titanium | 1x Titanium + 1x Rare Earth |

### 5.3 HUD: Powder Capacity Gauge

```
Bottom-center HUD:

+------------------------------+
|  HARVESTER T1                |
|  %%%%%%%%______  52/100      |  <-- Powder capacity bar
|  # SCRAP ORE                 |  <-- Current material type
+------------------------------+
```

- Bar color matches material type
- Pulses when near full capacity
- Shows "COMPRESS READY" when above minimum threshold for current material

---

## 6. Compression

Not a separate tool -- it is an intrinsic ability. Compression transforms internal powder into a physical cube ejected into the world.

### 6.1 Mechanic

1. When carrying enough powder (>= material's compression threshold), Compress becomes available
2. Press Compress action (long-press or dedicated button)
3. **Screen shake** -- intensity increases over ~2 seconds
4. **HUD pressure/heat gauges** spike -- valves animate, warning lights flash
5. **Sound** -- hydraulic press sound, metallic groaning, pressure hiss
6. Bot bends forward slightly (first-person camera dips)
7. A **cube ejects** from the bot onto the ground in front of you
8. Powder capacity resets to zero for that material

### 6.2 Compression Quality

- Compress with exactly the right amount --> clean cube (quality 1.0)
- Compress with excess --> cube + leftover powder stays
- Take damage during compression --> cube quality degrades (cracked cube, worth less)

### 6.3 Compression Thresholds by Material

| Material | Powder Needed |
|----------|--------------|
| Rock | 40 |
| Scrap Iron | 60 |
| Copper | 80 |
| Silicon | 100 |
| Titanium | 120 |

### 6.4 HUD: Compression Overlay

Temporary overlay during compression:

```
+-------------------------------------+
|                                     |
|    PRESSURE %%%%%%%%%%__ 85%        |
|    HEAT     %%%%%%%%____ 62%        |
|                                     |
|    # COMPRESSING SCRAP ORE...       |
|                                     |
+-------------------------------------+
```

- Pressure bar fills in ~2 seconds
- Heat bar fills slightly behind pressure
- Both must reach 100% for a clean cube
- Camera shake intensity matches pressure
- Edge heat distortion (post-processing) matches heat
- Sound: hydraulic press crescendo

### 6.5 Compression Particle Effects

| Material | Particle Effect |
|----------|----------------|
| Rock | Brown-gray dust cloud, settles quickly |
| Scrap Iron | Orange-brown sparks + rust dust |
| Copper | Warm orange sparks with green-tinted edges |
| Silicon | Blue-white crystalline sparkle, slow fade |
| Titanium | Bright white flash + purple-blue afterglow sparks |

---

## 7. Cube Physics

### 7.1 Cubes as Rigid Bodies

Every cube in the world is a Rapier rigid body:

- **Dynamic** when loose (falls, rolls, can be pushed)
- **KinematicPosition** when placed on grid (locked, immovable by physics)
- Collider: `cuboid(0.25, 0.25, 0.25)` -- half-extents for 0.5m cube
- Friction: 0.8 (cubes do not slide easily)
- Restitution: 0.1 (minimal bounce -- heavy industrial materials)
- Mass: derived from `material.weight`

### 7.2 Snap Grid

Cubes align to a global 0.5m snap grid when placed. The grid is invisible until the player enters placement mode.

```
Snap rules:
- Cube center within 0.3m of a grid point --> snap to that grid point
- Adjacent to an already-placed cube --> snap to the neighbor face
- On flat ground (slope < 15 degrees) --> snap to ground-level grid
- On steep terrain --> no snap (cube is loose, rolls downhill)
```

Ghost preview in placement mode:
- Semi-transparent cube at the snap position
- Green tint when placement is valid
- Red tint when blocked (overlapping another collider)
- Wireframe grid lines on adjacent faces showing expansion options
- Material-specific ghost appearance

### 7.3 Stacking

Cubes stack vertically. Gravity holds them in place. Stacking is the fundamental building action.

```
Stacking physics:
- Max stable height: 8 cubes (4m) for unsupported column
- Buttressed columns (adjacent stacks providing lateral support): up to 16 cubes (8m)
- Center of mass: calculated per column, recalculated when cubes added/removed
- Stability threshold: center of mass must remain within base footprint
- Material weight affects stability: heavy cubes (titanium, iron) need wider bases
```

### 7.4 Toppling

Towers topple when their center of mass exceeds the base support footprint. You cannot build a single-column tower 20 cubes high -- you need pyramidal or buttressed designs.

```
Toppling calculation (per column, per physics tick):

  centerOfMassX = sum(cube.weight * cube.gridX) / sum(cube.weight)
  centerOfMassZ = sum(cube.weight * cube.gridZ) / sum(cube.weight)

  baseSupportRadius = (number of ground-level cubes in connected group) * 0.25m

  if distance(centerOfMass.xz, baseCenter.xz) > baseSupportRadius:
    trigger topple event
    convert top N cubes from kinematic --> dynamic (they fall with physics)
    apply random angular impulse (tumbling)
    each cube takes fall damage: fallDamage = cube.weight * fallHeight * 10
```

Toppling is dramatic -- a tower of iron cubes collapsing creates a cascade of physics objects clanking and tumbling. Nearby entities take crush damage.

### 7.5 Material Mixing

Walls and structures CAN mix materials. A rock foundation with iron upper walls is valid and strategically optimal (cheap base, strong where it matters).

Visual consequences of mixing:
- Seam lines between different materials are more pronounced (thicker normal map gap)
- Color contrast makes material boundaries obvious
- Material transitions render a thin dark gap line (0.5px normal map groove)
- No structural penalty for mixing

### 7.6 Cubes as Currency

Cubes ARE the economy. There is no abstract resource counter. Your wealth is the physical pile of cubes sitting outside your base. Enemies can **raid** your stockpiles. You can **steal** enemy cubes.

Implications:
- You can see how wealthy an enemy is (count their cube piles)
- Raiding is meaningful -- you physically grab their cubes and run
- Defense matters -- walls protect cube stockpiles
- Belt logistics matter -- automated transport reduces theft risk

---

## 8. Grabber Tool

Your second tool -- built from your first few cubes at the furnace.

### 8.1 Mechanic

1. Aim crosshair at a cube (or any grabbable physics object)
2. Press grab action -- magnetic beam visual connects bot hand to cube
3. Cube levitates and follows your movement (held ~1m in front at chest height)
4. Walk to destination
5. Release -- cube drops with physics (or snaps to grid near a valid slot)
6. Can throw cubes (release while moving) -- combat potential

### 8.2 Grabber Tiers

| Tier | Range | Carry Weight | Special |
|------|-------|-------------|---------|
| 1 | 3m | 1 cube | Basic magnet |
| 2 | 5m | 2 cubes | Stronger magnet |
| 3 | 8m | 4 cubes | Tractor beam, can pull distant cubes |
| 4 | 12m | 8 cubes | Gravity manipulation, can grab enemy cubes |

### 8.3 Carry Mechanics

```
Movement speed while carrying:
  speed = baseSpeed * min(carrySpeedMultiplier for each held cube)

  Example: Carrying 2 iron cubes (0.75 each)
  speed = baseSpeed * 0.75

Multiple cubes arrangement:
  1 cube:   held centered, 1m in front
  2 cubes:  held side by side, 1m in front
  3-4 cubes: held in 2x2 grid, 1.2m in front
  5-8 cubes: held in 2x2x2 cluster, 1.5m in front (partially obscures view)
```

Carrying large loads is deliberately awkward -- cubes block part of the first-person view, movement is slower, and the bot cannot use other tools while carrying. This pressure drives investment in automation.

### 8.4 Placement Flow

```
1. Grab a cube with the Grabber tool (aim + grab action)
2. Cube levitates in front of the bot (~1m forward, chest height)
3. Walk to the build site
4. Aim at a surface (ground, wall face, top of existing cube)
5. Ghost preview appears at nearest valid snap position
6. Click/tap to place --> cube transitions from held --> grid-locked
   - Cube rigid body changes from dynamic to kinematicPosition
   - Snap sound plays (metallic clank, pitch varies by material)
   - Seam lines appear between adjacent cubes
7. Or throw (release while moving) --> cube launches as projectile
   - Throw velocity = bot movement velocity * 2.0
   - Thrown cubes deal impact damage: cube.weight * velocity * 5
```

### 8.5 HUD: Grabber Indicator

```
Bottom-right HUD:

+----------------+
|  GRABBER T1    |
|  HOLDING:      |
|  # SCRAP CUBE  |
|  Quality: 100% |
|  [RELEASE: R]  |
+----------------+
```

---

## 9. Furnace & Processing

### 9.1 Starting Machine

Every civilization starts with exactly one machine at their spawn point: a furnace. In GDD-006's model, the starting furnace is **damaged** -- missing cubes from its structure. The player must harvest and place cubes to repair it before it activates.

**Physical design:**
- ~2m tall, industrial look, glowing intake at top
- Front face has visible controls (buttons, gauges, display panel)
- Chimney/exhaust vents -- emit particle smoke when active
- Output slot at bottom-front -- items physically slide out
- Status lights: red (empty), yellow (processing), green (ready)

### 9.2 Interaction

1. **Drop cubes into hopper** -- walk up, aim at hopper opening, release grabbed cube
   - Cube falls into hopper with physics (clanking sound)
   - Hopper shows what is inside (visible cubes, or inventory count on display)

2. **Tap furnace front** --> contextual radial menu appears
   - Menu options depend on what cubes are in the hopper
   - Greyed-out options show what additional materials are needed

3. **Processing** -- select a recipe:
   - Furnace animates (glow intensifies, sparks, smoke)
   - Takes real time (5-30 seconds depending on recipe)
   - Progress bar on the furnace display panel

4. **Output** -- finished item slides out the front slot
   - Physical object on the ground
   - Grab it, install it (tap your own bot --> upgrade menu)

### 9.3 Furnace Recipes

Defined in `config/furnace.json`. Organized by unlock tier:

**Tier 1 -- Salvage (Starting)**

| Recipe | Input | Time | Output |
|--------|-------|------|--------|
| Grabber Arm | 3 Scrap | 10s | Grabber T1 |
| Diamond Drill Bit | 4 Scrap | 15s | Harvester T2 |
| Scanner Lens | 2 Scrap | 8s | Scanner T1 |
| Basic Power Cell | 5 Scrap | 20s | Power Cell |
| Repair Patch | 2 Scrap | 5s | Consumable Repair |

**Tier 2 -- Copper (requires Harvester T2)**

| Recipe | Input | Time | Output |
|--------|-------|------|--------|
| Copper Wire Bundle | 2 Copper | 12s | Wire Bundle |
| Conveyor Belt Segment | 3 Scrap + 1 Copper | 15s | Belt Segment |
| Auto-Hopper | 4 Scrap + 2 Copper | 20s | Auto-Hopper |
| Grabber Mk2 | 3 Copper + 2 Scrap | 15s | Grabber T2 |

**Tier 3 -- Silicon (requires Harvester T2)**

| Recipe | Input | Time | Output |
|--------|-------|------|--------|
| Circuit Board | 2 Silicon + 1 Copper | 25s | Circuit Board |
| Signal Relay | 1 Silicon + 2 Copper + 2 Scrap | 20s | Signal Relay |
| Battle Bot Chassis | 6 Scrap + 2 Copper + 1 Silicon | 30s | Bot Chassis |

**Tier 4 -- Titanium (requires Harvester T3)**

| Recipe | Input | Time | Output |
|--------|-------|------|--------|
| Plasma Cutter | 2 Titanium + 1 Silicon + 2 Copper | 30s | Harvester T3 |
| Defense Turret | 3 Titanium + 2 Silicon + 3 Copper | 40s | Turret |
| Wall Segment | 4 Titanium + 4 Scrap | 25s | Prefab Wall |
| Outpost Core | 2 Titanium + 2 Silicon + 4 Copper + 4 Scrap | 60s | Outpost |

### 9.4 Iron Smelting

Iron is a processed material -- you never mine it directly. Recipe:

```
2 Scrap Iron cubes --> 1 Iron cube (via Smelter, requires power)
```

This bottleneck gates mid-game progression. The Smelter is a higher-tier furnace that requires power connection.

---

## 10. Machine Assembly

Machines are not items you craft and place. Machines are assembled by placing specific cube types in specific spatial patterns in the world. When the pattern is complete, the cubes merge into a functional machine entity.

### 10.1 Assembly Patterns

Defined in `config/machineAssembly.json`. Examples:

**Furnace** (2x2x2):
- Layer 0: 4 iron cubes (2x2 base)
- Layer 1: 3 rock + 1 copper (insulation + wiring)
- Total: 4 iron, 3 rock, 1 copper
- Power required: No

**Lightning Rod** (1x1x6):
- Layers 0-3: iron (structural column)
- Layers 4-5: copper (conductor tip)
- Total: 4 iron, 2 copper
- Power output: yes, capture radius 8m

**Smelter** (2x2x3):
- Layer 0: 4 iron, Layer 1: 2 rock + 2 copper, Layer 2: 4 iron
- Total: 8 iron, 2 rock, 2 copper
- Power required: Yes

**Fabrication Unit** (3x2x2):
- Total: 8 iron, 2 copper, 2 silicon
- Power required: Yes

**Outpost Core** (3x3x3):
- Layer 0: 8 iron + 1 copper (9 cubes, iron ring with copper center)
- Layer 1: 4 copper + 1 silicon (cross pattern with gaps)
- Layer 2: 4 iron + 1 silicon (plus pattern)
- Total: 12 iron, 5 copper, 2 silicon
- Claim radius: 20m, power required: Yes

**Defense Turret** (2x2x2):
- Layer 0: 4 titanium, Layer 1: 2 silicon + 2 copper
- Total: 4 titanium, 2 silicon, 2 copper
- Attack range: 12m, damage: 25, rate: 1.5/s, power required: Yes

### 10.2 Assembly Process

```
1. Player places cubes matching a machine pattern
2. After each cube placement, system checks for complete patterns
3. Pattern matching:
   a. Check all 4 rotations (0, 90, 180, 270 degrees around Y)
   b. Check if all required cube types are present at correct relative positions
   c. null entries in the pattern are empty spaces (must be unoccupied)
4. If pattern matches:
   a. Activation animation (0.5s):
      - Cubes glow with emissive pulse
      - Particle burst in machine's theme color
      - Camera shake (subtle, 0.1 intensity)
      - Activation sound (metallic assembly, hydraulic hiss)
   b. Individual cube entities destroyed
   c. Single machine entity spawned at pattern center
   d. Machine mesh replaces cube geometry
   e. Machine becomes functional with hopper, output, power connection
```

### 10.3 Disassembly

Machines can be dismantled to recover cubes:

```
1. Click/tap machine --> radial menu --> [DISMANTLE]
2. Confirmation prompt: "Dismantle Furnace? This takes 10 seconds."
3. Dismantle timer begins (visible progress bar)
4. On completion:
   - Machine entity destroyed
   - Cubes returned at original pattern positions
   - Cube quality reduced by wear: quality = original_quality * 0.85
   - Cubes are loose (dynamic) and must be grabbed/placed
```

Disassembly enables nomadic play -- tear down your base, carry the cubes, rebuild elsewhere.

---

## 11. Belt Transport

Belts are the primary cube automation system. A belt segment physically moves cubes along its surface without bot intervention.

### 11.1 Belt Placement

```
1. Craft belt segment (furnace: 3 scrap iron + 1 copper --> 1 belt segment)
2. Enter build mode --> select Belt
3. Aim at ground --> ghost preview of belt segment
4. Click to place --> belt snaps to 0.5m grid
5. Adjacent belt segments auto-connect (arrow shows direction)
6. Belt direction: set by player facing direction when placed
```

### 11.2 Belt Operation

- One cube per belt segment at a time
- Speed tiers: 1.0 cubes/sec (basic), 2.0 (fast), 4.0 (express)
- Cubes placed on belt entrance: cube mesh visibly slides along belt surface
- At belt end: cube drops off (dynamic physics) or enters connected hopper
- Junction types: straight, 90-degree turn, T-splitter, merger
- Underground belt: tunnels under other belts for crossing paths

### 11.3 Back-Pressure

When a belt's output is blocked (destination full, no connection), cubes queue on the belt. If all segments are occupied, the belt stops accepting new cubes at its entrance. This creates natural flow control without explicit logic.

### 11.4 Belt-to-Machine Connection

Belts connect to machine hoppers via Auto-Hoppers (Tier 2 recipe). Cubes arriving at a belt end adjacent to an Auto-Hopper automatically feed into the machine.

---

## 12. Building & Walls

### 12.1 Walls Are Emergent

There is no "wall" entity type. There is no "build wall" button. Walls are emergent structures created by stacking cubes in a line. A wall is defined by its geometry:

```
Wall recognition heuristic:
  For each group of contiguous placed cubes:
    if width >= 2 AND height >= 2:
      classify as "wall segment"
      register in defense graph for AI pathfinding
      enable wall integrity overlay when selected
```

Wall design is freeform. Build L-shapes, zigzags, star forts, layered walls, walls with embedded copper wiring, walls with silicon windows. The system does not constrain; it recognizes patterns.

### 12.2 Manual vs. Blueprint Building

**Manual:** Walk up, grab cubes one at a time from stockpile, carry to build site, place. Slow but precise. Good for small repairs, custom shapes, early game.

**Blueprint mode:**
```
1. Open build menu --> select "Blueprint" --> select "Wall"
2. First-person view shifts to projection overlay
3. Aim at ground to set wall start point --> click
4. Drag to set wall end point --> click
5. Set wall height (scroll or number key) --> confirm
6. Ghost cubes show planned outline
7. Assign a bot (or self) to the blueprint
8. Bot carries cubes from nearest stockpile and fills blueprint
9. Prioritizes bottom row first, then each subsequent row (structural stability)
10. Unfilled positions show as wireframe outlines
```

### 12.3 Wall Strength

Wall strength is the sum of individual cube HPs along any cross-section:

```
Wall strength at a point:
  strengthAtColumn(x, z) = sum of cube.hp for all cubes at grid column (x, z)

Total wall integrity:
  wallIntegrity = min(strengthAtColumn for each column in wall)
  // The wall is only as strong as its weakest column
```

Strategic implications:
- 3-cube-thick rock wall (3 * 50 = 150 HP/column) < single iron wall (180 HP/column)
- Rock wall is cheaper and wider, potentially absorbing more area damage
- Mixed rock core + iron facing = 50 + 180 = 230 HP at moderate cost

### 12.4 Breach Mechanics

```
Attack targeting (AI):
1. Scan wall for lowest-HP cube at ground level
2. Concentrate fire on that cube
3. When destroyed --> hole in wall (1 cube gap)
4. Column stability check:
   - Cubes above may topple into gap
   - Or hold if adjacent columns provide lateral support
5. Once a hole exists, melee attackers path through it
6. Ranged attackers continue widening the breach

Breach cascade:
  Destroy ground-level cube --> remove support above
  --> Column stability check
  --> Stable: cubes above hold (bridging)
  --> Unstable: topple event (cubes fall, blocking gap with rubble)
  --> Rubble slows movement but does not block it
```

### 12.5 Rubble

Destroyed cubes generate rubble -- not clean disappearance:

```
On cube destruction:
  70% chance: spawn 1 damaged cube (quality 0.3-0.6)
  30% chance: nothing (material lost to damage)

Damaged cubes:
  - Reduced HP (quality * maxHp)
  - Visual: heavy crack overlay, reduced metalness, increased roughness
  - Can be re-compressed in furnace to recover ~50%
  - Can be placed as-is (weaker but functional)
```

Rubble is strategic: salvage after sieges, slows movement through breaches, throwable in desperation.

### 12.6 Doorways

Doorways are gaps intentionally left in walls. No special door entity initially.

| Pattern | Size | Use |
|---------|------|-----|
| Basic | 1 wide, 2 tall | Bot/player passage |
| Wide | 2 wide, 2 tall | Vehicle access |
| Arch | 2 wide, 3 tall with cap | Decorative |

Future: Door mechanism recipe (2 iron + 1 copper) with proximity sensor (copper conductivity) and lockable circuit board key (silicon + copper).

### 12.7 Wall Integrity Overlay

In defense view or when a wall is selected, cubes show HP as color overlays:

| HP Range | Overlay |
|----------|---------|
| 100-75% | Green tint (emissive #00ff44, intensity 0.1) |
| 75-50% | Yellow tint (emissive #ffaa00, intensity 0.15) |
| 50-25% | Orange tint (emissive #ff6600, intensity 0.2) |
| 25-0% | Red tint, pulsing (emissive #ff0000, intensity 0.25) |

---

## 13. Stockpile & Territory Strategy

### 13.1 Stockpiles Are Visible Wealth

No hidden inventory. Every cube you own is physically present in the world and visible to any entity with line of sight.

```
Stockpile value calculation:
  stockpileValue(position, radius) =
    sum of (cube.material.rarity_weight * cube.quality)
    for all cubes within radius

  Rarity weights:
    rock: 1, scrap_iron: 2, iron: 4, copper: 5, silicon: 8, titanium: 12
```

### 13.2 Stockpile Aggro

Large stockpiles attract raiders. Enemy AI evaluates raid worthiness:

```
Raid attractiveness:
  raidScore = stockpileValue * visibilityFactor - defenseEstimate

  visibilityFactor:
    1.0  open ground (no walls)
    0.5  partially enclosed (walls on 2+ sides)
    0.2  fully enclosed (walls on all sides + roof)
    0.0  inside active outpost with turrets

  defenseEstimate:
    sum of (wall.hp + turret.dps * 30 + patrol_bot.combat_rating)
    for all defenses within 10m

  If raidScore > raid_threshold: AI assembles raid party
```

### 13.3 Storage Strategy

| Strategy | Access Speed | Protection | Best For |
|----------|-------------|------------|----------|
| Open stockpile | Fast | None (visibility 1.0) | Active build sites, low-value rock |
| Walled storage | Medium | Moderate (visibility 0.5) | Medium-value materials |
| Vault (enclosed + door) | Slow | High (visibility 0.2) | Silicon, titanium, strategic reserves |

### 13.4 Stockpile Glow

Large concentrations of valuable materials emit environmental glow visible from distance:

```
Glow activation: 5+ cubes of a single material within 2m
glowIntensity = sum(cubeValue) / 100
glowRadius = sqrt(cubeCount) * 0.5m

Material glow colors:
  Rock:       No glow
  Scrap Iron: Warm orange (#cc8844, 0.05/cube)
  Iron:       Cool silver (#aabbcc, 0.08/cube)
  Copper:     Warm amber (#ffaa44, 0.12/cube)
  Silicon:    Cold blue (#8899cc, 0.2/cube)
  Titanium:   Bright white-blue (#ccddff, 0.3/cube)

Point light at pile center, 0.8-1.0 intensity oscillation (period 4s)
```

### 13.5 Territory via Outposts

Territory is claimed by assembling an outpost core (12 iron + 5 copper + 2 silicon).

```
Territory rules:
- Outpost claim radius: 20m (40 cube-lengths)
- Buildings and blueprints can only be placed within claimed territory
- Multiple outposts extend territory (circles overlap)
- Outposts require power to maintain claim
  - Unpowered: claim radius shrinks by 1m per minute
  - At radius 0: territory unclaimed, buildings become neutral
- Contested territory: overlapping claims from different factions
  - No building allowed in contested zones
  - Defender combat bonus: +10% damage in own territory
  - Attacker can "flip" territory by destroying the outpost
- Outpost HP: combined cube HP (12*180 + 5*80 + 2*60 = 2,680 HP)
- On destruction: rubble scatters, territory unclaimed, must re-assemble
```

### 13.6 Territory Expansion Cost

```
Minimum (outpost only): 12 iron + 5 copper + 2 silicon
Recommended:
  + 4 iron + 2 copper (lightning rod)
  + 4 iron + 3 rock + 1 copper (furnace)
  + ~40 cubes for perimeter walls
Total: ~70 cubes for a basic defended expansion
```

---

## 14. Power System

### 14.1 Lightning Rods

The machine planet draws power from its perpetual storm via lightning rods:
- Lightning rods are your primary power infrastructure
- Built by stacking cubes in the lightning rod pattern (4 iron + 2 copper, vertical)
- More rods = more power capacity
- Inside claimed territory, rods protect units from random lightning strikes

### 14.2 Power Wiring

Power does not teleport. Copper cubes placed in a line on the ground between a lightning rod base and a machine create a physical wire. Each copper cube extends the power connection. When the chain is complete, the machine powers up.

- Wire = chain of copper cubes with `WiredTo` relation linking each to the next
- Wire conductivity: copper's conductivity (1.0) enables full power transfer
- Other materials have lower conductivity and are insufficient for primary wiring

### 14.3 Outside Claimed Territory

- No lightning rod protection
- Units are vulnerable to random lightning strikes (damage)
- Must plan expeditions with this hazard in mind

---

## 15. Signal & Compute Network

### 15.1 Signal Range

Signal range determines whether you can reach a unit. Signal relays (1 silicon + 2 copper + 2 scrap) extend your network.

| Situation | Can Reach? | Can Manage? | Result |
|-----------|------------|-------------|--------|
| Normal | Yes | Yes | Full control |
| Compute shortage | Yes | No | Unit vulnerable to hack |
| Signal loss | No | N/A | Unit follows last order |
| Both lost | No | No | Unit isolated and vulnerable |

### 15.2 Compute

Compute is the cognitive resource for managing your distributed bot network. Circuit boards (2 silicon + 1 copper) enable compute capacity. Without enough compute, units become vulnerable to enemy hacking.

---

## 16. Bot Automation

### 16.1 Carry Routes

Bots can be assigned repetitive carry tasks:

```
1. Click bot --> radial menu --> [ORDER]
2. Select "Carry Route"
3. Click source (stockpile, belt output, deposit)
4. Click destination (hopper, build site, stockpile)
5. Bot loops: go to source --> grab cube(s) --> carry to destination --> drop --> repeat
```

Bot carry AI uses Yuka GoalEvaluators:
- `CarryEvaluator`: desirability 0.8 when route assigned, source has cubes, destination needs cubes
- `ArriveBehavior` for precision pickup
- `FollowPathBehavior` for route navigation
- `ObstacleAvoidanceBehavior` for wall/bot avoidance

### 16.2 Cube Priority Marking

Cubes can be marked for specific uses, preventing wrong-task grabbing:

| Mark | Icon | Color |
|------|------|-------|
| BUILDING | Hammer | Green |
| FURNACE | Flame | Orange |
| EXPORT | Arrow | Blue |
| DEFENSE | Shield | Red |

Bots with carry routes respect priorities. Unmarked cubes are available for any task.

---

## 17. Tool Unlock Sequence

```
Game Start
  +-- Harvester Tier 1 (starting)
        +-- First Scrap Cubes --> Furnace assembles:
              +-- Grabber Tier 1
              +-- Harvester Tier 2
              +-- Scanner (see deposit types at range)
                    +-- More diverse cubes --> Furnace upgrades:
                          +-- Grabber Tier 2
                          +-- Basic Belt (conveyor)
                          +-- Hopper (auto-feed furnace)
                          +-- Power Cell (enables machines)
                                +-- Powered machines --> Advanced assembly:
                                      +-- Battle Bot chassis
                                      +-- Wall segments
                                      +-- Turret base
                                      +-- Signal Relay
                                      +-- Outpost Core (territory claim)
```

---

## 18. Otter Holograms as Quest Guides

Otters appear as holographic projections near key progression points. They guide the player through the tech tree with contextual hints.

### 18.1 Quest Flow

Defined in `config/quests.json`. Progression chain:

1. **First Cube** (game_start) -- Otter near starting deposit: "See that scrap pile? Hold [ACTION] to grind, then [COMPRESS]."
2. **First Craft** (after first cube) -- Otter near furnace: "Grab the cube, carry it to the furnace, drop it in the hopper."
3. **Get Grabber** (after first craft) -- "Install the Grabber via [TAB]. Stack cubes near the furnace."
4. **Explore Copper** (after grabber installed) -- Otter points toward copper: "Green streaks on the cliff. Make 4 scrap cubes for a Diamond Drill."
5. **First Belt** (after Harvester T2) -- "Craft a Belt Segment. Place belts from deposit to furnace."
6. **Defense** (after first belt) -- "Other machines are watching your cubes. Build walls or a battle bot."

### 18.2 Otter Behavior

- Holographic shader (shimmer, translucent)
- Wave, point in directions, small animations
- Speech bubbles appear when player is within range
- Relocate to next quest-relevant location after each objective
- Tap otter --> `[TALK] [REPEAT HINT] [DISMISS]`
- Never block the player -- translucent, no collider

---

## 19. AI Civilizations & Cubes

AI governors manage physical cube logistics identically to the player:

- AI bots harvest deposits --> compress cubes --> carry to their machines
- AI cube stockpiles are visible and raidable
- AI defenses protect cube reserves
- Trade between civs = physically exchanging cubes at borders
- Destroyed bots drop cubes as loot

---

## 20. Combat Over Cubes

The primary strategic resource is physical cubes. Combat revolves around them:

- **Raiding:** Send bots to enemy bases to physically grab cubes and flee
- **Defense:** Walls + turrets protect stockpiles; patrol bots intercept raiders
- **Improvised combat:** Throw cubes at enemies (damage = weight * velocity * 5)
- **Loot:** Destroyed bots drop cubes
- **Attrition:** Destroying enemy walls and machines reduces them to salvageable rubble

---

## 21. Koota ECS Traits

```typescript
// Core cube traits
MaterialCube    // material, quality, hp, maxHp, gridPosition, placed, damaged, priorityMark
PowderStorage   // material, amount, capacity
CompressionState // active, progress, pressure, heat
OreDeposit      // oreType, currentYield, maxYield, depletionVisual

// Tools
Harvester       // tier, speed, mineableTypes
Grabber         // tier, range, maxCarry
Scanner         // tier, range

// Machines
Hopper          // cubeSlots
Processor       // processorType, currentRecipe, progress, speed, active
Machine         // machineType, tier, powered, active, wearLevel

// Structures
WallSegment     // cubeCount, totalHp, weakestColumnHp, width, height
Blueprint       // blueprintType, gridStart, gridEnd, height, preferredMaterial, progress, total
AssemblyCandidate // machineType, progress, total, rotation, anchorGrid
Stockpile       // totalValue, cubeCount, visibilityFactor, raidAttractiveness

// Automation
CarryRoute      // sourceEntity, destinationEntity, materialFilter, active

// Relations
HeldBy          // cube --> bot holding it (exclusive)
InsideOf        // cube --> machine hopper (exclusive)
OnBelt          // cube --> belt segment (exclusive)
OutputOf        // item --> machine that made it (exclusive)
AssignedTo      // bot --> blueprint
PoweredBy       // machine --> lightning rod (via copper wire)
WiredTo         // copper cube --> copper cube (wire chain)
```

---

## 22. Open Questions

- **Cube weight vs. throw distance trade-off:** Should heavier cubes deal more damage but fly shorter, or use a flat throw arc? Current formula (weight * velocity * 5) may need playtesting.
- **Compression interruption:** If hit mid-compression, should the cube be lost entirely or ejected at reduced quality? Current design says reduced quality.
- **Iron availability timing:** 2:1 scrap-to-iron conversion plus Smelter power requirement may create too harsh a mid-game gate. Ratio may need tuning.
- **Stockpile glow visibility:** Does glow make it too easy for AI to find player stockpiles? May need difficulty-based scaling.
- **Machine disassembly in combat:** Should disassembly be interruptible by taking damage? Prevents exploit of dismantling under fire to deny enemy the machine.
- **Maximum belt network complexity:** At what scale does physical cube simulation on belts become a performance concern? May need LOD for distant belt segments.
- **Door mechanisms:** When should door recipes unlock? Too early trivializes wall defense; too late makes walled storage impractical.
- **Rock as distinct material vs. simplified materials list:** GDD-004 used 6 types (scrap, copper, silicon, titanium, rare earth, carbon). GDD-006 replaced with 6 types (rock, scrap iron, iron, copper, silicon, titanium). The current set is confirmed.
