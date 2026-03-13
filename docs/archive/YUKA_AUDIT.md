# Yuka Audit

This audit is based on the local clone at `/Users/jbogaty/src/reference-codebases/yuka`, specifically:

- `src/`
- `examples/`
- `test/unit_test/`
- `src/yuka.js`

## Public API Surface

The local `src/yuka.js` exports the following categories that matter for Syntheteria:

- core: `EntityManager`, `GameEntity`, `MovingEntity`, `Time`, `Regulator`, messaging
- FSM: `State`, `StateMachine`
- goals: `Goal`, `CompositeGoal`, `GoalEvaluator`, `Think`
- graph/navigation: `Graph`, `AStar`, `Dijkstra`, `BFS`, `DFS`, `NavMesh`, `NavMeshLoader`, `Path`
- perception: `Vision`, `MemorySystem`, `MemoryRecord`
- steering: `Vehicle`, `SteeringManager`, `ArriveBehavior`, `FollowPathBehavior`, `PursuitBehavior`, `ObstacleAvoidanceBehavior`, `SeekBehavior`, `FleeBehavior`, `WanderBehavior`, formation behaviors
- tasks: `Task`, `TaskQueue`
- triggers: `Trigger`, trigger regions
- fuzzy logic: `FuzzyModule`, `FuzzyVariable`, `FuzzyRule`, fuzzy sets/operators
- serialization: many classes implement `toJSON()` / `fromJSON()`

## Example Coverage

The examples are useful because they show intended usage patterns, not just API breadth:

- `examples/goal/`
  - practical `Think` + evaluator-driven goal selection
- `examples/navigation/navmeshPerformance/`
  - `EntityManager`, `Vehicle`, `NavMeshLoader`, pathing at scale
- `examples/misc/savegame/`
  - save/load patterns, JSON ownership, custom entity restoration
- `examples/fuzzy/`
  - combat desirability modeling, but not immediately required
- `examples/playground/hideAndSeek/`
  - richer steering composition and tactical movement
- `examples/misc/trigger/`
  - trigger-driven interaction regions

## Unit Test Coverage Style

Yuka's unit tests are granular and contract-oriented:

- constructor defaults
- inheritance expectations
- behavior invariants
- JSON round-trips
- explicit failure/transition cases

That style should be mirrored in Syntheteria's wrappers. The value is not copying Yuka tests, but copying their discipline.

## Classification

### Adopt Directly

These are good substrate candidates with minimal semantic mismatch:

- `EntityManager`
- `Vehicle`
- `Path`
- `ArriveBehavior`
- `FollowPathBehavior`
- `SeekBehavior`
- `FleeBehavior`
- `PursuitBehavior`
- `ObstacleAvoidanceBehavior`
- `StateMachine`
- `Goal`, `CompositeGoal`, `GoalEvaluator`, `Think`
- `Task`, `TaskQueue`
- `Vision`, `MemorySystem`, `MemoryRecord`
- `Graph`, `AStar`, `Dijkstra`, `BFS`
- class-level JSON support as a reference pattern

### Wrap Behind Syntheteria Interfaces

These are valuable, but must not leak directly into gameplay code:

- agent lifecycle and registration
- Koota projection/write-back
- task/state serialization
- deterministic sim adapters
- navigation adapters for world hexes and future city squares
- planner/state contracts
- persistence-safe memory representation
- steering policy presets and tuning

### Defer

These are real capabilities, but we do not need them in the first AI-foundation phase:

- fuzzy logic for combat or utility scoring
- advanced trigger orchestration
- full navmesh import pipelines beyond our current adapters
- rich perception modeling until line-of-sight/awareness requirements are defined

### Reject Or Avoid

These patterns would create architecture debt if adopted naïvely:

- storing raw Yuka runtime objects as persisted save state
- allowing Yuka classes to become canonical gameplay state
- letting feature systems instantiate Yuka behaviors directly outside `src/ai`
- binding behavior update logic to React render timing

## Topic-Specific Findings

### Steering

Yuka steering is strong and ready for immediate use. `Vehicle` plus layered steering behaviors is the correct micro-level substrate for movement execution.

Decision:
- adopt `Vehicle` directly inside agent wrappers
- wrap behavior selection/presets in `src/ai/steering`

### Finite State Machines

Yuka FSM primitives are appropriate for local execution control, but Syntheteria still needs explicit serializable task/state contracts around them.

Decision:
- wrap FSM usage behind Syntheteria local state-machine contracts
- persist Syntheteria task/state, not opaque Yuka FSM internals

### Goal-Driven Behavior

`Think`, `Goal`, `CompositeGoal`, and `GoalEvaluator` are a strong fit for later macro/meso planning. They are not yet the first layer to operationalize, but the seams should exist now.

Decision:
- define planner seams in `src/ai/goals`
- defer real evaluator stacks until first consumers exist

### Task Queueing

`Task` and `TaskQueue` are promising, but they still need Syntheteria-level definitions for gameplay semantics and persistence.

Decision:
- use them conceptually
- persist task contracts through `src/ai/tasks` / `src/ai/serialization`

### Navigation / NavMesh

Yuka has good navigation primitives, but Syntheteria currently spans two future spaces:

- world hex traversal
- city square traversal

The correct move is an adapter layer, not directly coupling features to a specific nav representation.

Decision:
- wrap navigation in `src/ai/navigation`
- current world implementation can use existing pathfinding helper
- city implementation will supply a square-grid adapter later

### Perception / Memory / Vision

Yuka has real perception primitives, which matters for hostile AI and later signal/hacking interactions. However, Syntheteria needs a world-fact abstraction first so perception can be tested and persisted.

Decision:
- keep `src/ai/perception` data-first in phase one
- wire `Vision` / `MemorySystem` once line-of-sight and awareness rules are formalized

### Serialization

Yuka's JSON support is useful, especially the savegame example, but game saves need to store Syntheteria-owned contracts. Yuka serialization should inform our wrappers, not replace them.

Decision:
- use Yuka JSON patterns as inspiration
- canonical saves use Syntheteria serialization bundles

## Example Patterns Worth Porting

- `examples/misc/savegame/`: custom save/load ownership and rehydration pattern
- `examples/goal/`: evaluator + subgoal decomposition pattern
- `examples/navigation/navmeshPerformance/`: entity manager update discipline
- `examples/playground/hideAndSeek/`: layered steering composition

## Test Patterns Worth Mirroring

- constructor defaults and inheritance assertions
- explicit transition validity checks
- JSON round-trip tests
- isolated scenario tests instead of render-coupled integration only

## Recommendation

Yuka is a strong substrate for Syntheteria, but only if it is wrapped aggressively:

- direct use inside `src/ai`
- no raw Yuka sprawl across gameplay systems
- deterministic clocking
- Syntheteria-owned serialization
- Koota remains canonical

That is why this phase establishes the package boundaries first before building the next AI consumer.
