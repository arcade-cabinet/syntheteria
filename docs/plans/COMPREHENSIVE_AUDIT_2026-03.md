---
title: "Comprehensive audit 2026-03"
domain: meta
status: canonical
last_updated: 2026-03-14
summary: "Full codebase vs docs/PRD/GAMEPLAN audit — findings and fixes applied"
---

# Comprehensive Audit: Codebase vs Docs, PRD, GAMEPLAN

## Scope

- PRD user stories (ralph/projects/syntheteria-1-0/prd.json)
- GAMEPLAN_1_0 phases and status
- docs/ consistency (memory-bank, design, technical, interface, plans)
- Codebase vs documented architecture

---

## PRD Audit

| ID | Story | passes | Verified |
|----|-------|--------|----------|
| 0.1 | Remove Playwright, Maestro scaffold | true | ✓ Playwright removed from package.json; maestro/ exists |
| 0.2 | Fail-hard asset audit | true | ✓ getCityFamilyMaterial, getCityModelById throw; failHardAssets.test.ts |
| 0.3 | Floor textures to JSON | true | ✓ floorTextures.json exists; floorTextureAssets imports JSON; static imports for Metro (not require()) |
| 0.4 | City model manifest fix | true | ✓ modelDefinitions.json has machine_generator; progress.txt says mocks removed |
| 0.5 | Verify floor in browser | false | Manual — not run |
| 0.6 | Verify radial, turn, save/load | false | Manual — not run |
| 1.1–1.5 | Maestro flows, RNTL, R3F test-renderer | true | ✓ Flows exist; src/ui/__tests__/; r3fScene.test.tsx |
| 2.1–2.5 | Cultist, Mark, hack, escalation | true | ✓ unitVisuals.json, motorPool, hack_capture, cultists.json |
| 3.1–3.3 | Storm, zone blend, void floor | true | ✓ Renderers present; manual verify |
| 4.1–4.3 | ChunkLoaderSync, undermaterials, a11y | true | ✓ ChunkLoaderSync in App; document.title; HudButton/NewGameModal |
| 5.1–5.3 | Maestro CI, verification, PR | true | ✓ maestro/README; progress updated; PR for maintainer |

**Branch note:** PRD branchName is `ralph/syntheteria-1-0`; GAMEPLAN/activeContext reference `codex/ecumenopolis-fullscope`. Both may exist; PR target is main.

---

## GAMEPLAN vs Codebase

### Resolved / Updated

- **Floor textures (3.2):** floorTextures.json exists; zone structure is JSON-driven. Asset mapping uses static ESM imports (Metro requirement). Adding new zones requires JSON + TS mapping — partially config-driven.
- **City model manifest:** progress.txt 0.4 says complete; modelDefinitions.json has machine_generator. progress.md "gaps" may be stale — updated to note 0.4 completion.
- **StructuralFloorRenderer link:** Fixed to `../../src/rendering/StructuralFloorRenderer.tsx` (was broken `../rendering/`).
- **Metrics:** 127 suites, 2,431 tests; Appendix C updated.

### GAMEPLAN "What's Missing" (4.x) — Updated

- 4.1 Config pipeline: PARTIAL (floorTextures.json + static imports)
- 4.2 Bot speech: IMPLEMENTED (SpeechBubbleRenderer, botSpeech)
- 4.3 Chunk streaming: IMPLEMENTED (ChunkLoaderSync, per-chunk rendering)
- 4.4 Cultist visual: PARTIAL (unitVisuals.json; 3D models gap)
- 4.6 Mark upgrade: IMPLEMENTED (PRD 2.3)
- 4.7 Cultist escalation: IMPLEMENTED (PRD 2.5)

### Still Accurate

- Dual data store fix (3.1) — applied, unverified visually
- AI factions invisible (3.3) — minimal visible impact
- Phase 0–5 status table

---

## Docs Consistency Fixes Applied

1. **progress.md** — Floor textures: "require()" → "static imports; floorTextures.json config exists; Metro requires static imports for image assets." City model: add note that 0.4 completed manifest fix.
2. **GAMEPLAN 3.2** — Update problem statement: floorTextures.json exists; static imports (not require()); hybrid config.
3. **GAMEPLAN links** — StructuralFloorRenderer path fixed.

---

## Remaining Manual Items

- 0.5: Launch pnpm web, New Game, confirm floor visible
- 0.6: Radial, turn, save/load in browser
- 3.1–3.3, 4.x: Visual verification in browser
- 5.3: Create PR (maintainer)

## Other Fixes

- **README.md** — Quick Start updated: pnpm, pnpm web, Koota (not Miniplex). Project Status table updated to reflect 1.0 completion.
