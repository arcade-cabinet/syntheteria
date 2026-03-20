# ai/

Yuka GOAP-based AI runtime — autonomous faction decision-making, navigation, steering, and threat response.

## Rules
- **Yuka is the AI framework** — GoalEvaluators, FuzzyModule, Vehicle agents
- **Systems accept `world: World`** — never use a world singleton
- **AI never cheats** — decisions based on FactionMemory (fog-limited perception)
- **One evaluator per goal type** — AttackEvaluator, HarvestEvaluator, etc.
- **Reset functions exist for test isolation** — `resetAIRuntime()`, `resetAllFactionMemories()`, etc.

## Public API

### Entry Points
- `runYukaAiTurns(world, board)` — run all AI faction turns
- `resetAIRuntime()` — clear all AI state (for new game)
- `getAIRuntime()` — access the live runtime

### Agents
- `SyntheteriaAgent` — Yuka Vehicle subclass representing one AI faction

### Planning
- `assessSituationFuzzy()` — fuzzy logic threat/economy assessment
- `htnDecide()` — HTN planner for multi-step goals
- `computeInfluenceMap()` — spatial influence analysis
- `evaluateCombat()` — army strength comparison
- `decideDiplomacy()` — AI diplomatic reasoning

### Navigation
- `buildNavGraph()`, `yukaShortestPath()` — A* pathfinding on tile grid
- `sphereManhattan()` — sphere-aware distance metric

### Steering
- Evasion, flocking, formation, interpose, pursuit, wander, obstacle avoidance

### Perception & Triggers
- `FactionMemory` — per-faction sighting records
- `TerritoryTracker` — territory change detection
- `checkCorruptionTriggers()` — cult corruption alerts

## Files
| File | Purpose |
|------|---------|
| yukaAiTurnSystem.ts | Main AI turn entry point |
| trackSelection.ts | AI tech track selection logic |
| agents/SyntheteriaAgent.ts | Yuka Vehicle agent class |
| fsm/FactionFSM.ts | Faction-level finite state machine |
| fuzzy/situationModule.ts | Fuzzy logic situation assessment |
| goals/evaluators.ts | All GOAP goal evaluators |
| navigation/boardNavGraph.ts | Nav graph + A* pathfinding |
| perception/factionMemory.ts | Fog-limited perception memory |
| planning/combatEval.ts | Army strength evaluation |
| planning/diplomaticAi.ts | Diplomatic decision-making |
| planning/htnPlanner.ts | Hierarchical task network planner |
| planning/influenceMap.ts | Spatial influence computation |
| runtime/AIRuntime.ts | Runtime lifecycle manager |
| steering/*.ts | 7 steering behavior modules |
| tasks/UnitTaskQueue.ts | Multi-step unit task queues |
| triggers/corruptionTrigger.ts | Cult corruption event triggers |
| triggers/territoryTrigger.ts | Territory change event triggers |
