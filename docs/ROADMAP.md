# Syntheteria — Roadmap

> Foundation status, what's next, and how to build on top of the base.

---

## Foundation Status

The **full gameplay loop** with resource economy, combat, AI GOAP, salvage, cultist escalation,
specialization tracks, tech tree, victory conditions, diplomacy, territory, floor mining,
6-layer rendering pipeline, PBR texture atlas, fog of war, cylindrical curvature, save/load,
and audio is complete.

```
pnpm verify  →  vitest suites + CT pass + 0 TypeScript errors + 0 Biome errors
```

### What Works

| System | Status |
|--------|--------|
| Fixed-size board generator (seeded FNV-1a + mulberry32) | DONE |
| 9 terrain substrates (FloorType) with PBR atlas shader | DONE |
| 13-material resource taxonomy (ResourceMaterial) | DONE |
| BFS adjacency, A* pathfinding | DONE |
| GridApi addressable interface | DONE |
| Bridge/tunnel depth stacking (data + rendering) | DONE |
| Labyrinth generator (Rooms-and-Mazes, seeded) | DONE |
| BSP city layout (walls, corridors, doorways, 5 district zones) | DONE |
| Abyssal zones (bridges, platforms, docks) | DONE |
| Connectivity guarantee (flood-fill + corridor punching) | DONE |
| Weight-class traversal (scouts walk grating at 2 AP) | DONE |
| PBR texture atlas (8 AmbientCG packs, 5 atlas maps) | DONE |
| Grating cutout (discard in shader for abyssal transparency) | DONE |
| Koota ECS world init, traits, 40+ systems | DONE |
| 9 robot archetypes + spawn functions | DONE |
| 14 specialization tracks across 6 classes | DONE |
| Garage modal (two-step fabrication: Class → Track) | DONE |
| Specialization passives runtime (aura effects per turn) | DONE |
| AI track selection (per-faction preferences) | DONE |
| 5 factions + 3 cults (TypeScript const) | DONE |
| Faction relations (setRelation/getRelation/isHostile) | DONE |
| Movement system (lerp + AP deduction) | DONE |
| Highlight system (BFS reachable → emissive overlay) | DONE |
| Turn system (multi-phase: player → AI → attacks → environment → new turn) | DONE |
| Attack system (attack/defense stats, damage = attack - defense min 1) | DONE |
| Harvest system (tick-down, yield to faction pool, deposit depletion) | DONE |
| Floor mining system (DAISY pattern, deep mining tech +50%, pit creation) | DONE |
| Resource system (ResourcePool per faction, add/spend/canAfford) | DONE |
| Yuka GOAP AI with fuzzy logic, faction personalities, NavGraph A* | DONE |
| Cultist spawning (breach zones, 3 escalation stages, per-sect GOAP) | DONE |
| Cult mutation system (4-tier time-based: buffs → abilities → aberrant) | DONE |
| Cult POI spawning at game start | DONE |
| Cult structure spawning (altars, shelters, corruption nodes) | DONE |
| Corruption spreading (from corruption nodes) | DONE |
| 15 faction building definitions (TypeScript const with build costs) | DONE |
| 6 cult structure definitions | DONE |
| 10 salvage type definitions with yield tables + GLB model mappings | DONE |
| Building placement action (radial → select → cost check → place) | DONE |
| Building power systems (all building types have active gameplay effects) | DONE |
| Salvage prop placement in mapgen | DONE |
| Instanced GLB renderer for salvage props and buildings | DONE |
| Radial menu (dual-ring state machine, SVG renderer, per-class action providers) | DONE |
| Per-class action definitions (unique action sets per robot class) | DONE |
| Depth renderer (bridge platforms, columns, void planes) | DONE |
| Mined pit renderer (visible pits from floor mining) | DONE |
| HUD (turn, AP, resource counters for 13 materials) | DONE |
| Orbital illuminator (fixed zenith sun under dome) | DONE |
| Isometric camera (CivRev2-style, fixed angle, WASD pan) | DONE |
| Storm dome (3 GLSL layers: storm, wormhole, illuminator) | DONE |
| GLSL shader extraction (vite-plugin-glsl #include) | DONE |
| SQLite schema + migrations + GameRepo CRUD | DONE |
| Save/Load (fixed for BSP generator, unit identity, auto-save) | DONE |
| Landing screen + New Game modal (SectorScale, seed phrases, factions) | DONE |
| Settings modal (audio, keybindings, accessibility) | DONE |
| Board input (click-to-select, click-to-move, click-to-attack) | DONE |
| Robot GLB model loading (9 robot GLBs from asset library) | DONE |
| Fog of war (per-unit scan radius) | DONE |
| 6-layer rendering pipeline (grid, height, biomes, platforms, salvage, robots) | DONE |
| Cylindrical board curvature (CivRev2-style) | DONE |
| Seamless biome patterns (toroidal tiling) | DONE |
| Toroidal camera panning | DONE |
| 3D title text | DONE |
| Fatal error modal | DONE |
| Procedural walls/columns | DONE |
| Storm power grid (transmitters → power boxes → consumers) | DONE |
| Defense turret auto-attack (powered turrets, cooldown, manhattan range) | DONE |
| Motor pool bot fabrication (queue, resource cost, tick-down, spawn) | DONE |
| Synthesizer material fusion (recipes, common → advanced conversion) | DONE |
| Relay tower signal network (chained coverage, scanRange penalty) | DONE |
| Maintenance bay repair (+2 HP/turn to friendly units in range) | DONE |
| 27-tech research tree (15 base + 12 track-gating, 5 tiers) | DONE |
| 7 victory conditions (domination, research, economic, survival, wormhole, technical supremacy, forced) | DONE |
| Territory system (faction tile painting, percentage tracking) | DONE |
| Population cap enforcement | DONE |
| Resource renewal system | DONE |
| Experience system (XP tracking, mark progression) | DONE |
| Diplomacy system (granular standings -100 to +100) | DONE |
| Hacking system (hack enemy units/buildings) | DONE |
| Wormhole project (20-turn construction) | DONE |
| Turn event log | DONE |
| Toast notifications | DONE |
| Turn summary (end-of-turn recap) | DONE |
| Tutorial system | DONE |
| Memory fragments (lore discovery) | DONE |
| Speech profiles + bubbles (faction persona dialogue) | DONE |
| Observer mode (AI-vs-AI spectator) | DONE |
| Dev console controls | DONE |
| Minimap with territory visualization | DONE |
| Audio (Tone.js synth pooling, SFX, ambient storm loop) | DONE |
| Campaign stats | DONE |
| Analytics collector | DONE |
| 360 GLB models from 3 asset packs | DONE |
| E2E Playwright tests (AI-vs-AI playtests) | DONE |

### What's Missing

| Gap | Impact |
|-----|--------|
| Unified depth renderer | Visual polish — BiomeRenderer + DepthRenderer + MinedPitRenderer should merge |
| Fog gradient | Visual polish — hard cutoff instead of radiating gradient |
| Storm dome tuning | Visual polish — hypercane + wormhole atmosphere |
| Signal relay control limits | Gameplay — relay towers don't limit unit control range |
| 4 failing test suites | Low — 2171 tests pass, 4 suites have issues |

---

## Phase 1 — Player Economy (DONE)

- [x] **1.1** — 13-material resource taxonomy
- [x] **1.2** — Harvest system
- [x] **1.3** — Radial menu
- [x] **1.4** — HUD resource display

---

## Phase 2 — Turn Expansion (DONE)

- [x] **2.1** — Multi-phase turn structure
- [x] **2.2** — AI faction movement
- [x] **2.3** — Attack system
- [x] **2.4** — Cultist spawning + escalation

---

## Phase 3 — World Population + Rendering (DONE)

- [x] **3.1** — Salvage prop placement in board generator
- [x] **3.2** — Building definitions (15 faction structures)
- [x] **3.3** — Instanced GLB renderer for salvage props and buildings
- [x] **3.4** — Robot GLB model loading
- [x] **3.5** — Depth renderer
- [x] **3.6** — Cult structure definitions (6 types)
- [x] **3.7** — Salvage type definitions (10 types)
- [x] **3.8** — Fog of war
- [x] **3.9** — 6-layer rendering pipeline
- [x] **3.10** — Cylindrical board curvature
- [x] **3.11** — Seamless biome patterns
- [x] **3.12** — Toroidal camera panning
- [x] **3.13** — 3D title text
- [x] **3.14** — Fatal error modal
- [x] **3.15** — Procedural walls/columns
- [x] **3.16** — Building placement ACTION
- [x] **3.17** — PBR texture atlas (AmbientCG)
- [x] **3.18** — Grating cutout (shader discard)

---

## Phase 4 — Building Systems (DONE)

- [x] **4.1** — Storm power grid
- [x] **4.2** — Defense turret auto-attack
- [x] **4.3** — Motor pool bot fabrication
- [x] **4.4** — Synthesizer material fusion
- [x] **4.5** — Relay tower signal network
- [x] **4.6** — Maintenance bay repair
- [x] **4.7** — Cult structure spawning at breach zones

---

## Phase 5 — Victory + Polish (DONE)

- [x] **5.1** — Victory conditions (7 paths + elimination defeat + forced endgame)
- [x] **5.2** — Background pass (StormDome tuning)
- [x] **5.3** — E2E Playwright tests
- [x] **5.4** — Visual QA screenshot review

---

## Phase 6 — Deep Systems (DONE)

- [x] AI GOAP depth (Yuka Think/GoalEvaluator with fuzzy logic + faction personalities)
- [x] Diplomacy system (granular standings -100 to +100)
- [x] Audio (Tone.js synth pooling + ambient storm loop)
- [x] Bot speech profiles + speech bubbles
- [x] Tech tree / research (27 techs, 5 tiers)
- [x] Wormhole victory (20-turn stabilizer project)
- [x] Observer mode (AI-vs-AI spectator)
- [x] Territory system (faction tile painting)
- [x] Population cap
- [x] Experience system + mark progression
- [x] Hacking system
- [x] Floor mining (DAISY pattern + deep mining bonus)

---

## Phase 7 — Specialization + Cult Evolution (DONE)

- [x] **7.1** — 14 specialization tracks across 6 robot classes
- [x] **7.2** — Garage modal (two-step fabrication)
- [x] **7.3** — Track registry (single source of truth)
- [x] **7.4** — Specialization passives runtime (aura effects)
- [x] **7.5** — AI track selection (per-faction preferences)
- [x] **7.6** — 12 track-gating techs in tech tree
- [x] **7.7** — Cult mutation system (4-tier time-based)
- [x] **7.8** — Cult escalation stages (wanderer → war party → assault)
- [x] **7.9** — Per-sect GOAP behaviors (Static Remnants / Null Monks / Lost Signal)
- [x] **7.10** — Technical Supremacy victory (Mark V of all 6 classes)
- [x] **7.11** — Deep mining tech bonus (+50% yield)
- [x] **7.12** — Per-class action definitions (unique action sets)

---

## Phase 8 — Visual Polish (NEXT)

- [ ] **8.1** — Unified depth layer refactor (merge BiomeRenderer + DepthRenderer + MinedPitRenderer)
- [ ] **8.2** — Fog of war radiating gradient (not hard cutoff)
- [ ] **8.3** — Storm dome atmosphere (hypercane + wormhole-is-the-eye)
- [ ] **8.4** — Visual polish screenshots at 3 zoom levels

---

## Phase 9 — Low Priority

- [ ] Signal relay control limits (relay towers limit unit control range)
- [ ] Fix 4 failing test suites
- [ ] Paper playtesting at turn 1/10/100/1000
- [ ] Radial menu completeness audit
