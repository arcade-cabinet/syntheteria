---
title: "Prioritization Framework"
domain: meta
status: canonical
last_updated: 2026-03-15
summary: "How we order work: 4X fun, player journey, and design goals. Single source for 'what next'."
depends_on:
  - GAME_DESIGN.md
  - productContext.md
  - projectbrief.md
  - GAMEPLAN_1_0.md
---

# Prioritization — What to Do Next

This document **owns prioritization**. It is grounded in: the **goals** of the game, what makes it **fun**, the **player journey**, and how **4X** works. When in doubt, we do the thing that most improves the next 15 minutes of play or unblocks the next phase of the journey.

---

## 1. Why This Exists

Plans and backlogs can list everything without answering **what first**. Prioritization answers:

- What blocks the player from feeling the intended experience?
- What multiplies fun at each phase of the journey?
- What is important but not journey-critical?
- What is nice to have when capacity allows?

We use the **player journey** and **4X pillars** as the ruler. Not "coverage" or "task list order" in isolation.

---

## 2. The Player Journey (What We're Optimizing For)

From [GAME_DESIGN](design/GAME_DESIGN.md) and [productContext](memory-bank/productContext.md):

| Phase | Time | Feel we want |
|-------|------|----------------|
| **Awakening** | 0–15 min | Intimate, quiet, slightly disorienting. Reconnect a few machines. Perception snaps together. World is dark and small. Every discovery feels significant. |
| **Expansion** | 15–60 min | Fog lifts in patches. Harvestable structures appear. Resources flow. First fabrication feels powerful. Ecumenopolis feels vast and reclaimable. |
| **Competition** | 1–3 h | Rival consciousnesses contest expansion. Cult pressure escalates. Automation, specialization, territory and doctrine choices. |
| **Resolution** | 3–6 h | Full strategic scale. Choice between dominance, technical supremacy, wormhole transcendence. Endgame is what machine civilization does next. |

The game should **grow into** strategic scale. We prioritize work that makes each phase **feel** right before piling on the next.

---

## 3. 4X Literacy (What "Fun" Means Here)

We assume familiarity with 4X. Fun in this game comes from:

- **eXplore** — Fog of war, discovery payoff, "what's over there?" Tension from the unknown; reward when the map fills in and reveals harvest and threat.
- **eXploit** — Urban mining. Every structure is a deposit. Decisions about what to strip, what to keep, what to build. Resource flow must feel legible and consequential.
- **eXpand** — Building matters. First substation, first Motor Pool, relay network. Expansion should feel earned and spatially meaningful.
- **eXterminate** — Stakes. Cult and rivals as pressure. Combat and hacking that feel decisive, not cosmetic.

Prioritization favors work that **makes one of these pillars feel real** over work that only satisfies completeness or coverage.

---

## 4. Priority Tiers

### P0 — Journey blockers

**Definition:** Anything that prevents the player from experiencing the intended arc.

- Game doesn’t run or shows a black void on start.
- Crash on first meaningful action (new game, end turn, save, load).
- Save/load broken or corrupt.
- Core loop broken (can’t move, can’t harvest, can’t end turn, can’t build).
- Title → New Game → first frame of play broken or illegible.

**Rule:** Fix P0 before any P1. No exceptions.

**Examples (from current state):** Floor renderer / discovery state correctness so the world is visible; asset validation so missing assets crash instead of void; any regression that makes "first 15 minutes" unplayable.

---

### P1 — Fun multipliers

**Definition:** Work that directly amplifies the 4X pillars and phase-by-phase satisfaction.

Order **within P1** by journey phase: Awakening first, then Expansion, then Competition, then Resolution.

| Journey phase | P1 focus | Examples |
|---------------|----------|----------|
| **Awakening** | Intimacy, reconnection, first discovery | Starting roster legible; first fog reveal satisfying; first harvest or repair feels meaningful; bot speech/thought that reinforces "I am reconnecting." |
| **Expansion** | Fog payoff, resource flow, first build | Harvest → resource strip legible; first fabrication feels powerful; building placement and adjacency feel fair and readable; storm % and day phase readable. |
| **Competition** | Rivals and cult feel present | AI factions produce visible world changes (build, expand, appear at fog edge); cult pressure visible and escalating; diplomacy/trade/war consequences feel real. |
| **Resolution** | Victory paths feel achievable and distinct | Subjugation / technical / wormhole all playable; endgame pacing and feedback clear. |

**Rule:** Within P1, prefer "player sees / feels X" over "system Y has tests." Prefer one complete loop (e.g. harvest → see materials → build one thing) over scattered polish.

**Examples:** Fix dual-store floor so discovery and harvest translate to visible world. Make first fabrication and first build feel consequential. Make rivals visible (build/expand/encounter). Storm as both threat and resource in UI and feedback.

---

### P2 — Depth and polish

**Definition:** Important for quality and correctness but not the first thing a player notices in a 15-minute play.

- Tech tree effects clearly change gameplay (verify and tune).
- Diplomacy consequences (trade, alliance, war) verified and tuned.
- Victory pacing and achievability.
- Tests that lock in behavior (turn rehydrate, save/load, chunk round-trip, coverage gaps).
- Component and E2E tests for critical flows.
- AI visibility improvements beyond "it runs" (e.g. construction/expansion visibility).
- Narrative/bot speech tuning (emergent tone, not scripted blocks).

**Rule:** After P0 is clear and P1 has the current phase feeling right, do P2. P2 is the right place for "comprehensive coverage" and "all scenarios" — they protect fun we’ve already built.

---

### P3 — Nice to have

**Definition:** Improves quality when capacity allows. Not required for 1.0 journey.

See [NICE_TO_HAVES](NICE_TO_HAVES.md). Examples: storm/wormhole spectacle tuning, Maestro in CI, reduced-motion a11y, full runtime floor texture resolution, optional floor tile GLBs.

**Rule:** Do not do P3 until P0/P1/P2 for the target scope are in good shape.

---

## 5. How to Use This

1. **Before picking a task:** Ask: Is anything P0 broken? If yes, fix it. If no, what’s the next P1 for the phase we care about (usually Awakening → Expansion)?
2. **When adding to backlog:** Tag work as P0 / P1 / P2 / P3 and, for P1, which journey phase it serves.
3. **When disagreeing on order:** Resolve by appeal to journey and 4X pillars. "This makes Expansion feel better" beats "this was next on the list."
4. **Tests and coverage:** They serve the journey. Prioritize tests that protect P0 and P1 behavior (first run, first turn, save/load, harvest→build, turn phase). Broader scenario coverage is P2.

---

## 6. Current Mapping (Snapshot)

Use this to see where known work lives. Update as work is done or new items appear.

| Item | Tier | Journey phase | Rationale |
|------|------|----------------|-----------|
| Floor / discovery single source of truth | P0 | Awakening | **Done:** StructuralFloorRenderer subscribes to game state and re-reads discovery from structuralSpace on each tick so exploration updates are visible. |
| Asset validation (crash on missing) | P0 | Awakening | Prevents black void from bad config. |
| Title → New Game → first frame | P0 | Awakening | First 60 seconds must work. |
| Save/load integrity | P0 | All | Losing progress kills trust. |
| End Turn → AI → environment → new turn | P0 | All | Core loop. |
| Harvest → resources visible | P1 | Expansion | Exploit pillar must feel real. |
| First fabrication / first build feedback | P1 | Expansion | Expand pillar; "I built something." |
| Storm / day in HUD | P1 | Expansion | Storm as threat+resource legible. |
| Rivals visible (build, expand, encounter) | P1 | Competition | Competition pillar. |
| Cult escalation visible | P1 | Competition | Stakes and pressure. |
| Victory paths playable and distinct | P1 | Resolution | Resolution phase payoff. |
| Turn rehydrate / load-into-phase | P2 | All | Correctness; protects save/load. |
| No-save edge (0 slots) | P2 | Awakening | Edge case; avoids surprise. |
| Chunk round-trip, discovery persist | P2 | Expansion | Correctness for infinite world. |
| Comprehensive test scenarios | P2 | All | Locks in P0/P1 behavior. |
| Playwright CT (DOM components) | P2 | All | Protects UI contracts. |
| Maestro E2E (web/native) | P2 | All | Protects full flow; optional in CI. |
| AI construction/expansion visibility | P2 | Competition | Depth; P1 is "rivals exist." |
| Storm spectacle, zone blend tune | P3 | — | Polish. |
| NICE_TO_HAVES items | P3 | — | When capacity allows. |

---

## 7. References

- [GAME_DESIGN](../design/GAME_DESIGN.md) — Vision, 4X pillars, phases
- [productContext](../memory-bank/productContext.md) — UX goals, target experience by phase
- [projectbrief](../memory-bank/projectbrief.md) — Non-negotiables, identity
- [GAMEPLAN_1_0](GAMEPLAN_1_0.md) — Status, what works, what doesn’t
- [TASK_LIST](TASK_LIST.md) — Concrete tasks and dependencies
- [COMPREHENSIVE_TEST_COVERAGE](COMPREHENSIVE_TEST_COVERAGE.md) — Scenario matrix (P2)
- [NICE_TO_HAVES](NICE_TO_HAVES.md) — P3 list
