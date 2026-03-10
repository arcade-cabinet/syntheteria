# Syntheteria: 4X Mechanics Gap Analysis

**Date:** 2026-03-10
**Purpose:** Identify every gap preventing AI-vs-AI games from being playable and fun.
**Sources:** Paper playtest findings, progression/evolution design doc, source code audit, comparison with Civ VI / Stellaris / AoE IV / Factorio / RimWorld.

---

## 1. Executive Summary

Four AI civilizations cannot play a complete game of Syntheteria right now. Two disconnected AI systems exist -- a GOAP-based `CivilizationGovernor` and a state-machine-based `aiCivilization.ts` -- but neither produces real entities, moves real units, harvests real deposits, compresses real cubes, or interacts with real buildings. The GOAP planner has unreachable preconditions that block entire action categories. The state machine has a rounding bug that starves every faction with fewer than 10 territories. No "new game" initialization function exists to spawn factions, place deposits, or start the simulation. The game loop orchestrator (`gameLoopOrchestrator.ts`) has phase slots but nothing registers systems into them. Combat only works between `feral` and `player` factions -- AI civilizations cannot fight each other. Diplomacy can propose trades but no system evaluates or responds to them from the AI side beyond hardcoded `scrapMetal:10 / eWaste:5` swaps. Victory detection checks quest completion and player bot death -- it does not evaluate any of the six victory conditions defined in `config/victory.json`. There is no pacing mechanism, no threat escalation, no storm progression, and no storyteller-style difficulty curve. If you pressed "start game" today, four AI factions would accumulate abstract cube counters in a module-level Map, make no visible impact on the world, and eventually one of them would get stuck in a permanent GATHER phase because `Math.round(1 * 0.1 * 0.7)` equals zero.

---

## 2. Critical Path to AI-vs-AI

These systems must exist, in dependency order, for a minimal watchable AI game.

### Layer 0: World Bootstrap
1. **newGameInit.ts** -- Orchestrates map generation, deposit spawning, and faction placement. Nothing calls `mapGenerator.ts` or `oreSpawner.ts` today. Without this, there is no world for AI to inhabit.
2. **System registration** -- The `gameLoopOrchestrator.ts` has phase slots but zero systems are registered. Every system runs in isolation or not at all.

### Layer 1: AI Spawns Real Entities
3. **AI entity factory** -- `aiCivilization.ts` tracks abstract `resources.units` and `resources.buildings` counters. These must create real ECS entities with positions, components, faction tags, and navigation data. Without real entities, AI decisions have no world-space effect.
4. **AI starting position** -- Each faction needs a home territory, a furnace, a lightning rod, and 3 starter bots placed on the map.

### Layer 2: AI Economy Is Physical
5. **AI harvesting integration** -- When the state machine says "harvest_resources," a real bot must walk to a real deposit, run the harvesting pipeline, and produce real powder/cubes. Currently it just does `state.resources.cubes += Math.round(...)`.
6. **Fix the rounding bug** -- `passiveHarvest` in `aiCivilization.ts` computes `territories * 0.1 * economy_bias`. For a faction with 1 territory and economy bias 0.7, this is `Math.round(0.07)` = 0. Every faction starves.
7. **Fix the no-fallback bug** -- When the governor's best action is unaffordable (cubes < cost), `executeDecision` silently does nothing. The faction is stuck forever because the decision is still stored as `lastDecision` and the evaluation function keeps recommending the same unaffordable action.

### Layer 3: AI Can Fight
8. **Multi-faction combat** -- `combat.ts` only resolves damage between `feral` and `player` factions. AI civs (`reclaimers`, `volt_collective`, etc.) are never checked. Two AI armies can walk through each other.
9. **Raid targeting for AI** -- `raidSystem.ts` exists and works, but nothing in the AI decision pipeline calls `planRaid()`. The GOAP `LaunchRaid` action has precondition `has_enemy_target` which no action produces, making it permanently unreachable.

### Layer 4: AI Uses Diplomacy
10. **Fix unreachable GOAP preconditions** -- `has_enemy_target` and `has_trade_partner` are world state keys that no action sets as an effect. `LaunchRaid` and `TradeOffer` are dead code in the planner.
11. **Unify GOAP + state machine** -- The `CivilizationGovernor` (GOAP) and `aiCivilization.ts` (state machine) do not share state. The governor produces `GOAPAction` objects; the state machine has its own `GovernorDecision` objects. Neither reads from the other.

### Layer 5: Victory Detection
12. **Victory condition evaluation** -- `gameOverDetection.ts` checks quest completion and player bot death. It ignores `config/victory.json` entirely. No system tracks cube counts, territory percentages, tech tiers, or hack progress toward the six defined victory conditions.

### Layer 6: Pacing
13. **Storm escalation** -- `weatherSystem.ts` tracks weather states but has no time-based escalation. The five storm phases defined in the progression design doc (Calm -> Rising -> Storm -> Tempest -> Convergence) are not implemented.
14. **AI aggression curves** -- No mechanism controls when AI factions become aggressive. Without pacing, either nothing happens or everything happens at once.

---

## 3. 4X Pillar Analysis

### 3.1 eXplore

**What Syntheteria has:**
- `fogOfWar.ts` -- Tracks explored/visible/hidden tiles
- `exploration.ts` -- Exists as a system file
- `discoverySystem.ts` -- Handles discovery events
- GOAP `SendScoutParty` action with correct preconditions/effects

**What's missing vs established 4X games:**
- **No AI scouting behavior.** In Civ VI, every civilization sends scouts in the first 10 turns. The AI evaluates terrain, discovers city-state locations, and identifies resource deposits before making settlement decisions. In Syntheteria, the GOAP planner can produce a `SendScoutParty` plan, but no code translates that into "move bot X to unexplored tile Y."
- **No map awareness feedback.** In Stellaris, exploration reveals anomalies, special projects, and strategic resources that immediately influence decision-making. Syntheteria's fog of war exists but AI factions don't read it -- they have no concept of "I don't know what's over there."
- **No deposit discovery.** Ore deposits exist but AI has no perception of them. There is no "scan for deposits" behavior.

**Minimum viable version:**
- AI spawns a scout bot at game start
- Scout follows a spiral/random walk pattern through unexplored fog
- Discovered deposits and enemy positions are recorded in faction state
- `has_scouted` world state key is set when 20% of map is revealed

### 3.2 eXpand

**What Syntheteria has:**
- `territory.ts` -- Circular territory claims with influence decay
- `outpost.ts` -- Outpost placement system
- `territoryControl.ts` -- Territory ownership tracking
- GOAP `BuildOutpost` action
- Config: `config/territory.json` with outpost tiers

**What's missing vs established 4X games:**
- **No AI site evaluation.** In Civ VI, the AI evaluates dozens of factors (fresh water, luxury resources, strategic resources, adjacency bonuses, distance from other cities) before settling. Syntheteria's AI has no site selection logic -- even if `BuildOutpost` fires, there is no code to choose WHERE to place it.
- **No expansion pressure.** In Stellaris, expansion is driven by starbase influence costs and administrative capacity. In AoE IV, forward bases provide map control. Syntheteria's territory system exists but AI doesn't evaluate "I need territory X because deposit Y is there."
- **No border friction.** Territory overlap detection exists (`getOverlappingTerritories`) but overlapping territories don't trigger diplomatic incidents or combat.

**Minimum viable version:**
- AI evaluates known deposit locations and picks the richest unclaimed area
- AI builds outpost at chosen location when it has resources
- Territory overlap triggers opinion penalty between factions
- `TERRITORY_EXPANDED` world state key is set correctly

### 3.3 eXploit

**What Syntheteria has:**
- `harvesting.ts` + `harvestCompress.ts` -- Two duplicate harvesting systems
- `compression.ts` -- Powder-to-cube compression
- `furnace.ts` + `furnaceProcessing.ts` -- Smelting/crafting
- `beltTransport.ts` + `beltRouting.ts` -- Belt logistics
- `mining.ts` -- Mining system
- `processing.ts` -- Material processing
- `resources.ts` -- Abstract resource tracking
- Config: `config/mining.json`, `config/furnace.json`, `config/processing.json`
- GOAP `AssignMiners` and `HoardCubes` actions

**What's missing vs established 4X games:**
- **No end-to-end resource pipeline for AI.** In Factorio, the logistics chain is the game -- belts, inserters, and assemblers form a continuous physical pipeline. Syntheteria has all the pieces (harvesting, compression, belts, furnaces) but they are "island systems" with no integration wires. AI cannot execute the core loop: grind -> compress -> carry -> furnace -> craft -> build.
- **No production planning.** In Factorio, the player (or mod AI) calculates "I need 30 iron plates/minute, which requires 2 smelters fed by 3 miners." Syntheteria's AI has no concept of production chains or throughput planning.
- **Two duplicate harvesting systems.** `harvesting.ts` and `harvestCompress.ts` have incompatible APIs. A developer wouldn't know which to call.
- **Abstract economy vs physical economy.** `aiCivilization.ts` adds cubes to an abstract counter. The design vision is a PHYSICAL cube economy where cubes are visible, stealable rigid bodies. These are fundamentally incompatible.

**Minimum viable version:**
- Merge harvesting systems into one canonical system
- AI bots walk to deposits, harvest, compress cubes, carry to furnace
- Even simplified: AI gets passive cube generation BUT cubes are spawned as real entities at the faction's base position
- `gameLoopBridge.ts` connects harvest -> compress -> cube spawn -> furnace

### 3.4 eXterminate

**What Syntheteria has:**
- `combat.ts` -- Component-based damage system (feral vs player only)
- `fpsCombat.ts` -- FPS combat for player
- `raidSystem.ts` -- Full raid state machine (APPROACH -> ENGAGE -> LOOT -> RETREAT)
- `raidTargeting.ts` -- Raid target selection
- `turret.ts` -- Automated turret defense
- `breachDetection.ts` -- Wall breach detection
- `hacking.ts` -- Hacking system
- Config: `config/combat.json` with raid parameters

**What's missing vs established 4X games:**
- **No inter-faction combat.** In Civ VI, any civilization can declare war on any other. In Stellaris, fleet combat involves dozens of ships with different weapon types, shields, and hull points. In Syntheteria, `combat.ts` line 88 checks `if (attacker.faction !== "feral") continue;` and line 93 checks `if (target.faction !== "player") continue;`. Two AI armies physically cannot damage each other.
- **No war declaration.** In Civ VI, declaring war has diplomatic consequences (grievances, warmonger penalties). Syntheteria has opinion scores but no "declare war" action that transitions diplomatic stance to hostile and enables combat.
- **No army composition.** In AoE IV, the AI builds mixed armies with specific unit counters. Syntheteria's AI cannot build units at all (the state machine increments `units += 1` abstractly).
- **No tactical AI.** In AoE IV, the AI uses build orders and timing attacks. Stellaris AI composes fleets and positions them strategically. Syntheteria's bot automation handles patrol/guard/follow but nothing connects AI governor decisions to bot orders.
- **Raid system is disconnected.** `raidSystem.ts` is complete and well-built but nothing calls `planRaid()`. The GOAP planner cannot reach `LaunchRaid` because `has_enemy_target` has no producer action.

**Minimum viable version:**
- Combat system checks all hostile faction pairs, not just feral/player
- Add `IdentifyEnemyTarget` action to GOAP that produces `has_enemy_target`
- AI governor calls `planRaid()` when `LaunchRaid` action is selected
- War declaration modifies diplomatic stance and enables combat between factions
- AI spawns real combat units with positions and navigation

---

## 4. AI Architecture Gaps

### Current State

Two completely disconnected AI systems exist:

**System A: `CivilizationGovernor` (GOAP)**
- File: `src/ai/goap/CivilizationGovernor.ts`
- Approach: Goal-Oriented Action Planning with A* search
- Strengths: Personality-driven weights, situational modifiers, clean planner
- Fatal flaw: Produces `GOAPAction` objects that nothing executes. The planner finds a plan, but `executeNextAction()` returns an action NAME -- no code maps that name to real game operations.
- Fatal flaw: Two preconditions (`has_enemy_target`, `has_trade_partner`) have no producer actions, making `LaunchRaid` and `TradeOffer` permanently unreachable.

**System B: `aiCivilization.ts` (State Machine)**
- File: `src/systems/aiCivilization.ts`
- Approach: GATHER -> BUILD -> EXPAND -> DEFEND phase cycle with evaluation-based decision making
- Strengths: Simple, has actual execute logic, directly modifies state
- Fatal flaw: Operates on abstract counters (`resources.cubes += N`), not real entities
- Fatal flaw: Rounding bug causes starvation at low territory counts
- Fatal flaw: No fallback when best action is unaffordable

**Neither reads from the other.** They share no state, no events, no coordination. The GOAP governor could decide "launch raid" while the state machine is in GATHER phase building miners.

### What Established Games Do

**Civ VI:** Uses a layered AI with:
1. **Grand strategy layer** -- Evaluates victory conditions, picks a path (science/domination/culture)
2. **Tactical layer** -- Unit positioning, combat evaluation, retreat decisions
3. **Economic layer** -- City placement, district adjacency, wonder racing
4. **Diplomatic layer** -- Opinion scores, grievances, agenda-driven behavior

Each layer feeds into the next. The grand strategy informs economic priorities which inform tactical decisions. Civ VI's weakness is that the AI cannot plan ahead (e.g., "wait 10 turns for a better district location").

**Stellaris:** Uses a behavior tree approach:
1. **AI personality** -- Determined by ethics/civics (Militarist, Pacifist, etc.)
2. **Budget allocation** -- AI allocates income to military/economy/research percentages
3. **Fleet manager** -- Builds ships to match fleet composition goals
4. **Diplomatic AI** -- Evaluates opinion, threat, and relative power for every interaction

Stellaris's sector AI for automated planet management has been consistently criticized -- even Paradox's internal AI struggles with multi-layer economic optimization.

**RimWorld:** Uses a "storyteller" approach:
1. **Colony wealth** is the primary difficulty driver -- as you succeed, threats escalate
2. **Raid points** are calculated from wealth, with storyteller-specific multipliers (Cassandra uses curves, Randy uses random 0.5x-1.5x multipliers)
3. **Cooldown periods** between major events prevent overwhelming the player
4. **Threat categories** (raids, infestations, toxic fallout) are chosen to match the colony's weaknesses

### Recommended Architecture for Syntheteria

**Merge into a single `CivilizationAI` class per faction with three layers:**

```
Layer 1: Governor (Strategic)
  - One GOAP planner per faction (keep existing CivilizationGovernor)
  - Fix unreachable preconditions
  - Add world state sensing (read real entity counts, territory, economy)
  - Output: High-level directives (expand, attack, trade, defend, research)

Layer 2: Commander (Operational)
  - Translates directives into bot orders
  - "Expand" -> pick site, assign builder bot, build outpost
  - "Attack" -> call planRaid(), assign combat bots
  - "Defend" -> assign bots to guard mode at border
  - Manages bot fleet: spawns new bots, assigns roles, replaces losses

Layer 3: Bot Brain (Tactical)
  - Existing botAutomation.ts handles individual bot behaviors
  - Patrol, guard, follow, work routines already implemented
  - Needs: combat targeting, retreat decisions, formation movement
```

**The state machine in `aiCivilization.ts` should be replaced by the Commander layer.** The GOAP planner handles strategic "what to do," the Commander handles "how to do it with real entities," and the Bot Brain handles "how each unit moves and fights."

---

## 5. Economy Loop Gaps

### Can an AI harvest -> compress -> carry -> furnace -> craft -> build?

**No.** Here is the gap at each step:

| Step | System Exists? | AI Can Trigger? | Integration Wire? |
|------|---------------|-----------------|-------------------|
| Walk to deposit | `botAutomation.ts` work mode | No -- AI doesn't assign bots to deposits | Missing |
| Grind deposit | `harvesting.ts` OR `harvestCompress.ts` | No -- two duplicate systems, neither called by AI | Missing |
| Fill powder gauge | `harvestCompress.ts` has capacity tracking | No HUD update, no event emitted | Missing |
| Compress to cube | `compression.ts` | No -- nothing triggers it from AI | Missing |
| Spawn physical cube | Needs `grabber.registerCube()` | No -- compression doesn't spawn cubes | Missing |
| Carry cube | `grabber.ts` | No -- AI doesn't use grabber system | Missing |
| Drop in furnace hopper | `furnace.ts` hopper system | No -- no AI interaction with furnaces | Missing |
| Select recipe | `furnaceProcessing.ts` | No -- radial menu is player-only | Missing |
| Output item | `furnaceProcessing.ts` | No -- output not spawned as entity | Missing |
| Install/place | Various placement systems | No | Missing |

**Every single integration wire is missing.** The paper playtest correctly identified this as the "island systems" problem. Each system works in isolation but no coordination layer connects them.

### Comparison to Factorio

In Factorio, the logistics chain is the game's core:
- **Miners** auto-extract from deposits and output to belts
- **Belts** physically carry items at defined speeds
- **Inserters** pick items from belts and place them into machines
- **Assemblers** consume inputs and produce outputs on a timer
- **The player's job** is designing the layout -- the systems self-connect once placed

Syntheteria has miners, belts, and furnaces, but they don't self-connect. There is no inserter equivalent. There is no "output to belt" behavior for miners. Even if the AI could build a factory layout, the systems wouldn't flow.

### Minimum Viable AI Economy

For AI-vs-AI to work, the simplest approach is:

1. **Abstract economy with physical manifestation**: AI factions generate cubes passively (fix the rounding bug), but cubes are spawned as REAL entities at the faction's base. This gives AI cube stockpiles that are visible, raidable, and count toward victory.
2. **Deferred factory automation**: Full factory chains (belts, furnaces, multi-step processing) can come later. The priority is getting cubes into the world as physical objects.
3. **Production rate config**: Each building the AI "builds" (abstractly) increases its passive cube generation rate. This simulates factory efficiency without requiring the full logistics chain.

---

## 6. Combat & Diplomacy Gaps

### Can AIs fight each other?

**No.** Three specific code-level blocks prevent it:

1. **Faction filter in combat.ts (line 88-93):**
   ```typescript
   if (attacker.faction !== "feral") continue;
   // ...
   if (target.faction !== "player") continue;
   ```
   Only feral-vs-player combat is resolved. Two `reclaimers` bots and two `volt_collective` bots in melee range do nothing.

2. **No war declaration mechanism.** The diplomacy system tracks opinion scores and derives stances (hostile/unfriendly/neutral/friendly/allied), but no code says "when stance is hostile, combat is enabled between these factions." There's no `declareWar()` function.

3. **Raid system is player-targeted only.** `raidSystem.ts` line 480-489 (`findDefenders`) only looks for `faction !== "player"` defenders. Raids against AI bases are not implemented.

### Comparison to Civ VI Diplomacy

Civ VI has:
- **Formal war declarations** with diplomatic consequences (denouncement -> formal war -> grievances)
- **Casus belli** system -- different war types have different penalties
- **War weariness** -- prolonged wars reduce amenities
- **Peace deals** -- territory, gold, strategic resources can be exchanged
- **Agenda system** -- each leader has public and hidden agendas that drive opinions

Syntheteria has:
- Opinion scores (-100 to +100) with threshold-based stance derivation
- Opinion modifiers from config (`tradeDeal`, etc.)
- Trade proposals (hardcoded to `scrapMetal:10 / eWaste:5`)
- Opinion decay toward neutral
- No war declaration, no peace deals, no casus belli, no war weariness

### Comparison to Stellaris Federations

Stellaris has:
- **Federation types** with shared fleets, tech sharing, and economic bonuses
- **Subject types** (vassals, tributaries, protectorates)
- **Galactic community** with resolutions and voting
- **Espionage** operations that affect diplomatic relations

Syntheteria's design doc envisions vassalization for Cultural Victory but no code supports it.

### Can AIs negotiate?

**Barely.** `diplomacySystem.ts` has AI trade proposals, but:
- All AI trade offers are identical: `{ scrapMetal: 10 }` for `{ eWaste: 5 }`
- No evaluation of whether the trade is beneficial
- No counter-offer system
- Trade acceptance/rejection affects opinion but doesn't transfer actual resources (no integration with the resource system)
- AI never proposes alliances, peace deals, or tribute demands

### Minimum Viable Combat + Diplomacy

1. Remove faction filter from `combat.ts` -- check all hostile faction pairs
2. Add `declareWar(factionA, factionB)` that sets opinion to -100 and stance to hostile
3. Add `IdentifyEnemyTarget` GOAP action that senses nearby enemy positions and produces `has_enemy_target`
4. Add `IdentifyTradePartner` GOAP action that checks for neutral/friendly factions and produces `has_trade_partner`
5. Connect GOAP `LaunchRaid` -> `planRaid()` in the Commander layer
6. AI trade proposals should evaluate what resources are needed, not hardcode values

---

## 7. Pacing & Escalation

### Is there a victory condition?

**In config, yes. In code, no.**

`config/victory.json` defines 6 victory conditions (Economic, Military, Scientific, Cultural, Hacking, Survival). `gameOverDetection.ts` ignores all of them. It only checks:
1. Is the final quest completed? (victory)
2. Are all player bots destroyed? (loss)

No system tracks victory progress. No system announces "Reclaimers are at 80% of Economic Victory." No system triggers endgame events.

### Does difficulty scale?

**No.** There is no pacing mechanism:
- Storm intensity is static (no progression through Calm -> Convergence phases)
- AI aggression is static (no time-based escalation curves)
- Feral bot spawns are static (no evolution factor like Factorio's biters)
- No environmental hazards (acid rain, magnetic storms, sinkholes) are implemented despite being designed in the progression doc

### Comparison to RimWorld's Storyteller AI

RimWorld's pacing is driven by:
1. **Colony wealth** -- As you accumulate resources, raid points increase proportionally
2. **Storyteller curves** -- Cassandra uses a rising tension curve with breathing room. Randy uses pure randomness. Phoebe gives long gaps between events.
3. **Threat categorization** -- The storyteller selects threat types that exploit the colony's weaknesses (no food -> food blight, low defense -> large raid, everyone happy -> social fight)
4. **Adaptation rate** -- Difficulty adjusts in real-time based on recent events (if you just survived a disaster, the next event is delayed)

Syntheteria has none of this. The closest analog would be:
- **Cube stockpile as "wealth"** -- Larger stockpiles should attract larger raids (analogous to RimWorld)
- **Storm phase as global timer** -- Weather escalation creates urgency (designed but not implemented)
- **AI aggression curves per faction** -- Volt Collective raids early, Iron Creed waits (designed in progression doc, not implemented)

### Minimum Viable Pacing

1. **Implement storm phases** -- Time-based progression through 5 phases. At minimum, increase lightning frequency and environmental damage over time.
2. **Implement wealth-based raid scaling** -- Larger cube stockpiles attract more frequent/larger raids. Use a formula like RimWorld: `raidStrength = cubeCount * 0.5 + buildingCount * 2 + techLevel * 10`.
3. **Implement victory progress tracking** -- A system that periodically evaluates each faction against all 6 victory conditions and emits progress events.
4. **Implement AI aggression curves** -- Per-faction timers that control when scouting, raiding, and full assault behaviors unlock.

---

## 8. Prioritized Fix List

### Phase 1: CRITICAL -- Make AI Exist in the World (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 1 | No new game initialization | CRITICAL | L | Build `newGameInit.ts` to orchestrate map generation, deposit spawning, faction placement, and player spawning |
| 2 | No system registration in orchestrator | CRITICAL | M | Register all systems into `gameLoopOrchestrator.ts` phase slots so the game loop actually runs |
| 3 | AI state machine rounding bug | CRITICAL | S | `passiveHarvest`: `Math.round(territories * 0.1 * economy_bias)` = 0 for factions with 1-2 territories. Fix: use `Math.max(1, Math.ceil(...))` or increase base rate |
| 4 | AI no-fallback when action is unaffordable | CRITICAL | S | When best action costs more than available cubes, AI is stuck forever. Fix: fall back to next-best action, or force GATHER phase |
| 5 | GOAP unreachable preconditions | CRITICAL | M | `has_enemy_target` and `has_trade_partner` have no producer actions. Add `IdentifyEnemyTarget` and `IdentifyTradePartner` actions to `ActionTypes.ts` |
| 6 | Two disconnected AI systems | CRITICAL | XL | `CivilizationGovernor` (GOAP) and `aiCivilization.ts` (state machine) don't communicate. Unify into layered architecture: Governor -> Commander -> Bot Brain |
| 7 | AI produces abstract counters, not real entities | CRITICAL | L | `executeDecision` increments `resources.units += 1`. Must spawn real ECS entities with positions, components, and faction tags |

### Phase 2: CRITICAL -- Make AI Interact with the World (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 8 | No AI harvesting integration | CRITICAL | L | AI bots don't interact with deposits. At minimum, AI-generated cubes must appear as real entities in the world |
| 9 | Combat is feral-vs-player only | CRITICAL | S | `combat.ts` filters to feral/player factions. Remove filter, check all hostile faction pairs |
| 10 | No war declaration mechanism | CRITICAL | M | Diplomacy stance "hostile" exists but doesn't enable combat. Add `declareWar()` that sets opinion and enables faction combat |
| 11 | Raid system disconnected from AI | CRITICAL | M | `raidSystem.ts` is complete but nothing calls `planRaid()`. Connect GOAP `LaunchRaid` -> Commander -> `planRaid()` |
| 12 | Duplicate harvesting systems | HIGH | M | `harvesting.ts` and `harvestCompress.ts` have incompatible APIs. Merge into one canonical system |
| 13 | Event bus is dead | HIGH | L | `eventBus.ts` defines 10 events. Only `notificationSystem.ts` imports it. Zero systems emit events. Wire all core systems to emit events |

### Phase 3: HIGH -- Victory and Pacing (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 14 | No victory condition evaluation | HIGH | M | `gameOverDetection.ts` ignores `config/victory.json`. Build `victoryTracker.ts` that evaluates all 6 conditions per faction per tick |
| 15 | No victory progress visibility | HIGH | M | No system tracks or displays victory progress. Build Victory Progress Panel data source |
| 16 | No storm escalation | HIGH | M | Weather is static. Implement 5-phase storm progression (Calm -> Convergence) with time-based triggers |
| 17 | No AI aggression curves | HIGH | M | All factions behave identically from tick 1. Implement per-faction aggression timers from progression design doc |
| 18 | No wealth-based raid scaling | HIGH | M | Raids don't scale with player/faction wealth. Implement RimWorld-style raid point calculation |
| 19 | No pacing / storyteller | HIGH | L | No breathing room between disasters. Implement cooldown-based event scheduling with tension curves |

### Phase 4: HIGH -- Economy Integration (Estimated: 3 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 20 | No gameLoopBridge | HIGH | L | Zero integration wires between island systems. Build coordination layer: harvest->HUD, compress->cube spawn, furnace->output |
| 21 | AI trade proposals are hardcoded | HIGH | S | All trades are `scrapMetal:10 / eWaste:5`. AI should evaluate resource needs and propose relevant trades |
| 22 | Trade doesn't transfer resources | HIGH | M | `acceptTrade()` modifies opinion but doesn't actually move resources between factions |
| 23 | AI doesn't evaluate territory value | HIGH | M | AI has no site selection logic for outpost placement. Need deposit-aware site evaluation |
| 24 | No AI production planning | HIGH | L | AI doesn't know "I need X cubes of material Y to build Z." Need simple recipe-aware production goals |
| 25 | Economy simulation disconnected | MEDIUM | M | `economySimulation.ts` tracks GDP/production but nothing feeds it real data. Connect to cube economy |

### Phase 5: MEDIUM -- Faction Differentiation (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 26 | All factions play identically | MEDIUM | M | Different governor biases exist but produce nearly identical behavior. Need faction-specific strategies (Reclaimers hoard, Volt attacks early, etc.) |
| 27 | No unique units per faction | MEDIUM | L | Design doc defines 12 unique units (3 per faction). None are implemented |
| 28 | No unique buildings per faction | MEDIUM | L | Design doc defines 8 unique buildings (2 per faction). None are implemented |
| 29 | No tech tree integration with AI | MEDIUM | L | `techTree.ts` and `techResearch.ts` exist but AI doesn't use them. GOAP `ResearchTech` action doesn't trigger real research |
| 30 | No faction visual identity | MEDIUM | M | All factions would look identical. Need per-faction materials, emissive colors, and bot head styles from design doc |

### Phase 6: MEDIUM -- Combat Depth (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 31 | No army composition | MEDIUM | M | AI cannot build specific unit types. Need unit type selection based on strategic needs |
| 32 | No tactical AI | MEDIUM | L | Bots don't flank, retreat, or use terrain. Need basic tactical behaviors |
| 33 | No siege mechanics | MEDIUM | M | Walls exist but no siege equipment. Need wall-breaching behavior for AI |
| 34 | No hacking warfare | MEDIUM | L | Hacking system exists but AI doesn't use it. Signal Choir should heavily favor hack attacks |
| 35 | No formation combat | MEDIUM | M | `FormationSystem.ts` and `FormationPatterns.ts` exist but aren't used by AI combat |

### Phase 7: MEDIUM -- World Responsiveness (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 36 | No environmental hazards | MEDIUM | L | Acid rain, magnetic storms, sinkholes designed but not implemented |
| 37 | No ancient machine awakening | MEDIUM | L | Ancient Sentinels, Crawlers, Colossus designed but not implemented |
| 38 | No AI perception of cube stockpiles | MEDIUM | M | Enemies can't "see" your wealth. Cubes should attract raids proportionally |
| 39 | No territory border visualization | MEDIUM | M | Territories claimed but not visible. Need border rendering for watchability |
| 40 | No weather gameplay effects | MEDIUM | M | Weather exists but doesn't affect movement, visibility, or combat |

### Phase 8: LOW -- Polish for Watchability (Estimated: 2 weeks)

| # | Gap | Severity | Complexity | Description |
|---|-----|----------|------------|-------------|
| 41 | No sound feedback | LOW | M | Zero audio triggers. Core loop is silent |
| 42 | No particle feedback | LOW | M | Zero particle triggers. Grinding, compression, combat are invisible |
| 43 | No crosshair feedback | LOW | S | 5 crosshair styles defined, nothing switches between them |
| 44 | No AI decision visualization | LOW | M | No way to see what AI is "thinking." Need debug overlay showing goals, plans, weights |
| 45 | No minimap | LOW | M | `minimapData.ts` exists but no minimap rendering. Essential for watchability |
| 46 | No cube material differentiation | LOW | M | All cubes look the same. Need per-material PBR from `cubeMaterials.json` |
| 47 | No replay system | LOW | L | `replaySystem.ts` exists but replay of AI games would be the best watchability tool |

---

## 9. Known Bugs (Verbatim from Previous Session)

These bugs were discovered in the AI source code and must be fixed before any AI-vs-AI testing:

1. **`src/systems/aiCivilization.ts` ROUNDING BUG:** `Math.round(territories * 0.1 * economy_bias)` = 0 for factions with 1-2 territories. All factions starve.

2. **`src/systems/aiCivilization.ts` NO FALLBACK:** When best action is unaffordable, nothing happens -- faction stuck forever.

3. **`src/ai/goap/ActionTypes.ts` UNREACHABLE PRECONDITIONS:** `has_enemy_target` has no producer action -> LaunchRaid unreachable. `has_trade_partner` has no producer action -> TradeOffer unreachable.

4. **TWO DISCONNECTED AI SYSTEMS:** CivilizationGovernor (GOAP) and aiCivilization.ts (state machine) don't communicate.

---

## 10. Summary: What Makes AI-vs-AI Watchable and Fun

Drawing from established 4X games, a watchable AI game needs:

1. **Visible progress** -- You can see factions growing. Bases get bigger. Cube stockpiles grow. Borders expand. (Requires: real entities, territory visualization, cube rendering)

2. **Meaningful conflict** -- Factions fight over resources, territory, and strategic positions. Raids are dramatic. Walls breach. Cubes are stolen. (Requires: multi-faction combat, raid system integration, wall mechanics)

3. **Distinct personalities** -- Each faction plays differently. Volt Collective attacks early. Iron Creed turtles. Signal Choir hacks. Reclaimers out-produce everyone. (Requires: faction-specific AI behaviors, unique units)

4. **Escalating tension** -- The game gets harder over time. Storms intensify. Factions arm up. Ancient machines awaken. The endgame is apocalyptic. (Requires: storm phases, aggression curves, environmental hazards)

5. **Clear victory race** -- You can see who's winning and why. Victory progress is visible. The leading faction becomes everyone's target. (Requires: victory tracker, progress panel, AI threat assessment of leaders)

6. **Dramatic moments** -- A massive raid breaches the wall. A cube stockpile is looted. An Ancient Colossus awakens and wrecks a base. A hacking attack turns half an army. (Requires: working raid system, ancient machines, hacking warfare)

None of these currently function end-to-end. The architecture is present in pieces -- the GOAP planner is solid, the raid state machine is well-designed, the territory system is clean -- but the integration layer that connects strategic decisions to world-space actions does not exist. That integration layer is the single most important missing piece.
