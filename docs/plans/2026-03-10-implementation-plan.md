# Syntheteria Implementation Plan

**Date:** 2026-03-10
**Status:** Active
**Goal:** Ship a playable, visually coherent, narratively grounded first-person 4X factory game

---

## Current State

The prototype is **functional but incoherent**. Core loop works (harvest → compress → carry → build). GOAP governors run. 143/171 test suites pass. But:

1. **UI communicates the wrong game** — generic green terminal, "AWAKEN // CONNECT // REBUILD", no factory/colonization identity
2. **28 test suites fail** from 3 missing config fields (combat, furnace, mining)
3. **Bot AI is stubbed** — Yuka frameworks exist but aren't wired
4. **Alien ecosystem is unreconciled** — Ferrovores and Residuals designed independently
5. **Advanced 4X features are stubs** — walls, raiding, hacking, diplomacy

---

## Phases

### Phase 0: Stabilize (Prerequisite for Everything)

Fix the 3 config schema gaps so tests pass and combat/furnace work at runtime.

| Task | Files | Effort |
|------|-------|--------|
| Add missing combat.json fields (meleeRange, attackChancePerTick, etc.) | config/combat.json | 10 min |
| Add furnace.json defaultMaxHopperSize | config/furnace.json | 5 min |
| Add mining.json powderCapacity | config/mining.json | 5 min |
| Verify all 171 test suites pass | — | 5 min |

### Phase 1: UI/UX Redesign — Communicate the Game

The game's identity must be visible from the first screen. GDD-010 specifies exactly what each screen should be.

**Title Screen Overhaul:**
- Subtitle: "AWAKEN // CONNECT // REBUILD" → something that communicates machine planet + factory
- Visual tone: industrial, mechanical, not just generic terminal green
- Seed input stays but moves into pregame modal (per user feedback)
- Title screen buttons: NEW GAME, CONTINUE, SETTINGS, SPECTATE

**Pregame Lobby (GDD-010):**
- Tabs: PATRON | MAP | RIVALS | SETTINGS (not FACTION | MAP | OPPONENTS)
- Patron selection = choosing home planet AI sponsor (Forge-Mother, The Conductor, The Chorus, The Architect)
- Cards show patron demands, colony passives, stat bars, difficulty ratings
- Detailed patron info panel expands below selected card
- Map config: 5 sizes (TINY→HUGE), 5 types (Pangaea→Fracture), resource density, biome sliders
- Rivals tab: configure AI opponent count and patrons
- "LAUNCH COLONY" button (not "START GAME")

**In-Game HUD Identity:**
- HUD elements should use faction-colored accents, not universal green
- Terminology: "Colony Status" not "Base Status", "Patron Demands" not "Resources"

### Phase 2: Config + Test Stability

Complete config coverage so every system has the data it needs.

| Task | Files |
|------|-------|
| economy.json: full material table, drill tiers, furnace recipes | config/economy.json |
| biomes.json: 5 biomes with resource/movement/visibility modifiers | config/biomes.json |
| Restructure technology.json: universal + per-race branches | config/technology.json |
| Validate all configs with tests | config/__tests__/ |

### Phase 3: Bot AI Integration

Wire Yuka Vehicle steering into actual bot movement.

| Task | Dependency |
|------|-----------|
| BotVehicle.ts: create Yuka Vehicle per bot entity | Phase 0 |
| BotBrain.ts: unit-level GOAP (patrol/attack/flee/guard) | Phase 0 |
| Replace simple pathfinding with Yuka Vehicle + NavMesh | BotVehicle |
| Formation movement (OffsetPursuit + Separation) | BotBrain |

### Phase 4: Alien Ecosystem Reconciliation

Merge Ferrovores + Residuals into unified ecosystem per design intent.

### Phase 5: Visual Identity

PBR materials, procedural geometry, faction-differentiated rendering. Uses asset library at /Volumes/home/assets.

### Phase 6: Advanced 4X Features

Walls, raiding, hacking, diplomacy, fog of war — all have stubs, need completion.

---

## Agent Team Structure

| Role | Scope | Skills |
|------|-------|--------|
| **Team Lead** | Plan execution, task routing, integration, testing | Orchestration |
| **Frontend Designer** | UI/UX redesign per GDD-010, title screen, pregame lobby, HUD identity | React, CSS, R3F |
| **Config Engineer** | JSON configs, schema validation, test coverage | TypeScript, Jest |
| **AI Engineer** | Yuka integration, bot brain, governor refinement | Yuka, GOAP, ECS |
| **Lore Writer** | Alien ecosystem reconciliation, quest scripts | Writing |
| **Systems Engineer** | Wall building, raiding, hacking, advanced 4X | ECS, Rapier |

---

## Execution Rules

1. **Every task has a clear deliverable** — "implement X" not "explore Y"
2. **Every agent gets specific file scope** — no two agents editing the same files
3. **Dependencies are explicit** — blocked tasks don't start until blockers complete
4. **Tests run after every phase** — green suite before moving to next phase
5. **Visual verification via Chrome DevTools MCP** — every UI change verified in browser
