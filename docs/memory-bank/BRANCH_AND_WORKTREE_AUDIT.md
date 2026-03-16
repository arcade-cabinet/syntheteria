# Branch and Worktree Audit

**Date:** 2026-03-13  
**Purpose:** Identify all outstanding branches and worktrees; determine if any have work that SHOULD be in main before kicking off Ralph.

**Cleanup:** 2026-03-13 — House cleaned. All value either extracted (3D → syntheteria-3d) or inapplicable. Obsolete branches and worktree removed.

---

## Summary (post-cleanup)

| Branch / Worktree | Status |
|-------------------|--------|
| **main** (local) | **Only branch.** All work lives here. |
| **origin/main** | Remote; push when ready (e.g. after Ralph, then PR). |

**Removed (value extracted or inapplicable):**

- **claude/explore-repo-f7SUJ** — Content moved to `../arcade-cabinet/syntheteria-3d`. Remote and local branch deleted.
- **claude/factory-planet-game-design-C8FNa** — Alternate “factory planet” vision; not applicable to main. Remote and local branch deleted.
- **feat/game-refinement-and-polish** — Behind main; terrain/hex alternate. Remote and local branch deleted.
- **.claude/worktrees/agent-a1bae54e** — No unique content. Directory removed.

**Conclusion:** Single source of truth is **main**. Ralph and further work proceed from here.

---


## Reference

- **3D experimental expansion:** `../arcade-cabinet/syntheteria-3d` (own repo; GitHub: arcade-cabinet/syntheteria-3d). Run from `syntheteria-3d/game` with `npm run dev`.

---

*Audit complete. House cleaned. Ralph and merges proceed from main only.*
