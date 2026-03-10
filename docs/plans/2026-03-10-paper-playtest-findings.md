# Paper Playtest Findings — 2026-03-10

## Methodology

Walked through the complete core loop and 4X experience mentally, tracing
every system call, event emission, HUD update, and player feedback point.
Analyzed 99 game systems, 38 config files, and the event/HUD architecture.

---

## 1. CRITICAL GAPS (Game-Breaking)

### 1.1 Zero System Integration — "Island Systems" Problem

**Every system is an isolated island.** The event bus (`eventBus.ts`) defines
10 typed events, but only `notificationSystem.ts` imports it. Zero systems
emit events. Zero systems listen for events from other systems.

**Impact:** The core loop cannot function. Harvesting completes but nothing
updates the HUD powder gauge. Compression spawns a `CompressEvent` internally
but nothing creates a physical cube from it. Furnace smelting completes but
no output cube materializes.

**Fix Required:** `gameLoopBridge.ts` — a coordination system that:
- Subscribes to harvest ticks → updates HUD powderGauge
- Listens for CompressEvent → calls grabber.registerCube() to spawn cube
- Listens for SmeltingResult → spawns output entity
- Bridges all system outputs to event bus emissions
- Updates achievement/progression systems on milestones

### 1.2 Duplicate Harvesting Systems

Two systems handle harvesting with incompatible APIs:
- `harvesting.ts`: Single-player focused, position-based range check, directly modifies powder storage
- `harvestCompress.ts`: Entity-based, tick-driven, no range check, capacity-based

**Impact:** Which one runs? Both? Neither? A developer wouldn't know which to
call. This will cause bugs when both write to the same deposit simultaneously.

**Fix Required:** Merge into one canonical system. `harvestCompress.ts` is more
complete (handles both harvest + compress pipeline). Remove `harvesting.ts` or
make it a thin wrapper.

### 1.3 No "New Game" Initialization Sequence

No system orchestrates starting a new game:
- No function populates the world with deposits
- No function spawns the player bot
- No function places initial terrain/biomes
- `mapGenerator.ts` exists but nothing calls it
- `oreSpawner.ts` exists but nothing triggers initial spawn
- `raceSelection.ts` exists but doesn't feed into world setup

**Impact:** Even if all systems worked, there's no "main()" to wire them together.

**Fix Required:** `newGameInit.ts` — orchestrates:
1. Race selection → set faction config
2. Map generation → create terrain + biomes
3. Ore deposit spawning → place initial resources
4. Player bot spawning → create starter entity with harvester
5. AI civilization spawning → place 3 enemy factions
6. Tutorial start → begin otter hologram sequence
7. HUD initialization → set all gauges to starting values

### 1.4 No Player Entity Lifecycle

No system manages the player bot as a coherent entity:
- Movement is in `movement.ts` but disconnected from ECS
- Camera is in `cameraSystem.ts` but doesn't read from player entity
- Health, power, signal strength exist in HUD but nothing damages the player
- Death/respawn completely missing

**Fix Required:** `playerEntity.ts` — manages:
- Player spawn with correct faction/race config
- Health component (damage → death → respawn)
- Equipment slots (harvester, grabber, drill upgrades)
- Powder storage capacity (upgradeable)
- Movement speed (affected by terrain, weather, load)

---

## 2. HIGH-PRIORITY UX ISSUES

### 2.1 No Crosshair Feedback Loop

The HUD has 5 crosshair styles (`default`, `harvest`, `interact`, `combat`,
`build`) but nothing switches between them. The player has no visual cue
about what they're looking at or what action is available.

**Fix:** `crosshairDriver.ts` — raycasts from camera center, checks what the
ray hits, and updates `hudState.crosshair` accordingly:
- Looking at deposit → "harvest" style + deposit name + distance
- Looking at cube → "interact" style + material name
- Looking at enemy → "combat" style + enemy name + health
- Looking at building → "interact" style + building type + actions
- Looking at nothing → "default" style

### 2.2 No Sound Feedback

`audioEventSystem.ts` defines spatial sound events but nothing triggers them.
The core loop has zero audio feedback:
- Grinding has no grinding sound
- Compression has no hydraulic press sound
- Cube dropping has no metallic clang
- Furnace has no smelting ambience
- Combat has no weapon sounds
- Walking has no footstep sounds

**Fix:** Wire event bus → audio system. Each core action emits an audio event.

### 2.3 No Particle Feedback

`particleEmitterSystem.ts` exists but nothing triggers particles:
- Grinding should spray sparks and powder
- Compression should emit pressure steam
- Furnace should glow and emit heat shimmer
- Combat should produce impact sparks
- Walking on different terrain should kick up different dust

**Fix:** Wire event bus → particle system alongside audio.

### 2.4 Radial Menu Not Contextual

`interactionState.ts` handles click detection, `hudState.ts` has a
`RadialMenuState`, but there's no logic mapping "I clicked a furnace" to
"show these 4 furnace actions in the radial menu."

**Fix:** `contextualActions.ts` — maps entity type → available actions:
- Deposit → [Harvest, Inspect, Mark on map]
- Cube → [Grab, Inspect, Kick]
- Furnace → [Open hopper, View recipes, Toggle power, Inspect]
- Belt → [Rotate, Remove, Inspect]
- Enemy bot → [Attack, Hack, Inspect]
- Friendly bot → [Command, Switch to, Inspect]
- Building → [Repair, Power, Upgrade, Demolish]

### 2.5 No Tutorial Audio/Visual Cues

`tutorialSystem.ts` has 10 steps with otter dialogue, but:
- No otter entity is placed in the world
- No speech bubble rendering
- No waypoint marker pointing to the next objective
- No highlighting of the target object
- No "press X to continue" prompt

**Fix:** Tutorial needs rendering hooks and a waypoint system.

---

## 3. MEDIUM-PRIORITY IMPROVEMENTS

### 3.1 Compression Needs Juice

The compression mechanic (powder → cube) is the game's signature moment.
Currently it's just a timer. It needs:
- Screen shake (increasing intensity as pressure builds)
- Pressure gauge overlay (0→100% with red zone)
- Temperature gauge (heat builds during compression)
- Sound: hydraulic press whine → SLAM on completion
- Particle burst on cube eject
- Cube should physically pop out and bounce

### 3.2 Cube Material Differentiation

`cubeMaterials.json` exists with PBR specs, but cubes are functionally
identical. Different materials should:
- Have different compression times (iron=2s, copper=1.5s, rare_alloy=4s)
- Stack differently (heavy materials need stronger foundations)
- Provide different wall strength (iron > copper > scrap)
- Look distinctly different at a glance (color + roughness + emissive)

### 3.3 Weather Should Affect Gameplay

`weatherSystem.ts` tracks weather states, but weather has no gameplay impact:
- Storms should increase lightning rod output but damage exposed cubes
- Rain should slow movement and reduce visibility
- Fog should reduce perception range (AI and player)
- Clear weather should boost solar power (future)

### 3.4 Missing "Quick Deposit" Action

When carrying a cube to a furnace, the player must:
1. Walk to furnace
2. Open radial menu
3. Select "Open hopper"
4. Drop cube in

This is too many steps for the core loop's most repeated action. Need a
"Quick Deposit" — walk up to furnace while holding cube → prompt appears
→ single key press deposits cube into hopper.

### 3.5 No Cube Count Indicator in World

The player's cube pile is their wealth — visible to everyone. But there's
no world-space UI showing how many cubes are in a stack, what material,
or their total value. Need floating labels on cube piles.

---

## 4. INTEGRATION MISSING

| Source System | Target System | Missing Wire |
|---------------|--------------|--------------|
| harvestCompress | hudState | powderGauge updates |
| harvestCompress | audioEventSystem | grinding/compression sounds |
| harvestCompress | particleEmitterSystem | sparks/steam particles |
| harvestCompress | eventBus | resource_gathered events |
| harvestCompress | grabber | cube spawn on compress complete |
| furnaceProcessing | grabber | output cube spawn |
| furnaceProcessing | audioEventSystem | smelting sounds |
| furnaceProcessing | eventBus | building_placed for output |
| combat | hudState | damage flash, health updates |
| combat | audioEventSystem | weapon sounds |
| combat | eventBus | combat_kill events |
| movement | hudState | coords update |
| movement | weatherSystem | speed modifiers |
| weatherSystem | combat | visibility/accuracy modifiers |
| weatherSystem | power | lightning chance modifiers |
| biomeSystem | movement | terrain speed modifiers |
| biomeSystem | oreSpawner | deposit type distribution |
| progressionSystem | hudState | XP bar updates |
| achievementSystem | notificationSystem | achievement popups |
| interactionState | hudState | crosshair + radial menu |
| tutorialSystem | hudState | tutorial overlay |
| techTree | craftingSystem | recipe unlocks |
| diplomacySystem | eventBus | diplomacy_changed events |
| territoryControl | eventBus | territory_claimed events |

---

## 5. BALANCE CONCERNS

### 5.1 Harvest Rate vs Compression Cost

- Default extraction rate: config.mining.defaultExtractionRate
- Default powder capacity: config.mining.harvesting.defaultPowderCapacity
- Compression time: 2 seconds (fallback)

Need to verify: How many seconds of grinding to fill capacity?
If capacity=100 and rate=1.0/tick at 60fps → 100 frames = 1.67 seconds.
That's too fast. Grinding should feel like WORK — target 8-15 seconds.

### 5.2 Furnace Throughput

Smelting times in furnace.json need to balance against:
- Player walking speed (how long to carry cube to furnace)
- Hopper queue size (how many cubes can buffer)
- Output value (is the recipe worth the time?)

### 5.3 AI Civilization Pacing

No config controls WHEN AI factions become active threats.
Need a "peace period" for the first N minutes where AI focuses
on economy, giving the player time to establish.

---

## 6. NOVEL INSIGHTS — Untapped Value

### 6.1 "Cube Economy as Information Layer"

Cubes are visible. Enemies can SEE your wealth. This creates emergent
behavior: hiding cubes behind walls, building decoy piles, creating
underground storage. **No system supports this yet.** Need:
- Cube visibility check from AI perception
- "Decoy pile" building that creates fake cubes
- Underground storage building that hides cubes from perception

### 6.2 "Grind Sound as Danger Signal"

When grinding ore, the player is stationary and vulnerable. The grinding
sound should be audible to nearby AI enemies, attracting attention.
This creates tension: faster drills are louder, drawing more enemies.
Stealth vs speed trade-off.

### 6.3 "Material Cubes as Ammunition"

Throwing cubes does damage (grabber.throwCube exists). Different materials
should deal different damage. Rare alloy cubes = expensive but devastating.
This creates a resource economy tension: do you smelt your best cubes or
throw them at enemies?

### 6.4 "Cube Tower Defense"

Stacked cube walls block enemy pathfinding. Different materials have
different durability. This means wall-building IS the defense system —
no separate "wall building" blueprint needed. Just stack cubes.
Need: cube HP, wall damage from raids, structural collapse when
support cubes are destroyed.

### 6.5 "Weather-Driven Resource Cycles"

Storms charge lightning rods (power) but damage exposed cube piles.
This creates a cycle: build roofs over cubes before storms hit.
Need: cube damage from weather, roof/shelter building, storm forecasting.

### 6.6 "Otter Secret Economy"

Otters are quest-givers. What if they also trade? The otter holograms
could offer rare recipes or materials in exchange for specific cube
combinations. This adds a secondary economy layer and makes otters
feel more alive. Need: otter trade system, rare otter-only recipes.

---

## Action Plan

### Phase 1: Wire the Core Loop (This Session)
1. Build `gameLoopBridge.ts` — connects harvest→compress→cube→furnace→craft
2. Build `crosshairDriver.ts` — raycast → HUD crosshair updates
3. Build `contextualActions.ts` — entity type → radial menu items
4. Build `newGameInit.ts` — orchestrates new game setup
5. Add event bus emissions to all core systems
6. Wire audio + particle events

### Phase 2: Juice the Core (Next)
1. Compression screen shake + overlays
2. Audio integration (grinding, smelting, dropping)
3. Particle effects (sparks, steam, dust)
4. Cube material visual differentiation

### Phase 3: 4X Integration
1. AI perception of cube piles
2. Weather gameplay effects
3. Territory + diplomacy event wiring
4. Victory condition checking
