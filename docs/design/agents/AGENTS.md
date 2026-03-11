# AI Systems Design — Agent Guide

How AI civilizations think and act. Governor architecture, bot brain design, steering behaviors.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `GOVERNORS.md` | 3-layer AI architecture, GOAP planning, faction behavior, pacing | Patron Agent (strategic, 2-5 min) → Base Agent (operational, 3-10s) → Bot Brain (tactical, per-frame). Governor profiles, strategic evaluators, action execution. |
| `BOTS.md` | Bot types, procedural generation, Yuka steering, brain states, formations | Worker/scout/combat bots, component-based construction, 9-state FSM, formation movement, perception system. |

## Config Files

| Config | Controls |
|--------|----------|
| `config/civilizations.json` | Governor profiles — weight biases per faction |
| `config/units.json` | Bot types, speeds, component loadouts |
| `config/combat.json` | Combat bot damage, ranges, cooldowns |

## Key Concepts

- **3-layer architecture** — Patron (why), Base (what), Bot (how). Each layer operates at different time scales.
- **GOAP planning** — governors evaluate goal priorities each tick, run GOAP planner to find action sequences.
- **Same rules as player** — AI uses the same physical systems. No cheat economy. Must physically harvest, compress, carry, build.
- **Yuka framework** — Vehicle steering for movement, NavMesh for pathfinding, GameEntity for perception.
- **Governor profiles are JSON** — balance changes (making Iron Creed more aggressive) never require code changes.

## Source Code

| Path | Purpose |
|------|---------|
| `src/ai/goap/CivilizationGovernor.ts` | GOAP governor implementation |
| `src/ai/goap/GOAPPlanner.ts` | Goal-oriented action planning |
| `src/ai/BotBrain.ts` | 9-state FSM for individual bot behavior |
| `src/ai/base/` | Base agent layer (operational decisions) |
| `src/ai/YukaSystem.tsx` | Yuka integration — Vehicle, NavMesh, EntityManager |
