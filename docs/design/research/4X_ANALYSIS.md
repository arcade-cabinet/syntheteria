# 4X Game Design Research — Comparative Analysis

**Date:** 2026-03-10
**Purpose:** Inform Syntheteria's governor design by analyzing established 4X games

---

## Implementation Status Audit (2026-03-11)

> Cross-referenced against codebase state: 256 test suites, 7,594 tests passing, 552 source files.
> Annotations below track which recommendations have been adopted, rejected, or remain pending.

---

## Games Analyzed

1. **Civilization VI** — Turn-based 4X
2. **Stellaris** — Real-time 4X
3. **Age of Empires IV** — RTS-4X hybrid
4. **Factorio** — Factory builder with 4X elements
5. **RimWorld** — Colony sim with adaptive AI storyteller

---

## Key Takeaways for Syntheteria

### 1. Factorio's Cascading Dependency Loop is Our Model

The harvest→compress→carry→build cycle should create cascading demand:
- Need cubes → need powder → need deposits → need territory → need defense
- Each step creates demand for the previous step at increasing scale
- This is exactly what makes Factorio addictive — every "solution" creates 2-3 new "problems"

> **[ADOPTED - IMPLEMENTED]** The full cascade chain exists: `harvesting.ts` / `harvestCompress.ts` (grind deposits) -> `compression.ts` / `compressionJuice.ts` (compress powder to cubes) -> `grabber.ts` (carry cubes) -> `furnaceProcessing.ts` (process in furnace) -> `buildingPlacement.ts` (build). Belt transport (`beltTransport.ts`, `beltRouting.ts`) automates the carry step. `mining.ts` for outpost extraction. `techResearch.ts` gates progression. Territory (`territory.ts`, `territoryControl.ts`) drives expansion. All tested and registered in game loop.

### 2. RimWorld's Wealth-Based Threat Scaling is Perfect for Cube Economy

- Colony wealth drives raid difficulty (buildings count at 50%)
- Creates the "success paradox" — prosperity makes you a bigger target
- **Syntheteria parallel:** visible cube stockpiles ARE your wealth, enemies should target them proportionally
- Skilled players practice "wealth management" — don't over-stockpile

> **[ADOPTED - PARTIALLY DONE]** `cubeVisibility.ts` tracks cube pile visibility, size, value, and "attractiveness" score for AI targeting. `cubePileTracker.ts` tracks pile locations. `raidTargeting.ts` selects raid targets. `decoyPile.ts` enables strategic deception. `undergroundStorage.ts` lets players hide wealth. However, the **wealth-to-raid-strength scaling formula** (REMAINING-WORK.md 5.4) is not yet implemented -- raids happen but their strength is not proportional to visible wealth.

### 3. Physical/Visible Economy is Our Biggest Differentiator

No other 4X makes resources this tangible. Factorio comes closest (items on belts), RimWorld second (stockpile stacks). But cubes that enemies can SEE and STEAL creates strategic tension abstract counters never can.

> **[ADOPTED - IMPLEMENTED]** Physical cubes are real 0.5m Rapier rigid bodies (`cubePhysicsModel.ts`). Stacking physics (`cubeStacking.ts`, `structuralCollapse.ts`). Belt transport moves real 3D cubes. `InstancedCubeRenderer.tsx` wired in GameScene for rendering 5000+ cubes. 15 cube materials with PBR treatment (`CubeMaterialProvider.tsx`, `cubePBRMaterials.json`). AI cubes also spawn as real entities. This recommendation is fully adopted as the core design pillar.

### 4. GOAP for AI Governors Aligns with Industry Best Practice

The hierarchical manager pattern (Grand Strategic AI delegates to Expansion/Military/Economic/Research managers) is used across all successful 4X AI. GOAP with A*-planned action sequences produces more coherent behavior than rule-based systems. Confirmed by F.E.A.R. and Total War implementations.

> **[ADOPTED - PARTIALLY DONE]** `GOAPPlanner.ts` implements A*-based GOAP planning. `CivilizationGovernor.ts` with 4 faction profiles. `GovernorActionExecutor` translates GOAP actions to bot orders via `actionToOrder()`. `governorSystem.ts` wired to game loop. `BotBrain.ts` + `UnitBrain.ts` for unit-level AI. `ThreatAssessment.ts` for strategic evaluation. **Remaining:** GOAP planner doesn't yet connect `LaunchRaid` to the raid system (REMAINING-WORK.md 3.3); AI production planning incomplete (2.4); no faction-specific strategies (3.6).

### 5. Common AI Failures to Avoid

Every game studied has these AI weaknesses:
- Over-deterministic behavior (same inputs → same outputs) — add randomization
- Failure to evaluate consequences before declaring war
- Reliance on resource bonuses at higher difficulty, NOT improved decision-making
- Poor siege/complex-unit management
- Inability to exploit expansion mechanics designed for human thinking

> **[ACKNOWLEDGED - PARTIALLY ADDRESSED]** Governor profiles include personality weights that vary by faction (not identical). `BotBrain.ts` uses state-based decision making with perception. However: no explicit randomization layer on GOAP decisions; no war consequence evaluation before `declareWar()` (REMAINING-WORK.md 3.2); difficulty still relies on resource bonuses not smarter AI; no siege mechanics (4.6); expansion AI doesn't evaluate territory value (2.5). These anti-patterns remain risks.

### 6. Onboarding Through Core Loop, Not Front-Loading

Don't present all systems simultaneously. Start with grind→compress→build-one-thing. Each crafted item naturally introduces the next system. 10-16% retention improvements from better onboarding (Google Play data).

> **[ADOPTED - IMPLEMENTED]** `tutorialSystem.ts` implements exactly this: 10 progressive steps (move -> look -> grind -> compress -> grab -> carry -> furnace -> craft -> build -> territory). `tutorialOtterBridge.ts` wires step dialogue to otter hologram speech. `questDialogue.ts` drives quest-guided progression. **Remaining:** visual verification needed; otter rendering depends on texture assets (REMAINING-WORK.md 7.7, 7.8, 7.9).

---

## Essential Mechanics Tiers

### Tier 1: Required for 4X (must have)

| System | Best Implementation | Original Status | **2026-03-11 Status** |
|--------|--------------------|--------------------|----------------------|
| Map Exploration / Fog of War | Stellaris (anomalies, escalating discovery) | Implemented (fogOfWar.ts) | **IMPLEMENTED** -- `fogOfWar.ts`, `fogOfWarManager.ts`, `exploration.ts`, `discoverySystem.ts`. Registered in game loop. Tested. |
| Territory Claiming | Civ VI (districts physically occupy tiles) | Implemented (territory.ts + outpost.ts) | **IMPLEMENTED** -- `territory.ts`, `territoryControl.ts`, `territoryEffects.ts`, `outpost.ts`, `territoryVisualization.ts`. Registered in game loop. Tested. |
| Resource Economy | Factorio (physical, visible) | Core exists (cubes), integration missing | **IMPLEMENTED** -- Physical cubes as Rapier rigid bodies. Full pipeline: harvest -> compress -> grab -> belt -> furnace -> build. `resources.ts`, `economySimulation.ts`, `cubeEconomy.ts`. AI cubes spawn as real entities. |
| Technology/Research Tree | Civ VI (dual tree with Eureka boosts) | Implemented (techTree.ts) | **IMPLEMENTED** -- `techTree.ts`, `techResearch.ts`, `techEffects.ts`, `config/technology.json`, `TechTreeScreen.tsx`. AI research via `GovernorActionExecutor`. All tested. |
| Military/Combat | AoE4 (hard counters) | Implemented (combat.ts, fpsCombat.ts) | **IMPLEMENTED** -- `combat.ts`, `fpsCombat.ts`, `turret.ts`, `hacking.ts`, `BotBrain.ts`, `FormationSystem.ts`, `config/combat.json`. Melee + ranged + hacking. All tested. |
| Multiple Victory Paths | Civ VI (5-6 conditions) | Basic (gameOver.ts), needs expansion | **IMPLEMENTED** -- `victoryConditionEvaluator.ts` evaluates 8 conditions (colonial, domination, economic, technology, diplomatic, integration, survival, story). Hold timers, tiebreakers, per-faction. `config/victory.json`. Tested. **Missing:** UI panel (REMAINING-WORK.md 5.2). |

### Tier 2: Creates Depth

| System | Best Implementation | Original Status | **2026-03-11 Status** |
|--------|--------------------|--------------------|----------------------|
| AI with Personality | Stellaris (ethics-driven types) | Partial (GOAP exists, broken) | **PARTIALLY DONE** -- `CivilizationGovernor.ts` with 4 faction profiles (Reclaimer, Volt, Signal, Iron). `governorSystem.ts` wired to game loop. `GovernorActionExecutor` translates actions to orders. **Still missing:** faction-specific strategies (REMAINING-WORK.md 3.6), GOAP-to-raid pipeline (3.3). |
| Diplomacy | Civ VI (agendas + delegation) | Basic (diplomacySystem.ts) | **PARTIALLY DONE** -- `diplomacySystem.ts` registered in game loop. `config/diplomacy.json`. `tradeRouteSystem.ts` exists. **Missing:** real resource transfer in trades (REMAINING-WORK.md 3.5), war declaration with consequence eval (3.2). |
| Economic Specialization | Civ VI (district adjacency) | Not implemented | **NOT STARTED** -- No district/adjacency system. `cubeMaterialProperties.ts` has per-material gameplay data but no specialization mechanic. See REMAINING-WORK.md 6.6. |
| Threat Scaling | RimWorld (wealth-based) | Not implemented | **PARTIALLY DONE** -- `cubeVisibility.ts` tracks pile attractiveness for AI raids. `raidTargeting.ts` selects targets. `cubePileTracker.ts` monitors wealth. **Missing:** `raidStrength = f(cubeCount, buildingCount, techLevel)` formula (REMAINING-WORK.md 5.4). |
| Progressive Unlocks | Factorio (science pack tiers) | Tech tree exists, not gated properly | **PARTIALLY DONE** -- Tech tree with tiers in `config/technology.json`. `techEffects.ts` applies bonuses. **Missing:** recipe gating by tech level (REMAINING-WORK.md 8.8). |

### Tier 3: Elevates

| System | Best Implementation | Original Status | **2026-03-11 Status** |
|--------|--------------------|--------------------|----------------------|
| Physical/Visible Economy | Factorio (items on belts) | Core differentiator — cubes ARE this | **IMPLEMENTED** -- Full physical cube pipeline. `InstancedCubeRenderer.tsx` in GameScene. 15 PBR material types. Rapier rigid bodies. Belt transport. This is the core design pillar. |
| Emergent Narratives | RimWorld (storyteller + psychology) | Otter holograms, needs expansion | **PARTIALLY DONE** -- `questSystem.ts`, `proceduralQuests.ts`, `questDialogue.ts` (27 otter quests). `tutorialOtterBridge.ts` wires otter speech. `OtterRenderer.tsx`, `HologramRenderer.tsx`. **Missing:** storyteller/pacing system (REMAINING-WORK.md 5.6), more quest variety (10.4). |
| Asymmetric Factions | AoE4 (aggressive asymmetry) | 4 races defined, not differentiated in gameplay | **NOT STARTED** -- 4 faction profiles in governor. `config/civilizations.json`, `config/factionVisuals.json`. No unique units (REMAINING-WORK.md 4.1), no unique buildings (4.2), no per-faction visual identity in rendering (4.3). |
| Crisis/Endgame Events | Stellaris (galaxy threats) | Not implemented | **PARTIALLY DONE** -- `stormEscalation.ts` implements 5-phase storm lifecycle (calm -> brewing -> active -> surge -> aftermath). `environmentHazards.ts` has 5 hazard types. **Missing:** Stellaris-style endgame crisis, ancient machine awakening (REMAINING-WORK.md 6.3). |
| Adaptive Pacing | RimWorld (storyteller evaluates colony) | aiPeacePeriod.ts exists, disconnected | **PARTIALLY DONE** -- `aiPeacePeriod.ts` exists. `stormEscalation.ts` escalates over game time. `economySimulation.ts` tracks per-faction GDP. **Missing:** cooldown-based event scheduling / tension curves (REMAINING-WORK.md 5.6). |
| Spatial Puzzles | Civ VI (district adjacency) | Cube stacking IS a spatial puzzle | **IMPLEMENTED** -- `cubeStacking.ts`, `structuralCollapse.ts` (461 lines). Physical cube stacking with Rapier. `wallBuilding.ts`, `wallPlacement.ts` for defensive construction. Tested. |

---

## Detailed Game Analysis

### Civilization VI

**Districts:** Cities occupy multiple tiles through districts (Campus, Industrial Zone, etc.). Each gets adjacency bonuses from terrain and neighbors. Limited to one district per 3 population, forcing specialization. Can be pillaged by enemies.

**Dual Progression:** Science drives Technology tree; Culture drives Civics tree. Civics unlock Policy Cards and Government types. "Eureka Moments" (boosts) accelerate 50% when completing specific in-game actions.

**Government & Policy Cards:** Government types provide slot configurations (Military, Economic, Diplomatic, Wildcard). Cards swappable free when Civic completes. Creates "deck-building" feel.

**Three Resource Types:**
- Bonus (Wheat, Deer): improve yields
- Luxury (Silk, Diamonds): provide Amenities, tradeable
- Strategic (Iron, Horses, Oil): required for specific military units

**Amenities & Housing:** Amenities per-city (1 per 2 citizens after first 2). Housing caps population growth. Sources: freshwater, buildings, improvements.

**Loyalty (Rise and Fall):** Cities have loyalty score; low loyalty → Free City → may flip to rival. Governors increase loyalty.

**Victory Conditions:** Science (Mars colony), Culture (tourism dominance), Domination (all capitals), Religion (majority in all civs), Diplomacy (20 Victory Points), Score (fallback).

**AI Weaknesses:** Cannot wage naval/air war effectively. Poor war consequence evaluation. Relies on yield bonuses at higher difficulty, not better decisions. Can't exploit DLC mechanics.

### Stellaris

**Pop-Based Economy:** Pops work Jobs created by Districts and Buildings. Job tiers: Ruler > Specialist > Worker. Buildings don't produce without pops. Economy is fundamentally pop-driven.

**Resources:** Energy Credits (currency), Minerals (building), Food (growth), Alloys (ships), Consumer Goods (specialist upkeep). Strategic: Volatile Motes, Rare Crystals, Exotic Gases. Abstract: Unity, Influence, Research.

**Expansion:** Requires Influence (limited) to claim systems. Colonization needs colony ships (Alloy-expensive). Administrative capacity creates sprawl penalties.

**Intel System:** 0-100 across categories (Government, Military, Diplomatic, Economic, Technology). Spy networks require Envoys. Without intel, rival borders/fleets/stances hidden.

**Anomalies:** 5% base chance per body surveyed, +0.5% per failure. Range from minor bonuses to precursor chain storylines spanning entire game.

**Crises:** Midgame (War in Heaven, Great Khan). Endgame (Prethoryn Scourge, Unbidden, Contingency). "Become the Crisis" lets player BE the threat.

**Megastructures:** Dyson Sphere, Ring World, Science Nexus, etc. Years to build. Late-game economic triumph.

**AI:** Personality types from ethics/traits/government. Aggressiveness affects war declaration. "War preparation" phases before declaring.

### Age of Empires IV

**Villager Economy:** Universal worker. Food efficiency tiers: sheep > deer > berries > boar > farms. Creates decision sequences.

**Landmark Age-Up:** Choose between two Landmark buildings per age transition. Distinct asymmetric bonuses. Makes aging up a strategic decision.

**Aggressive Asymmetry:** Mongols move buildings. English get longbows + farm bonuses. Chinese use dynasty bonuses + tax. Delhi gets free but slow research. HRE uses relics for economy.

**Stone Walls:** Invulnerable to most attacks; only siege weapons breach. Infantry on walls get damage reduction. Clear attacker/defender asymmetry.

### Factorio

**Science Pack Escalation:** 7 tiers of increasing complexity. Each requires automating ALL previous tiers' components. Compound complexity.

**Three Logistics Paradigms:**
- Belts: Simple, visual, throughput-limited, short/medium distance
- Trains: High throughput, long distance, require signaling
- Robots: Flexible routing, easy setup, CPU-intensive at scale

**Biter Evolution:** Pollution from factories spreads. Nests absorb pollution → send attacks. Evolution Factor increases from: pollution, time, nests destroyed. Higher evolution → tougher variants. Direct feedback loop: bigger factory → stronger enemies.

**Physical Economy:** Items exist on belts, in chests, in machines. Bottlenecks diagnosed visually. The economy is never abstract.

### RimWorld

**Storyteller AI:** Cassandra (rising tension), Phoebe (peaceful intervals), Randy (unpredictable). Evaluate: colony wealth, colonist count, combat animals, recent deaths, time since last event.

**Wealth-Based Raids:** Raid points from total wealth (buildings 50%) + colonist count. "Success paradox" — prosperity = bigger target.

**Colonist Needs/Moods:** 0-100% scale. Mental break thresholds at 35%, 20%, 5%. Needs: Food quality, Rest, Comfort, Beauty, Recreation (20+ types with tolerance decay), Social, Temperature.

**Expectations Paradox:** Under 15k wealth: +30 mood. At 308k wealth: 0 bonus. Wealthy colonies need finer amenities or colonists become unhappy despite abundance.

---

## Why Players Bounce Off 4X Games

1. **Information Overload** — Too many systems presented simultaneously
2. **Decision Paralysis** — Can click buttons but don't understand WHY one choice is better
3. **Mid-Game Stagnation** — Best part is first 100 turns; once map known, becomes spreadsheet
4. **Session Length** — 6-20+ hours; players who bounce early never see mid/late systems
5. **Mitigation:** Gradual system introduction, narrative framing, hybridization, shorter formats

> **[MITIGATION STATUS]**
> - *Gradual introduction:* **ADOPTED** -- 10-step tutorial introduces systems one at a time (tutorialSystem.ts). Otter guide provides personality-driven onboarding.
> - *Narrative framing:* **PARTIALLY DONE** -- Colony mission briefing in pregame. Otter quest progression (27 quests). Lore in design docs but not yet surfaced in-game (REMAINING-WORK.md 10.5).
> - *Hybridization:* **ADOPTED** -- First-person FPS view + factory automation + 4X strategy is inherently hybrid. Real-time with pause.
> - *Shorter formats:* **PENDING** -- Map presets exist (`config/mapPresets.json`) including small maps, but no explicit "quick game" mode.

---

## The "Feel Complete" Formula

A 4X that feels complete needs:

| # | Requirement | **2026-03-11 Status** |
|---|-------------|----------------------|
| 1 | **Strong early-game hook** — exploration, discovery, survival | **PARTIALLY DONE** -- Tutorial with otter guide (10 steps), fog of war, biome diversity (4 types), discovery system. Core loop (grind-compress-carry) is satisfying if compression juice works. Missing: visual wow moments (procgen not wired to R3F), live build verification. |
| 2 | **Mid-game systems creating NEW decision types** | **PARTIALLY DONE** -- Tech tree gates progression. Belt automation changes gameplay from manual carry. Building placement, power networks, signal networks add complexity. Missing: recipe gating by tech, fabrication chains, mid-game narrative events. |
| 3 | **Late-game crisis/pressure** | **PARTIALLY DONE** -- `stormEscalation.ts` (5-phase escalation). `environmentHazards.ts` (5 hazard types). `victoryConditionEvaluator.ts` creates endgame tension. Missing: Stellaris-style crisis events, ancient machine awakening (REMAINING-WORK.md 6.3). |
| 4 | **Visible progress** — SEE empire growth | **PARTIALLY DONE** -- Physical cube stockpiles ARE visible wealth. `InstancedCubeRenderer` shows cube piles. Territory system tracks expansion. Missing: territory border visualization (REMAINING-WORK.md 6.5), minimap rendering (7.3), victory progress panel (5.2). |
| 5 | **Meaningful rivalry** — AI feels intelligent and reactive | **NOT YET ACHIEVED** -- Governor infrastructure exists but AI doesn't run full game loop. No faction-vs-faction combat. No GOAP-to-raid pipeline. This is the single biggest gap. See REMAINING-WORK.md 2.2, 3.1-3.6. |
| 6 | **Multiple viable strategies** — no single dominant path | **PARTIALLY DONE** -- 8 victory conditions (colonial, domination, economic, technology, diplomatic, integration, survival, story). 4 faction profiles with different weights. Missing: asymmetric faction units/buildings (REMAINING-WORK.md 4.1-4.2), hacking warfare specialization (4.7). |

---

*Sources: Civilization Wiki, Paradox Wiki, Factorio Wiki, RimWorld Wiki, Game Developer articles, Google Play data, Game AI Pro, SpaceSector AI analysis*
