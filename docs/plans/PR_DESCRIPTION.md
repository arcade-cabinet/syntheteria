# PR: Capacitor + Vite + R3F migration complete, task list done

**Branch:** `ralph/syntheteria-1-0` (or current branch) → `main`

## Summary

- **Migration (Phases 1–8):** Primary build is Vite + Capacitor + R3F. Assets in `public/assets/`; root `assets` is a symlink. Filament and scene snapshot removed.
- **Capacitor DB wired:** When running in Capacitor native shell, `main.tsx` calls `initCapacitorDb()` and `runBootstrapCapacitor()` so the native DB has the schema; session still uses sql.js for sync API.
- **Docs:** E2E/Maestro use Vite (`pnpm dev`, port 5173). Task list with dependencies at `docs/plans/TASK_LIST.md`. Stale Filament references removed from activeContext.
- **Assets:** All repo assets moved to `public/assets/`; commit staged (move + symlink).

## Verification

- [x] `pnpm lint` — 0 errors
- [x] `pnpm tsc` — 0 errors
- [x] `pnpm test` — 128 suites, 2,431 tests passed
- [x] `pnpm test:vitest` — 12 passed
- [ ] Maestro web: run `pnpm dev`, then `MAESTRO_WEB_URL=http://localhost:5173 maestro test maestro/flows/title-web.yaml` (may need selector/timing tweak if "New Game" assert fails)
- [ ] Maestro native: `pnpm build && pnpm cap:sync` then run on **both** iOS and Android per [MAESTRO_PLAYTESTING.md](MAESTRO_PLAYTESTING.md)

## References

- [EXPO_TO_CAPACITOR_MIGRATION.md](EXPO_TO_CAPACITOR_MIGRATION.md) — full plan
- [TASK_LIST.md](TASK_LIST.md) — remaining work with dependencies
- [PR_CHECKLIST.md](PR_CHECKLIST.md) — before/after merge
- Ralph 1.0 PRD: `ralph/projects/syntheteria-1-0/prd.json` (0.5, 0.6 manual; 5.3 = this PR)

## On merge

- Update `docs/plans/GAMEPLAN_1_0.md` branch/date if needed
- Update `docs/memory-bank/progress.md` if system status changed
- Update `docs/memory-bank/activeContext.md` — set "Current Focus" / "Next Steps" for post-merge
