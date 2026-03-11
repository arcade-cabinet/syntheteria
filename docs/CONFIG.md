# Config Schema Reference

All game balance in Syntheteria lives in `config/*.json`. Changes to balance values never require code changes.

The type-safe loader at `config/index.ts` imports all 39 config files and re-exports them as a single `config` object with full TypeScript inference via `typeof`:

```ts
import { config } from '../config';

const speed  = config.belts.tiers.fast.speed;            // number
const ore    = config.mining.oreTypes.titanium.hardness; // number
const npc    = config.civilizations.reclaimers;          // exact shape
```

Config tests live in `config/__tests__/` — one test file per JSON file.

---

## Cross-Reference Rules

Tests enforce these cross-config referential integrity constraints:

| Config | Field | Must reference valid ID from |
|--------|-------|------------------------------|
| `furnace.json` | recipe inputs | ore types in `mining.json` |
| `economy.json` | `furnaceRecipes` inputs | ore types in `mining.json` |
| `biomes.json` | `resourceMultipliers` keys | ore types in `mining.json` |
| `technology.json` | unlock prerequisites | tech IDs within same file |
| `quests.json` | biome references | biome IDs in `biomes.json` |
| `enemies.json` | faction names | faction IDs in `civilizations.json` |

---

## Files by Domain

### Economy

#### mining.json

Core extraction parameters.

| Field | Type | Description |
|-------|------|-------------|
| `oreTypes` | object | Map of ore ID → ore definition |
| `oreTypes[].hardness` | integer 1–10 | Mining difficulty (higher = harder) |
| `oreTypes[].grindSpeed` | float 0–1 | Powder accumulation rate (lower = slower) |
| `oreTypes[].color` | `#rrggbb` | Hex display color |
| `powderCapacity` | integer | Default bot powder storage |
| `defaultExtractionRate` | float | Base extraction rate before multipliers |
| `drillTiers` | object | Drill tier definitions (keys "1"–"4") |
| `drillTiers[].rateMultiplier` | float | Multiplier on base extraction rate |
| `drillTiers[].capacity` | integer | Max powder per grind session |
| `drillTiers[].mineableTypes` | string[] | Ore IDs this tier can mine |
| `drillTiers[].aggroRadius` | float | Enemy detection radius while drilling |
| `drillTiers[].unlockCost` | object\|null | Null for tier 1 (starting drill) |
| `harvesting.defaultRange` | float | Max reach to interact with a deposit |
| `scavenging` | object | Ground scrap placement parameters |

Valid ore IDs: `rock`, `scrap_iron`, `copper`, `silicon`, `carbon`, `titanium`, `rare_earth`, `gold`, `quantum_crystal`.

Example — add a new ore type:

```json
"oreTypes": {
  "my_ore": { "hardness": 4, "grindSpeed": 0.45, "color": "#AA3388" }
}
```

#### furnace.json

Furnace machine parameters and per-tier recipe lists.

| Field | Type | Description |
|-------|------|-------------|
| `hopperCapacity` | integer | Starting hopper cube capacity |
| `hopperUpgrades` | integer[] | Upgraded hopper sizes (ascending) |
| `processSpeed` | float | Base recipe processing speed multiplier |
| `poweredSpeedBonus` | float | Additional multiplier when powered |
| `powerRequired` | integer | Power units needed for powered bonus |
| `maxQueueDepth` | integer | Max pending recipes |
| `tiers` | object | Tier definitions (keys "1"–"5") |
| `tiers[].name` | string | Display name |
| `tiers[].techRequired` | integer | Minimum tech level to unlock this tier |
| `tiers[].recipes` | object | Recipe ID → recipe definition |
| `tiers[].recipes[].inputs` | object | Ore ID → quantity required |
| `tiers[].recipes[].time` | integer | Processing time in seconds |
| `tiers[].recipes[].output` | string | Output item ID |
| `tiers[].recipes[].category` | string | "tool" \| "component" \| "building" \| "unit" \| "consumable" \| "material" |

Recipe input keys must be valid ore IDs from `mining.json`.

#### economy.json

Material values, trade rates, AI economics, and building costs.

| Field | Type | Description |
|-------|------|-------------|
| `materials[].tier` | integer 1–5 | Material rarity tier |
| `materials[].baseValue` | float | Base economic value per cube |
| `materials[].cubeHp` | integer | Hit points of a single cube |
| `materials[].wallHp` | integer | Effective wall HP when stacked |
| `materials[].carrySpeedMod` | float 0–1 | Speed multiplier when carrying this material |
| `alloys` | object | Smelted alloy definitions |
| `compression.cubeSize` | float | Physical cube side length in meters (0.5) |
| `deposits[].yieldMin/yieldMax` | integer | Powder yield range per deposit |
| `deposits[].respawnSeconds` | integer\|null | Null = never respawns |
| `deposits[].respawnMode` | string | "same_location" \| "same_biome_shifted" \| "random_in_biome" \| "random_on_map" \| "never" |
| `wealthBrackets` | object | Raid trigger thresholds by wealth level |
| `raidPointFormula` | object | Formula parameters for raid frequency calculation |
| `aiDifficulty` | object | Per-difficulty AI behavior multipliers |
| `aiEconomy.materialDistribution` | object | Per-faction starting material ratios |
| `trade` | object | Trade ratio thresholds, opinion changes |
| `patronShipments` | object | Home planet favor system parameters |
| `furnaceRecipes` | object | Full recipe list by tier (mirrors furnace.json) |
| `buildingCosts` | object | Per-category building cost tables |
| `tradeMultipliers` | object | Per-material trade value modifiers |
| `cubeValueScaling` | object | Processing stage value multipliers (raw / smelted / crafted) |
| `stockpileDepreciation` | object | Per-material decay rates when exposed |
| `biomeYieldModifiers` | object | Per-biome, per-material yield multipliers |

#### buildings.json

Building definitions including type, costs, power, and tech requirements.

| Field | Type | Description |
|-------|------|-------------|
| `buildings[].type` | string | Building type ID |
| `buildings[].displayName` | string | UI display name |
| `buildings[].cost` | object\|null | Material costs (ore ID → count). Null = free |
| `buildings[].power` | integer | Power units consumed |
| `buildings[].buildTime` | integer | Construction time in seconds |
| `buildings[].techTier` | integer | Tech level required to build |
| `buildings[].hp` | integer | Building hit points |
| `buildings[].footprint` | integer[] | Grid cells occupied [width, height] |

#### belts.json

Belt transport configuration.

| Field | Type | Description |
|-------|------|-------------|
| `tiers` | object | Belt tier definitions |
| `tiers[].speed` | float | Cube transport speed (units/second) |
| `tiers[].cost` | object | Material cost to build one belt segment |
| `tiers[].techRequired` | integer | Tech level to unlock |
| `maxCubesPerBelt` | integer | Maximum cubes on one belt segment |
| `backPressureEnabled` | boolean | Whether cubes back up when output is blocked |
| `spacing` | float | Minimum spacing between cubes on belt |

#### processing.json

Smelter, refiner, and separator recipe configurations.

| Field | Type | Description |
|-------|------|-------------|
| `recipes[].id` | string | Unique recipe ID |
| `recipes[].inputs` | object | Ore ID → quantity |
| `recipes[].output` | string | Output material ID |
| `recipes[].outputCount` | integer | Number of output cubes |
| `recipes[].time` | integer | Processing time in seconds |
| `recipes[].machineType` | string | "smelter" \| "refiner" \| "separator" |
| `recipes[].techTier` | integer | Required tech level |

---

### Combat

#### combat.json

Player and faction combat parameters.

| Field | Type | Description |
|-------|------|-------------|
| `meleeRange` | float | Max melee attack distance |
| `meleeHitChance` | float 0–1 | Base melee accuracy |
| `playerHealth.maxHp` | integer | Player bot maximum HP |
| `playerHealth.hpRegenPerSecond` | float | Out-of-combat HP regen rate |
| `playerHealth.maxArmorDR` | float 0–1 | Maximum damage reduction from armor |
| `playerHealth.armorSources` | object | Per-armor-type DR values and costs |
| `playerWeapons` | object | Per-weapon-type damage, range, attack speed |
| `raidConfig` | object | Raid state machine timing |

#### hacking.json

Hacking system parameters.

| Field | Type | Description |
|-------|------|-------------|
| `baseHackSpeed` | float | Hacking progress per tick |
| `computeCostPerHack` | integer | Compute units consumed per hack attempt |
| `hackRange` | float | Max distance to initiate hack |
| `detectionTime` | float | Seconds before breach triggers counter-response |
| `breachSeverity` | object | Effects per breach type |

#### enemies.json

Feral and rogue unit definitions.

| Field | Type | Description |
|-------|------|-------------|
| `types[].id` | string | Enemy type ID |
| `types[].faction` | string | "feral" \| "rogue" |
| `types[].hp` | integer | Unit hit points |
| `types[].damage` | integer | Attack damage per hit |
| `types[].speed` | float | Movement speed |
| `types[].aggroRange` | float | Detection range |
| `types[].spawnWeight` | float | Relative spawn probability |

---

### 4X Systems

#### civilizations.json

Faction definitions and governor personality profiles.

| Field | Type | Description |
|-------|------|-------------|
| `factions[].id` | string | Faction ID used throughout configs |
| `factions[].displayName` | string | UI name |
| `factions[].description` | string | Lore description |
| `factions[].governorProfile` | object | GOAP weight per strategic goal |
| `factions[].governorProfile.expand` | float | Weight: territory expansion |
| `factions[].governorProfile.gather` | float | Weight: resource accumulation |
| `factions[].governorProfile.defend` | float | Weight: base defense |
| `factions[].governorProfile.attack` | float | Weight: offensive raids |
| `factions[].governorProfile.research` | float | Weight: tech progression |
| `factions[].governorProfile.trade` | float | Weight: inter-faction trade |
| `factions[].startingBiomes` | string[] | Preferred starting biome IDs |

Valid faction IDs: `reclaimers`, `volt_collective`, `signal_choir`, `iron_creed`.

#### technology.json

Tech tree definitions for all factions.

| Field | Type | Description |
|-------|------|-------------|
| `universal` | object | Tech nodes available to all factions |
| `reclaimers` | object | Reclaimer-exclusive tech nodes |
| `volt_collective` | object | Volt Collective-exclusive tech nodes |
| `signal_choir` | object | Signal Choir-exclusive tech nodes |
| `iron_creed` | object | Iron Creed-exclusive tech nodes |
| `[faction][node].prerequisites` | string[] | Tech IDs that must be unlocked first |
| `[faction][node].cost` | object | Material cost to research |
| `[faction][node].researchTime` | integer | Ticks to complete research |
| `[faction][node].unlocks` | string[] | IDs of things unlocked (recipes, buildings, abilities) |

#### territory.json

Territory claiming and contestation parameters.

| Field | Type | Description |
|-------|------|-------------|
| `outpostClaimRadius` | float | Tiles claimed by an outpost |
| `contestationDecayRate` | float | How fast contested claims weaken per tick |
| `minPresenceToHold` | float | Minimum faction presence to maintain a claim |

#### diplomacy.json

Inter-faction relationship parameters.

| Field | Type | Description |
|-------|------|-------------|
| `opinionRange.min/max` | integer | Opinion value bounds |
| `opinionChanges` | object | Opinion delta per event type |
| `allianceThreshold` | integer | Opinion required to form alliance |
| `warThreshold` | integer | Opinion at which war becomes likely |
| `tradeEmbargoDuration` | integer | Seconds an embargo lasts |

#### victory.json

Victory condition thresholds.

| Field | Type | Description |
|-------|------|-------------|
| `conditions` | object | Per-victory-type requirements |
| `conditions.economic.cubeValue` | float | Total cube stockpile value needed |
| `conditions.territorial.regions` | integer | Number of regions to control |
| `conditions.elimination.factions` | integer | Factions that must be defeated |
| `conditions.independence.favor` | integer | Patron favor required |

---

### World

#### biomes.json

Biome definitions, weather system, terrain hazards, and processing cycles.

| Field | Type | Description |
|-------|------|-------------|
| `biomes` | object | Map of biome ID → biome definition |
| `biomes[].displayName` | string | UI name |
| `biomes[].loreName` | string | In-world Ferrovore-era name |
| `biomes[].moveSpeedMod` | float 0–1 | Movement speed multiplier |
| `biomes[].harvestMod` | float 0–2 | Harvest rate multiplier |
| `biomes[].visibility` | float 0–1 | Vision range fraction |
| `biomes[].signalBonus` | float 0–2 | Signal network strength multiplier |
| `biomes[].passable` | boolean | Whether units can enter |
| `biomes[].bgColor` | `#rrggbb` | Minimap color |
| `biomes[].lightningMultiplier` | float | Storm lightning strike rate modifier |
| `biomes[].alienSpawnRate` | float 0–1 | Native alien encounter probability |
| `biomes[].resourceMultipliers` | object | Per-ore-type yield multipliers (keys must be valid ore IDs) |
| `biomes[].features` | string[] | Environmental feature identifiers |
| `biomes[].strategicRole` | string | Design note on this biome's purpose |
| `terrain.slopeModifiers` | object | Speed and build restrictions per slope steepness |
| `terrain.hazards` | object | Hazard type definitions with biome assignments |
| `terrain.bridges` | object | Bridge types with span, HP, and cost |
| `processingCycles` | object | Planet processing phase definitions (dormant/active/volatile/convergent/aftermath) |
| `cycleProgression` | array | Timeline of cycle pattern changes |
| `weatherStates` | object | Weather type definitions with modifiers |
| `weatherTransitions` | object | Markov chain transition probabilities (must sum to 1.0 per state) |
| `stormIntensity` | object | Ramp/decay rates for storm buildup |
| `factionBiomePreferences` | object | Preferred starting biomes per faction |
| `weatherBiomeInteractions` | object | Special effects when weather meets specific biomes |
| `alienNativeTerritories` | object | Native presence density and unique resources per biome |

Valid gameplay biome IDs: `rust_plains`, `scrap_hills`, `chrome_ridge`, `signal_plateau`, `cable_forest`.
Water biome IDs: `deep_water`, `shallow_water`.

**Important:** Weather transition probabilities must sum to exactly 1.0 for every source state. Tests enforce this.

#### terrain.json

Heightfield and noise parameters for world generation.

| Field | Type | Description |
|-------|------|-------------|
| `width/height` | integer | World grid dimensions |
| `noiseScale` | float | Perlin noise frequency |
| `noiseOctaves` | integer | Noise octave count |
| `heightRange` | object | Min/max terrain elevation |
| `biomeAssignment` | object | Elevation and noise thresholds per biome |

#### mapPresets.json

Pre-defined map generation profiles.

| Field | Type | Description |
|-------|------|-------------|
| `presets[].id` | string | Preset identifier |
| `presets[].displayName` | string | UI name |
| `presets[].seed` | string\|null | Fixed seed or null for random |
| `presets[].width/height` | integer | Map dimensions |
| `presets[].biomeDistribution` | object | Target biome area fractions |
| `presets[].resourceDensity` | float | Ore deposit frequency multiplier |

---

### Visual

#### materials.json

Material visual properties for non-cube game objects.

#### factionVisuals.json

Per-faction color palettes, material properties, and bot visual descriptors.

| Field | Type | Description |
|-------|------|-------------|
| `factions[].primaryColor` | `#rrggbb` | Primary faction color |
| `factions[].accentColor` | `#rrggbb` | Accent color for highlights |
| `factions[].metalness` | float 0–1 | PBR metalness |
| `factions[].roughness` | float 0–1 | PBR roughness |
| `factions[].emissiveColor` | `#rrggbb` | Glow color |
| `factions[].emissiveIntensity` | float | Glow strength |

#### rendering.json

Rendering quality and visual parameters.

| Field | Type | Description |
|-------|------|-------------|
| `shadowMapSize` | integer | Shadow map resolution |
| `fogDensity` | float | Atmospheric fog density |
| `lodDistances` | float[] | LOD switch distances |
| `particleMaxCount` | integer | Global particle cap |

#### particles.json

Particle system configurations for harvest, compression, damage, and ambient effects.

#### textureMapping.json

Maps logical material IDs to texture file paths (for PBR texture set loading).

---

### Gameplay

#### quests.json

Otter hologram quest lines and dialogue.

| Field | Type | Description |
|-------|------|-------------|
| `trustArc` | object | Trust level thresholds and unlock conditions |
| `questLines` | object | Quest ID → quest definition |
| `questLines[].steps` | array | Ordered quest step definitions |
| `questLines[].steps[].objective` | string | Player-visible objective text |
| `questLines[].steps[].condition` | object | Completion trigger (type, value, biome) |
| `questLines[].steps[].dialogue` | string[] | Otter hologram dialogue lines |
| `otterDialogues` | object | Context-triggered otter sayings |

Biome IDs referenced in quest conditions must be valid IDs from `biomes.json`.

#### botMovement.json

Bot movement physics parameters.

| Field | Type | Description |
|-------|------|-------------|
| `walkSpeed` | float | Normal walking speed |
| `sprintSpeed` | float | Sprinting speed |
| `acceleration` | float | Acceleration rate |
| `deceleration` | float | Braking rate |
| `jumpForce` | float | Upward jump impulse |
| `gravity` | float | Gravity acceleration |

#### botAutomation.json

Automated bot routine parameters (patrol, guard, work, follow behavior).

#### power.json

Power generation and distribution parameters.

| Field | Type | Description |
|-------|------|-------------|
| `lightningRod.baseOutput` | float | Base power generated per storm tick |
| `lightningRod.stormMultiplier` | float | Power bonus during storms |
| `lightningRod.range` | float | Wire connection range |
| `wireLoss` | float | Power lost per wire segment |
| `maxWireLength` | integer | Max segments per wire chain |
| `protectionRadius` | float | Lightning protection around rods |

#### interaction.json

Contextual interaction system parameters.

| Field | Type | Description |
|-------|------|-------------|
| `raycastRange` | float | Max raycast distance for object selection |
| `highlightColor` | `#rrggbb` | Emissive highlight color on hover |
| `radialMenuRadius` | float | UI radial menu size |
| `actionCooldown` | float | Minimum seconds between actions |

#### camera.json

FPS camera parameters.

| Field | Type | Description |
|-------|------|-------------|
| `fov` | float | Vertical field of view in degrees |
| `nearClip` | float | Near clipping plane |
| `farClip` | float | Far clipping plane |
| `mouseSensitivity` | float | Look sensitivity |
| `headBobAmplitude` | float | Head bob distance |
| `headBobFrequency` | float | Head bob cycles per second |

#### discoveries.json

Exploration discovery event definitions triggered by entering new areas.

#### progression.json

Progression system parameters for leveling and milestone tracking.

#### achievements.json

Achievement definitions with conditions and rewards.

---

### Audio

#### audio.json

Volume levels, mixer settings, and ambient layer definitions.

| Field | Type | Description |
|-------|------|-------------|
| `masterVolume` | float 0–1 | Global volume |
| `musicVolume` | float 0–1 | Music channel volume |
| `sfxVolume` | float 0–1 | Sound effects volume |
| `ambientVolume` | float 0–1 | Ambient layer volume |
| `ambientLayers` | object | Per-biome ambient sound configurations |

---

## Adding New Config Values

### New Ore Type

1. Add entry to `config/mining.json` under `oreTypes`
2. Add entry to `config/economy.json` under `materials` and `deposits`
3. Add entry to `config/biomes.json` under each relevant biome's `resourceMultipliers`
4. Add entry to `config/economy.json` under `tradeMultipliers` and `stockpileDepreciation.materialRates`
5. Add entry to `config/economy.json` under `biomeYieldModifiers` for each biome
6. Update `config/__tests__/mining.test.ts` to include the new ore in the `ALL_ORE_TYPES` list
7. Update cross-reference tests in `config/__tests__/biomes.test.ts`

### New Building Type

1. Add entry to `config/buildings.json`
2. Add cost entry to `config/economy.json` under `buildingCosts`
3. Add furnace recipe to `config/furnace.json` under the appropriate tier
4. Update tech unlock in `config/technology.json` if gated behind research
5. Update `config/__tests__/buildings.test.ts`

### New Recipe

1. Add to `config/furnace.json` under the appropriate tier
2. Ensure all input ore IDs exist in `config/mining.json`
3. If the recipe creates a new output type, add it to the relevant config
4. Cross-reference test in `config/__tests__/furnace.test.ts` will validate inputs automatically

### New Tech Node

1. Add to the appropriate faction branch in `config/technology.json`
2. Set `prerequisites` to existing tech node IDs
3. Set `unlocks` to recipe/building IDs that already exist in their respective configs
4. Update `config/__tests__/technology.test.ts`

---

## Validation

All config files have corresponding test suites in `config/__tests__/`. Run:

```bash
npm test
```

Tests check:
- Required fields are present
- Numeric values are within valid ranges
- String fields match expected enum values or regex patterns
- Cross-references point to valid IDs in other configs
- Transition probabilities sum to 1.0
- No placeholder values (TODO, TBD, FIXME, xxx)
