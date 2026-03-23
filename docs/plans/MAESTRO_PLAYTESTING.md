---
title: "Maestro playtesting"
domain: meta
status: canonical
last_updated: 2026-03-14
summary: "How to run Maestro E2E flows and current verification status"
---

# Maestro playtesting

## Verification checklist (iOS + Android)

Before release or when validating E2E, run Maestro on **both** platforms:

| Step | Command |
|------|---------|
| 1. iOS | Build and run: `pnpm build && pnpm cap:sync && pnpm cap:ios`; then `maestro test --platform ios maestro/` |
| 2. Android | Build and run: `pnpm build && pnpm cap:sync && pnpm cap:android`; then `maestro test --platform android maestro/` |
| 3. Web (optional) | `pnpm dev` (Vite, port 5173), set `MAESTRO_WEB_URL=http://localhost:5173`, then `maestro test maestro/flows/title-web.yaml` |

Do not rely on iOS-only (or Android-only) E2E runs.

## Status (2026-03-14)

- **Flows:** Five YAML flows: `title`, `title-web`, `onboarding`, `onboarding-web`, `ai-playtest`. Web flows use `url: ${MAESTRO_WEB_URL}` — **no hardcoded ports**. Set `MAESTRO_WEB_URL` or `webUrl` in `config/e2e.json` (see [config/README.md](../../config/README.md)). See [maestro/README.md](../../maestro/README.md).
- **CLI run (native):** `maestro test maestro/` **fails** unless a development build of the app is installed on the target device/simulator. Error: `Unable to launch app com.arcadecabinet.syntheteria`.
- **Resolution:** Build and run the Capacitor app: `pnpm build && pnpm cap:sync`, then `pnpm cap:ios` or `pnpm cap:android`. Use `maestro test --platform ios maestro/` or `maestro test --platform android maestro/` when both are available; **test both platforms**, not just iOS. Optional: target a specific device via `E2E_IOS_DEVICE` or `config/e2e.json` (`iosDevice`).
- **Web:** For web **without** a native build: set `MAESTRO_WEB_URL=http://localhost:5173` (or `config/e2e.json` → `webUrl`). Start the app with `pnpm dev` (Vite serves on 5173). Run `scripts/run-maestro-e2e.sh --web` or `maestro test -e MAESTRO_WEB_URL=http://localhost:5173 maestro/flows/title-web.yaml`. Flow uses `extendedWaitUntil: visible: "New Game"` (60s) for SPA hydration.

## What was verified

1. **Docs review**
   - Updated `docs/memory-bank/AGENTS.md` Step 4 to use correct domain doc paths (`design/GAME_DESIGN.md`, `technical/ARCHITECTURE.md`, etc.) instead of obsolete top-level paths.
   - Updated `docs/memory-bank/progress.md` test metrics: 127 suites, 2,431 tests.
   - Updated `docs/memory-bank/activeContext.md` session log to match.
   - Updated `docs/plans/GAMEPLAN_1_0.md` canonical document table to point to `design/`, `technical/`, `interface/` and existing filenames (ARCHITECTURE, ASSETS, BOTS, ECONOMY, FACTIONS, etc.).

2. **Maestro**
   - Maestro CLI is present; `maestro test maestro/` was run. All three native flows failed due to missing installed app.
   - **title-web.yaml:** Set `MAESTRO_WEB_URL=http://localhost:5173` (or `webUrl` in config); start app with `pnpm dev`; run `scripts/run-maestro-e2e.sh --web`. Flow uses `extendedWaitUntil` for "New Game" (60s) to allow SPA hydration.
   - `maestro/README.md` expanded with prerequisites, flow table, testID list, port note for web, and long-timeout note.
   - **GAMEPLAN links:** Fixed four broken doc links in `docs/plans/GAMEPLAN_1_0.md`: TECHNICAL.md → technical/ARCHITECTURE.md, GAME_DESIGN.md → design/GAME_DESIGN.md, ASSET_GAPS.md → technical/ASSETS.md, UI_BRAND_AND_EXPERIENCE.md → interface/UI_DESIGN.md.
   - **techContext.md:** Testing row and Build & Run updated to Maestro (E2E), pnpm, and current test counts (127 suites, 2,431 tests). Testing Conventions and CI/CD updated.
   - **projectbrief.md:** eXploit pillar updated from 8 to 11 material types to match ECONOMY.md.
   - **Root AGENTS.md:** Validation block updated to 127 suites / 2,431 tests and Maestro for E2E.

## Flow selector audit

Selectors used in flows were cross-checked against the codebase:

- **title / title-web:** "SYNTHETERIA", "New Game", "Settings", "Continue" (assertNotVisible when no save), `id: settings-close` — all exist. "Continue" only visible when `hasSaveGame` (TitleMenuOverlay).
- **onboarding:** `new-game-confirm`, `game-scene-ready`, `briefing-bubble-selected-unit`, `briefing-bubble-nearby-site`, `radial-menu`, `radial-petal-label-move`, `radial-petal-label-survey`, `city-site-close` — all match BriefingBubbleLayer testIDs, RadialMenu, CitySiteModal.
- **ai-playtest:** "End Turn" (text) — GameHUD has label "End Turn" and `testID="end-turn-button"`. `game-scene-ready` for final assert.

## Next steps for maintainers

- **Run flows on a dev build:** Build and run the Capacitor app on an iOS simulator **and** an Android emulator, then run Maestro on **both** platforms. Do not test only iOS.
  - **iOS:** `pnpm build && pnpm cap:sync && pnpm cap:ios` (optional device via `E2E_IOS_DEVICE` or `config/e2e.json`). Then `maestro test --platform ios maestro/`.
  - **Android:** `pnpm build && pnpm cap:sync && pnpm cap:android`, then `maestro test --platform android maestro/`.
  - If only one device is running, `maestro test maestro/` is enough; use `--platform` when both are active to avoid ambiguity.
- **Web flow:** `title-web.yaml` uses `url: ${MAESTRO_WEB_URL}`. Set `MAESTRO_WEB_URL=http://localhost:5173` (or `webUrl` in config); start app with `pnpm dev`; run `scripts/run-maestro-e2e.sh --web` for quick local E2E without a native build.
- **CI:** Wire Maestro into CI via EAS + Maestro Cloud (see [PLAYWRIGHT_TO_MAESTRO_MIGRATION.md](PLAYWRIGHT_TO_MAESTRO_MIGRATION.md)); run both iOS and Android when possible.
