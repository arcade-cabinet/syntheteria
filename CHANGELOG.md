# Changelog

## Final Grind (2026-03-20)

- **Storm sky backdrop** — inverted sphere dome with gradient, horizon plane, no visible map edges
- **Biome scatter models** — rocks on mountains, craters in desert, bones in tundra
- **Roboform improvement overlays** — infrastructure 3D models at level 2+ (pipes, lights, power)
- **Building tier visual variants** — T1/T2/T3 use different model variants
- **Infrastructure connections** — pipe/cable models between networked buildings
- **Complete POI system** — 19 POIs: 5 ruins, 6 hostile, 8 holocrons with lore + gameplay bonuses
- **POI discovery rewards** — resource caches, scan bonuses, map reveals, XP boosts
- **Hostile humans (Epoch 1-2)** — pre-EL antagonist using cult mechanics
- **EL arrival transition (Epoch 3)** — dramatic narrative event converting humans to cult
- **Organic tutorial** — 10 contextual tooltips firing once per game concept
- **Integration tests** — game lifecycle, POI discovery, building chains, human-cult transition, model paths, score/victory

## Current State (2026-03-20)

### DESIGN.md rewrite (latest)

Single-source design doc reconciled with the **near-future Earth** pitch: awakened machine minds, perpetual storm, wormhole eye — not a far-future ecumenopolis city-cover as the default framing.

| Topic | Canon |
|-------|--------|
| Setting | Near-future Earth; natural **8 biomes** (grassland → tundra); **ruins are a POI type**, not terrain |
| POIs | **Three categories:** ruins (positive), hostile (human → cult), holocrons (lore + one-time bonus) |
| Epochs | **1–2:** hostile **human** cities · **3+:** **Cult of EL** after EL arrival |
| Onboarding | **Organic** — contextual tooltips on first encounter; **no modal tutorial** |
| Starting units | **Six functional** robot classes at game start (not a broken-repair loop) |

Root docs ([AGENTS.md](AGENTS.md), [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), this file, [references/HISTORY.md](references/HISTORY.md)) updated to match.

### Metrics

| Metric | Value |
|--------|-------|
| Source files | ~457 |
| Test files | 139 |
| Tests | 2345 |
| TypeScript errors | 0 |
| Biome errors | 0 |
| Config files | 20+ |
| GLB models | 212 |

---

## Recently Completed

### Design Overhaul (Phase 11)

- **Biome terrain** — **8** types (grassland, forest, mountain, water, desert, hills, wetland, tundra) replacing industrial floor types — **not 9**; no “ruins” terrain tile
- **Ruin POIs** — 5 ruin types (depot, factory, outpost, research, military) as discoverable map features, not a biome
- **Hostile POIs** — human cities (Epochs 1–2), cult structures (Epoch 3+); **holocron POIs** — lore + gameplay bonuses
- **Organic tutorial** — contextual first-run tooltips (no modal onboarding)
- **Natural→processed→synthetic resource taxonomy** — 17 materials across 3 tiers
- **Building-driven progression** — tier 1-3 upgrades per building, replaces centralized tech tree
- **Building→building unlock chains** — prerequisite system gates construction
- **Per-building management modals** — React DOM panels replacing radial menu
- **Analysis Node** — passive accelerator replacing Research Lab concept
- **6 victory conditions** — domination, network supremacy, reclamation, transcendence, cult eradication, score
- **Epoch transition events** — 5 epochs with storm escalation, cult mutation caps
- **Cultist scripted encounters** — 8 trigger types wired via `cultEncounterDefs.ts`

### Infrastructure

- **Balance harness** — multi-tier AI-vs-AI diagnostic runs (10t/100t/200t/1000t)
- **Config registry** — `getConfig()`/`setConfigOverride()` typed API with override support
- **Capacitor SQLite** — replacing sql.js in production (web, Android, iOS)
- **Android + iOS platform setup** — Capacitor with debug APK CI workflow
- **CI/CD** — GitHub Actions for quality gates + Android debug builds
- **Zero backward compatibility** — all legacy aliases removed
- **Documentation consolidation** — flat root-level docs replacing nested `docs/` tree

### Rendering & Architecture

- **Phaser + enable3d board** — Scene3D replaces R3F for match rendering
- **R3F title globe** — retained for title/setup/generating phases
- **`src/rendering/` eliminated** — decomposed into `views/`, `lib/`, `config/`, `input/`
- **`src/view/` → `src/views/title/`** — legacy R3F view migrated
- **Views unification** — `views/title/` (R3F) + `views/board/` (Phaser)
- **Import gates** — `scripts/check-imports.sh` enforces sim/view boundary

### AI

- **10 GOAP evaluators** — all productive, idle at 0.05 floor
- **5-state FSM** — EXPLORE → EXPAND → FORTIFY → ATTACK ↔ RETREAT
- **Steering behaviors** — flocking, evasion, pursuit, wander
- **Auto-building, auto-synthesis, auto-fabrication** — AI economy self-sustaining
- **Per-faction personality biases** — measurably different behavior

---

## What Works

### Core Systems (all passing tests)

- Turn system with multi-phase resolution (player → AI → environment → new turn)
- Resource system (17 materials, add/spend, faction pools)
- Harvest system (salvage props → materials pipeline)
- Building placement (15 structure types, adjacency rules, starter placement)
- Building upgrade system (tier 1-3 per building)
- Attack/combat (component damage, retaliation)
- Fog of war (vision radius reveal)
- Victory conditions (6 paths + elimination defeat)
- Diplomacy (standing, trade, alliances)
- Score system (weighted faction scoring)
- Epoch system (5 epochs, tech tier gating)

### AI Systems

- Yuka GOAP with 10 evaluators
- Faction FSM macro strategy
- Cult AI with 3 sects and escalation stages
- Steering behaviors (flocking, evasion, pursuit)
- NavGraph A* pathfinding
- Auto-building, auto-synthesis, auto-fabrication
- Track selection per faction personality

### Rendering

- Phaser + enable3d board (playing phase)
- R3F title globe (title/setup/generating phases)
- Speech bubbles (both Phaser sprite and R3F Html paths)
- DOM label projection
- Lighting recipe locked (ambient, directional, accent, fog)

### Infrastructure

- Vitest: 139 files, 2345 tests
- Biome lint: 0 errors
- TypeScript: 0 errors
- Config registry with override API
- Capacitor SQLite persistence
- Balance harness (multi-tier)

---

## What's Next

- Terrain blending at biome edges (vertex color interpolation) and forest canopy depth
- Elevation drama (discrete height steps, cliff faces) and ocean layering polish
- Further balance iteration via harness and wider faction personality spread
- Production APK signing and store release pipelines
- Time-based escalation tuning on GOAP evaluators

---

## Historical Phases

### Phase A-H: Repository Hygiene → Cleanup (completed)

Squash PR workflow, views/ unification, import gates, POC lock-in, epoch/cult presentation, config consolidation, legacy renderer cleanup, `src/rendering/` elimination.

### Phase I: Design Overhaul (mostly completed)

Biome terrain, resource taxonomy, overworld generator, building-driven progression, unlock chains, per-building modals, victory conditions, cultist encounters, Capacitor + CI/CD. Remaining: visual roboforming overlays (11.8).

See [references/archive/CLOUD_AGENT_RUNBOOK.md](references/archive/CLOUD_AGENT_RUNBOOK.md) for full phase history.
