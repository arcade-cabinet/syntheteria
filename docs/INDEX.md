# Syntheteria Documentation Index

> **Syntheteria** is a first-person 4X factory game on a machine planet. You are a broken robot. Grind ore into powder, compress it into physical cubes, carry cubes to your furnace, craft tools and machines, expand territory, and compete against AI civilizations for control of the planet.
>
> The game was **completely redesigned** from a 2.5D top-down RTS to a first-person 3D 4X in early 2026. The GDD series (002-006) and CLAUDE.md are the source of truth for current design.

---

## Current Design (GDD Series)

These documents define the game as it exists now.

| Doc | Topic | Summary |
|-----|-------|---------|
| [FACTORY_PLANET_FPS_REDESIGN](./design/FACTORY_PLANET_FPS_REDESIGN.md) | Transition document | Why the game moved from 2.5D top-down to first-person 3D. The original manifesto. |
| [GDD-002](./design/002-koota-expo-migration.md) | Koota ECS + Expo migration | Koota trait-based ECS, Expo SDK 55/Metro bundler, JSON config system |
| [GDD-003](./design/003-4x-interaction-governors.md) | 4X framework + AI | 4X pillars, contextual interaction (click-to-act), Yuka GOAP governors, race system |
| [GDD-004](./design/004-core-loop-cubes-harvesting.md) | Core game loop | Grind ore -> powder -> compress -> physical cubes -> carry -> furnace -> craft |
| [GDD-005](./design/005-visual-identity-procgen-yuka-vehicles.md) | Visual identity | Procedural panel geometry, PBR materials, faction visual identity, Yuka vehicles |
| [GDD-006](./design/006-cube-building-economy.md) | Cube building + economy | Cube stacking, wall construction, machine assembly, cube-as-currency |

---

## Plans

| Doc | Topic |
|-----|-------|
| [Paper Playtest Findings](./plans/2026-03-10-paper-playtest-findings.md) | Mental walkthrough of full core loop and 4X experience, analyzing 99 systems |
| [Progression & Evolution Design](./plans/2026-03-10-progression-evolution-design.md) | Tech tree deep design, victory conditions, resource chain evolution, threat escalation |

---

## Story

| Doc | Topic |
|-----|-------|
| [Lore Overview](./story/LORE_OVERVIEW.md) | World history, EL, Cultists, geography (partially still relevant) |

---

## Technical

| Doc | Status | Topic |
|-----|--------|-------|
| [Architecture](./technical/ARCHITECTURE.md) | Being rewritten | Build order and implementation status |
| [Core Formulas](./technical/CORE_FORMULAS.md) | Needs review | Power, combat, mining formulas |
| [Reference Builds](./technical/REFERENCE_BUILDS.md) | Outdated | Old drone archetypes (pre-redesign component system) |

---

## Historical (Pre-Redesign)

These documents describe the **old 2.5D top-down RTS** that the game was before the redesign. They are preserved for reference but are **not the current design**. Each has a superseded notice at the top.

| Doc | What it described | Replaced by |
|-----|-------------------|-------------|
| [Game Overview](./design/GAME_OVERVIEW.md) | 2.5D AI consciousness commanding robots | GDD-003, GDD-004 |
| [Core Mechanics](./design/CORE_MECHANICS.md) | Old resource/hacking/power/combat systems | GDD-003, GDD-004 |
| [Consciousness Model](./design/CONSCIOUSNESS_MODEL.md) | AI resource model (energy, compute, signal) | GDD-004 (physical cubes) |
| [Drones](./design/DRONES.md) | Robot repair/enhance, component assembly | GDD-005 (faction bots) |
| [Combat](./design/COMBAT.md) | Cultist combat, component-based damage | GDD-003 (4X faction warfare) |
| [Materials](./design/MATERIALS.md) | Old scavenging/mining/fabrication | GDD-004, GDD-006 (cube economy) |
| [UI Concept](./design/UI_CONCEPT.md) | 2.5D top-down fragmented map UI | FPS HUD (FPSHUD.tsx) |
| [Intro Sequence](./design/INTRO_SEQUENCE.md) | Void awakening, map merging | Otter quest system (config/quests.json) |
| [Implementation Options](./design/IMPLEMENTATION_OPTIONS.md) | Engine evaluation | Decided: R3F + Three.js + Koota + Expo |
| [Open Questions](./design/OPEN_QUESTIONS.md) | Design questions tracker | Most resolved in GDD series |

---

## Implementation Progress

The codebase has **457 source files**, **141 game systems**, **38 JSON config files**, and **165 test files**.

| Area | Systems | Status |
|------|---------|--------|
| **ECS & World** | Koota traits (core, unit, factory, materials, ai), world setup | Done |
| **Core Loop** | harvesting, compression, furnace, cubeStacking, cubePlacement, cubePhysicsModel, harvestCompress, grabber, oreSpawner | Done |
| **Factory** | beltTransport, beltRouting, wireNetwork, wireBuilder, mining, processing, fabrication, furnaceProcessing | Done |
| **Combat** | combat, fpsCombat, damageModel, cubeDamage, cubeAmmo, turret, enemies, cultistAI | Done |
| **4X - Territory** | territory, territoryControl, territoryEffects, territoryVisualization, outpost, fogOfWar, fogOfWarManager | Done |
| **4X - Diplomacy** | diplomacySystem, raidSystem, raidTargeting, tradeRouteSystem, victoryTracking | Done |
| **4X - Economy** | cubeEconomy, economySimulation, resourceFlowTracker, cubePileTracker, otterTrade | Done |
| **AI** | aiCivilization, aiPeacePeriod, botAutomation, botCommand, botFleetManager, formationMovement | Done |
| **Walls & Building** | wallBuilder, wallBuilding, wallPlacement, buildingPlacement, patternMatcher, machineAssembly, gridSnap | Done |
| **Hacking** | hacking, signalNetwork, breachDetection | Done |
| **Input & Camera** | FPSCamera, FPSMovement, FPSInput, ObjectSelectionSystem, inputMapper, cameraSystem | Done |
| **UI** | FPSHUD, CoreLoopHUD, RadialActionMenu, ObjectActionMenu, TitleScreen, PregameScreen, FactionSelect, MapConfig, TechTreePanel, QuestPanel, InventoryView, PowerOverlay, MobileControls | Done |
| **Rendering** | cubeRendererBridge, depositRenderData, botRenderData, cubeMaterialProperties, cubeVisibility | Done |
| **Weather & Environment** | weatherSystem, weatherEffects, stormEscalation, stormForecast, environmentHazards, biomeSystem, weatherStructureBridge | Done |
| **Audio** | audioEventSystem, audioEventIntegration, audioFeedbackMap | Done |
| **Progression** | techTree, techResearch, techEffects, progressionSystem, achievementSystem, questSystem, proceduralQuests, questDialogue, tutorialSystem, discoverySystem | Done |
| **Save/Load** | saveLoad, autosaveSystem, replaySystem | Done |
| **Physics & Spatial** | cubePhysicsModel, structuralCollapse, spatialIndex, navmesh, pathfinding | Done |
| **Interaction** | contextualActions, interactionState, InteractionSystem, actionRegistry, tooltipSystem | Done |
| **Map & Exploration** | mapGenerator, exploration, minimapData, biomeSystem | Done |
| **Misc** | screenShake, compressionJuice, particleEmitterSystem, particleFeedbackMap, notificationSystem, settingsSystem, shelterSystem, undergroundStorage, salvageRecycling, decoyPile, noiseAttraction, waypointSystem | Done |
| **JSON Config** | 38 config files covering all game balance, materials, factions, terrain, audio, rendering | Done |
| **Expo/Metro** | app/ directory with Expo Router, metro.config.js, babel.config.js | Done |

### What Needs Work

| Area | Status |
|------|--------|
| Koota migration (from Miniplex) | In progress — traits defined, systems being migrated |
| Yuka AI integration (GOAP governors, Vehicle steering, NavMesh) | Planned |
| Procedural panel geometry (PanelGeometry.ts, BotGenerator.ts) | Planned |
| MaterialFactory + NormalMapComposer (composable PBR from JSON) | Planned |
| expo-sqlite + Drizzle persistence (native save/load) | Planned |
| Instanced rendering at scale | Planned |
| E2E Playwright test suite expansion | In progress |
