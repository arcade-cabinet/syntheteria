---
title: "AI Systems"
domain: technical
status: canonical
last_updated: 2026-03-13
summary: "AI architecture — GOAP governors, Yuka steering, NavMesh pathfinding, 7-layer package structure, consumer requirements"
depends_on:
  - "ARCHITECTURE.md"
planned_work:
  - "AI factions produce visible world changes"
  - "Bot emergent speech system"
  - "Cultist reactive escalation"
---

# AI Systems

## Purpose

The AI layer exists to:

1. Own deterministic agent-side behavior execution.
2. Bridge canonical game state from Koota into Yuka-backed runtime agents.
3. Persist Syntheteria-owned AI state without depending on opaque Yuka internals.
4. Present stable contracts for downstream systems so feature code stops writing ad hoc movement or behavior logic.

## Ownership Boundaries

| Owner | Responsibility |
|---|---|
| **Koota ECS** | Identity, faction, components, canonical position, scene state |
| **SQLite / Drizzle** | Persisted AI state (tasks, memory, steering targets, planner state) |
| **Yuka** | Runtime behavior substrate — steering, local execution state, short-lived behavior state |
| **`src/ai`** | The only valid place to create new Yuka-driven gameplay behavior |
| **UI panels** | Consumers of AI state, never owners |

## Architecture

```
Koota ECS ──→ src/ai/bridge ←── SQLite / Drizzle
(canonical       (projection +      (persisted AI
 gameplay         write-back)         + world state)
 state)               │
                      ▼
               src/ai/core
          (AIRuntime + AgentRegistry + AIClock)
                      │
                      ▼
              src/ai/agents
          (typed Syntheteria wrappers)
           ┌──┬──┬──┬──┬──┐
           ▼  ▼  ▼  ▼  ▼  ▼
     steering nav tasks FSM perception goals
```

## Package Structure

```
src/ai/
  core/            Runtime loop, registry, deterministic clock
  bridge/          Koota ↔ Yuka projection and write-back
  agents/          Typed Syntheteria agent wrappers
  steering/        Wrapped Yuka steering policies and tuning
  navigation/      Sector + square-grid navigation adapters
  tasks/           Serializable task definitions and work contracts
  state-machines/  Deterministic local execution control (FSM)
  goals/           GOAP planner / evaluator seam
  perception/      World facts, memory, visibility contracts
  serialization/   Canonical persisted AI state shapes
  testing/         Deterministic harnesses and fixtures
```

### Package Responsibilities

| Package | Owns | Must Not Own |
|---|---|---|
| `core` | Runtime loop, registry, deterministic clock | Gameplay truth |
| `bridge` | Projection and write-back between Koota and Yuka | Planner logic |
| `agents` | Typed agent wrappers with archetype, mark, speech profile, steering profile | DB I/O |
| `navigation` | Path contracts for sector and square-grid traversal | Feature-specific decisions |
| `steering` | Motion policies and tuning parameters | Persistence |
| `tasks` | Serializable work contracts | Navigation implementation |
| `state-machines` | Local execution transitions | Cross-system world truth |
| `goals` | GOAP evaluator seam, goal selection | Direct ECS writes |
| `perception` | World-fact and memory abstractions | Rendering |
| `serialization` | Save/load shapes, version guards | Raw runtime ownership |
| `testing` | Deterministic harnesses, scenario fixtures | Gameplay state |

## Dependency Order

This order is mandatory. If a downstream system needs a boundary that is not built yet, the correct move is to expand `src/ai`, not to bypass it.

```
1. AI runtime + package boundaries
   └→ 2. Koota/Yuka bridge + serialization
      └→ 3. Navigation abstraction
         └→ 4. Task + local state abstraction
            └→ 5. Perception + world facts
               └→ 6. First typed agent roles
                  └→ 7. Consumer systems
                     ├→ World logistics
                     ├→ Hacking / signal
                     ├→ Hostile AI
                     ├→ City agents
                     └→ Strategic world progression
```

## Implementation Status

### Implemented

| System | Status | Location |
|---|---|---|
| GOAP governors | Complete | `src/systems/governorSystem.ts` — GOAP→bot command layer |
| Yuka BotVehicle steering | Complete | Wrapped Yuka Vehicle with steering behaviors |
| NavMesh pathfinding | Complete | NavMeshBuilder + pathfinding integration |
| Unit brains | Complete | Per-unit behavior FSMs |
| AI civilization state machine | Complete | `src/systems/aiCivilization.ts` — faction state + real cube spawning |
| Bot orders | Complete | 8 order types including FLANK_TARGET, SIEGE_TARGET |
| Governor action executor | Complete | `GovernorActionExecutor` — GOAP ResearchTech→startResearch() |
| Tactical behaviors | Complete | FLANK state (perpendicular intercept), SIEGE state (spiral inward) |
| Signal Choir hack attack | Complete | Faction-specific distance-keeping behavior (hold at 6 units) |
| Formation integration | Complete | FLANK_TARGET accepts flankAngle; coordinated pincer with no inter-bot comms |

### Designed (Not Yet Implemented)

| System | Description |
|---|---|
| Bot emergent speech | Bots generate contextual utterances based on state, faction, personality |
| Cultist reactive escalation | Cultist AI scales aggression with campaign progression |
| AI factions produce visible world changes | Faction territory should show physical changes (built structures, claimed sectors) |
| Rich adversarial counter-hacking | Counter-hack AI that responds to player intrusion attempts |
| Advanced squad coordination | Multi-unit tactical formations beyond flank/siege |
| Rich population simulation | City-scale worker/job routing and population dynamics |

## Consumer Requirements

### World Campaign

Agent execution for claiming, founding, travel, extraction, and route servicing.

- Route tasks resume after save/load
- Movement consumes navigation adapters, not ad hoc direct position nudges
- No hidden global inventory/route state
- Persists: active task, task phase, steering target, local memory facts

### Hacking / Signal / Compute

Connectivity-aware agent behaviors for signal links, hacking jobs, compute-constrained actions.

- Tasks fail or stall when connectivity disappears
- Target selection uses world facts, not UI state
- Interruption is explicit and serializable
- Persists: target node, active hack task, interruption cause

### Combat / Hostile AI

Pursuit, flee, regroup, attack-range management, and threat response.

- State switching is explicit (BotState enum)
- Steering and attack choices are decoupled
- Threat behaviors are deterministic in tests
- Persists: current target, threat memory, state/goal/task

### City Simulation

Local jobs, worker/task routing, square-grid traversal inside founded sectors.

- City traversal uses square-grid navigation adapter
- City jobs use the same task/state contracts as world agents
- Persists: assigned job, local route, work progress

### Narrative / Onboarding

Predictable scripted or semi-scripted behavior for intro beats and tutorialized sequences.

- Scripted behavior can override evaluators cleanly
- Sequences remain replayable and deterministic
- Persists: active scripted phase, current objective target

### Persistence

Exact save/load restoration of active AI state.

- Save/load must not silently drop AI task state
- Versioned serialization is required
- Schema evolution must be explicit
- Every active agent's serialized AI contract is persisted

### Performance

Scalable update behavior for many agents without frame-coupled logic.

- Fixed-step update (not React render-driven)
- No per-frame allocation-heavy save transforms on the hot path
- Snapshotting is explicit, not continuous

## Fact Providers

These systems provide facts to the AI layer. They are not the correct place to own agent behavior.

| Provider | AI Relationship |
|---|---|
| `src/ecs` | Source of truth for identity, position, faction, components |
| `src/world` | Source of POIs, terrain, transitions, campaign facts |
| `src/db` | Source of saved AI/session state |
| `src/systems/pathfinding.ts` | Navigation dependency (wrapped by AI navigation adapters) |
| `src/systems/navmesh.ts` | Navigation dependency (wrapped by AI navigation adapters) |

## Rules

- Do not bind new gameplay systems directly to ad hoc movement code when the system is behavior-driven.
- Do not persist raw Yuka instances or assume Yuka JSON is sufficient as save data.
- Do not let React components own AI state transitions.
- Do not add a new AI package without first defining its owner, inputs, outputs, and serialization contract.
- Systems explicitly blocked from bypassing AI: world logistics and hauling, hacking traversal, hostile/cultist tactical behavior, city worker/job loops, scripted tutorial/onboarding escorts.

## Bot Definitions

Bot definitions carry:
- Archetype (scout, hauler, fabricator, assault, etc.)
- Mark (logarithmic progression tier)
- Speech profile (faction-specific utterance templates)
- Default AI role (combat, logistics, hacking, etc.)
- Steering profile (speed, turn rate, arrival radius)
- Navigation profile (sector vs. square-grid, pathfinding params)

These values meaningfully affect runtime behavior, not just metadata.

## Key Constants

| Constant | Value | Context |
|---|---|---|
| `SIGNAL_CHOIR_FACTION` | `"signal_choir"` | Faction ID for hack-attack behavior |
| `HACK_PREFERRED_RANGE` | `6` | Signal Choir holds at this distance during hack attacks |
| `SIEGE_TIMEOUT` | `10.0` | Seconds before siege spiral transitions to direct attack |
