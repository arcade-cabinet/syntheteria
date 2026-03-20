# Cloud / long-running agent runbook — Syntheteria

> **Single entry point** for autonomous or multi-session work (local or cloud). Read this first, then follow links — do not guess.
>
> **Repo:** `arcade-cabinet/syntheteria`  
> **Integration branch (work ahead of `origin/main`):** `feature/phaser-civrev2-main-integration` — open a **squash PR** into `main` when ready to collapse the tranche.

---

## 1. Hard rules (violations = stop and fix)

| Rule | Source |
|------|--------|
| Package index imports only; no deep cross-package paths | [AGENTS.md](../AGENTS.md) |
| `systems/` + `traits/` must **not** import `views/` | [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §2 |
| Never read or ship code from `pending/` | [AGENTS.md](../AGENTS.md) |
| ECS: `world` param everywhere; no `world.entity(id)` | [AGENTS.md](../AGENTS.md), [KOOTA_PATTERNS.md](KOOTA_PATTERNS.md) |
| Config = TypeScript `const` in `src/config/`, not JSON | [AGENTS.md](../AGENTS.md) |
| Before claiming done: `pnpm verify` | [AGENTS.md](../AGENTS.md) |

---

## 2. Session start checklist (every run)

1. [AGENTS.md](../AGENTS.md) — package map, commands, bans  
2. [docs/memory-bank/activeContext.md](memory-bank/activeContext.md) — current focus  
3. [docs/memory-bank/progress.md](memory-bank/progress.md) — what exists vs legacy  
4. **This file** — phase you are executing  
5. [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) — technical depth  
6. Run `pnpm verify` on the branch before starting edits; again before push  

---

## 3. Git workflow (squash to `main`)

```text
origin/main  ◄── PR ── feature/phaser-civrev2-main-integration (integration tranche)
```

1. **Branch discipline:** Integration work should land via **`feature/phaser-civrev2-main-integration` → `main`**. If commits currently sit on **`main` only** (e.g. `main` ahead of `origin/main`), create/switch before push:  
   `git branch feature/phaser-civrev2-main-integration` (from current `main`) **or** `git checkout -b feature/phaser-civrev2-main-integration`, then push **that** branch — avoid pushing dozens of unsquashed commits straight to `origin/main` unless that is explicitly intended.  
2. Push: `git push -u origin feature/phaser-civrev2-main-integration`  
3. Open **PR: `feature/phaser-civrev2-main-integration` → `main`**.  
4. Merge with **Squash and merge** (or squash locally then fast-forward) so `main` gets one coherent commit.  
5. After merge: `git checkout main && git pull origin main`; delete the remote feature branch when done.

**Do not** force-push `main` without review. **Do** keep the integration branch green with **`pnpm verify`** before push.

### 3.1 Pre-PR tight checklist (this tranche)

- [ ] **`pnpm verify`** — lint + `tsc` + Vitest all green  
- [ ] **Metrics** — `docs/memory-bank/progress.md` + `activeContext.md` match `pnpm test:vitest` output (Vitest 4 reports **test files** count; see §11 below)  
- [ ] **New docs tracked** — e.g. `COMPREHENSIVE_ENGINEERING_PLAN.md`, `CLOUD_AGENT_RUNBOOK.md`, `reference-codebases.md`; no accidental `??` left out unless gitignored on purpose  
- [ ] **Design truth** — `GAME_DESIGN.md` §9 (command UI), §5 (settlement production), `PHASER_PIVOT_PLAN` Phase 4 (no city Scene3D) match what you’re shipping in prose  
- [ ] **Optional** — `pnpm verify:with-ct` still expected to fail until Phase C; do not block PR on it  

---

## 4. Proof-of-concept artifacts (repo root) — visual ground truth

| File | Role | Compare against |
|------|------|-----------------|
| [poc-roboforming.html](../poc-roboforming.html) | **Primary** — Phaser-style vertex terrain, lighting, roboforming, CivRev2 mood | `src/views/board/lighting/worldLighting.ts`, `WorldScene` |
| [poc-isometric.html](../poc-isometric.html) | Isometric / board framing experiments | Camera math vs `views` board |
| [poc.html](../poc.html) | Earlier grating / ocean experiments | `oceanRenderer` etc. |
| [poc_real_world.html](../poc_real_world.html) | Real-world-ish terrain POC | Terrain color language |

**Non-negotiable:** Playing scene should match or beat **`poc-roboforming.html`** per [RENDERING_VISION.md](RENDERING_VISION.md).

---

## 5. Plans & architecture (read order for rendering work)

| Priority | Document | Contents |
|----------|----------|----------|
| 1 | [RENDERING_VISION.md](RENDERING_VISION.md) | Stack decision, lighting recipe, terrain/ocean/forest/roboforming gaps |
| 2 | [PHASER_PIVOT_PLAN.md](PHASER_PIVOT_PLAN.md) | Phased migration; Phase 0 config consolidation; settlements / city **DOM** panel; cleanup |
| 3 | [PHASER_VS_REACT_MATRIX.md](PHASER_VS_REACT_MATRIX.md) | Phaser vs React DOM ownership |
| 4 | [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) | Single `views/title` + `views/board`, Koota/Three checks, CivRev2 table, tests |
| 5 | [reference-codebases.md](reference-codebases.md) | Clone Koota, Phaser, three.js for upstream examples |

---

## 6. Product & simulation context

| Document | Use |
|----------|-----|
| [GAME_DESIGN.md](GAME_DESIGN.md) | Vision, lore, **epochs §4**, economy, bots, factions, presentation split §2 |
| [AI_DESIGN.md](AI_DESIGN.md) | Yuka GOAP, AI architecture |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Packages, ECS, DB, tests (may lag `views/` rename — trust AGENTS + progress) |
| [ROADMAP.md](ROADMAP.md) | Historical phases; cross-check with progress |
| `src/config/epochDefs.ts` | Epoch ↔ storm ↔ cult mutation caps (must match GAME_DESIGN) |

---

## 7. Wiring & UX references (when touching HUD / speech / command UI)

| Document | Use |
|----------|-----|
| [SPEECH_BUBBLES_WIRING.md](SPEECH_BUBBLES_WIRING.md) | Speech pipeline |
| [SPEECH_BUBBLES_CODEPATHS.md](SPEECH_BUBBLES_CODEPATHS.md) | File-level paths |

---

## 8. Visual & UX targets

| Document | Use |
|----------|-----|
| [Grok-Civilization_Revolution_2_Visual_Recreation.md](Grok-Civilization_Revolution_2_Visual_Recreation.md) | **Board** art direction — isometric tiles, camera, readability |
| [GAME_DESIGN.md](GAME_DESIGN.md) §9 | **Commands** — Civ VI (esp. mobile) for information layout; radial **deprecated** |
| [docs/screenshots/](screenshots/) | Phaser board verification images (if present) |

Deliverable: parity sheet (reference vs game screenshots) per [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §4.

---

## 9. Historical / superseded (context only — verify against code)

| Document | Note |
|----------|------|
| [HONEST_REVIEW.md](HONEST_REVIEW.md) | Pre-pivot audit; banner superseded |
| [FINAL_GAPS.md](FINAL_GAPS.md) | Old paths; superseded |
| [FULL_AUDIT.md](FULL_AUDIT.md) | Older audit |
| [SPHERICAL_WORLD_SPEC.md](SPHERICAL_WORLD_SPEC.md) | Sphere sim detail; match uses isometric board |
| [superpowers/plans/](superpowers/plans/) | Session plans — cross-check only |

---

## 10. Remaining work — phased backlog (execute in order)

Copy checkboxes into your task tracker; **do not skip gates**.

### Phase A — Repository hygiene

- [x] Open + merge squash PR: `feature/phaser-civrev2-main-integration` → `main` (see **§3.1** before push)  
- [x] `pnpm verify` on `main` after merge  

### Phase B — `views/` unification ([COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §0)

- [x] `src/views/title/` ← migrate `src/view/` (R3F globe)  
- [x] `src/views/board/` ← migrate current Phaser files from flat `src/views/*`  
- [x] Remove `src/view/`; update all imports; grep CI gate  
- [x] `pnpm verify`  

### Phase C — Gates & regression safety ([COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §7)

- [x] Script or Biome: block `systems/` / `traits/` → `views/`  
- [x] Playwright (or CT): golden screenshot title + playing  
- [x] Optional: GLB path resolution Vitest sweep  

### Phase D — POC + CivRev2 lock-in

- [x] Side-by-side `poc-roboforming.html` vs dev build; lock constants in `worldLighting.ts`  
- [x] CivRev2 parity sheet  
- [x] [RENDERING_VISION.md](RENDERING_VISION.md) gaps: blending, elevation drama, remaining ocean polish as needed  

### Phase E — Epoch / cult / roboform presentation

- [x] `epochDefs` → `epochAtmosphere` + fog tunables (deterministic tests)  
- [x] `roboformOverlay` driven from ECS/build events ([GAME_DESIGN.md](GAME_DESIGN.md) §4, RENDERING_VISION roboforming table)  

### Phase F — Config consolidation ([PHASER_PIVOT_PLAN.md](PHASER_PIVOT_PLAN.md) 0.1)

- [x] Move pure data packages under `src/config/` subfolders; barrels only  
- [x] `pnpm verify`  

### Phase G — Settlements / city data ([PHASER_PIVOT_PLAN.md](PHASER_PIVOT_PLAN.md) 0.2 / Phase 4)

**CANCELLED** — Design pivot: hub-and-spoke **networks** replace discrete settlement types; per-building modals replace a unified city screen (`GAME_DESIGN.md`). No separate “settlement snapshot” tranche; world/hub data evolves with biome + resource work.

### Phase H — Cleanup

- [x] Delete legacy R3F **match** renderers not used by title globe  
- [x] Trim R3F deps to minimum for title  
- [x] Final `pnpm verify`; update [memory-bank/progress.md](memory-bank/progress.md) + [activeContext.md](memory-bank/activeContext.md)  

### Phase I — Eliminate `src/rendering/` ([COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §8)

- [x] **Why:** Kitchen-sink package mixed board geometry, asset catalogs, globe shaders, materials, particles, fog **rules**, and input state — violated single responsibility.  
- [x] Move `boardGeometry` / `spherePlacement` → `board/sphere/`  
- [x] ~~Move depth/labyrinth geometry → `board/depth/`~~ — labyrinth/depth **removed** with overworld pivot  
- [x] Move `modelPaths` → `config/models.ts`  
- [x] Move globe shaders + `cinematicState` + title-only GLSL → `views/title/`  
- [x] Move `heightMaterial` → `views/title/materials/`  
- [x] Move `particles/*` → `lib/particles/`  
- [x] Move `pathPreview` → `input/pathPreview.ts`  
- [x] Move `tileVisibility` / `unitDetection` → `lib/fog/`  
- [x] Move `chronometry` → `lib/chronometry.ts`  
- [x] Delete `src/rendering/`; import gate (`scripts/check-imports.sh`) on `src/`  
- [x] `pnpm verify`; update [AGENTS.md](../AGENTS.md) package map (no `rendering/`)

### Phase 11 — Design Overhaul (sync with [ROADMAP.md](ROADMAP.md) §Phase 11)

- [x] **11.1** Biome terrain  
- [x] **11.2** Resource taxonomy (natural → processed → synthetic)  
- [x] **11.3** Overworld generator (biome noise)  
- [x] **11.4** Building-driven progression  
- [x] **11.5** Building unlock chains  
- [x] **11.6** Per-building modals  
- [x] **11.7** Victory conditions (6 paths + elimination defeat)  
- [ ] **11.8** Improvement overlays (visual roboforming — Phaser rendering work)  
- [ ] **11.9** Cultist scripted encounters (narrative/content)  
- [x] **11.10** Capacitor + CI/CD (Android debug APK workflow, iOS/Web targets)  

---

## 11. Commands

```bash
pnpm dev              # Vite
pnpm verify           # lint + tsc + vitest (same as CI Quality job) — required before push
pnpm verify:with-ct   # + Vitest browser mode (currently fails: stale imports in tests/components — repair Phase C)
pnpm test:ct          # browser CT only (needs Playwright browsers installed)
pnpm test:vitest      # unit tests only
pnpm tsc              # types only
```

**Vitest 4 + `@vitest/browser-playwright`:** `vitest.browser.config.ts` uses the `playwright()` provider factory. Component tests under `tests/components/*.browser.test.tsx` still reference removed modules (`src/rendering/BoardRenderer`, `src/city/...`, old `ai` exports). **Do not block merges on `test:ct` until Phase C** — update previews to **`src/views/board/`** + `src/views/title/` (post–Phase B) or delete obsolete files.

**Vitest CLI counts (2026-03-20, `pnpm test:vitest`):** **126 test files**, **2252 tests** passed. Update `memory-bank/progress.md` when those numbers change.

---

## 12. Memory bank updates (end of each milestone)

- [activeContext.md](memory-bank/activeContext.md) — what changed, what’s next  
- [progress.md](memory-bank/progress.md) — system status if anything flipped  

---

## 13. Escalation / ambiguity

If a doc conflicts with **code**, **code + AGENTS.md** win; then fix the doc in the same PR.

---

*Branch for this tranche: `feature/phaser-civrev2-main-integration`. Update this runbook when phases complete or branch name changes.*
