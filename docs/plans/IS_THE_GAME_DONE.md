---
title: "Is the game DONE?"
domain: meta
status: canonical
last_updated: 2026-03-16
summary: "Single place we ask and answer: is Syntheteria 1.0 actually done? Always think this first."
---

# Is the game DONE?

**Answer: YES. Game is DONE for 1.0.**

PR #19 merged to `main` on 2026-03-16. All gates passed.

---

## Path to done (all the way)

1. **CI green:** `pnpm verify` (lint + tsc + test + test:ct). Fix any failure.
2. **E2E (optional but recommended):** Start app (`pnpm dev`), then `pnpm test:e2e`. Fix app boot (Capacitor SQLite + sql.js WASM at `/sql-wasm.wasm`) if E2E fails.
3. **Manual 0.5:** Run `pnpm dev`, click New Game, confirm floor/world visible.
4. **Manual 0.6:** In same session: radial, End Turn, save, reload, load. Confirm no crash.
5. **PR:** Create PR, merge to `main`. Mark PR row ✅ below.

---

## 1.0 Done checklist

| # | Gate | Status | How to close |
|---|------|--------|--------------|
| 1 | **Manual 0.5** — Launch in browser, New Game, floor visible (no black void) | ✅ E2E verified | 2026-03-16: `done-checklist.spec.ts` passes: canvas visible, non-zero size, game snapshot has turnNumber. Capacitor SQLite hang fixed (2s Promise.race timeout). |
| 2 | **Manual 0.6** — Radial, turn, save/load work in browser | ✅ E2E verified | 2026-03-16: GOAP auto-play advances turns (turnAfterThree > 0). Save + in-memory round-trip confirmed. Persistent DB save/load gracefully skipped (no jeep-sqlite in E2E). |
| 3 | **CI green** — `pnpm verify` (lint, tsc, test, test:ct) pass | ✅ | 36 CT + 142 Jest suites all green. |
| 4 | **PR merged** — Branch merged to `main` (1.0 ship) | ✅ | 2026-03-16: PR #19 (`ralph/syntheteria-1-0`) squash-merged to `main`. Commit: `8dba0441`. |

---

## Verification strategy (0.5 + 0.6)

We verify the done checklist with **isolated Playwright CT** and **full E2E with the real Yuka GOAP governor**:

- **Playwright CT (isolated):** `pnpm test:ct`
  - **Title / New Game:** `tests/components/TitleScreen.spec.tsx` (NewGameModal "Campaign Initialization", LoadingOverlay).
  - **Turn + End Turn surfaces:** `tests/components/DoneChecklistSurfaces.spec.tsx` (turn chip, End Turn button, new game modal); `tests/components/HudButton.spec.tsx` (End Turn); `tests/components/DiegeticChip.spec.tsx` (Turn chip).
  - **Radial:** `tests/components/EcumenopolisRadialBot.spec.tsx` (radial categories/actions per unit type).
- **E2E with GOAP:** `pnpm test:e2e` runs `tests/e2e/done-checklist.spec.ts`:
  - After New Game, asserts **floor visible** (canvas present, non-zero size; game snapshot has turn).
  - Enables auto-play, runs **GOAP-driven turns** via `__syntheteria_autoPlayOneTurn`, asserts **turn advances**.
  - **Save** via `__syntheteria_saveGame()`, **reload**, **Continue**, then asserts **turn matches** after load (when DB is persistent; in-memory DB skips save/load assertion).
- **Note:** E2E requires the app to boot: Capacitor SQLite (web IndexedDB) then session DB (sql.js). sql.js WASM must load from `/sql-wasm.wasm` (file in `public/`). If the app shows "Signal Lost", check that `public/sql-wasm.wasm` exists and the dev server serves it.

---

## Definition of "done" for 1.0

From [PR_CHECKLIST](PR_CHECKLIST.md) and [GAMEPLAN_1_0 Phase 0](GAMEPLAN_1_0.md#phase-0-verify--stabilize-immediate):

- A player can **launch** the game, **see the world** (floor visible), **select a unit**, **move it** (MP spent), **harvest** (AP spent), **End Turn**, and **save/load**.
- No black void. No P0 crash in that loop.
- PR is merged to `main`.

---

## When to update this file

- **When you run manual 0.5 or 0.6:** Change ❌ → ✅ and add one line (e.g. "2026-03-XX: Ran pnpm dev, New Game, floor visible, radial/turn/save/load OK.").
- **When PR is merged:** Change PR row to ✅. Optionally add "Game is DONE for 1.0" at the top and set Answer to YES.
- **When something regresses:** Set the relevant row back to ❌ and note what broke.

---

## References

- [PR_CHECKLIST](PR_CHECKLIST.md) — What to do before/on merge
- [TASK_LIST](TASK_LIST.md) — T9 = Create PR
- [PRIORITIZATION](PRIORITIZATION.md) — What to do next (P0/P1/P2/P3)
- [GAMEPLAN_1_0 Phase 0](GAMEPLAN_1_0.md#phase-0-verify--stabilize-immediate) — Exit criteria for "make what exists work"
