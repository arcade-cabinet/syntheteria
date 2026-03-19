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

| # | Evaluator | Role | Current Issue |
|---|-----------|------|---------------|
| 1 | **IdleEvaluator** | Fallback when nothing to do | Score too high — wins after turn 20 |
| 2 | **AttackEvaluator** | Engage adjacent enemies | Too conservative — never initiates |
| 3 | **ChaseEnemyEvaluator** | Pursue remembered enemies | Works but rarely triggers |
| 4 | **HarvestEvaluator** | Harvest nearby salvage | Drops to 0 when deposits depleted |
| 5 | **ExpandEvaluator** | Move to unclaimed territory | Stagnates after initial expansion |
| 6 | **BuildEvaluator** | Place buildings | Stops when resources don't match |
| 7 | **ScoutEvaluator** | Explore unknown areas | Works but limited range |
| 8 | **FloorMineEvaluator** | Strip-mine floor tiles | Works |
| 9 | **EvadeEvaluator** | Flee when outnumbered | NEW — needs tuning |
| 10 | **ResearchEvaluator** | Start tech research | NEW — needs verification |

### Known Problems (from 10x 100-turn playtests)

1. **IdleEvaluator dominates after turn 20** — all other evaluators drop below idle's score
2. **HarvestEvaluator gives up** when nearby deposits are depleted instead of seeking further
3. **BuildEvaluator uses binary resource check** — if you don't have exact materials, score = 0
4. **ExpandEvaluator stalls** at ~7% territory — doesn't push units far enough
5. **AttackEvaluator never initiates** — zero faction-vs-faction combat in 100 turns
6. **No "always productive" guarantee** — units idle for 80+ turns in a row

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

### Issue: FSM states apply multipliers but base evaluator scores are too low
The multipliers amplify scores that are already near-zero. 1.6x × 0.05 = 0.08 — still loses to idle at 0.15.

---

## 4. Steering Behaviors (Yuka)

### Implemented
- **Cult Flocking** (AlignmentBehavior + CohesionBehavior + SeparationBehavior) — cult units swarm
- **Faction Evasion** (EvadeBehavior) — flee when outnumbered, HP-weighted
- **Pursuit Intercept** (PursuitBehavior) — predict enemy movement, intercept

### Not Yet Implemented (available in Yuka)
- **WanderBehavior** — random patrol for cult wanderer stage
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

### Issue: Bias values are too close
All biases are 1-3, making personalities barely distinguishable. Iron Creed (attack=3) is only 1.5x more aggressive than Reclaimers (attack=1) with the 0.5+bias*0.3 formula. Need wider spread.

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

### 10x 100-Turn Pattern Analysis
- Units peak at 28 (turn ~10) then decline to 20-21
- Buildings stuck at 22 after turn ~10
- Territory peaks at 7.5% then drops to 6.7%
- Zero faction-vs-faction combat kills
- Complete stagnation after turn 20

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
- [ ] Fix IdleEvaluator dominance — score 0.05, never competitive
- [ ] Add time-based escalation to ALL evaluators
- [ ] HarvestEvaluator seeks further when nearby depleted
- [ ] BuildEvaluator plans resource gathering chain
- [ ] AttackEvaluator initiates combat when not outnumbered
- [ ] "Always productive" guarantee — no idle for 2+ consecutive turns

### High Priority
- [ ] Wider faction personality spread (1-5 range, not 1-3)
- [ ] Research tech automatically when lab exists
- [ ] Multi-base expansion (send workers far to found new outposts)
- [ ] Motor pools should NEVER be idle
- [ ] Wormhole project should be started at turn 100+ by strongest faction

### Medium Priority
- [ ] WanderBehavior for cult wanderer stage
- [ ] ObstacleAvoidanceBehavior for smooth movement
- [ ] InterposeBehavior for support units
- [ ] Formation movement for faction armies
- [ ] Diplomatic AI — trade, alliance, betrayal decisions

### Research / Exploration
- [ ] HTN (Hierarchical Task Network) planning for multi-turn strategies
- [ ] Monte Carlo Tree Search for combat evaluation
- [ ] Influence maps for territory value assessment
- [ ] LLM-assisted strategic planning (Vox Deorum approach)
