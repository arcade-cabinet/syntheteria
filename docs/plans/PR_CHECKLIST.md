---
title: "PR checklist for 1.0"
domain: meta
status: canonical
last_updated: 2026-03-14
summary: "Checklist for creating and merging the 1.0 PR"
---

# PR Checklist — 1.0 Merge

When creating the PR (e.g. `codex/ecumenopolis-fullscope` → `main` or current branch → main):

## Before Opening PR

- [ ] `pnpm tsc` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (127 suites, 2,431 tests)
- [ ] Optional: run `scripts/run-maestro-e2e.sh --web` (set MAESTRO_WEB_URL=http://localhost:5173 or config/e2e.json; start app with `pnpm dev`)
- [ ] Optional (native): run Maestro on **both** iOS and Android: `pnpm build && pnpm cap:sync` then `maestro test --platform ios maestro/` and `maestro test --platform android maestro/` (see [MAESTRO_PLAYTESTING.md](MAESTRO_PLAYTESTING.md))

## PR Description

- Reference Ralph 1.0 PRD: all 25 stories marked complete (0.5, 0.6 manual; 5.3 = this PR)
- Link: `ralph/projects/syntheteria-1-0/prd.json`, `docs/plans/GAMEPLAN_1_0.md`, `docs/memory-bank/progress.md`
- Note: Maestro E2E flows (5 YAML) require dev build or web flows; Playwright removed

## On Merge (or in PR)

- [ ] Update `docs/plans/GAMEPLAN_1_0.md` branch/date if needed
- [ ] Update `docs/memory-bank/progress.md` if any system status changed
- [ ] Update `docs/memory-bank/activeContext.md` — set "Current Focus" / "Next Steps" for post-merge

## Manual Verification (Post-Merge or Pre-Merge)

- **0.5:** Launch `pnpm web`, New Game, confirm floor visible (no black void)
- **0.6:** Radial, turn, save/load in browser
- Document results in `ralph/projects/syntheteria-1-0/progress.txt` if done
