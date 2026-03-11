# Syntheteria Agent Guidelines

## Agent Architecture
This repository uses LLM agents to orchestrate development tasks. The overarching mandate is adherence to our unified cross-platform Expo + Koota stack.

### 1. Macro Plan (Project-Wide Orchestration)
The Macro level focuses on cross-cutting architecture and transitioning from the legacy Vite prototype to the definitive multi-platform build.
- **Goal:** Complete the transition to Expo, Koota ECS, NativeWind, and Tone.js.
- **Execution:**
  - Scaffold and configure the Expo SDK environment with Metro and Jest.
  - Migrate all legacy Miniplex state to Koota traits and queries.
  - Bridge React Three Fiber via `expo-gl` for native support.
  - Overhaul UI using React Native Reusables and NativeWind v4.

### 2. Meso Plan (System-Level Milestones)
The Meso level breaks down Macro goals into distinct system tasks using the new Koota architecture.
- **Focus Areas:**
  - **Koota Trait Definitions:** Define strict traits (`Transform`, `Signal`, `Hacking`, etc.) to replace old interfaces.
  - **System Migration:** Port `hacking.ts`, `signalNetworkSystem.ts`, and core loop logic into Koota systems.
  - **Persistence Layer:** Setup Drizzle ORM schemas with Expo SQLite to serialize necessary game state (inventory, unlocks, map discovery) distinct from the ECS loop.
  - **Audio/UI Hooks:** Implement Tone.js `AmbienceManager` (using a hidden WebView bridge for native if needed) and Reanimated UI transitions.
- **Execution:** Execute via dedicated tickets. Each system needs Jest tests before integration.

### 3. Micro Plan (Atomic Implementation Steps)
The Micro level deals with individual files, strict type-safety, and adhering to the "No" list constraints.
- **Workflow:**
  - **Act:** Write focused Koota queries. Keep all game logic decoupled from UI components.
  - **Validate:** Use `pnpm` commands for validation. Run `pnpm lint` for Biome checks, `pnpm lint:fix` or `pnpm lint:fix:unsafe` for autofixes when appropriate, and Jest tests for behavior changes.
  - **Refactor:** Maintain DRY principles.

## Using LLMs in this Repo
1. **Context Window:** Provide `docs/TECHNICAL.md` to ensure agents understand the strict Expo + Koota architectural boundaries.
2. **Atomic Commits:** Output changes in atomic chunks—one system, trait, or UI component at a time.
3. **Tooling:** Prefer `pnpm` over `npm` or `yarn` for dependency management and script execution. Use Biome as the repository linter/formatter instead of ESLint.
4. **Mandates:**
   - **NO Vite/Vitest** -> Use Metro/Jest.
   - **NO Miniplex** -> Use Koota.
   - **NO Raw Web Audio** -> Use Tone.js.
   - **NO Raw CSS** -> Use NativeWind / RN Reusables.
