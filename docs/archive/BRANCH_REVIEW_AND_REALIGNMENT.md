# Branch Review And Realignment

Date: 2026-03-12
Branch: `codex/ecumenopolis-fullscope`

This document records the repo-level review of the long-running implementation branch after the ecumenopolis realignment. It captures what changed in scope, what is now canonical, what old assumptions must be removed instead of wrapped, and what implementation work still needs to catch up to the new design baseline.

## 1. Review Summary

The branch is no longer a narrow world/city implementation branch. It is now a full game-realignment branch with these major scopes moving in parallel:

- sector-generation and campaign persistence
- structural-kit ingest, previews, config, composites, grammar, and runtime
- AI-first package restructuring
- title/HUD/modal/UI refinement
- weather and storm visual systems
- E2E and component test expansion
- faction/campaign model realignment

That expansion is correct. The branch is not just adding features; it is replacing the game's foundational spatial model.

## 2. What Is Now Real

The following are materially real and no longer “just planned”:

- persistent save/session state through SQLite
- real city kit copied into `assets/models/city`
- generated city model manifest and preview inventory
- in-app City Kit Lab
- canonical world snapshot contracts
- city config validation, layout resolution, city understanding, and composite semantics packages
- weather/lightning systems with config-owned tunables
- UI brand direction formalized enough to guide real implementation
- bot archetype package and AI profile integration
- ecumenopolis campaign direction documented as canonical design intent

## 3. Canonical Docs That Already Carry Real Decisions

These are now the main documents that should survive and keep evolving:

- [docs/GAME_DESIGN.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/GAME_DESIGN.md)
- [docs/TECHNICAL.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/TECHNICAL.md)
- [docs/LORE.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/LORE.md)
- [docs/WORLD_AND_CITY_SYSTEMS.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/WORLD_AND_CITY_SYSTEMS.md)
- [docs/FACTION_AND_CAMPAIGN_MODEL.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/FACTION_AND_CAMPAIGN_MODEL.md)
- [docs/UI_BRAND_AND_EXPERIENCE.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/UI_BRAND_AND_EXPERIENCE.md)
- [docs/ASSET_GAPS.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/ASSET_GAPS.md)
- [docs/plans/WORLD_CITY_COMPLETION_PR_PLAN.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/WORLD_CITY_COMPLETION_PR_PLAN.md)
- [docs/plans/CLAUDE_UI_POLISH_PLAN.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/CLAUDE_UI_POLISH_PLAN.md)
- [docs/plans/STORM_WEATHER_VISUAL_SYSTEM.md](/Users/jbogaty/src/arcade-cabinet/syntheteria/docs/plans/STORM_WEATHER_VISUAL_SYSTEM.md)

## 4. Coordination Doc State

There is no longer a parallel `docs/agent-to-agent` tree on this branch. Durable decisions were already absorbed into canonical docs. That is the correct steady state.

## 5. Realignments Completed In This Review

This review pass performed these canonicalization steps:

- rewrote the design, technical, lore, and spatial docs around a single ecumenopolis campaign space
- removed the temporary pivot/question docs instead of keeping a second explanation layer
- reframed asset planning so the structural sci-fi kit is primary world language, not a detached city layer
- confirmed that radial actions plus anchored local briefings are the correct interaction direction

## 6. Current Misalignments

These are the highest-signal remaining mismatches between code, tests, and docs:

1. A large amount of runtime code still assumes hex tiles, outdoor map semantics, or a permanent world/city split.
2. The UI layer still contains surfaces and copy patterns built around the older split model.
3. Full-repo `tsc` and integration validation need to be rerun once the implementation catches up to the doc realignment.
4. Historical plan docs still contain some hex-world references; they should either be updated where still active or treated as historical architecture notes.

## 7. Scope Expansion Assessment

The branch has expanded in the correct direction:

- sector runtime, structural kit, AI, UI, and weather are tightly coupled
- weather and storm visuals are core to both gameplay and brand identity
- package cleanup is correctly preceding more UI complexity

The risk is not scope. The real risk is leaving old assumptions alive in code after the docs have moved on. That is why the next implementation phase should favor:

- deleting obsolete spatial logic rather than layering compatibility shims on top
- pulling remaining gameplay logic out of TSX and into package-owned modules
- revalidating tests against the new canonical design instead of keeping old behavior green by inertia

## 8. Recommended Next Review Pattern

For the rest of this branch:

- package logic changes should update canonical docs when they alter public contracts
- active plans should stay under `docs/plans`
- superseded docs should be removed instead of left beside canonical ones
- review checkpoints should continue producing one canonical “where we actually are” doc instead of relying on chat memory

## 9. Conclusion

The branch is coherent, but it is now in the middle of a structural replacement, not incremental feature work. The canonical answer is no longer “world map plus city map.” It is one continuous ecumenopolis campaign space. The next phase should make the implementation match that decision aggressively.
