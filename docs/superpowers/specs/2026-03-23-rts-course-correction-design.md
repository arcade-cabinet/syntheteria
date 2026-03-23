# Syntheteria RTS Course Correction — Complete Design Spec

## Summary

Restore the original RTS vision: one emergent AI waking in industrial ruins, repairing robots, exploring, fortifying, pushing north to defeat the Cult of EL. Port the best infrastructure from the feature branch (Koota, labyrinth, audio, persistence, models) while dropping all 4X scope creep.

## Core Identity

**Genre:** Survival-RTS with narrative beats (Duskers/FTL/Homeworld, not Civ)
**Player:** One emergent AI consciousness
**Enemy:** Cult of EL (single escalating faction + enslaved machines + rogue AIs)
**Map:** Procedural labyrinth city (fills viewport, responsive) + open world beyond
**Time:** Real-time with pause (0x/0.5x/1x/2x/4x speed)
**Signature mechanics:** Component damage (not HP), Fragment merge fog-of-war
**Victory:** Defeat cult leader, launch through wormhole

---

## Architecture

| Layer | Technology | Why |
|-------|-----------|-----|
| ECS | **Koota** | More performant than Miniplex for real-time; trait composition; already built |
| Rendering | **R3F** (React Three Fiber) | Original tech, proven, works |
| AI | **Yuka.js** GOAP | Simplified: ONE enemy faction, escalating behavior |
| Persistence | **Capacitor SQLite** | Already built in `src/db/`, adapt to new entity model |
| Audio | **Tone.js** | Already built in `src/audio/`, bring directly |
| Bundler | **Vite 8 + Biome 2.4** | Already set up on this branch |
| Mobile | **Capacitor** | Init after core works |
| Linting | **Biome 2.4** | Already configured |

## Directory Structure (Target)

```
src/
  main.tsx                    — Capacitor-aware entry point
  app/
    App.tsx                   — Phase state machine (Title → Narration → Playing)
    session.ts                — Game session lifecycle
  ecs/
    world.ts                  — Koota world instance
    traits/                   — Koota trait definitions (from feature branch pattern)
      unit.ts                 — UnitPos, UnitStats, UnitVisual, UnitFaction, UnitMove
      building.ts             — Building trait
      board.ts                — Board singleton trait
      tile.ts                 — Tile trait
      faction.ts              — Faction + ResourcePool
      cult.ts                 — CultStructure, CultUnit
      component.ts            — RobotComponent (camera, arms, legs, power_cell)
      fragment.ts             — Fragment (fog merge groups)
    factory.ts                — Entity spawn functions
  board/
    labyrinth.ts              — Rooms-and-Mazes generator (from aeef1650^)
    labyrinthMaze.ts          — Maze corridor carving
    labyrinthFeatures.ts      — Room placement + feature injection
    labyrinthConnectivity.ts  — Connectivity validation
    labyrinthPlatforms.ts     — Platform/elevation assignment
    noise.ts                  — Seeded PRNG
    types.ts                  — BoardConfig, TileData, etc.
    adjacency.ts              — Tile adjacency helpers
  systems/
    combat.ts                 — Component-based damage (from original)
    movement.ts               — Pathfinding + movement (from original)
    pathfinding.ts            — A* on navmesh
    navmesh.ts                — Navigation mesh from labyrinth
    exploration.ts            — Fog reveal + fragment merge
    resources.ts              — Scavenge → repair → fabricate
    fabrication.ts            — Component manufacturing
    power.ts                  — Lightning rod power grid
    repair.ts                 — Unit repair at fabrication units
    enemies.ts                — Cult escalation (wanderer → war party → assault)
    buildingPlacement.ts      — Ghost preview + validation
    gameLoop.ts               — Real-time tick orchestrator (from original gameState.ts)
  ai/
    cultBehavior.ts           — Yuka GOAP for cult units (simplified from feature branch)
    rogueAi.ts                — Feral machine behavior
  rendering/
    TerrainRenderer.tsx       — Per-fragment terrain (from original, upgrade with PBR)
    CityRenderer.tsx          — Instanced city blocks (from original, upgrade with GLBs)
    UnitRenderer.tsx           — Robot GLB models (replace primitive geometry)
    StormSky.tsx              — Storm shader sky dome (from original)
    LandscapeProps.tsx        — Instanced scatter (from original)
  input/
    TopDownCamera.tsx         — WASD + scroll + touch (from original)
    UnitInput.tsx             — Selection + commands (from original)
  ui/
    landing/                  — Landing screen + New Game modal (from feature branch)
    game/
      GameUI.tsx              — In-game HUD (from original, enhanced)
      RadialMenu.tsx          — Unit action radial (Mark upgrades, skills)
  audio/
    audioEngine.ts            — Tone.js init (from feature branch)
    sfx.ts                    — Sound effects (from feature branch)
    music.ts                  — Procedural music (from feature branch)
    ambience.ts               — Storm ambience (from feature branch)
  db/
    adapter.ts                — DB adapter interface (from feature branch)
    capacitorAdapter.ts       — Capacitor SQLite impl (from feature branch)
    gameRepo.ts               — Save/load operations (adapt to new entity model)
    migrations.ts             — Schema migrations (from feature branch)
    schema.ts                 — DB schema (adapt)
    serialize.ts              — ECS ↔ DB serialization (rewrite for Koota)
  config/
    gameDefaults.ts           — Constants
    materials.ts              — Resource material definitions
    robotDefs.ts              — 6 robot types with Mark I/II/III progression
    cultDefs.ts               — 3 cult mech types + escalation tiers
    buildingDefs.ts           — 25 building definitions (GLB paths + gameplay)
    models.ts                 — Model path registry
  robots/
    CultMechs.ts              — Cult mech archetypes (from feature branch)
public/
  assets/
    models/
      robots/
        factions/             — 6 player robot GLBs (from feature branch)
        cult/                 — 3 cult mech GLBs (from feature branch)
      buildings/              — 25 building GLBs (from feature branch)
    audio/                    — SFX + music assets
    textures/                 — PBR materials for terrain/city
```

---

## Code Sourcing — Exact Commits

| Component | Branch/Commit | Files to Extract |
|-----------|--------------|-----------------|
| **Labyrinth generator** | `aeef1650^` (parent of removal commit) | `src/board/labyrinth.ts`, `labyrinthMaze.ts`, `labyrinthFeatures.ts`, `labyrinthConnectivity.ts`, `labyrinthPlatforms.ts`, `labyrinthGenerator.ts` + all `__tests__/labyrinth*.vitest.ts` |
| **Koota traits** | `cursor/cloud-agent-runbook-review-0483` | `src/traits/*.ts` (board, building, cult, faction, tile, unit, poi, resource, salvage) — use as TEMPLATE for new trait design |
| **Cult mechs** | `cursor/cloud-agent-runbook-review-0483` | `src/robots/CultMechs.ts` + tests |
| **Robot GLBs** | `cursor/cloud-agent-runbook-review-0483` | `public/assets/models/robots/factions/*.glb` (6), `public/assets/models/robots/cult/*.glb` (3) |
| **Building GLBs** | `cursor/cloud-agent-runbook-review-0483` | `public/assets/models/buildings/*.glb` (25) |
| **Capacitor SQLite** | `cursor/cloud-agent-runbook-review-0483` | `src/db/*.ts` (adapter, capacitorAdapter, gameRepo, migrations, schema, serialize, types) |
| **Audio** | `cursor/cloud-agent-runbook-review-0483` | `src/audio/*.ts` (audioEngine, sfx, music, ambience, index) |
| **Landing UI** | `cursor/cloud-agent-runbook-review-0483` | `src/ui/landing/*.tsx` (LandingScreen, NewGameModal, SettingsModal, title/*) |
| **R3F Globe** | `cursor/cloud-agent-runbook-review-0483` | `src/ui/Globe.tsx` + sphere shaders (for menu background only) |
| **Yuka AI core** | `cursor/cloud-agent-runbook-review-0483` | `src/ai/` — extract enemy behavior patterns, drop faction/diplomatic AI |
| **Original game** | Current branch `src/` | combat.ts, movement.ts, exploration.ts, etc. — the 27-file game |

---

## Phases

### Phase 0: Foundation (no gameplay changes)

- Fix 60 Biome lint errors in original code
- Initialize Capacitor (`npx cap init`)
- Port `game/src/` entity model from Miniplex → Koota
  - Use `src/traits/` from feature branch as template
  - Map original entity fields to Koota traits
  - Preserve ALL original game logic (combat, movement, exploration, etc.)
  - Ensure component damage system works in Koota
  - Ensure fragment merge works in Koota
- Copy public assets from feature branch:
  - 9 robot GLBs (6 player + 3 cult)
  - 25 building GLBs
  - Audio assets (if any static files exist)
- Verify game compiles and runs (even if broken visually)

### Phase 1: Core RTS Loop

- Extract labyrinth generator from `aeef1650^` into `src/board/`
  - Adapt room types: faction starts → player start, cult POI rooms
  - Remove faction-specific room placement (only ONE player start)
  - Ensure seeded determinism
- Wire labyrinth into the game as the city environment
- Replace primitive unit geometry with GLB robot models
- Replace primitive city geometry with GLB building set pieces
- Make viewport fill + responsive scaling
- Wire real-time game loop (from original `gameState.ts`, ported to Koota)
- Verify: you can see a labyrinth city with robot models in it

### Phase 2: Combat + Exploration

- Port component damage system to Koota
- Port fragment merge fog-of-war to Koota
- Wire cult mechs as enemies (3 types from CultMechs.ts)
- Implement cult escalation: wanderer → war party → assault
- Wire Yuka GOAP for cult behavior (simplified: patrol, aggro, escalate)
- Port navmesh pathfinding
- Port unit selection + RTS input (click/tap/right-click)
- Verify: you can select units, move them, fight cultists

### Phase 3: Economy + Building

- Port resource scavenging (strip ruins for parts)
- Port fabrication system (build components at powered fabs)
- Port power system (lightning rods from storm)
- Port building placement (ghost preview + validation)
- Port repair system
- Wire Mark I → II → III upgrades via radial menu
- Verify: full resource loop works (scavenge → repair → fabricate → upgrade)

### Phase 4: UI + Audio + Persistence

- Bring in landing page (LandingScreen + NewGameModal from feature branch)
- Bring in R3F globe as menu background (storm sky)
- Bring in audio system (SFX + procedural music + storm ambience)
- Adapt Capacitor SQLite for save/load with new Koota entity model
- Rewrite `serialize.ts` for Koota world snapshots
- Wire game speed controls (0x/0.5x/1x/2x/4x)
- Verify: can start new game, play, save, load, with audio

### Phase 5: Polish + Narrative

- Port narrative dialogue system (intro sequence, story beats)
- Human temperature system (friendly → hostile, Colonization-style)
- Wire 3 game phases: Awakening / Expansion / War
- PBR materials on city environment (concrete, metal, durasteel from ambientCG)
- E2E tests with Playwright
- Production error handling (no fallbacks, assert + throw, debug overlay)
- Performance optimization for mobile (Capacitor build)

---

## What Gets DROPPED (permanently)

| Feature | Reason |
|---------|--------|
| 4 competing AI factions | Original has ONE player |
| Diplomacy system | No faction relations in original |
| 5 epochs | Original has 3 phases |
| Sphere world | Original is flat top-down |
| Tech tree | Original uses blueprint discovery |
| Specialization tracks | Original has Mark I/II/III |
| Roboforming | Not in original |
| Territory system | Not in original |
| Turn-based system | Original is real-time |
| Phaser / enable3d / Babylon.js | R3F is the rendering tech |
| 200+ scatter GLBs | 25 buildings + procedural city |
| Biome terrain system | City environment, not natural terrain |
| Weather multipliers on gameplay | Storm is atmospheric, not gameplay modifier |

---

## Success Criteria

- [ ] Procedural labyrinth city fills viewport responsively
- [ ] 6 robot types rendered as GLB models with component damage
- [ ] 3 cult mech types as enemies with escalating behavior
- [ ] Real-time combat with pause
- [ ] Fragment merge fog-of-war
- [ ] Resource loop: scavenge → repair → fabricate → upgrade
- [ ] Building placement (lightning rods, fabrication units)
- [ ] Save/load via Capacitor SQLite
- [ ] Audio: SFX + procedural music + storm ambience
- [ ] Landing page with R3F globe
- [ ] Mobile-responsive viewport
- [ ] 0 TypeScript errors, Biome clean, all tests pass
