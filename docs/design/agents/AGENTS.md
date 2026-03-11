# AI Systems Design — Agent Guide

How AI civilizations think and act. Governor architecture, bot brain design, steering behaviors.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `GOVERNORS.md` | 3-layer AI architecture, GOAP planning, faction behavior, pacing | Patron Agent (strategic, 2-5 min) → Base Agent (operational, 3-10s) → Bot Brain (tactical, per-frame). CivilizationGovernor GOAP (8 goals, 10 actions, A* planner). FactionPersonality weights and situational modifiers. GovernorActionExecutor (raid + research dispatch). GovernorSystem bridge. aiCivilization.ts passive economic state machine. |
| `BOTS.md` | Bot types, procedural generation, Yuka steering, brain states, formations | Worker/scout/combat bots, component-based construction, **10-state** BotBrain FSM (IDLE/PATROL/PHONE_HOME/SEEK_TARGET/ATTACK/FLEE/GUARD/FOLLOW/GATHER/RETURN_TO_BASE), BotVehicle factory, SteeringBehaviors weights, NavMesh pathfinding, PerceptionSystem, FormationSystem. |

## Cross-References

| Topic | Primary document | Additional coverage |
|-------|-----------------|---------------------|
| Per-faction GOAP weights (lore + tables) | `docs/design/world/RACES.md` | `GOVERNORS.md §7` (config values) |
| AI combat decisions (attack/retreat/target) | `docs/design/gameplay/COMBAT.md §13` | `GOVERNORS.md §4.6` (executor), `BOTS.md §8` (state machine) |
| AI overview (player-facing) | `docs/design/gameplay/OVERVIEW.md §Civilizations` | `GOVERNORS.md §1` (philosophy) |
| Hacking system (compute, faction modifiers) | `docs/design/gameplay/COMBAT.md §5` | `BOTS.md §6.3` (signal network) |
| Raid system | `docs/design/gameplay/COMBAT.md §7` | `GOVERNORS.md §4.6` (GovernorActionExecutor) |
| Military doctrine per faction | `docs/design/world/RACES.md §Military Doctrine` | `BOTS.md §10` (formation movement) |

## Config Files

| Config | Controls |
|--------|----------|
| `config/civilizations.json` | Governor profiles — `governorBias` weights per faction (economy, mining, military, defense, research, expansion) |
| `config/botMovement.json` | Yuka Vehicle physics — maxSpeed, maxForce, mass, turnRate, carrySpeedMultiplier |
| `config/botAutomation.json` | BotBrain constants — guardRange, followDistance, workDistance, waypointReachThreshold |
| `config/combat.json` | Combat bot damage, ranges, cooldowns, veterancy, squad behavior, faction hacking modifiers |

## Key Concepts

- **3-layer architecture** — Patron (why, every 2-5 min), Base (what, every 3-10s), Bot (how, per-frame). Each layer operates at different time scales.
- **GOAP planning** — `CivilizationGovernor` evaluates 8 `CivGoal` priorities each tick using `FactionPersonality` weights + situational modifiers, then runs A* search over 10 actions to find the cheapest plan.
- **FactionPersonality** — maps 6 `governorBias` values from config to per-goal weights; applies 6 dynamic situational modifiers (low resources, under attack, low exploration, many idle units, behind on tech, no outposts).
- **GovernorActionExecutor** — decoupled from governor; bridges GOAP decisions to `raidTargeting`, `raidSystem`, and `techResearch` system calls. Only `launch_raid` and `research_tech` need direct system dispatch; all other goals resolve at the bot-brain layer.
- **GovernorSystem** — bridge layer between GOAP governor and `aiCivilization.ts`; translates `GOAPAction.name` to bot commands.
- **Same rules as player** — AI uses the same physical systems. No cheat economy. Must physically harvest, compress, carry, build.
- **Yuka framework** — `BotVehicle` (Vehicle per bot, from config), `SteeringBehaviors` (6 behaviors, obstacle avoidance always active), `NavMeshBuilder` (2-unit grid NavMesh), `PathfindingSystem` (smoothed path following), `PerceptionSystem` (Yuka Vision cones).
- **10-state BotBrain** — implemented states: IDLE, PATROL, PHONE_HOME, SEEK_TARGET, ATTACK, FLEE, GUARD, FOLLOW, GATHER, RETURN_TO_BASE. Economy states (COMPRESS, PICKUP_CUBE, BUILD, etc.) are designed but pending implementation.
- **Phone Home guarantee** — no bot ever permanently idles. PHONE_HOME is a distinct FSM state (not just a fallback) that physically moves the bot to its base to claim a task from the work queue.
- **Governor profiles are JSON** — balance changes (making Iron Creed more aggressive) never require code changes.

## Source Code

| Path | Purpose |
|------|---------|
| `src/ai/goap/CivilizationGovernor.ts` | GOAP governor — goal scoring, plan management, fallback guarantee |
| `src/ai/goap/GOAPPlanner.ts` | A* planner — finds cheapest action sequence from current to goal state |
| `src/ai/goap/ActionTypes.ts` | 10 GOAP actions + WorldStateKey enum |
| `src/ai/goap/GoalTypes.ts` | 8 CivGoals + GoalState type |
| `src/ai/goap/FactionPersonality.ts` | Config bias → goal weights + 6 situational modifiers |
| `src/ai/goap/GovernorActionExecutor.ts` | Bridges GOAP to raid + research system calls |
| `src/systems/governorSystem.ts` | Wires governor to aiCivilization.ts + issues bot commands |
| `src/systems/aiCivilization.ts` | Passive economic state machine (GATHER/BUILD/EXPAND/DEFEND) |
| `src/ai/BotBrain.ts` | 10-state FSM for individual bot behavior |
| `src/ai/BotVehicle.ts` | Creates Yuka Vehicles from config/botMovement.json |
| `src/ai/SteeringBehaviors.ts` | Attaches 6 steering behaviors to a vehicle (seek, flee, arrive, wander, obstacleAvoidance, separation) |
| `src/ai/PerceptionSystem.ts` | Yuka Vision cone checks, weather-adjusted range, LOS blocking |
| `src/ai/FormationSystem.ts` | Squad formations using OffsetPursuitBehavior |
| `src/ai/PathfindingSystem.ts` | NavMesh path requests + FollowPathBehavior + path smoothing |
| `src/ai/NavMeshBuilder.ts` | Generates Yuka NavMesh from terrain walkability + building footprints |
| `src/ai/base/` | Base agent layer (operational decisions, work queue, event bus) |
