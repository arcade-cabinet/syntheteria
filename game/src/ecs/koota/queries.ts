/**
 * Reusable Koota queries — mirrors the existing Miniplex archetype queries
 * defined in game/src/ecs/world.ts.
 *
 * These are created via `createQuery()` which caches the query globally.
 * Systems and React components can use these directly or via `useQuery()`.
 *
 * During migration, both Miniplex queries (world.with(...)) and these Koota
 * queries will coexist. Systems will be migrated one at a time.
 */

import { createQuery, Not } from "koota";
import {
	Automation,
	Belt,
	Building,
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
	InHopper,
	IsPlayerControlled,
	IsSelected,
	Item,
	LightningRod,
	MapFragment,
	MaterialCube,
	Miner,
	Navigation,
	NextBelt,
	OnBelt,
	OreDeposit,
	Otter,
	PlacedAt,
	Position,
	Processor,
	SignalRelay,
	Unit,
	Wire,
} from "./world";

// ---------------------------------------------------------------------------
// Core spatial queries
// ---------------------------------------------------------------------------

/** All entities that have a position and faction — the broadest spatial query. */
export const allPositioned = createQuery(Position, Faction);

/** The entity currently being piloted by the player (first-person). */
export const playerControlled = createQuery(Position, IsPlayerControlled);

/** All entities with active navigation (path-following). */
export const navigating = createQuery(Navigation, Position);

/** All entities in a map fragment (for fog-of-war grouping). */
export const allFragmented = createQuery(Position, MapFragment);

/** Currently selected entities (for RTS-style command dispatch). */
export const selected = createQuery(IsSelected, Position);

// ---------------------------------------------------------------------------
// Unit & Building queries (mirrors Miniplex world.ts)
// ---------------------------------------------------------------------------

/** All mobile units — mirrors `units` from Miniplex world. */
export const allUnits = createQuery(Unit, Position, MapFragment);

/** Units that are actively moving — mirrors `movingUnits`. */
export const movingUnits = createQuery(Unit, Navigation, Position);

/** Player-owned bots — mirrors `playerBots`. */
export const playerBots = createQuery(IsPlayerControlled, Unit, Position);

/** All buildings — mirrors `buildings`. */
export const allBuildings = createQuery(Building, Position);

/** Player-owned units — units with Faction='player'. Filter at read time. */
export const playerUnits = createQuery(Unit, Faction, Position);

/** Units with active navigation — for combined movement + unit logic. */
export const unitsWithNavigation = createQuery(Unit, Navigation, Position);

/** Lightning rods — mirrors `lightningRods`. */
export const allLightningRods = createQuery(LightningRod, Building, Position);

/** Alias for allLightningRods — convenient shorthand. */
export const lightningRods = allLightningRods;

/**
 * Buildings that could be powered — filter `powered` field at read time.
 * Use: `poweredBuildings.updateEach(([b, p]) => { if (b.powered) ... })`
 */
export const poweredBuildings = createQuery(Building, Faction, Position);

// ---------------------------------------------------------------------------
// Factory queries (mirrors Miniplex world.ts)
// ---------------------------------------------------------------------------

/** All conveyor belt segments — mirrors `belts`. */
export const allBelts = createQuery(Belt, Position);

/** Belts that have a successor in the chain. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const linkedBelts = createQuery(Belt, NextBelt("*") as any);

/** Terminal belts (no successor — items pile up here). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const terminalBelts = createQuery(Belt, Not(NextBelt("*") as any));

/**
 * Active belts — belts currently carrying an item.
 * Filter `carrying !== null` at read time since Belt.carrying is a data field.
 * Includes position for spatial iteration.
 */
export const activeBelts = createQuery(Belt, Position);

/** All wires in the network — mirrors `wires`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const allWires = createQuery(Wire, ConnectsFrom("*") as any, ConnectsTo("*") as any);

/**
 * Power wires — all wires with type='power'.
 * Filter `type === 'power'` at read time since Wire.type is a data field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const powerWires = createQuery(Wire, ConnectsFrom("*") as any, ConnectsTo("*") as any);

/** Mining drills — mirrors `miners`. */
export const allMiners = createQuery(Miner, Building, Position);

/**
 * Active miners — miners that are extracting resources.
 * Filter `drillHealth > 0` at read time since Miner fields are data.
 */
export const activeMiners = createQuery(Miner, Building, Position);

/** Processors — mirrors `processors`. */
export const allProcessors = createQuery(Processor, Building, Position);

/**
 * Active processors — processors currently running a recipe.
 * Filter `active === true` at read time since Processor.active is a data field.
 */
export const activeProcessors = createQuery(Processor, Building, Position);

/** Items on belts or in world — mirrors `items`. */
export const allItems = createQuery(Item, Position);

// ---------------------------------------------------------------------------
// Material / cube queries
// ---------------------------------------------------------------------------

/** All ore deposits in the terrain. */
export const allOreDeposits = createQuery(OreDeposit, Position);

/** All material cubes in the world. */
export const allMaterialCubes = createQuery(MaterialCube, Position);

/** Cubes currently being carried by a unit. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const heldCubes = createQuery(MaterialCube, HeldBy("*") as any);

/** Cubes riding on conveyor belts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const beltCubes = createQuery(MaterialCube, OnBelt("*") as any);

/** Cubes stored in hoppers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hopperCubes = createQuery(MaterialCube, InHopper("*") as any);

/** Cubes placed as structural elements on the build grid. */
export const placedCubes = createQuery(MaterialCube, PlacedAt);

/** Free cubes — not held, not on belt, not in hopper, not placed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const freeCubes = createQuery(
	MaterialCube,
	Not(HeldBy("*") as any),
	Not(OnBelt("*") as any),
	Not(InHopper("*") as any),
	Not(PlacedAt),
);

/** Grabbable items near units (for pickup logic). */
export const grabbableItems = createQuery(Grabbable, MaterialCube, Position);

/** Cube stacks (for instanced wall/structure rendering). */
export const allCubeStacks = createQuery(CubeStack);

// ---------------------------------------------------------------------------
// AI & Behavior queries (mirrors Miniplex world.ts)
// ---------------------------------------------------------------------------

/** All hackable entities — mirrors `hackables`. */
export const allHackables = createQuery(Hackable, Position);

/** All signal relays — mirrors `signalRelays`. */
export const allSignalRelays = createQuery(SignalRelay, Position);

/** All bots with automation — mirrors `automatedBots`. */
export const allAutomated = createQuery(Automation, Unit, Position);

/** Bots currently following a target. */
export const followingBots = createQuery(
	Automation,
	FollowTarget("*"),
	Position,
);

/** All otters — mirrors `otters`. */
export const allOtters = createQuery(Otter, Position);

/** All holograms. */
export const allHolograms = createQuery(Hologram, Position);

/** Holograms linked to a source emitter. */
export const linkedHolograms = createQuery(Hologram, HologramSource("*"));

/** Faction entities with selected status (for UI). */
export const selectedUnits = createQuery(Unit, IsSelected);

// ---------------------------------------------------------------------------
// Convenience aliases — match naming from the migration task spec
// ---------------------------------------------------------------------------

/** Alias for allHackables — convenient shorthand. */
export const hackableEntities = allHackables;

/** Alias for allSignalRelays — convenient shorthand. */
export const signalRelays = allSignalRelays;

/**
 * Active relays — signal relays with signalStrength > 0.
 * Filter `signalStrength > 0` at read time since SignalRelay.signalStrength
 * is a data field.
 */
export const activeRelays = createQuery(SignalRelay, Position, Faction);

/** Alias for allAutomated — convenient shorthand. */
export const automatedUnits = allAutomated;

/** Alias for allOtters — convenient shorthand. */
export const otters = allOtters;

/** Alias for allHolograms — convenient shorthand. */
export const holograms = allHolograms;

/** Alias for allItems — convenient shorthand. */
export const items = allItems;
