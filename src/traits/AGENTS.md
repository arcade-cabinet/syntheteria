# traits/

Koota trait definitions — pure data schemas with default values.

## Rules
- **No logic** — traits are data containers, not behaviors
- **No imports from other packages** except type-only from `board/types` and `robots/types`
- One domain per file (unit.ts, building.ts, etc.)
- All traits re-exported via `index.ts`

## Files
| File | Traits |
|------|--------|
| board.ts | Board |
| building.ts | Building, PowerGrid, Powered, SignalNode, TurretStats, BotFabricator, StorageCapacity |
| cult.ts | CultMutation, CultStructure |
| faction.ts | Faction, FactionRelation |
| resource.ts | ResourceDeposit, ResourcePool |
| salvage.ts | SalvageProp |
| tile.ts | Tile, TileHighlight |
| unit.ts | UnitPos, UnitMove, UnitFaction, UnitStats, UnitVisual, UnitAttack, CombatResult, UnitHarvest, UnitMine, UnitSpecialization, UnitUpgrade, UnitXP |
