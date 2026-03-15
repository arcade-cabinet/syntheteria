# Task list (with dependencies)

> Single source of remaining work. Tasks can depend on others; complete dependencies first.
> Style: [agent teams](https://code.claude.com/docs/en/agent-teams) — shared task list, dependencies block claiming.

**Last updated:** 2026-03-14

---

## Dependency graph (summary)

- **T1** (no deps) → **T2**, **T3**, **T4** can run in parallel after T1.
- **T2** → **T5**. **T3** → **T6**. **T4** → **T7**.
- **T5, T6, T7** → **T8** (final verification).

---

## Tasks

| ID | Task | Depends on | Status | Owner |
|----|------|------------|--------|-------|
| **T1** | **Docs: Strip stale Filament/SceneComposer** — activeContext "Rendering Backends" and any "Current" sections must describe R3F-only. Session log can keep historical Filament entries. | — | Done | — |
| **T2** | **Docs: Maestro/E2E use Vite** — All references to `npx expo start --web` and port 8081 → `pnpm dev` and port 5173. Update MAESTRO_PLAYTESTING.md, maestro/README, config/e2e.example.json, activeContext Next Steps, techContext, PR_CHECKLIST. | — | Done | — |
| **T3** | **Docs: Assets commit** — Document in EXPO_TO_CAPACITOR_MIGRATION or ASSETS.md: how to commit the assets move (stage public/assets, symlink assets, git rm old assets if needed). | — | Done | — |
| **T4** | **Docs: Progress & activeContext** — Set Next Steps to point at TASK_LIST; ensure progress.md and activeContext "What's Missing" / "Next Steps" align with this list. | — | Done | — |
| **T5** | **Wire Capacitor DB at runtime** — When running in Capacitor native, initCapacitorDb() + runBootstrapCapacitor(); session still uses sql.js. | T2 | Done | — |
| **T6** | **Maestro E2E: Run web flow** — Start app with `pnpm dev`, set MAESTRO_WEB_URL=http://localhost:5173, run title-web.yaml. | T2 | Run attempted; "New Game" visibility assert failed (may need longer wait or selector). | — |
| **T7** | **Maestro E2E: Run native** — Build with `pnpm build` + `pnpm cap:sync`, run `maestro test --platform ios` and `maestro test --platform android`. | T2 | Pending | Requires dev build on devices. |
| **T8** | **Verification** — `pnpm lint`, `pnpm tsc`, `pnpm test`, `pnpm test:vitest`. | T1–T4 | Done | — |
| **T9** | **Create PR** — Branch → `main` when ready. See docs/plans/PR_DESCRIPTION.md. | T8 | Ready | Maintainer |

---

## Out of scope (for this list)

- Removing Expo/RN deps (kept for legacy Jest until tests migrate to Vitest).
- NICE_TO_HAVES.md items (optional; separate backlog).
- Ralph PRD manual verification (0.5, 0.6) and PR (5.3) — maintainer.

---

## Completion

When T1–T4 and T8 are done: docs are consistent, E2E config points at Vite, assets commit is documented, and the repo builds and tests pass. T5 (Capacitor DB at runtime) is optional. T6–T7 are manual/CI. T9 is maintainer-driven.
