/**
 * Koota ECS — barrel export.
 *
 * Import from this module to access the Koota world, traits, queries, and bridge.
 */

// Re-export bridge
export {
	destroyEntityById,
	getEntityMap,
	getKootaEntity,
	getMiniplexId,
	resetBridge,
	spawnKootaEntity,
	syncAfterFrame,
	syncBeforeFrame,
	syncMiniplexToKoota,
} from "./bridge";
// Re-export queries
export {
	allAutomated,
	// Factory
	allBelts,
	allBuildings,
	allCubeStacks,
	allFragmented,
	// AI & Behavior
	allHackables,
	allHolograms,
	allItems,
	allLightningRods,
	allMaterialCubes,
	allMiners,
	// Materials
	allOreDeposits,
	allOtters,
	// Core
	allPositioned,
	allProcessors,
	allSignalRelays,
	// Units & Buildings
	allUnits,
	allWires,
	beltCubes,
	followingBots,
	freeCubes,
	grabbableItems,
	heldCubes,
	hopperCubes,
	linkedBelts,
	linkedHolograms,
	movingUnits,
	navigating,
	placedCubes,
	playerBots,
	playerControlled,
	selected,
	selectedUnits,
	terminalBelts,
} from "./queries";
// Re-export all traits
export {
	Automation,
	// Factory
	Belt,
	Building,
	CivilizationGovernor,
	ConnectsFrom,
	ConnectsTo,
	CubeStack,
	Faction,
	FollowTarget,
	Grabbable,
	// AI & Behavior
	Hackable,
	HeldBy,
	Hologram,
	HologramSource,
	Hopper,
	InHopper,
	InputFrom,
	IsPlayerControlled,
	IsSelected,
	Item,
	kootaWorld,
	LightningRod,
	MapFragment,
	MaterialCube,
	Miner,
	Navigation,
	NextBelt,
	OnBelt,
	// Materials
	OreDeposit,
	Otter,
	OutputTo,
	PlacedAt,
	// Core
	Position,
	PowderStorage,
	PrevBelt,
	Processor,
	SignalRelay,
	// Unit & Building
	Unit,
	Wire,
	WorkTarget,
} from "./world";
// Re-export serialization
export {
	deserializeKootaWorld,
	serializeKootaWorld,
} from "./serialize";
