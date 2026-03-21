# lib/

Shared utilities — small helpers used across packages. Subfolders group related modules.

## Rules
- **Keep modules focused** — `lib/particles/` and `lib/fog/` are self-contained barrels
- **`lib/fog/`** may import `traits/` for ECS queries (`tileVisibility`); keep that boundary thin
- **`lib/particles/`** stays dependency-free (effect bus + pool)

## Public API (via `index.ts`)
- `randomUUID()` — UUID generation
- `turnToChronometry`, `computeSunDir`, `computeSunColor` — orbital illuminator math (`chronometry.ts`)
- `buildExploredSet`, `isTileExplored`, `isUnitDetected` — fog / scan helpers (`fog/`)
- `pushEffect`, `drainEffects`, `ParticlePool`, etc. — visual effect queue (`particles/`)

## Files
| File / dir | Purpose |
|------------|---------|
| uuid.ts | UUID generation |
| chronometry.ts | Turn → day angle / season for sky & lighting |
| fog/ | Explored-tile set + unit scan detection |
| particles/ | Effect event bus + `ParticlePool` |
