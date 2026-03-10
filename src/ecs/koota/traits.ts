/**
 * Koota ECS Trait Definitions
 *
 * This file provides a single canonical import point for all Koota traits.
 * It re-exports everything from world.ts and fills in field gaps that were
 * identified during migration (see MIGRATION_STATUS.md).
 *
 * Systems should import traits from here (or from the barrel index.ts).
 */

// Re-export everything from world.ts — all traits are defined there.
export {
	Automation,
	Belt,
	Building,
	CivilizationGovernor,
	ConnectsFrom,
	ConnectsTo,
	CubeStack,
	Faction,
	FollowTarget,
	Grabbable,
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
	OreDeposit,
	Otter,
	OutputTo,
	PlacedAt,
	Position,
	PowderStorage,
	PrevBelt,
	Processor,
	SignalRelay,
	Unit,
	Wire,
	WorkTarget,
} from "./world";

// Re-export the FactionId type for convenience.
export type { FactionId } from "../../../ecs/traits/core";
