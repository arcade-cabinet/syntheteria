# Asset Library Reorganization & Syntheteria Integration Plan

This plan covers two interleaved workstreams:
1. **Library reorganization** — finish the three-tier taxonomy at `/Volumes/home/assets`
2. **Syntheteria asset pipeline** — copy, catalog, and wire ~100 models into the 4X world generator

Both must happen together: the library needs to be navigable before we can confidently pull assets, and Syntheteria needs real models to make the generator produce a playable map from a single seed.

---

## Current State Assessment (2026-03-12)

### What's Right
- Top-level split: `3DLowPoly/` (9,920 GLBs) and `3DPSX/` (1,452 GLBs) is correct
- Category directories exist: Characters/, Environment/, Props/, Vehicles/
- Most single-source packs are at correct depth (macro → meso → micro → pack)
- Catalog DB has 11,372 rows with FTS5 index
- Pipeline scripts exist: `batch_convert_fbx.sh`, `promote_glbs_to_pack_root.py`, `generate_pack_agents.py`

### What's Broken

#### 1. GameKits — KEEP INTACT
GameKits stay together as cohesive sets. They preserve assembly logic and theming that would be lost by decomposition. The `GameKits/` directory is a valid top-level category alongside Characters/, Environment/, Props/.

| Kit | GLBs | Status |
|---|---|---|
| CubeWorld | 109 | OK — cohesive kit |
| Cyberpunk | 71 | OK — cohesive kit |
| Fantasy | 128 | OK — cohesive kit |
| FantasyCards | 34 | OK — cohesive kit |
| MushroomHunting | 62 | OK — cohesive kit |
| Platformer | 637 | OK — cohesive kit |
| SciFi | 191 | OK — cohesive kit |
| ToonShooter | 74 | OK — cohesive kit |
| TowerDefense | 279 | OK — cohesive kit |
| Zombie | 60 | OK — cohesive kit |

**Action**: Ensure each kit has AGENTS.md and CATALOG.md. No decomposition needed.

#### 2. Special/ Is a Catch-All (7 packs)
`Special/` has no semantic meaning. Each pack belongs elsewhere:
- `ConveyorKit/` → `Props/Industrial/` or `Environment/Industrial/`
- `HexagonKit/` → `Environment/Terrain/`
- `Brick/` → `Environment/Architecture/`
- `CoasterKit/` → `Environment/Entertainment/`
- `MarbleKit/` → `Props/Games/`
- `MinigolfKit/` → `Props/Games/`
- `Skate/` → `Props/Vehicles/` or `Environment/Urban/`

**Action**: Move each to proper location, update AGENTS.md/CATALOG.md.

#### 3. GLBs Buried in Subdirs (266+ GLBs)
Some packs have GLBs in subdirectories instead of at pack root:
- `AnimatedChars/.../Models/` — 4 GLBs in format subdir
- `KayKit_Skeletons_1.1_FREE/` — 19 GLBs in subdir
- `kitchen/` — 179 GLBs in nested models/ dir
- `mushroom_hunting/` — 62 GLBs in subdir

**Action**: Run `promote_glbs_to_pack_root.py` then verify and re-ingest.

#### 4. _Archive Directories
Scattered `_Archive/` dirs hold duplicates or pre-conversion source files. Need auditing — keep if unique, delete if duplicated by promoted GLBs.

**Action**: Audit each _Archive, delete confirmed duplicates, move unique assets to proper location.

#### 5. FTS5 Search Bug (FIXED 2026-03-12)
Multi-word queries used FTS5 implicit AND, returning empty results. Fixed in `assets-mcp` commit `e733a83` — queries now use OR-joined prefix terms. **Server restart needed to pick up fix.**

---

## Phase 1: Fix the Foundation (Asset Library)

### 1.1 Promote Buried GLBs
```bash
python3 /Volumes/home/assets/scripts/promote_glbs_to_pack_root.py \
  --root /Volumes/home/assets --dry-run
# Review output, then run without --dry-run
```

### 1.2 Decompose GameKits
For each kit, create a decomposition manifest (`_decompose.json`) mapping each GLB to its target category:

```json
{
  "pack": "Cyberpunk Game Kit - July 2022",
  "moves": {
    "Character.glb": "Characters/SciFi/Cyberpunk Characters/",
    "Enemy_2Legs.glb": "Characters/SciFi/Cyberpunk Characters/",
    "Enemy_Flying.glb": "Characters/SciFi/Cyberpunk Characters/",
    "AC_Side.glb": "Environment/City/Cyberpunk Props/",
    "Antenna_1.glb": "Environment/City/Cyberpunk Props/",
    "Turret_Cannon.glb": "Props/Weapons/Cyberpunk Turrets/",
    "Pipe_1.glb": "Props/Industrial/Cyberpunk Pipes/"
  }
}
```

### 1.3 Relocate Special/ Packs
Move each pack to its semantic home. Update any hardcoded paths in scripts.

### 1.4 Audit _Archive Directories
List all `_Archive/` dirs, diff against promoted GLBs, delete confirmed duplicates.

### 1.5 Re-Ingest
After all moves:
```bash
uv run --project ~/src/assets-management/assets-mcp assets-ingest --force
```

### 1.6 Regenerate AGENTS.md Files
```bash
python3 /Volumes/home/assets/scripts/generate_pack_agents.py \
  --root /Volumes/home/assets --force
```

---

## Phase 2: Syntheteria Asset Pipeline

### 2.1 Target Asset Inventory (~100 models)

Assets selected for 4X world-building, organized by gameplay function:

#### Infrastructure (25 models) — pipes, cables, supports, antennas, monorail
| Source Pack | Assets | Purpose |
|---|---|---|
| Space Kit | pipe_straight, pipe_corner, pipe_cross, pipe_split, pipe_end, pipe_entrance, pipe_ring, pipe_supportHigh, pipe_supportLow | Overworld pipe networks between POIs |
| Space Kit | monorail_trackStraight, monorail_trackCornerLarge, monorail_trackSlope, monorail_trackSupport | Transit corridors |
| Space Kit | satelliteDish, satelliteDish_detailed, satelliteDish_large | Communication arrays at POIs |
| Space Kit | machine_generator, machine_generatorLarge, machine_wireless | Power generation |
| Cyberpunk | Antenna_1, Antenna_2, Cable_Long, Cable_Thick | Signal infrastructure |
| Cyberpunk | Support, Support_Long | Structural supports |

#### Defense (15 models) — turrets, gates, barricades, fences
| Source Pack | Assets | Purpose |
|---|---|---|
| Cyberpunk | Turret_Cannon, Turret_Gun, Turret_GunDouble, Fence | Defensive emplacements |
| Space Kit | turret_single, turret_double, gate_complex, gate_simple | Sector gates |
| Building Kit | barricade-doorway-a, barricade-doorway-b, barricade-window-a | Breach barricades |
| Cyberpunk | Tank | Heavy defense |
| Cyberpunk | Sign_Corner_Hazard | Hostile zone markers |

#### Industrial (20 models) — generators, conveyors, barrels, machines
| Source Pack | Assets | Purpose |
|---|---|---|
| Conveyor Kit | conveyor, conveyor-long, conveyor-sides, robot-arm-a, robot-arm-b | Fabrication blocks |
| Conveyor Kit | scanner-high, scanner-low | Inspection points |
| Space Kit | machine_barrel, machine_barrelLarge, barrel, barrels, barrels_rail | Resource storage |
| Cyberpunk | Computer, Computer_Large, Lever | Control systems |
| Cyberpunk | TV_1, TV_2, TV_3 | Display terminals |

#### Logistics (10 models) — containers, crates, cargo
| Source Pack | Assets | Purpose |
|---|---|---|
| Conveyor Kit | box-large, box-long, box-small, box-wide | Cargo containers |
| Conveyor Kit | door-wide-closed, door-wide-open | Warehouse access |
| Space Kit | craft_cargoA, craft_cargoB, craft_miner | Transport vehicles |

#### Exploration (15 models) — craters, crystals, ruins, loot
| Source Pack | Assets | Purpose |
|---|---|---|
| Space Kit | crater, craterLarge, rock_crystals, rock_crystalsLargeA, rock_crystalsLargeB | Terrain features, resource nodes |
| Space Kit | bones, rocks_smallA, rocks_smallB, meteor_half | Wreckage, exploration rewards |
| Cyberpunk | Lootbox, Collectible_Board, Collectible_Gear | Salvage caches |
| Space Kit | hangar_smallA, hangar_largeA | Abandoned structures |

#### Structural (15 models) — platforms, columns, buildings
| Source Pack | Assets | Purpose |
|---|---|---|
| Space Kit | platform_center, platform_corner, platform_high, platform_large | Sector foundations |
| Space Kit | structure, structure_closed, structure_detailed | Building shells |
| Space Kit | supports_high, supports_low | Elevated platforms |
| SciFi MegaKit | Column_Pipes, Column_MetalSupport, Column_Simple | Interior columns |
| SciFi MegaKit | Prop_Vent_Big, Prop_Vent_Small, Prop_AccessPoint | Interior details |

### 2.2 Copy Assets Into Syntheteria
```
assets/models/
├── city/          (91 existing — Modular City Kit)
├── robots/        (9 existing — player/hostile/industrial)
├── infrastructure/  (25 new)
├── defense/         (15 new)
├── industrial/      (20 new)
├── logistics/       (10 new)
├── exploration/     (15 new)
└── structural/      (15 new)
```

### 2.3 Build ModelEntry Atlas Definitions
Each copied model gets a full `ModelEntry` in `src/config/ecumenopolisAtlas.ts`:
- `id`: snake_case identifier matching filename
- `zoneAffinity`: which sector zones this model fits
- `adjacencyBias`: what neighbor tags boost placement score
- `compositeRoles`: which composites can use this model
- `visualWeight`: { close, mid, far } importance weights
- `placement`: grid | wall | freeform
- `passability`: open | cover | blocked | portal
- `gridFootprint`: [w, d] in grid units
- `lodTier`: 0 (hero) | 1 (standard) | 2 (fill)

### 2.4 Create Overworld Composites
New composite recipes in `cityComposites.ts` using copied assets:
- `power_relay_station` — generator + cables + antenna + satellite dish
- `pipe_junction` — pipe_cross + pipe_supports + machine_barrel
- `defensive_outpost` — turrets + barricades + gate + fence
- `transit_depot` — monorail_track + platform + craft_cargo
- `salvage_cache` — lootbox + rocks + crater + bones
- `resource_node` — crystals + machine_generator + pipe_ring
- `abandoned_hangar` — hangar + barrel + structure_detailed
- `cult_breach_point` — barricade + sign_hazard + meteor_half

### 2.5 Expand World Generator for 4X
In `generation.ts` and `sectorStructurePlan.ts`:

**Explore**: Scatter exploration POIs at meaningful distances from home base. Fog of war reveals landmarks (crystal formations, abandoned hangars) as rewards. Resource caches hidden at sector boundaries.

**Expand**: Infrastructure corridors (pipe networks, monorail tracks) connect POIs. Territory control visualized by structural presence. Transit nodes unlock fast travel between founded cities.

**Exploit**: Resource hotspots (crystal clusters, ore craters) placed at strategic distances. Industrial composites (conveyors, generators) at exploitation sites. Power network lines between cities.

**Exterminate**: Hostile zones with cult breach points at chokepoints. Defensive gates at sector boundaries. Turret emplacements at contested corridors. Hostile machine patrols between cult sites.

---

## Phase 3: Validation

### 3.1 Visual Audit
- Load each copied model in CityKitLab
- Verify scale consistency (all models should work at GRID_UNIT=2)
- Check material compatibility (PBR, no Lambert)

### 3.2 Generator Smoke Test
- Generate 10 worlds from different seeds
- Verify each has: 5 POIs at meaningful distances, infrastructure corridors, 2+ resource hotspots, 1+ hostile zone, defensible chokepoints

### 3.3 Test Coverage
- Unit tests for new composites
- Adjacency validation tests for new model families
- World generation seed determinism tests

---

## Execution Priority

| Priority | Task | Blocked By |
|---|---|---|
| P0 | Fix FTS search (DONE) | — |
| P0 | Promote buried GLBs | — |
| P1 | Copy 100 models into Syntheteria | — |
| P1 | Build ModelEntry atlas definitions | Copy models |
| P1 | Create overworld composites | Atlas definitions |
| P2 | Ensure GameKits have AGENTS.md + CATALOG.md | — |
| P2 | Relocate Special/ packs | — |
| P2 | Expand world generator for 4X | Composites |
| P3 | Audit _Archive dirs | Decompose kits |
| P3 | Re-ingest + regenerate AGENTS.md | All moves |
| P3 | Visual audit + generator smoke test | Generator expansion |
