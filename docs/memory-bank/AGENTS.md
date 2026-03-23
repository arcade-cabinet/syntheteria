# Memory Bank — Agent Instructions

The memory bank is the **executive summary layer** for Syntheteria. It gives any agent rapid context on the project's current state without reading the entire codebase or full domain docs.

**Location:** `docs/memory-bank/`

## Memory Bank Files

| File | Purpose | Volatility |
|---|---|---|
| `activeContext.md` | Current work focus, recent changes, next steps | **High** — updated every session |
| `progress.md` | What works, what's left, known issues | **Medium** — updated when system status changes |
| `projectbrief.md` | Foundation: what is the project, non-negotiable requirements | **Low** — rarely changes |
| `productContext.md` | Why it exists, UX goals, target experience | **Low** — changes with major pivots |
| `systemPatterns.md` | Architecture, patterns, component relationships | **Medium** — updated when patterns change |
| `techContext.md` | Tech stack, constraints, dependencies | **Medium** — updated when stack changes |

---

## Session Start Protocol (MANDATORY)

Every agent **must** read the memory bank before doing any work. **Always think: is the game DONE?** Follow this order:

### Step 0: Is the game DONE?
```
docs/plans/IS_THE_GAME_DONE.md     — single checklist: manual 0.5/0.6, CI, PR. Answer: NO until all checked.
```

### Step 1: Current State (read first — these change most often)
```
docs/memory-bank/activeContext.md   — what's happening RIGHT NOW (includes "Is the game DONE?")
docs/memory-bank/progress.md       — what works, what doesn't (includes "Is the game DONE?")
```

### Step 2: Project Foundation
```
docs/memory-bank/projectbrief.md   — scope, identity, non-negotiables
docs/memory-bank/productContext.md — UX goals, player experience
docs/memory-bank/systemPatterns.md — how things are built
docs/memory-bank/techContext.md    — stack, constraints, dependencies
```

### Step 3: Domain Docs Index
```
docs/AGENTS.md                     — master index of all domain docs
```

### Step 4: Task-Relevant Domain Docs
Based on your task, read the relevant domain docs. Use frontmatter or the first 15 lines (`head -15`) to decide relevance before reading the full file. **Canonical paths** (see `docs/AGENTS.md` for full index):

- **Game design:** `docs/design/GAME_DESIGN.md`
- **Economy/turns:** `docs/design/ECONOMY.md`
- **World/systems:** `docs/technical/WORLD_SYSTEMS.md`
- **UI/brand:** `docs/interface/UI_DESIGN.md`
- **Lore:** `docs/design/LORE.md`
- **Technical architecture:** `docs/technical/ARCHITECTURE.md`
- **Input/interaction:** `docs/interface/INPUT.md`
- **Factions/campaign:** `docs/design/FACTIONS.md`
- **Bots/archetypes:** `docs/design/BOTS.md`
- **Assets/pipeline:** `docs/technical/ASSETS.md`
- **Rendering:** `docs/technical/RENDERING.md`
- **Design subdomain:** `docs/design/`
- **Technical subdomain:** `docs/technical/`
- **Interface subdomain:** `docs/interface/`
- **Plans:** `docs/plans/`

---

## Session End Protocol (MANDATORY)

Before finishing work, update the memory bank to reflect what happened.

### Always Update
- **`activeContext.md`** — Record what you accomplished, decisions made, and next steps. This is the most important update — the next agent depends on it.
- **`progress.md`** — Update if any system's status changed (e.g., something that was broken now works, or a new subsystem is complete).

### Update If Changed
- **`systemPatterns.md`** — Only if you introduced or changed an architectural pattern.
- **`techContext.md`** — Only if you added/removed dependencies, changed build config, or discovered new constraints.
- **`projectbrief.md`** / **`productContext.md`** — Only if the user explicitly changed project scope or UX goals.

### Update Format
When updating `activeContext.md`, structure entries as:

```markdown
## Current Focus
[What is actively being worked on]

## Recent Changes
- [Date]: [What changed] — [which files] — [key decisions]

## Next Steps
- [Concrete next actions for the next session]

## Active Decisions
[Any open questions or decisions that affect upcoming work]
```

---

## When to Update the Memory Bank

1. **After implementing significant changes** — new systems, major refactors, completed features.
2. **When discovering new project patterns** — conventions, gotchas, or implicit rules you learned the hard way.
3. **When the user requests "update memory bank"** — treat this as a directive to review and refresh all files.
4. **When context needs clarification** — if you found that a memory bank file was misleading or outdated, fix it.

---

## Multi-Agent Coordination

- Each agent reads the full memory bank independently at session start.
- **Only one agent should update `activeContext.md` at a time.** If you are running in a multi-agent team, coordinate through your team lead or task system to avoid conflicts.
- Domain docs (`docs/design/`, `docs/technical/`, `docs/interface/`) are the **detailed references**. The memory bank is the **executive summary layer** that points to them.
- If your work changes a domain doc, note the change in `activeContext.md` so the next agent knows to re-read it.

---

## Hard Rules

1. **Memory bank files are SUMMARIES.** Link to domain docs for detail — never duplicate content that lives in domain docs. Use relative links (e.g., `../GAME_DESIGN.md`, `../design/ECONOMY.md`).

2. **`activeContext.md` should be <200 lines.** It is a status board, not a narrative. Prune old entries as new ones are added. Archive old context to `progress.md` or domain docs if needed.

3. **`progress.md` tracks system-level status, not individual tasks.** It answers "what works?" and "what's broken?" — not "what did agent X do at 3pm?"

4. **Never duplicate information that lives in domain docs.** If `GAME_DESIGN.md` defines the economy rules, `systemPatterns.md` should link to it, not restate it.

5. **Keep entries concrete.** Write "wired InstancedCubeRenderer into GameScene.tsx" not "made rendering improvements." Include file paths and system names.

6. **Respect the CLAUDE.md contract.** The memory bank supplements but does not override the project's `CLAUDE.md`. If there is a conflict, `CLAUDE.md` wins.

---

## Relationship to Other Context Files

```
CLAUDE.md (root)          — operational contract, brand rules, test requirements
├── docs/AGENTS.md        — domain doc index, agent workflow (macro/meso/micro)
├── docs/memory-bank/     — executive summary layer (YOU ARE HERE)
│   ├── activeContext.md   — current status board
│   ├── progress.md        — system completion tracker
│   ├── projectbrief.md    — project identity
│   ├── productContext.md  — UX goals
│   ├── systemPatterns.md  — architecture patterns
│   └── techContext.md     — stack and constraints
└── docs/{domain}/        — full domain documentation
```

The memory bank sits between the operational contract (`CLAUDE.md`) and the full domain docs. It provides enough context to orient quickly without requiring a deep read of every domain doc on every session.
