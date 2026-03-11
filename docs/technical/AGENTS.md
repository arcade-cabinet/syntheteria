# Technical Documentation — Agent Guide

Implementation details, formulas, and reference material for developers building or
modifying Syntheteria systems.

## Documents

| Document | Scope |
|----------|-------|
| `ARCHITECTURE.md` | Canonical system inventory — every module, its responsibility, file paths, ECS model, AI architecture, rendering pipeline, state bridge, application boot flow |
| `CORE_FORMULAS.md` | Implemented mathematical formulas — harvesting rates, compression parameters, combat damage model, power generation, turret fire, raid scoring, wall HP, movement interpolation, tech research, perception FOV, weather transitions |
| `REFERENCE_BUILDS.md` | Example bot configurations for testing and balance verification (needs rebuild for current component data) |

## Relationship to Root Docs

`docs/ARCHITECTURE.md` (root) is a high-level summary that redirects here. This directory
(`docs/technical/`) is the single source of truth for implementation details.

`docs/CONFIG.md` (root) documents the config schema. `CORE_FORMULAS.md` here documents
which formulas READ those configs at runtime. Both docs must stay in sync when balance
fields change.

## When to Use

- **"How is module X wired to module Y?"** Use `ARCHITECTURE.md` — system inventory with file paths.
- **"What is the formula for combat damage?"** Use `CORE_FORMULAS.md` — all formulas reference their config path.
- **"What's a balanced bot loadout?"** Use `REFERENCE_BUILDS.md` — note this document needs a rebuild for current faction data.
- **"What JSON field controls X?"** Use `docs/CONFIG.md` (root).
- **"What's left to build?"** Use `docs/REMAINING-WORK.md` (root).
