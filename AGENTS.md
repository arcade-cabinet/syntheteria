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
3. **Use the Right Context:** For gameplay rules, consult `docs/GAME_DESIGN.md`. For structural constraints, read `docs/TECHNICAL.md`.
4. **Use Repository Tooling:** This repository uses `pnpm` for package management and scripts. Use Biome for linting and autofix via `pnpm lint`, `pnpm lint:fix`, and `pnpm lint:fix:unsafe`.
5. **Agent Action Loop:**
   - **Plan:** Review the requested goal against `docs/AGENTS.md` (Meso/Micro plans).
   - **Act:** Implement changes ensuring minimal blast radius.
   - **Validate:** Run Biome, the TypeScript compiler, and relevant tests to confirm system stability.

## Immediate Objectives
As of the current iteration, focus on:
1. Establishing the **Yuka-first AI foundation** in `src/ai`, including bridge, serialization, navigation, and deterministic test scaffolding.
2. Expanding the persisted **world campaign model** with resource ownership, discovery, and founded-city progression on top of that AI layer.
3. Building true **world-to-city transitions** on top of persisted `city_instances`.
4. Defining the **square-grid city assembly** system for Quaternius integration.
5. Continuing the **hacking / signal / cult pressure** mechanics on top of the persistent campaign foundation and AI substrate.
