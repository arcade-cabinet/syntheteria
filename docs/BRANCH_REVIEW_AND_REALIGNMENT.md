# Branch Review And Realignment

Date: 2026-03-11
Branch: `codex/world-city-longrun`

This document records a repo-level review of the long-running world/city branch, the scope that has expanded on it, what has already been canonically documented, what still needs realignment, and which temporary agent-to-agent notes can now be retired.

## 1. Review Summary

The branch is no longer a narrow world/city implementation branch. It has become a multi-track integration branch with these major scopes moving in parallel:

- persistent world generation and hydration
- city-kit ingest, previews, config, composites, grammar, and runtime
- AI-first package restructuring
- title/HUD/modal/UI refinement
- weather and storm visual systems
- E2E and component test expansion

That expansion is acceptable, but it means the repo now needs stronger canonical docs and less reliance on transient agent handoff files.

## 2. What Is Now Real

The following are materially real and no longer “just planned”:

- persistent save/world/city state through SQLite
- generated world map + POI + city-instance seeding
- real city kit copied into `assets/models/city`
- generated city model manifest and preview inventory
- in-app City Kit Lab
- canonical world snapshot contracts
- city config validation, layout resolution, city understanding, and composite semantics packages
- weather/lightning systems with config-owned tunables
- UI brand direction formalized enough to guide real implementation

## 3. Canonical Docs That Already Carry Real Decisions

These are now the main documents that should survive and keep evolving:

- [docs/GAME_DESIGN.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/GAME_DESIGN.md)
- [docs/TECHNICAL.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/TECHNICAL.md)
- [docs/LORE.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/LORE.md)
- [docs/WORLD_AND_CITY_SYSTEMS.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/WORLD_AND_CITY_SYSTEMS.md)
- [docs/UI_BRAND_AND_EXPERIENCE.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md)
- [docs/ASSET_GAPS.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/ASSET_GAPS.md)
- [docs/plans/WORLD_CITY_COMPLETION_PR_PLAN.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/WORLD_CITY_COMPLETION_PR_PLAN.md)
- [docs/plans/CLAUDE_UI_POLISH_PLAN.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/CLAUDE_UI_POLISH_PLAN.md)
- [docs/plans/STORM_WEATHER_VISUAL_SYSTEM.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/STORM_WEATHER_VISUAL_SYSTEM.md)

## 4. Agent-To-Agent Docs Review

### Files that should remain

- [docs/agent-to-agent/PACKAGE_PROGRESS.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/agent-to-agent/PACKAGE_PROGRESS.md)
  Reason: active package-side coordination for TSX consumers still has value while the branch is unstable.

### Files that were resolved and should be retired

- `UI_REFINEMENT_QUESTIONS.md`
- `UI_REFINEMENT_ANSWERS.md`

Reason:
- their durable decisions have already been absorbed into `CLAUDE.md`, `docs/UI_BRAND_AND_EXPERIENCE.md`, and `docs/plans/CLAUDE_UI_POLISH_PLAN.md`
- keeping them around encourages duplicate sources of truth

### Files that were partially transient but contained durable implementation status

- `WEATHER_STORM_PROGRESS.md`

Reason:
- most of its lasting content belongs in canonical docs, not handoff space
- lore consequences belong in `docs/LORE.md`
- architecture/system ownership belongs in `docs/TECHNICAL.md`
- current asset/runtime gap state belongs in `docs/ASSET_GAPS.md`

Its durable pieces have now been folded into those docs. The remaining content was progress-log style and is safe to retire.

## 5. Realignments Completed In This Review

This review pass performed these canonicalization steps:

- added weather/storm runtime ownership to `docs/TECHNICAL.md`
- updated `docs/ASSET_GAPS.md` so weather/storm is no longer described as wholly missing
- confirmed the cyan/mint split and diegetic-copy direction already live in `docs/UI_BRAND_AND_EXPERIENCE.md`
- confirmed package-side world/city contracts are documented in `docs/WORLD_AND_CITY_SYSTEMS.md`
- preserved the active package handoff in `docs/agent-to-agent/PACKAGE_PROGRESS.md`

## 6. Current Misalignments

These are the highest-signal remaining mismatches between code, tests, and docs:

1. Full-repo `tsc` is currently blocked by unrelated render typing drift in `src/rendering/LightningSystem.tsx`.
2. The branch has grown beyond the current “World / City Completion” plan and now also contains a significant weather/visual/HUD track that should be treated as first-class in ongoing reviews.
3. There is still a large amount of concurrent modified state on the branch, so future reviews should continue distinguishing:
   - canonical docs
   - transient coordination docs
   - active implementation status

## 7. Scope Expansion Assessment

The branch has expanded in a defensible direction:

- world and city systems are tightly coupled to HUD and modal flows
- weather and storm visuals are core to both gameplay and brand identity
- package cleanup is correctly preceding more UI complexity

The risk is not “too much scope” in the abstract. The real risk is losing source-of-truth discipline. That is why this review favors:

- fewer transient docs
- stronger root-doc updates
- explicit package contracts
- tests around package-owned logic

## 8. Recommended Next Review Pattern

For the rest of this branch:

- package logic changes should update canonical docs when they alter public contracts
- transient agent notes should only stay alive if they still guide active parallel work
- resolved handoff files should be retired quickly
- review checkpoints should continue producing one canonical “where we actually are” doc instead of relying on chat memory

## 9. Conclusion

The branch is still coherent, but it had started to accumulate too many temporary explanation layers. After this review:

- canonical UI decisions live in root docs
- canonical weather/storm ownership lives in root docs
- package-side handoff remains available where it is still useful
- resolved agent question/answer artifacts no longer need to stay in `docs/agent-to-agent`

This is the right baseline for continuing the long-running branch without letting coordination artifacts become a second documentation tree.
