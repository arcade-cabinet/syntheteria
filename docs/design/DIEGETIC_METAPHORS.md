---
title: "Diegetic Metaphors"
domain: design
status: canonical
last_updated: 2026-03-14
summary: "How to explore diegetic presentation more fully — in-world UI, machine language, and narrative surfaces"
depends_on:
  - "UI_DESIGN.md"
  - "BOTS.md"
---

# Diegetic Metaphors

**Diegetic** = existing within the fiction of the world. In Syntheteria, the player is coordinating a machine network in a storm-scarred ecumenopolis. Every surface that *feels* like part of that world—rather than a generic game UI—strengthens the metaphor. This doc expands on [UI_DESIGN.md](../interface/UI_DESIGN.md) and [BOTS.md](BOTS.md) to explore **how we can use diegetic metaphors even more fully**.

---

## 1. What we already do

| Surface | Diegetic treatment |
|--------|---------------------|
| **Title screen** | Live 3D scene (storm, globe, lightning); bezel menu; no tech-stack footer. `src/ui/title/TitleMenuScene.tsx`, [UI_DESIGN](../interface/UI_DESIGN.md). |
| **Loading overlay** | Diegetic copy ("Calibrating…", "Mapping sectors…"); honest progress; no "React/Expo" language. |
| **Bot speech** | Lines come from archetypes and events (harvest, combat, move); proximity-filtered; machine-operational tone. [BOTS.md](BOTS.md), botSpeech. |
| **Briefing bubbles** | In-world context: selected unit, nearby site; "Mentor Relay", "Field Technician", site descriptions. |
| **HUD / panels** | "Signal", "utility" variants; cyan/mint palette; machine-consciousness tone. Copy avoids `runtime`, `SQLite`, `pipeline`. |
| **Notifications / thought** | Machine-thought moments; not generic toasts. [UI_DESIGN §7](../interface/UI_DESIGN.md). |

---

## 2. Directions to explore further

### 2.1 In-world readouts and terminals

- **HUD chips** (Turn, Day, Storm %, Scrap) are already small readouts. Push further: label them as **system designators** ("TURN CYCLE", "ATMO PHASE", "SIGNAL STRENGTH") so they read like a control panel, not a game stat bar.
- **Tooltips and hover** could use the same vocabulary: e.g. "Fabrication queue: assembly node 2 of 4" instead of "Building: 50%".
- **Fake terminals or logs**: Optional "System log" or "Relay buffer" panel that scrolls diegetic lines (harvest events, contact pings, errors) as if the player were watching a machine stream.

### 2.2 Machine thought and narration

- **Thought overlay** is already called out as diegetic. Expand: first-run hints, upgrade unlocks, and tutorial nudges as **machine realizations** ("Primary unit suggests: survey this sector") rather than "Tip: press X".
- **Victory and defeat** copy can be framed as network state: "Signal dominance achieved" / "Relay lost" instead of "You win" / "Game over".
- **Settings and meta** can stay honest but use in-world framing: "Calibration" instead of "Settings"; "Persistence sync" instead of "Save game".

### 2.3 Sound and environment as diegetic

- **Ambient and SFX** (Tone.js) can be tied to world state: storm intensity, territory control, wormhole phase. Sound becomes part of the world, not a layer on top.
- **Voice or synthesis**: If we ever add spoken lines for bots or system, keep them mechanical and in-universe (synthetic, relay-style), not "announcer" tone.

### 2.4 Spatial and anchored UI

- **Briefing bubbles and site overlays** are already anchored (unit, POI). Go further: any contextual panel (e.g. "Unit actions", "Structure info") could be **anchored in world space** or to a "terminal" position so it feels like a display the network is showing the player, not a floating window.
- **Radial menu** can stay as-is but its labels and meta text should be full diegetic: "Move" → "Relocate unit"; "Survey" → "Scan sector"; fabrication actions as "Assembly node", etc.

### 2.5 Progression and unlocks as in-world events

- **Tech tree and Mark upgrades** can be phrased as **network upgrades** or **chassis authorizations**: "Unlock: Extended survey protocol" instead of "New ability: Survey".
- **Diplomacy and victory** events can be delivered as **relay traffic** or **contact logs** so the player feels they are reading in-world reports.

### 2.6 Failure and edge states

- **Errors and missing data** should never say "undefined" or "SQLite error". Use diegetic fallbacks: "Signal lost", "Relay offline", "Data not available in this build".
- **Empty states** (no save, no units, no research) can be short machine-status lines: "No persistence image" / "No active units" / "No protocols queued".

---

## 3. Implementation guidelines

1. **One vocabulary** — Maintain a small glossary: preferred terms (e.g. "relay", "sector", "chassis", "protocol", "persistence image") and terms to avoid (e.g. "runtime", "save file", "UI"). Use it in copy passes and when adding new strings.
2. **Copy passes** — When adding or polishing a surface, do a diegetic pass: replace any dev or generic wording with machine-operational language.
3. **Component naming** — Where it helps, name UI components for their in-world role (e.g. `DiegeticChip` for HUD readouts) so the codebase reinforces the metaphor.
4. **Testability** — Diegetic copy can still be asserted in tests (e.g. "Relocate unit" visible, "Signal lost" on error). Prefer stable, meaningful strings for testIDs and assertions.

---

## 4. References

- [UI_DESIGN.md](../interface/UI_DESIGN.md) — §6 Copy tone, §7 Notifications / thought
- [BOTS.md](BOTS.md) — Bot speech, archetypes, diegetic tutorial guidance
- [ARCHIVE: UI_REFINEMENT_EXECUTION_PLAN](../archive/UI_REFINEMENT_EXECUTION_PLAN.md) — Past diegetic copy passes
- `src/ui/dom/DiegeticChip.tsx` — Example presentational chip for in-world readouts
