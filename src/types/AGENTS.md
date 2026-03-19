# types/

Ambient type declarations for third-party libraries that lack upstream types.

## Rules
- **`.d.ts` files only** — no runtime code
- **No `index.ts` needed** — ambient declarations are auto-included by TypeScript
- **One file per library** — `declare module "library-name"` pattern
- **Add here when a dependency has no `@types/` package**

## Files
| File | Purpose |
|------|---------|
| marching-cubes-faster.d.ts | Types for the marching-cubes-faster CJS package |
| sql-js-asm.d.ts | Types for the sql.js ASM build (pure JS, no WASM) |
