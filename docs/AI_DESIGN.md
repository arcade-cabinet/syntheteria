# Syntheteria — AI Design Document

> Everything about how the AI works, what's implemented, what's planned, research findings,
> Yuka integration, balance data, and observed patterns from playtesting.

---

## 1. Architecture Overview

### Stack
- **Yuka v0.7.8** — game AI library
- **GOAP** (Goal-Oriented Action Planning) via Yuka's Think/GoalEvaluator system
- **FSM** (Finite State Machine) via Yuka's StateMachine — macro strategy per faction
- **Steering Behaviors** — flocking, evasion, pursuit via Yuka's behavior system
- **TaskQueue** — multi-step compound tasks via Yuka's Task system
- **TriggerRegions** — cult corruption detection, faction contact alerts
- **FuzzyModule** — situation assessment (resource level, threat proximity, territory size)
- **NavGraph** — A* pathfinding with sphere wrapping + elevation awareness

### Key Files
```
src/ai/
├── agents/SyntheteriaAgent.ts    — Yuka Vehicle + Think brain + DecidedAction
├── fsm/FactionFSM.ts             — 5-state macro strategy per faction
├── fuzzy/situationModule.ts      — FuzzyModule for situation assessment
├── goals/evaluators.ts           — 10 GoalEvaluators (GOAP brain)
├── navigation/boardNavGraph.ts   — NavGraph A* with sphere wrapping
├── perception/factionMemory.ts   — Turn-based perception memory
├── runtime/AIRuntime.ts          — EntityManager + agent registry
├── steering/
│   ├── evasionSteering.ts        — Flee when outnumbered
│   ├── flockingSteering.ts       — Cult swarm coordination
│   └── pursuitSteering.ts        — Intercept fleeing enemies
├── tasks/UnitTaskQueue.ts        — Multi-step compound tasks
├── triggers/
│   ├── corruptionTrigger.ts      — Cult POI zone detection
│   └── territoryTrigger.ts       — Territory boundary events
├── trackSelection.ts             — AI specialization track preferences
└── yukaAiTurnSystem.ts           — Main entry point (turn processing)
```

---

## 2. GOAP Evaluators (10 total)

Each evaluator returns a desirability score [0, 1]. Think.arbitrate() picks the highest.

| # | Evaluator | Role | Status |
|---|-----------|------|--------|
| 1 | **IdleEvaluator** | Fallback when nothing to do | FIXED — score 0.05, absolute fallback |
| 2 | **AttackEvaluator** | Engage adjacent enemies | FIXED — 0.95 floor for adjacent, bypasses aggressionMult |
| 3 | **ChaseEnemyEvaluator** | Pursue remembered enemies | DONE — uses perception memory + pursuit intercept |
| 4 | **HarvestEvaluator** | Harvest nearby salvage | FIXED — seeks distant deposits, never gives up |
| 5 | **ExpandEvaluator** | Move to unclaimed territory | FIXED — pushes 10 tiles outward, multi-base expansion |
| 6 | **BuildEvaluator** | Place buildings | FIXED — priority order, motor pool bonus, time ramp |
| 7 | **ScoutEvaluator** | Explore unknown areas | DONE — quadrant exploration, enemy discovery boost |
| 8 | **FloorMineEvaluator** | Strip-mine floor tiles | DONE — backstop economy when salvage scarce |
| 9 | **EvadeEvaluator** | Flee when outnumbered | DONE — HP-weighted, local force ratio |
| 10 | **ResearchEvaluator** | Start tech research | DONE — auto-queues per faction tech priority |

### Remaining Issues

1. **FSM RETREAT suppresses attack** — with < 3 units, attack bias drops to 0.3x which can let harvest win even with adjacent enemies
2. **Stagnation after turn 20** — evaluator scores plateau; need time-based escalation on ALL evaluators
3. **No "always productive" guarantee** — idle still possible for multiple consecutive turns when all evaluators return low scores

---

## 3. FSM Macro Strategy (5 states)

```
EXPLORE (turns 1-10) → EXPAND (turns 10+) → FORTIFY (threat) → ATTACK (turn 40+, 8+ units)
                                                                    ↕
                                              RETREAT (units < 3) ←─┘
```

| State | Bias Multipliers | Entry Condition |
|-------|-----------------|-----------------|
| EXPLORE | scout 1.8x, expand 1.4x, attack 0.4x | Default (turns 1-10) |
| EXPAND | build 1.6x, expand 1.5x | Turn >= 10 |
| FORTIFY | build 1.5x, evade 1.4x, scout 0.5x | 3+ threats within 5 tiles of buildings |
| ATTACK | attack 1.8x, chase 1.6x, idle 0.2x | Turn 40+, enemy contacted, 8+ units |
| RETREAT | evade 2.0x, attack 0.3x | Units < 3 |

### Status: Implemented and active
FSM multipliers now amplify meaningful base scores (evaluator floors raised). Idle is 0.05 so multiplying it by 1.2x still keeps it below all productive evaluators. RETREAT state's 0.3x attack bias can suppress combat when the faction has < 3 units — this is intentional but may be too conservative.

---

## 4. Steering Behaviors (Yuka)

### Implemented
- **Cult Flocking** (AlignmentBehavior + CohesionBehavior + SeparationBehavior) — cult units swarm
- **Faction Evasion** (EvadeBehavior) — flee when outnumbered, HP-weighted
- **Pursuit Intercept** (PursuitBehavior) — predict enemy movement, intercept
- **WanderBehavior** — random patrol for cult wanderer stage (`wanderSteering.ts`)

### Not Yet Implemented (available in Yuka)
- **ObstacleAvoidanceBehavior** — navigate around walls smoothly
- **FollowPathBehavior** — follow A* paths with smoothing
- **InterposeBehavior** — get between attacker and ally (support units)
- **OffsetPursuitBehavior** — follow formation

---

## 5. Faction Personalities (characterBias)

| Faction | Harvest | Build | Scout | Expand | Attack | Defense | Personality |
|---------|---------|-------|-------|--------|--------|---------|-------------|
| Reclaimers | 3 | 3 | 2 | 2 | 1 | 2 | Economic — harvest + build focused |
| Volt Collective | 2 | 2 | 3 | 2 | 1 | 3 | Defensive — scout + defend |
| Signal Choir | 1 | 2 | 3 | 3 | 2 | 1 | Expansionist — scout + expand |
| Iron Creed | 1 | 1 | 1 | 2 | 3 | 2 | Aggressive — attack focused |

### Status
Biases are mapped to 0.2-1.0 range via `norm(v) = 0.2 + (v/3) * 0.8`. Iron Creed attack bias = 1.0, Reclaimers = 0.73. Combined with FSM multipliers, personalities produce measurably different behavior (verified in differentiation tests). Still uses 1-3 scale — widening to 1-5 would increase spread further.

---

## 6. Research Findings (from Game AI Pro, GDC)

### Utility AI Best Practices
1. **IdleEvaluator = 0.05 ALWAYS** — absolute fallback, never competitive
2. **Minimum activity floor** — every productive evaluator has floor 0.15+
3. **Time-based escalation** — urgency rises over turns without action
4. **"Something is always urgent"** — if resources > threshold, fabricate/build score maxes
5. **Momentum bonus** — +0.1 for currently executing action (finish what you started)
6. **Response curves** — smooth logistic/quadratic functions, not binary thresholds
7. **Normalize to 0-1** — all evaluators return comparable scores

### Relevant GDC Talks
- "Improving AI Decision Modeling Through Utility Theory" — Kevin Dill, Dave Mark (GDC 2010)
- "Building a Better Centaur: AI at Massive Scale" — Mike Lewis, Dave Mark (GDC 2015)
- Game AI Pro Chapter 13: "Choosing Effective Utility-Based Considerations" — Mike Lewis

### Relevant Paper
- "Vox Deorum: A Hybrid LLM Architecture for 4X Game AI — Lessons from Civilization V" (2025)

---

## 7. Balance Data (from playtests)

### 1000-Turn Playtest #1 (pre-motor-pool fix)
- ALL faction units dead by turn ~500
- Cults killed everyone (30 cult units, 0 faction units)
- Economy accumulated 2000+ resources but nothing spent

### 1000-Turn Playtest #2 (with motor pool + FSM + steering)
- VICTORY — 3/4 factions alive
- Signal Choir grew to 11 units
- 22 buildings (up from 16)
- BUT: still only 11 units in 1000 turns

### 10x 100-Turn Pattern Analysis (pre-economy-chain fix)
- Units peak at 28 (turn ~10) then decline to 20-21
- Buildings stuck at 22 after turn ~10
- Territory peaks at 7.5% then drops to 6.7%
- Zero faction-vs-faction combat kills
- Complete stagnation after turn 20

### 50-Turn Playtest #3 (with economy chain + tuning fixes)
- Buildings: 20→38 by turn 10 (18 new buildings, all factions building)
- Units: 16→39 at turn 10 (fabrication throughput)
- All factions build research_lab, defense_turret, relay_tower, motor_pool #2
- Iron Creed builds 11 buildings including motor_pool #3 and outpost #3
- Reclaimers/Volt/Signal each build 9 buildings (4 new types)
- Economy self-sustaining: resources at 158 by turn 50 (growing, not draining)
- Harvest yield boosted (2-5 per harvest), synthesis output doubled (2 alloy/polymer per recipe)
- Resource renewals: synthesizer +1 scrap/turn, resource_refinery +2 ferrous/turn
- Fabrication throttled to 1 unit/motor pool/turn to preserve building resources

### Target Metrics (per faction at turn 100)
- 10+ units (growing, not declining)
- 8+ buildings (multiple types including research_lab)
- 10%+ territory (expanding, not contracting)
- At least 1 tech researched
- At least 1 specialized unit
- Some combat kills

---

## 8. Cult AI

### Escalation Stages
| Stage | Triggers | Behavior |
|-------|----------|----------|
| Wanderer (tier 0-1) | Default | Random movement, avoid factions, flocking with low goal weight |
| War Party (tier 2-3) | Territory pressure | Coordinated groups, target faction edges, strong flocking |
| Assault (tier 4+) | High escalation | Direct attacks on buildings/units, very strong flocking |

### Time-Based Mutations
| Turns Alive | Tier | Effect |
|-------------|------|--------|
| 1-5 | 0 | Base stats |
| 6-10 | 1 | One seeded buff (speed/armor/damage) |
| 11-20 | 2 | Second buff + special ability |
| 21+ | 3 | Aberrant — all stats +2, mini-boss |

### Sect Behaviors
- **Static Remnants**: territorial, defend POIs, tight patrol
- **Null Monks**: stealth/ambush, target isolated units, spread corruption
- **Lost Signal**: aggressive berserker, skip wanderer stage, +1 attack bonus

---

## 9. TODO — Next Steps

### Critical (blocks fun gameplay)
- [x] Fix IdleEvaluator dominance — score 0.05, absolute fallback (**DONE**)
- [ ] Add time-based escalation to ALL evaluators (ExpandEvaluator has time ramp, others need it)
- [x] HarvestEvaluator seeks further when nearby depleted (**DONE** — searches entire board)
- [x] BuildEvaluator plans resource gathering chain (**DONE** — priority order, time ramp, motor pool bonus)
- [x] AttackEvaluator initiates combat when not outnumbered (**DONE** — 0.95 floor for adjacent)
- [ ] "Always productive" guarantee — no idle for 2+ consecutive turns
- [x] Synthesizer in starters (**DONE** — every faction starts with synthesizer)
- [x] Auto-building system (**DONE** — runAiBuilding post-GOAP, dynamic priority, build cooldown)
- [x] Auto-synthesis system (**DONE** — runAiSynthesis queues recipes on idle synthesizers with resource reserves)
- [x] Economy chain unblocked (**DONE** — harvest → synthesize → build research_lab cycle works)

### High Priority
- [ ] Wider faction personality spread (1-5 range, not 1-3)
- [x] Research tech automatically when lab exists (**DONE** — ResearchEvaluator + runAiResearch per faction priority)
- [x] Multi-base expansion (send workers far to found new outposts) (**DONE** — ExpandEvaluator worker dispatch)
- [x] Motor pools should NEVER be idle (**DONE** — runAiFabrication fills ALL open slots)
- [ ] Wormhole project should be started at turn 100+ by strongest faction
- [ ] Harvest rate tuning — mid-game resource recovery too slow, buildings plateau after initial burst

### Medium Priority
- [x] WanderBehavior for cult wanderer stage (**DONE** — `wanderSteering.ts`)
- [ ] ObstacleAvoidanceBehavior for smooth movement
- [ ] InterposeBehavior for support units
- [ ] Formation movement for faction armies
- [ ] Diplomatic AI — trade, alliance, betrayal decisions

### Research / Exploration
- [ ] HTN (Hierarchical Task Network) planning for multi-turn strategies
- [ ] Monte Carlo Tree Search for combat evaluation
- [ ] Influence maps for territory value assessment
- [ ] LLM-assisted strategic planning (Vox Deorum approach)
