# Root Agent Plan: Syntheteria Repository

Welcome, Agent. You are operating in the Syntheteria repository. This document defines the overarching workflows and context paths to assist you in autonomously advancing the project.

## Repository Layout
- `game/`: The main Vite application (React Three Fiber, Miniplex ECS).
- `docs/`: Centralized game design, technical specs, lore, and agent-specific documentation.
- `prototype/`: Superseded web tech demos.

## Macro, Meso, and Micro Approaches
Refer to `docs/AGENTS.md` for specific architectural approaches to macro, meso, and micro levels of development.

## Core Directives for LLM Execution
1. **Respect the Architecture:** Game state is handled via an ECS (Miniplex) in `game/src/ecs`. Logic happens in `systems/`. React components (`rendering/` and `ui/`) strictly read from the ECS.
2. **Run Tests:** Ensure any logic modification is validated. Playwright handles E2E tests (`game/tests/e2e/`).
3. **Use the Right Context:** For gameplay rules, consult `docs/GAME_DESIGN.md`. For structural constraints, read `docs/TECHNICAL.md`.
4. **Use Repository Tooling:** This repository uses `pnpm` for package management and scripts. Use Biome for linting and autofix via `pnpm lint`, `pnpm lint:fix`, and `pnpm lint:fix:unsafe`.
5. **Agent Action Loop:**
   - **Plan:** Review the requested goal against `docs/AGENTS.md` (Meso/Micro plans).
   - **Act:** Implement changes ensuring minimal blast radius.
   - **Validate:** Run Biome, the TypeScript compiler, and relevant tests to confirm system stability.

## Immediate Objectives
As of the current iteration, focus on:
1. Building out the **Hacking System** (signal link, compute checks).
2. Implementing **Cultist Lightning Combat**.
3. Establishing the **Signal/Compute BFS Networks**.
