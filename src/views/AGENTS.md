# src/views/ — Phaser + enable3d (playing board)

> **Target layout:** files here move under **`src/views/board/`**; R3F title code moves from
> `src/view/` into **`src/views/title/`**. Single package name `views` — no parallel `view/`.
> See [docs/COMPREHENSIVE_ENGINEERING_PLAN.md](../../docs/COMPREHENSIVE_ENGINEERING_PLAN.md) §0.

## Current (pre-subfolder migration)

- `createGame.ts`, `eventBus.ts`, `scenes/WorldScene.ts`, `renderers/`, `lighting/`, `input/`, `labels/`
- Consumed by `src/app/GameBoard.tsx` and `App.tsx` (EventBus).

## Rules

- No React inside this tree (except nothing — pure TS + Phaser).
- Import `rendering/`, `traits/`, `systems/`, `config/`, `board/` — not `ui/`.
