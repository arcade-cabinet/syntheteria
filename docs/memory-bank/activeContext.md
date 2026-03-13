# Active Context: Syntheteria

> What's happening RIGHT NOW. Updated every session. Read this first.
> See [GAMEPLAN_1_0.md](../plans/GAMEPLAN_1_0.md) for the full execution roadmap.

---

## Current Focus

- **Doc reorganization**: consolidating 20 plan docs + 16 design docs into domain-organized structure with memory bank
- **Floor rendering fix applied** (dual data store bug) — NOT YET VISUALLY VERIFIED
- **BriefingBubbleLayer removed** from GameUI.tsx

---

## Recent Changes (2026-03-13)

- `GAMEPLAN_1_0.md` written — comprehensive assessment consolidating all 20 plans into one canonical roadmap
- `StructuralFloorRenderer.tsx` fixed — reads live discovery from `structuralSpace` instead of stale DB snapshot
- `BriefingBubbleLayer` removed from `GameUI.tsx`
- Fail-hard throws added to floor texture resolution (no more silent fallbacks)
- Doc restructure in progress — new layout: `docs/{memory-bank,design,technical,interface,archive}/`
- Memory bank created: `productContext.md`, `progress.md`, `systemPatterns.md`, `techContext.md`, `projectbrief.md`

---

## Next Steps (Prioritized)

1. **Verify floor renders visually in browser** (Phase 0.1) — launch game, confirm ~20 pre-discovered cells visible near home_base
2. **Complete doc restructure** — write updated CLAUDE.md, root AGENTS.md, docs/AGENTS.md
3. **Archive obsolete plan docs** — move completed/superseded plans to `docs/archive/`
4. **Phase 0: Verify core systems visually** — radial menu triggers actions, turn system gates AP/MP, save/load round-trips
5. **Phase 0.5: Remove ALL silent asset fallbacks** — codebase-wide audit, replace with hard crashes
6. **Phase 1: Bot speech bubbles + visible AI factions** — make the world feel alive
7. **Phase 2: Config-driven asset pipeline** — floor textures to JSON, unified `resolveAssetUri()` for all assets

---

## Active Decisions

| Decision | Rationale |
|----------|-----------|
| Chunk streaming deferred (Phase 3) | Playable fixed-grid game is the immediate goal. Infinite ecumenopolis is vision, not 1.0. |
| Narrative must be emergent bot speech | NOT scripted story blocks. Bots say things because they're doing things. |
| ALL asset loads must crash hard on failure | NEVER fallback silently. Missing asset = crash with clear error naming the asset. |
| One plan document (GAMEPLAN_1_0) | 20 previous plans are demoted to reference. Do NOT create new plan docs. |
| Config over code | Asset paths, costs, material types, texture sets belong in JSON configs, not .ts files. |
| Visual verification required | A task is not "done" until verified in browser. Tests passing != feature working. |

---

## Blocked / At Risk

| Item | Status | Risk |
|------|--------|------|
| Floor rendering | Fix applied, unverified | If `structuralSpace` isn't populated before first render, cells still won't appear |
| Silent asset fallbacks | Partially fixed | Some loading paths may still return null; fail-hard audit not complete |
| Plan contradictions | Identified | 20 plan docs contradict each other; GAMEPLAN_1_0 is canonical but old docs still in repo |

---

## Key Links

| Resource | Path |
|----------|------|
| Execution roadmap | [`docs/plans/GAMEPLAN_1_0.md`](../plans/GAMEPLAN_1_0.md) |
| Progress tracker | [`docs/memory-bank/progress.md`](progress.md) |
| Product context | [`docs/memory-bank/productContext.md`](productContext.md) |
| System patterns | [`docs/memory-bank/systemPatterns.md`](systemPatterns.md) |
| Tech context | [`docs/memory-bank/techContext.md`](techContext.md) |
| Design docs | `docs/` (16 canonical design documents) |
| Plan docs | `docs/plans/` (20 docs — reference only, GAMEPLAN_1_0 is canonical) |

---

## Session Log

### 2026-03-13
- Wrote GAMEPLAN_1_0.md — comprehensive 6-phase execution roadmap
- Fixed StructuralFloorRenderer dual data store bug
- Removed BriefingBubbleLayer from GameUI
- Added fail-hard throws for floor texture resolution
- Created memory bank files (productContext, progress, systemPatterns, techContext, projectbrief)
- Started doc reorganization into domain-based directory structure
