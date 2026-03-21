/**
 * @package traits
 *
 * ALL Koota trait definitions for Syntheteria.
 * Traits are pure data schemas — no logic, no side effects.
 */

export { Board } from "./board";
export {
	BotFabricator,
	Building,
	type BuildingType,
	Powered,
	PowerGrid,
	RESEARCH_LAB_ALIAS,
	SignalNode,
	StorageCapacity,
	TurretStats,
} from "./building";
export { CultMutation, CultStructure, type CultStructureType } from "./cult";
export { Faction, FactionRelation } from "./faction";
export { POIMarker } from "./poi";
export { ResourceDeposit, ResourcePool } from "./resource";
export { SalvageProp, type SalvageType } from "./salvage";
export { Tile, TileHighlight } from "./tile";
export {
	CombatResult,
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMine,
	UnitMove,
	UnitPos,
	UnitSpecialization,
	UnitStats,
	UnitUpgrade,
	UnitVisual,
	UnitXP,
} from "./unit";
