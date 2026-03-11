# Syntheteria — Remaining Work Specification

> **Single source of truth** for all incomplete work. Consolidates and replaces:
> all docs/plans/, .ralph-tui/ PRDs, and .kiro/specs/ task lists.
>
> **Last updated:** 2026-03-11
> **Codebase state:** 256 test suites, 7,594 tests passing, 552 source files, zero TS errors

---

## How to Use This Document

Each section is a **workstream** — a coherent chunk of related work. Within each workstream,
items are ordered by dependency. Items marked `[CRITICAL]` block gameplay. Items marked
`[HIGH]` significantly impact quality. Items marked `[MEDIUM]` add depth. Items marked
`[LOW]` are polish.

**When work is completed, check the box and note the commit SHA.**

---

## 1. Rendering Pipeline — Wire Procgen to R3F Scene `[CRITICAL]`

All procedural geometry generators exist and are tested, but none render in the live scene.
The game currently shows placeholder geometry.

- [ ] **1.1** Wire `PanelGeometry.ts` (563 lines) into R3F rendering for buildings/machines
- [ ] **1.2** Wire `BotGenerator.ts` + `BotParts.ts` (1,238 lines) into R3F for faction bots
- [ ] **1.3** Wire `BuildingGenerator` into R3F for building entities
- [ ] **1.4** Wire `InstancedCubeRenderer.tsx` (387 lines) into R3F scene for cube stockpiles
- [ ] **1.5** Replace remaining `meshLambertMaterial` with `MeshStandardMaterial` (PBR)
- [ ] **1.6** Drive `MaterialFactory` from JSON specs (currently some hardcoded materials)
- [ ] **1.7** Verify HDRI environment lighting in live scene
- [ ] **1.8** Wire `OreDepositGenerator` (672 lines) into R3F for deposit rendering

**Files:** `src/rendering/`, `src/rendering/procgen/`, `src/rendering/materials/`
**Tests:** Unit tests exist for generators; need integration with R3F scene

---

## 2. AI Economy — Real Entities, Not Abstract Counters `[CRITICAL]`

AI civilizations produce abstract resource counters but don't create real ECS entities.
The physical cube economy — the game's core differentiator — is player-only.

- [ ] **2.1** AI-produced cubes must spawn as real Rapier rigid body entities at faction bases
- [ ] **2.2** AI bots must interact with deposits (walk to, harvest, compress, carry)
  - At minimum: passive cube generation spawns REAL cubes at faction base
  - Full: AI bots run the harvest→compress→carry pipeline like the player
- [ ] **2.3** Build Commander layer: translate governor directives into bot orders via `actionToOrder()`
- [ ] **2.4** AI production planning: "I need X cubes of Y material to build Z"
- [ ] **2.5** AI should evaluate territory value (deposit-aware site selection for outposts)
- [ ] **2.6** Connect `economySimulation.ts` to real cube economy data

**Source:** Gap analysis gaps #7, #8, #20-25; Paper playtest §1.1

---

## 3. AI Combat & Diplomacy `[CRITICAL]`

Combat is feral-vs-player only. AI factions can't fight each other or negotiate meaningfully.

- [ ] **3.1** Remove faction filter from `combat.ts` — enable all hostile faction pairs
- [ ] **3.2** Add `declareWar(factionA, factionB)` — sets opinion to -100, enables combat
- [ ] **3.3** Connect GOAP `LaunchRaid` → Commander → `planRaid()` (raid system is complete but nothing calls it)
- [ ] **3.4** AI trade proposals: evaluate resource needs instead of hardcoded `scrapMetal:10 / eWaste:5`
- [ ] **3.5** `acceptTrade()` must transfer actual resources between factions (currently only modifies opinion)
- [ ] **3.6** Faction-specific AI strategies: Reclaimers hoard, Volt attacks early, Signal hacks, Iron turtles
- [ ] **3.7** AI tech tree usage: GOAP `ResearchTech` must trigger real `techResearch.ts`

**Source:** Gap analysis gaps #9-11, #21-22, #26-30

---

## 4. Faction Differentiation `[HIGH]`

All factions play and look identically. Design docs define unique units, buildings, and visual identity.

- [ ] **4.1** Implement 12 unique units (3 per faction) from GDD-007
- [ ] **4.2** Implement 8 unique buildings (2 per faction) from GDD-007
- [ ] **4.3** Per-faction visual identity: materials, emissive colors, bot head styles
- [ ] **4.4** Faction-colored HUD accents when playing as each faction
- [ ] **4.5** Tactical AI: flanking, retreat, terrain usage
- [ ] **4.6** Siege mechanics: wall-breaching behavior for AI
- [ ] **4.7** Hacking warfare: Signal Choir should heavily favor hack attacks
- [ ] **4.8** Formation combat: wire `FormationSystem.ts` into AI combat

**Source:** Gap analysis gaps #26-35; GDD-007 race design

---

## 5. Victory & Pacing `[HIGH]`

Victory conditions are in config but not evaluated. No difficulty scaling or pacing.

- [ ] **5.1** Victory progress tracking: evaluate all 6 conditions per faction per tick
  - `config/victory.json` defines conditions; `gameOverDetection.ts` currently only checks quest completion + bot death
- [ ] **5.2** Victory progress UI panel (show faction progress toward each condition)
- [ ] **5.3** Storm escalation: 5-phase progression (Calm → Convergence) with time-based triggers
- [ ] **5.4** Wealth-based raid scaling (RimWorld-style: `raidStrength = cubeCount * 0.5 + buildingCount * 2 + techLevel * 10`)
- [ ] **5.5** AI aggression curves: per-faction timers controlling when scouting/raiding/assault unlocks
- [ ] **5.6** Pacing/storyteller: cooldown-based event scheduling with tension curves

**Source:** Gap analysis gaps #14-19; Progression design doc §3, §6

---

## 6. World Responsiveness `[HIGH]`

Weather, hazards, and ancient machines are designed but don't affect gameplay.

- [ ] **6.1** Weather gameplay effects: storms → lightning rod output, rain → movement/visibility, fog → perception range
- [ ] **6.2** Environmental hazards: acid rain, magnetic storms, sinkholes
- [ ] **6.3** Ancient machine awakening: Sentinels, Crawlers, Colossus (from GDD-008)
- [ ] **6.4** AI perception of cube stockpiles — enemies "see" wealth, attract raids proportionally
- [ ] **6.5** Territory border visualization — render faction borders on terrain
- [ ] **6.6** Cube material gameplay differentiation: different compression times, wall strength, stack behavior
- [ ] **6.7** Cube count indicators: floating world-space labels on cube piles

**Source:** Gap analysis gaps #36-40; Paper playtest §3.2, §3.3

---

## 7. UI/UX Overhaul `[HIGH]`

Current UI is functional but text-heavy. Needs shaders, faction art, portraits, and modern game design.

- [ ] **7.1** Faction patron portraits and selection card art (pregame PATRON tab)
- [ ] **7.2** Shader-based UI effects (scanlines, holographic overlays, glitch transitions)
- [ ] **7.3** In-game minimap rendering (`minimapData.ts` exists, no rendering)
- [ ] **7.4** Crosshair feedback loop: switch between 5 crosshair styles based on raycast target
- [ ] **7.5** Contextual tooltips on hover (entity name, distance, available actions)
- [ ] **7.6** Tech tree visualization UI panel
- [ ] **7.7** Otter hologram visual treatment (holographic projection effect, speech bubbles)
- [ ] **7.8** First-5-minutes onboarding experience design
- [ ] **7.9** Tutorial waypoint markers + target object highlighting

**Source:** Paper playtest §2.1-2.5; User feedback "just text"

---

## 8. System Integration Wires `[MEDIUM]`

Many system-to-system event wires are missing. The event bus is underutilized.

- [ ] **8.1** Wire core systems → `audioEventSystem`: grinding, compression, smelting, dropping, combat sounds
- [ ] **8.2** Wire core systems → `particleEmitterSystem`: sparks, steam, dust, impact particles
- [ ] **8.3** Wire `weatherSystem` → gameplay: movement speed, visibility, combat accuracy modifiers
- [ ] **8.4** Wire `biomeSystem` → `movement`: terrain speed modifiers
- [ ] **8.5** Wire `biomeSystem` → `oreSpawner`: deposit type distribution by biome
- [ ] **8.6** Wire `progressionSystem` → `hudState`: XP bar updates
- [ ] **8.7** Wire `diplomacySystem` → event bus: diplomacy_changed events
- [ ] **8.8** Wire `techTree` → `craftingSystem`: recipe unlocks gated by tech level
- [ ] **8.9** Event bus audit: verify all 10 defined events have emitters + subscribers

**Source:** Paper playtest §4 integration matrix (27 missing wires)

---

## 9. Architecture Migration `[MEDIUM]`

Migration to Koota ECS and Expo is scaffolded but not complete.

- [ ] **9.1** Full Koota ECS migration: replace Miniplex entity types/queries with Koota traits
  - Bridge exists at `src/ecs/koota/bridge.ts`, traits started in `src/ecs/koota/`
  - ~30 system files need query migration
- [ ] **9.2** Expo SDK 55 native builds: verify iOS and Android builds compile and run
- [ ] **9.3** expo-sqlite game.db: verify native persistence works alongside IndexedDB web path
- [ ] **9.4** Drizzle ORM schema for game save data

**Source:** CLAUDE.md "Architecture Migration" checklist

---

## 10. Content & Lore `[MEDIUM]`

Designed content not yet implemented.

- [ ] **10.1** Alien ecosystem reconciliation: merge Ferrovores + Residuals into unified fauna
- [ ] **10.2** Ancient Sentinel encounters (mid-game environmental threat)
- [ ] **10.3** Recipe expansion: more furnace recipes, fabrication chains
- [ ] **10.4** Procedural quest variety beyond the 27 otter quests
- [ ] **10.5** Lore entries: discoverable world lore pieces

**Source:** GDD-008 alien natives; Progression design doc §8

---

## 11. Performance & Polish `[LOW]`

- [ ] **11.1** Entity pooling for cubes, projectiles, particles
- [ ] **11.2** LOD system for distant terrain/buildings
- [ ] **11.3** Culling optimization (frustum + occlusion)
- [ ] **11.4** Physics optimization: spatial partitioning for large cube counts
- [ ] **11.5** AI debug overlay: visualization of GOAP goals, plans, weights
- [ ] **11.6** Replay system: make `replaySystem.ts` functional
- [ ] **11.7** Day/night cycle
- [ ] **11.8** Localization framework

---

## 12. Spectator & Testing `[LOW]`

- [ ] **12.1** AI-vs-AI spectator mode (camera control, faction overview, speed controls)
- [ ] **12.2** Headed Chrome E2E playtesting (visual verification of full game loop)
- [ ] **12.3** Performance profiling under load (100+ cubes, 4 AI factions, full systems)

---

## Reference: Design Documents

These GDDs remain the source of truth for design decisions and are NOT task lists:

| GDD | Topic | Status |
|-----|-------|--------|
| 002 | Koota ECS + Expo/Metro migration | Active — migration ongoing |
| 003 | 4X framework, contextual interaction, governors | Active |
| 004 | Core game loop — harvesting, cubes, compression | Active |
| 005 | Visual identity — procgen, Yuka vehicles, PBR | Active |
| 006 | Cube building economy | Active |
| 007 | Lore and narrative | Active |
| 007-race | Race design (4 factions) | Active |
| 008 | Alien natives | Active |
| 009 | Governor architecture | Active |
| 010 | Pregame lobby | Active — UI implemented |
| 011 | Victory conditions | Active |
| 012 | Economy balance | Active |
| 013 | Combat system | Active |
| 014 | Environment systems | Active |
| COLONIZATION-MODEL | Colony framing | Active |
| FACTORY_PLANET_FPS_REDESIGN | Original FPS redesign | Reference |

Research/analysis docs preserved in `docs/design/`:
- `4x-research-analysis.md` — Comparative analysis of Civ VI, Stellaris, AoE IV, Factorio, RimWorld
- `progression-evolution-design.md` — 5-act player journey, tech tree deep design, retention hooks

---

## Summary

| Priority | Workstreams | Items |
|----------|------------|-------|
| CRITICAL | 1 (Rendering), 2 (AI Economy), 3 (AI Combat) | 21 items |
| HIGH | 4 (Factions), 5 (Victory), 6 (World), 7 (UI/UX) | 30 items |
| MEDIUM | 8 (Integration), 9 (Migration), 10 (Content) | 18 items |
| LOW | 11 (Performance), 12 (Spectator) | 11 items |
| **Total** | **12 workstreams** | **80 items** |

Critical path: Rendering pipeline (§1) and AI economy (§2) unblock the most downstream work.
