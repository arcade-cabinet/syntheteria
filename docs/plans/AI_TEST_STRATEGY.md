# AI Test Strategy

This document defines how AI work is validated before downstream gameplay features are built against it.

## Principles

- Test the wrapper layer first.
- Test determinism explicitly.
- Test projection and persistence boundaries before feature behavior.
- Prefer scenario simulation over UI-driven verification for AI correctness.

## Test Layers

### Wrapper Unit Tests

Purpose:
- prove that each Syntheteria wrapper around Yuka behaves predictably

Targets:
- `AIClock`
- `AgentRegistry`
- `SyntheteriaAgent`
- steering policy catalogs
- local state machine wrappers

Assertions:
- constructor defaults
- invariant enforcement
- deterministic step behavior
- transition failures

### Bridge Tests

Purpose:
- prove Koota snapshots project into AI state correctly and AI write-back remains bounded

Targets:
- `KootaYukaBridge`

Assertions:
- ECS snapshot -> projected persisted state
- persisted state overlay behavior
- projected write-back fields remain limited and explicit
- ownership matrix stays stable

### Serialization Tests

Purpose:
- prove save/load round-trips preserve AI state

Targets:
- `serializeAIState()`
- `deserializeAIState()`
- future version migrations

Assertions:
- deep round-trip equality
- unsupported version rejection
- cloned payloads are not aliased

### Scenario Simulation Tests

Purpose:
- prove the AI package can drive deterministic headless execution

Targets:
- `AITestHarness`
- first movement/task fixtures

Assertions:
- fixed-step progression
- arrival behavior
- follow-path behavior
- state transitions
- interruption and recovery

### Contract Tests

Purpose:
- prove adapter seams are stable before consumers depend on them

Targets:
- hex navigation adapter
- square-grid navigation adapter

Assertions:
- path contract shape is stable
- world hex adapter delegates to current pathing system
- square-grid adapter stays deterministic and extendable

### Future Acceptance Harness

Purpose:
- provide reusable simulation infrastructure for the first AI consumers

Planned consumers:
- world logistics
- hacking/signal jobs
- hostile/cultist pursuit and attack state

Deliverable requirement:
- no new consumer should need to invent a test harness from scratch

## Coverage Matrix

```mermaid
flowchart LR
    U["Wrapper unit"] --> B["Bridge"]
    B --> S["Serialization"]
    S --> C["Contract"]
    C --> SC["Scenario simulation"]
    SC --> A["Future acceptance suites"]
```

## Current Tests Added In This Phase

- deterministic clock stepping
- registry lifecycle behavior
- bridge projection and write-back
- serialization round-trip and version guards
- local state machine transition enforcement
- test harness/runtime registration behavior
- navigation adapter contract behavior

## Exit Criteria

This phase is complete when:

- `src/ai` has baseline deterministic tests
- the docs define the next consumer without missing architecture decisions
- future AI consumers can plug into an existing harness and serialization model
