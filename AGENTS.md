# Root Agent Plan: Syntheteria Repository

Welcome, Agent. You are operating in the Syntheteria repository. This document defines the overarching workflows and context paths to assist you in autonomously advancing the project.

## Repository Layout
- `src/`: The main Expo application source (React Three Fiber, Koota ECS, NativeWind UI).
- `docs/`: Centralized game design, technical specs, lore, and agent-specific documentation.
- `prototype/`: Superseded web tech demos.

## Macro, Meso, and Micro Approaches
Refer to `docs/AGENTS.md` for specific architectural approaches to macro, meso, and micro levels of development.

## Core Directives for LLM Execution
1. **Respect the Architecture:** Game state is handled via Koota ECS in `src/ecs`. Logic happens in `src/systems` and `src/world`. React components in `src/rendering` and `src/ui` should read from ECS/runtime state instead of owning simulation logic.
2. **Run Tests:** Ensure any logic modification is validated. Jest covers unit/integration behavior and Playwright component tests cover critical rendered states.
3. **Use the Right Context:** For gameplay rules, consult `docs/GAME_DESIGN.md`. For structural constraints, read `docs/TECHNICAL.md`. For economy and turns, read `docs/TURN_AND_ECONOMY.md`. For lore, read `docs/LORE.md`.
4. **Use Repository Tooling:** This repository uses `pnpm` for package management and scripts. Use Biome for linting and autofix via `pnpm lint`, `pnpm lint:fix`, and `pnpm lint:fix:unsafe`.
5. **Agent Action Loop:**
   - **Plan:** Review the requested goal against `docs/AGENTS.md` (Meso/Micro plans).
   - **Act:** Implement changes ensuring minimal blast radius.
   - **Validate:** Run Biome, the TypeScript compiler, and relevant tests to confirm system stability.

## Immediate Objectives
As of the current iteration, focus on:
1. **Turn-based gameplay** — The game now uses Civ-style turns (AP/MP per unit, End Turn cycling). All gameplay actions must be gated by the turn system in `src/systems/turnSystem.ts`.
2. **Harvest economy loop** — Structures are harvestable for urban mining materials (8 types). The harvest system in `src/systems/harvestSystem.ts` is wired into the game tick. Structures consumed by harvesting disappear from the renderer.
3. **Fog of war** — Both floor and structure renderers filter by `discovery_state`. The game starts as an intimate illuminated island in darkness. New chunks reveal as units explore.
4. **Bot role specialization** — 6 player bot types (Technician, Scout, Striker, Fabricator, Guardian, Hauler) + 3 hackable hostile bots. See `docs/plans/BOT_AND_ECONOMY_REDESIGN.md`.
5. **UI clarity** — Thin top bar with resources + End Turn. Minimap moved to hamburger slide-out menu. Radial menu for all contextual actions. No clutter over the gameplay area.
6. **Viewport-driven chunk generation** — Future migration from fixed-size maps to infinite deterministic chunks. See `docs/plans/VIEWPORT_CHUNK_PIVOT.md`.

## Key System Files
| System | File | Purpose |
|--------|------|---------|
| Turn System | `src/systems/turnSystem.ts` | AP/MP, turn phases, End Turn |
| Harvest System | `src/systems/harvestSystem.ts` | Structure harvesting, resource deposits |
| Resource Pools | `src/systems/resourcePools.ts` | Model family → material pool mapping |
| Resources | `src/systems/resources.ts` | ResourcePool interface, add/spend |
| Game Tick | `src/ecs/gameState.ts` | Simulation loop, system orchestration |
| World Gen | `src/world/generation.ts` | Ecumenopolis sector generation |
| Structure Plan | `src/world/sectorStructurePlan.ts` | Model placement via adjacency scoring |
| Floor Renderer | `src/rendering/StructuralFloorRenderer.tsx` | PBR textured floors, fog of war |
| City Renderer | `src/rendering/CityRenderer.tsx` | 3D structures, fog + harvest filtering |
| Game HUD | `src/ui/panels/GameHUD.tsx` | Resources, turn counter, End Turn |
| Radial Menu | `src/ui/RadialMenu.tsx` | Positioned circular buttons, actions |
| Title Screen | `src/ui/TitleScreen.tsx` | Live 3D storm/globe diegetic title |
