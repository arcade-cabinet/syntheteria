# Syntheteria — Roadmap

> Foundation status, what's next, and how to build on top of the base.

---

## Foundation Status

The **full gameplay loop** with resource economy, combat, AI GOAP, salvage, cultist escalation,
specialization tracks, tech tree, victory conditions, diplomacy, territory, floor mining,
sphere world geometry, globe-based rendering pipeline, PBR texture atlas, fog of war,
title-to-game cinematic, save/load, and audio is complete.

```
pnpm verify  →  130 Vitest test files (2282 tests) + 0 TypeScript errors + 0 Biome errors  *(refresh from `pnpm test:vitest`)*
```

### What Works

| System | Status |
|--------|--------|
| Sphere world geometry (buildSphereGeometry, tileToSpherePos, sphereRadius) | DONE |
| SphereOrbitCamera (orbit around sphere center, WASD rotates globe) | DONE |
| Sphere model placement (units/buildings/salvage tangent to sphere normal) | DONE |
| Sphere fog of war (dedicated GLSL shaders, BFS on sphere surface) | DONE |
| Globe.tsx — ONE persistent Canvas across all phases | DONE |
| Title-to-game cinematic (globe growth 0.3→1, camera zoom to surface) | DONE |
| Persistent storm effects (StormClouds, Hypercane, Lightning in ALL phases) | DONE |
| Cutaway clip plane (CutawayClipPlane.tsx + cutawayStore.ts) | WIP |
| Fixed-size board generator (seeded FNV-1a + mulberry32) | DONE |
| 9 biome types (BiomeType) — grassland, forest, desert, hills, wetland, ruins, tundra, water, mountain | DONE |
| 17-material resource taxonomy (ResourceMaterial) — natural → processed → synthetic | DONE |
| BFS adjacency, A* pathfinding | DONE |
| GridApi addressable interface | DONE |
| Bridge/tunnel depth stacking (data + rendering) | **REMOVED** — depth system deleted |
| Labyrinth generator (Rooms-and-Mazes, seeded) | **REMOVED** — overworld-only; noise-based generator |
| BSP city layout (walls, corridors, doorways, 5 district zones) | **REMOVED** — overworld-only; labyrinth pipeline deleted |
| Connectivity guarantee (flood-fill + corridor punching) | **REMOVED** — labyrinth pipeline deleted |
| PBR texture atlas (8 AmbientCG packs, 5 atlas maps) | **LEGACY** — target: vertex-color biome terrain |
| Koota ECS world init, traits, 42 systems | DONE |
| 9 robot archetypes + spawn functions | DONE |
| 14 specialization tracks across 6 classes | DONE |
| Settlement production UI | Per-building modals | **GarageModal.tsx pattern** — target: each building type gets its own management panel |
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
| 15 faction building definitions (TypeScript const with build costs) | DONE |
| 6 cult structure definitions | DONE |
| 10 salvage type definitions with yield tables + GLB model mappings | DONE |
| Building placement action (command UI → select → cost check → place) | DONE |
| Building power systems (all building types have active gameplay effects) | DONE |
| Salvage prop placement in mapgen | DONE |
| Instanced GLB rendering for salvage, buildings, structures | DONE |
| Radial menu (dual-ring state machine, SVG renderer, per-class action providers) | DONE in code — **UX superseded** by Civ VI–style command UI (`GAME_DESIGN.md` §9) |
| Unified terrain renderer (replaced DepthRenderer + MinedPitRenderer) | **LEGACY** — stubbed after depth removal |
| HUD (turn, AP, resource counters for 13 materials) | DONE |
| Storm sky (3 GLSL layers: storm, wormhole, illuminator) | DONE |
| GLSL shader extraction (vite-plugin-glsl #include) | DONE |
| SQLite schema + migrations + GameRepo CRUD | DONE |
| Save/Load (fixed for BSP generator, unit identity, auto-save) | DONE |
| Landing screen + New Game modal (SectorScale, seed phrases, factions) | DONE |
| Settings modal (audio, keybindings, accessibility) | DONE |
| Board input (click-to-select, click-to-move, click-to-attack) | DONE |
| Robot GLB model loading (9 robot GLBs from asset library) | DONE |
| Fog of war (per-unit scan radius, flat + sphere GLSL) | DONE |
| Seamless biome patterns (toroidal tiling) | DONE |
| 3D title text + globe animation | DONE |
| Fatal error modal | DONE |
| Procedural walls/columns | **REMOVED** — depth system deleted |
| Storm power grid (transmitters → power boxes → consumers) | DONE |
| Defense turret auto-attack (powered turrets, cooldown, manhattan range) | DONE |
| Motor pool bot fabrication (queue, resource cost, tick-down, spawn) | DONE |
| Synthesizer material fusion (recipes, common → advanced conversion) | DONE |
| Relay tower signal network (chained coverage, scanRange penalty) | DONE |
| Maintenance bay repair (+2 HP/turn to friendly units in range) | DONE |
| 27-tech research tree (15 base + 12 track-gating, 5 tiers) | DONE — **LEGACY** — target: building-driven progression |
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
| Minimap with territory visualization | DONE |
| Audio (Tone.js synth pooling, SFX, ambient storm loop) | DONE |
| Campaign stats + analytics collector | DONE |
| 360 GLB models from 3 asset packs | DONE |
| 20 TypeScript config definition files (incl. registry, preferences, milestones, encounters) | DONE |
| Combat effects (floating damage, combat flash) | DONE |
| Path visualization | DONE |
| Unit status bars (HP/AP above units) | DONE |
| Particle system (sparkles on wormhole, power nodes, EL crystals) | DONE |
| Tech tree overlay (full DAG visualization) | DONE |
| Diplomacy overlay (faction standings panel) | DONE |
| Unit roster overlay (all player units with quick-jump) | DONE |
| Alert bar (off-screen event alerts) | DONE |
| Game outcome overlay (victory/defeat) | DONE |
| Pause menu | DONE |
| Hover tracker + entity tooltip | DONE |

### What's Missing

| Gap | Impact |
|-----|--------|
| Delete flat board code (GHOST, CURVE_STRENGTH) | Cleanup — legacy code in boardGeometry.ts |
| Delete GameScreen.tsx | Cleanup — superseded by Globe.tsx |
| LOD system | Visual — procedural shader at far zoom, PBR at close |
| Strategic zoom | Visual — seamless surface-to-globe zoom |
| Cutaway dollhouse zoom | Visual — descend through layers (WIP) |
| Volumetric fog | Visual — haze at scan range edge instead of hard cutoff |
| Infrastructure renderer | Content — 48 unused GLB models |
| Robot idle animations | Content — 6 faction bots need rigging |
| Signal relay control limits | Gameplay — relay towers don't limit unit control range |
| Observer mode with sphere camera | Gameplay — AI-vs-AI auto-play on sphere |
| Touch controls | Platform — pinch zoom on mobile/tablet |

---

## Phase 1 — Player Economy (DONE)

- [x] **1.1** — 13-material resource taxonomy
- [x] **1.2** — Harvest system
- [x] **1.3** — Context actions (radial in code — **superseded** by Civ VI–style UI, `GAME_DESIGN.md` §9)
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
- [x] **3.5** — Unified terrain renderer
- [x] **3.6** — Cult structure definitions (6 types)
- [x] **3.7** — Salvage type definitions (10 types)
- [x] **3.8** — Fog of war
- [x] **3.9** — PBR texture atlas (AmbientCG)

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
- [x] **5.2** — Background pass (StormSky tuning)
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
- [x] Territory system (faction tile painting)
- [x] Population cap
- [x] Experience system + mark progression
- [x] Hacking system
- [x] Floor mining (DAISY pattern + deep mining bonus)

---

## Phase 7 — Specialization + Cult Evolution (DONE)

- [x] **7.1** — 14 specialization tracks across 6 robot classes
- [x] **7.2** — Unit fabrication UI (today: `GarageModal` — merge into settlement production queue)
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

## Phase 8 — Sphere World (DONE) — **SUPERSEDED** — match board uses Phaser + enable3d isometric. Sphere geometry retained for title globe only.

- [x] **8.1** — `buildSphereGeometry()` — map tile grid onto SphereGeometry
- [x] **8.2** — SphereOrbitCamera — orbit around sphere center
- [x] **8.3** — Sphere model placement — units/buildings/salvage tangent to sphere
- [x] **8.4** — Sphere raycasting — click on sphere → tile coordinates
- [x] **8.5** — Title → game transition — globe growth cinematic
- [x] **8.6** — Globe.tsx — ONE persistent Canvas across all phases
- [x] **8.7** — Persistent storm effects (title storms → game sky)
- [x] **8.8** — Sphere fog of war GLSL shaders
- [x] **8.9** — Adjacency/pathfinding on sphere surface
- [x] **8.10** — Highlight renderer on sphere — reachable tiles glow on curved surface
- [x] **8.11** — Sphere-surface model orientation — all models tangent to sphere normal

---

## Phase 9 — Sphere Polish + Cleanup — **SUPERSEDED** — sphere-specific polish no longer applicable; board is Phaser isometric

- [ ] ~~**9.1** — Delete flat board code (GHOST, CURVE_STRENGTH, buildBoardGeometry)~~ SUPERSEDED
- [ ] ~~**9.2** — Delete GameScreen.tsx (superseded by Globe.tsx)~~ SUPERSEDED
- [ ] ~~**9.3** — LOD system (procedural shader at far zoom, PBR atlas at close zoom)~~ SUPERSEDED
- [ ] ~~**9.4** — Strategic zoom (seamless surface-to-globe, Supreme Commander style)~~ SUPERSEDED
- [ ] ~~**9.5** — Cutaway dollhouse zoom (descend through layers instead of into ceiling)~~ SUPERSEDED
- [ ] ~~**9.6** — Volumetric fog (haze at scan range edge, not hard cutoff)~~ SUPERSEDED
- [ ] ~~**9.7** — Infrastructure renderer (48 unused GLB models)~~ SUPERSEDED

---

## Phase 10 — Low Priority

- [ ] Signal relay control limits (relay towers limit unit control range)
- [ ] Observer mode with sphere camera (AI-vs-AI auto-play)
- [ ] Touch controls (pinch zoom on mobile/tablet)
- [ ] Robot idle animations (6 faction bots need rigging + idle loops)
- [ ] LOD generation (batch Blender decimation for distant models)
- [ ] Victory/defeat cinematics (7 victory paths need visual payoff)
- [ ] Wormhole project visual (20-turn build at north pole)
- [ ] Paper playtesting at turn 1/10/100/1000
- [ ] Full balance pass (economy, combat, AI tuning)
- [ ] 100-turn AI-vs-AI playtest

---

## Phase 11 — Design Overhaul (in progress)

The game's design has evolved significantly. Remaining gaps are mostly presentation (11.8) and narrative (11.9).

- [x] **11.1** — Biome terrain (replace industrial FloorTypes with grassland, forest, mountain, water, etc.)
- [x] **11.2** — Natural→processed→synthetic resource taxonomy (replace 13-material salvage)
- [x] **11.3** — Overworld generator with biome noise (replace labyrinth pipeline)
- [x] **11.4** — Building-driven progression (replace centralized tech tree with per-building upgrade tiers)
- [x] **11.5** — Building→building unlock chains
- [x] **11.6** — Per-building management modals (extend GarageModal pattern to all buildings)
- [x] **11.7** — Victory condition overhaul (6 paths: Domination, Network, Reclamation, Transcendence, Cult Eradication, Score)
- [ ] **11.8** — Improvement overlays (roads, mines, irrigation → roboforming visual progression)
- [x] **11.9** — Cultist scripted encounter events (8 encounter triggers — `src/config/cultEncounterDefs.ts`)
- [x] **11.10** — Capacitor setup (Android + iOS + Web), GitHub Actions APK builds

See `docs/GAME_DESIGN.md` for full TARGET sections.
