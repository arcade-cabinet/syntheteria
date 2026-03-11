---
inclusion: manual
---

# Mega-Spec Structure — Syntheteria Feature-Complete Ship Spec

This steering rule defines how the "ship-the-game" mega-spec is organized. The scope is too large for single monolithic documents — each stage gets its own subdirectory with properly decomposed files.

## CRITICAL: Do NOT Restate Existing Plans

All planning, analysis, and design work is ALREADY DONE across two parallel documentation systems. The spec REFERENCES both equally — it does NOT duplicate their content.

### Source System 1: Ralph PRD (structured JSON + markdown)

Ralph is the task tracker that drove the initial atomic implementation. Its PRD structure uses JSON with typed user stories, acceptance criteria, dependency graphs, and pass/fail status.

| File | Content | Status |
|------|---------|--------|
| `.ralph-tui/prd.md` | 20 atomic core loop stories (US-001→020) with full acceptance criteria | ALL 20 COMPLETE (passes: true) |
| `.ralph-tui/prd.json` | Same 20 stories in structured JSON with metadata, dependencies, labels | ALL 20 COMPLETE |
| `prd.json` (root) | 9 sequential core loop stories (STORY-001→009) — higher-level integration | NONE complete (passes: false) |
| `tasks/prd-integration-sprint.md` | 151 user stories (US-001→151) across 15 epics — the FULL integration backlog | NONE complete |
| `.ralph-tui/progress.md` | Agent progress log — patterns discovered during development | Active |
| `.ralph-tui/config.toml` | Ralph config: tracker=json, agent=kiro | — |
| `.ralph-tui/iterations/*.log` | Per-story execution logs (20 completed iterations) | Historical |

The ralph PRD JSON structure is:
```json
{
  "id": "US-001",
  "title": "...",
  "description": "...",
  "acceptanceCriteria": ["..."],
  "priority": 1,
  "passes": false,
  "labels": [],
  "dependsOn": ["US-xxx"],
  "completionNotes": "..."
}
```

### Source System 2: docs/plans/ (deep analysis markdown)

Six comprehensive analysis documents that represent weeks of design thinking. These are NOT summaries — they are the actual analysis with specific code-level findings, comparative research, and concrete recommendations.

| File | Content | Size |
|------|---------|------|
| `docs/plans/2026-03-10-4x-gap-analysis.md` | 47 prioritized gaps across 8 phases. Severity/complexity ratings. Specific code line references (e.g., combat.ts line 88). Dependency-ordered fix list. | ~490 lines |
| `docs/plans/2026-03-10-4x-research-analysis.md` | Comparative analysis: Civ VI, Stellaris, AoE IV, Factorio, RimWorld. Essential mechanics tiers. "Feel Complete" formula. | ~300 lines |
| `docs/plans/2026-03-10-implementation-plan.md` | Phase 0-6 plan. Agent team structure (6 roles). Execution rules. | ~150 lines |
| `docs/plans/2026-03-10-production-plan.md` | Phases A-N (14 phases). 115+ numbered tasks with file paths. Dependency graph. Quality gates. Success criteria. | ~400 lines |
| `docs/plans/2026-03-10-paper-playtest-findings.md` | 4 critical gaps, 5 high-priority UX issues, 6 medium improvements. Full integration wiring table (25 missing wires). 6 novel insights. Balance concerns. | ~350 lines |
| `docs/plans/2026-03-10-progression-evolution-design.md` | 5-act player journey (10hr arc). Tech tree deep design (5 tiers, 6 branches, 60+ techs). 6 victory conditions with config schemas. Resource chain evolution. Faction asymmetry. Threat escalation. | ~1900 lines |

### Source System 3: docs/design/ (GDDs — design source of truth)

27 Game Design Documents covering every system. These are AUTHORITATIVE for design decisions.

| Key GDDs | Topic |
|----------|-------|
| GDD-002 | Koota ECS + Expo migration |
| GDD-003 | 4X framework, contextual interaction, governors |
| GDD-004 | Core game loop — harvesting, cubes, compression |
| GDD-005 | Visual identity — PBR, procgen, faction visuals |
| GDD-006 | Cube building economy |
| GDD-007 | Race design (4 factions) |
| GDD-008 | Alien natives |
| GDD-009 | Governor architecture |
| GDD-010 | Pregame lobby |
| GDD-011 | Victory conditions |
| GDD-012 | Economy balance |
| GDD-013 | Combat system |
| GDD-014 | Environment systems |

### How These Three Systems Map Together

```
Ralph PRD (WHAT to build)          docs/plans/ (WHY and HOW)           docs/design/ (WHAT it should BE)
─────────────────────────          ─────────────────────────           ──────────────────────────────────
.ralph-tui/prd.json (done)    ←→  paper-playtest-findings.md     ←→  GDD-004 (core loop)
prd.json (9 stories)          ←→  implementation-plan.md          ←→  GDD-003, GDD-006
tasks/prd-integration-sprint  ←→  production-plan.md              ←→  ALL GDDs
  Epic 1: Foundation          ←→  gap-analysis §2 (Layer 0-1)    ←→  GDD-002
  Epic 2: AI Governors        ←→  gap-analysis §4 (AI Arch)      ←→  GDD-003, GDD-009
  Epic 3: Economy             ←→  gap-analysis §5 (Economy)      ←→  GDD-004, GDD-006, GDD-012
  Epic 4: Combat              ←→  gap-analysis §6 (Combat)       ←→  GDD-013
  Epic 5: Environment         ←→  gap-analysis §7 (Pacing)       ←→  GDD-014
  Epic 6: Infrastructure      ←→  production-plan Phase F         ←→  GDD-006
  Epic 7: Territory           ←→  gap-analysis §3.1-3.2          ←→  GDD-003
  Epic 8: Progression         ←→  progression-evolution-design    ←→  GDD-011
  Epic 9: Interaction         ←→  paper-playtest §2               ←→  GDD-003
  Epic 10: Save/Load          ←→  production-plan Phase J         ←→  GDD-002
  Epic 11: Rendering          ←→  production-plan Phase G         ←→  GDD-005
  Epic 12: Audio              ←→  production-plan Phase I         ←→  —
  Epic 13: Physics            ←→  production-plan Phase M         ←→  GDD-004
  Epic 14: UI/UX              ←→  production-plan Phase C         ←→  GDD-010
  Epic 15: E2E Validation     ←→  production-plan Phase N         ←→  —
```

## What the Spec ADDS (value that doesn't exist yet)

1. **Executable task decomposition** — The existing plans describe WHAT to do. The spec's `tasks.md` files break each into concrete, checkboxable implementation steps with file paths and test commands.
2. **Correctness properties** — Property-based tests that formally verify system integration (e.g., "for all valid cube types, harvest→compress→furnace produces the correct output").
3. **Cross-workstream dependency tracking** — Which tasks block which, across all 15 workstreams.
4. **Progress tracking** — Checkbox state in tasks.md files, updated as work completes.
5. **Playtest validation criteria** — What "fun" means, concretely, for each workstream.

## How to Reference Existing Docs

In requirements.md and design.md files, use this pattern:

```markdown
## Source: Integration Sprint PRD
See #[[file:tasks/prd-integration-sprint.md]] — Epic 3: US-022 to US-039

## Source: Gap Analysis  
See #[[file:docs/plans/2026-03-10-4x-gap-analysis.md]] — Section 5: Economy Loop Gaps

## Source: Production Plan
See #[[file:docs/plans/2026-03-10-production-plan.md]] — Phase B: Core Loop
```

Do NOT copy-paste story descriptions, acceptance criteria, or gap analysis text. REFERENCE it.

## Directory Layout

```
.kiro/specs/ship-the-game/
├── requirements.md          # Master index — references existing PRDs + gap analysis + what's NEW
├── design.md                # Master index — references existing plans/GDDs + what's NEW  
├── tasks.md                 # Master task index — references sub-task files
├── .config.kiro             # Spec metadata
│
├── 01-foundation/           # Init, orchestrator, event bus, system registration
│   └── tasks.md             # PRD US-001→006 + gap #1,#2,#13
│
├── 02-ai-governors/         # GOAP fix, governor pipeline, bot brains, formations
│   └── tasks.md             # PRD US-007→021 + gap #3-7,#10-11
│
├── 03-economy-pipeline/     # Harvest→compress→belt→furnace→craft integration
│   └── tasks.md             # PRD US-022→039 + gap #8,#12,#20-25
│
├── 04-combat-defense/       # Multi-faction combat, raids, hacking, walls, turrets
│   └── tasks.md             # PRD US-040→051 + gap #9,#31-35
│
├── 05-environment/          # Weather, storms, biomes, hazards, noise
│   └── tasks.md             # PRD US-052→059 + gap #36,#40
│
├── 06-territory-fog/        # Territory control, fog of war, exploration, diplomacy
│   └── tasks.md             # PRD US-068→075 + gap #23,#39
│
├── 07-progression/          # Tech tree, quests, achievements, victory conditions
│   └── tasks.md             # PRD US-076→087 + gap #14-15,#29
│
├── 08-infrastructure/       # Power, signals, wires, buildings, outposts
│   └── tasks.md             # PRD US-060→067 + gap #20
│
├── 09-interaction-ux/       # Interaction router, crosshair, radial menu, input
│   └── tasks.md             # PRD US-088→095 + gap #43
│
├── 10-rendering/            # All R3F scene wiring, instancing, PBR, effects
│   └── tasks.md             # PRD US-102→116 + gap #46
│
├── 11-audio/                # Spatial audio, SFX, particles, screen shake
│   └── tasks.md             # PRD US-117→122 + gap #41-42
│
├── 12-ui-hud/               # HUD widgets, title screen, pregame, settings, overlays
│   └── tasks.md             # PRD US-127→141 + gap #45
│
├── 13-save-load/            # Serialization, autosave, replay, round-trip
│   └── tasks.md             # PRD US-096→101
│
├── 14-playtest-validation/  # E2E tests, performance, audits, visual smoke tests
│   └── tasks.md             # PRD US-142→151
│
└── 15-polish-fun/           # Balance, juice, faction differentiation, pacing, FUN
    └── tasks.md             # Gap #16-19,#26-28,#30,#37-38 + new playtest criteria
```

Note: Sub-directories only get their own `requirements.md` or `design.md` if there is NEW analysis not covered by existing docs. Most workstreams only need `tasks.md` because the requirements and design already exist in `docs/plans/` and `docs/design/`.

## Execution Order (Critical Path)

```
01-foundation ──→ 02-ai-governors ──→ 04-combat-defense
      │                  │
      ├──→ 03-economy-pipeline ──→ 08-infrastructure
      │
      ├──→ 05-environment
      │
      ├──→ 06-territory-fog
      │
      ├──→ 09-interaction-ux
      │
      ├──→ 10-rendering (parallel with most)
      │
      ├──→ 11-audio (parallel with most)
      │
      └──→ 12-ui-hud (parallel with most)

07-progression ──→ depends on 03, 04, 06
13-save-load ──→ depends on 01
14-playtest-validation ──→ depends on ALL above
15-polish-fun ──→ depends on ALL above
```

## Source Material Cross-Reference

| Subdirectory | PRD Stories | Gap Analysis Items | Production Plan Phase |
|---|---|---|---|
| 01-foundation | US-001 to US-006 | #1, #2, #13 | A |
| 02-ai-governors | US-007 to US-021 | #3-7, #10-11 | E |
| 03-economy-pipeline | US-022 to US-039 | #8, #12, #20-25 | B |
| 04-combat-defense | US-040 to US-051 | #9, #31-35 | F |
| 05-environment | US-052 to US-059 | #36, #40 | F |
| 06-territory-fog | US-068 to US-075 | #23, #39 | H |
| 07-progression | US-076 to US-087 | #14-15, #29 | H |
| 08-infrastructure | US-060 to US-067 | #20 | F |
| 09-interaction-ux | US-088 to US-095 | #43 | B, K |
| 10-rendering | US-102 to US-116 | #46 | G |
| 11-audio | US-117 to US-122 | #41-42 | I |
| 12-ui-hud | US-127 to US-141 | #45 | C |
| 13-save-load | US-096 to US-101 | — | J |
| 14-playtest-validation | US-142 to US-151 | — | N |
| 15-polish-fun | — | #16-19, #26-28, #30, #37-38 | K, L |
