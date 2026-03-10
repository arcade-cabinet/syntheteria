/**
 * Koota ECS world and core trait definitions.
 *
 * This runs in PARALLEL with the existing Miniplex world during the migration.
 * Do NOT remove the Miniplex world — it will be removed in P2.5 after all
 * systems have been migrated to Koota.
 *
 * Storage modes:
 *   - Schema object → SoA (struct-of-arrays): fast iteration over single fields
 *   - Callback function → AoS (array-of-structs): complex/nested data
 *   - No args → Tag trait: pure boolean marker, no data
 *
 * See game/ecs/traits/ for the full design docs behind each trait.
 */

import { createWorld, relation, trait } from "koota";
import type { FactionId } from "../../../ecs/traits/core";

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export const kootaWorld = createWorld();

// ---------------------------------------------------------------------------
// Core traits
// ---------------------------------------------------------------------------

/**
 * Position — continuous 3D world-space coordinates.
 * SoA storage: x, y, z stored in separate typed arrays for cache-friendly
 * iteration when systems only need one axis.
 */
export const Position = trait({ x: 0, y: 0, z: 0 });

/**
 * Faction — which team/alignment this entity belongs to.
 * SoA storage: single string field.
 */
export const Faction = trait({ value: "player" as FactionId });

/**
 * IsPlayerControlled — marks the entity currently being piloted by the player
 * in first-person mode. AoS storage (callback form) because this is mutated
 * frequently by the input system and the fields are always read together.
 *
 * Only one entity should have isActive=true at a time.
 */
export const IsPlayerControlled = trait(() => ({
	isActive: false,
	yaw: 0,
	pitch: 0,
}));

/**
 * Navigation — path-following state for entities that move through the world.
 * AoS storage (callback form) because `path` is a variable-length array.
 */
export const Navigation = trait(() => ({
	path: [] as { x: number; y: number; z: number }[],
	pathIndex: 0,
	moving: false,
}));

/**
 * MapFragment — fog-of-war grouping. Entities belong to a fragment that is
 * revealed when the player's units explore that area.
 * SoA storage: single string field.
 */
export const MapFragment = trait({ fragmentId: "" });

/**
 * IsSelected — tag trait indicating the entity is currently selected by the
 * player. No data — pure marker for efficient queries.
 */
export const IsSelected = trait();

// ---------------------------------------------------------------------------
// Unit & Building traits
// ---------------------------------------------------------------------------

/**
 * Unit — a mobile robot entity.
 * AoS storage (callback form) because `components` is a variable-length array.
 */
export const Unit = trait(() => ({
	type: "maintenance_bot" as string,
	displayName: "Bot",
	speed: 3,
	selected: false,
	components: [] as {
		type: string;
		functional: boolean;
		health: number;
		material: string;
	}[],
}));

/**
 * Building — a stationary structure placed in the world.
 * AoS storage (callback form) for consistency with Unit.
 */
export const Building = trait(() => ({
	type: "lightning_rod" as string,
	powered: false,
	operational: false,
}));

/**
 * LightningRod — specialization trait for buildings that harvest storm energy.
 * SoA storage: flat numerics ideal for power system iteration.
 */
export const LightningRod = trait({
	capacity: 10,
	currentOutput: 0,
	protectionRadius: 8,
});

// ---------------------------------------------------------------------------
// Factory traits
// ---------------------------------------------------------------------------

/**
 * Belt — a single conveyor belt segment.
 * AoS storage (callback form) because `carrying` is a nullable reference.
 */
export const Belt = trait(() => ({
	direction: "north" as "north" | "south" | "east" | "west",
	speed: 1,
	tier: "basic" as "basic" | "fast" | "express",
	carrying: null as string | null,
	itemProgress: 0,
}));

/** NextBelt — relation from a belt to the next belt in the chain. */
export const NextBelt = relation({ exclusive: true });

/** PrevBelt — relation from a belt to the previous belt in the chain. */
export const PrevBelt = relation({ exclusive: true });

/** InputFrom — relation from a machine to its input belt. */
export const InputFrom = relation({ exclusive: true });

/** OutputTo — relation from a machine to its output belt. */
export const OutputTo = relation({ exclusive: true });

/**
 * Wire — a power or signal cable connecting two entities.
 * AoS storage (callback form).
 */
export const Wire = trait(() => ({
	type: "power" as "power" | "signal",
	length: 0,
	maxCapacity: 10,
	currentLoad: 0,
}));

/** ConnectsFrom — relation from a wire to its source endpoint. */
export const ConnectsFrom = relation({ exclusive: true });

/** ConnectsTo — relation from a wire to its target endpoint. */
export const ConnectsTo = relation({ exclusive: true });

/**
 * Miner — a mining drill that extracts ore from terrain deposits.
 * AoS storage (callback form).
 */
export const Miner = trait(() => ({
	resourceType: "scrap_metal" as string,
	extractionRate: 1,
	drillHealth: 1,
}));

/**
 * Processor — transforms raw materials into refined products.
 * AoS storage (callback form).
 */
export const Processor = trait(() => ({
	type: "smelter" as "smelter" | "refiner" | "separator",
	recipe: null as string | null,
	progress: 0,
	speed: 60,
	active: false,
}));

// ---------------------------------------------------------------------------
// Material traits
// ---------------------------------------------------------------------------

/**
 * OreDeposit — a mineable resource node in the terrain.
 * SoA storage: flat numerics.
 */
export const OreDeposit = trait({
	oreType: "scrap_metal" as string,
	currentYield: 100,
	maxYield: 100,
	hardness: 1,
});

/**
 * MaterialCube — a physical block of processed material.
 * AoS storage (callback form).
 */
export const MaterialCube = trait(() => ({
	material: "refined_metal" as string,
	quality: 1,
	hp: 10,
	maxHp: 10,
	damaged: false,
}));

/** HeldBy — relation from a cube to the entity carrying it. */
export const HeldBy = relation({ exclusive: true });

/** OnBelt — relation from a cube to the belt it is riding. */
export const OnBelt = relation({ exclusive: true });

/** InHopper — relation from a cube to the hopper storing it. */
export const InHopper = relation({ exclusive: true });

/**
 * PlacedAt — grid position for cubes placed as structural elements.
 * SoA storage: flat numerics.
 */
export const PlacedAt = trait({ gridX: 0, gridZ: 0, gridY: 0 });

/**
 * Grabbable — marks an entity as something a unit can pick up.
 * SoA storage.
 */
export const Grabbable = trait({ weight: 1 });

// ---------------------------------------------------------------------------
// AI & Behavior traits
// ---------------------------------------------------------------------------

/**
 * Hackable — marks an entity as a target for the player's hacking ability.
 * SoA storage: flat numerics/booleans.
 */
export const Hackable = trait({
	difficulty: 5,
	progress: 0,
	beingHacked: false,
	hacked: false,
});

/**
 * SignalRelay — a node in the signal/compute network.
 * AoS storage (callback form) because `connectedTo` is a variable-length array.
 */
export const SignalRelay = trait(() => ({
	range: 10,
	connectedTo: [] as string[],
	signalStrength: 1,
}));

/**
 * Automation — defines the behavioral routine a bot follows when not
 * directly commanded.
 * AoS storage (callback form) because `patrolPoints` is a variable-length array.
 */
export const Automation = trait(() => ({
	routine: "idle" as
		| "idle"
		| "patrol"
		| "guard"
		| "follow"
		| "work"
		| "carry_cubes"
		| "build_wall",
	followTarget: null as string | null,
	patrolPoints: [] as { x: number; y: number; z: number }[],
	patrolIndex: 0,
	workTarget: null as string | null,
}));

/** FollowTarget — relation from a bot to the entity it is following. */
export const FollowTarget = relation({ exclusive: true });

/** WorkTarget — relation from a bot to the entity it is working on. */
export const WorkTarget = relation({ exclusive: true });

/**
 * Otter — small furry wildlife that wanders the ruins.
 * AoS storage (callback form) because `lines` is a variable-length array.
 */
export const Otter = trait(() => ({
	speed: 1.5,
	wanderTimer: 4,
	wanderDir: { x: 1, z: 0 } as { x: number; z: number },
	moving: false,
	stationary: false,
	lines: [] as string[],
	questIndex: 0,
}));

/**
 * Hologram — a holographic projection.
 * AoS storage (callback form).
 */
export const Hologram = trait(() => ({
	sourceEmitterId: "" as string,
	emissiveColor: "#00ff88",
	spriteId: "" as string,
	animState: "idle" as "idle" | "walk" | "talk",
	opacity: 1,
	flickerSeed: 0,
	flickerPhase: 0,
}));

/** HologramSource — relation from a hologram to its emitter. */
export const HologramSource = relation({ exclusive: true });

/**
 * CivilizationGovernor — AI director trait for NPC faction entities.
 * AoS storage (callback form) because `evaluatorWeights` is a dynamic map.
 */
export const CivilizationGovernor = trait(() => ({
	civId: "" as string,
	evaluatorWeights: {} as Record<string, number>,
	currentGoal: null as string | null,
}));

/**
 * Item — an item on a conveyor belt or in inventory (legacy compat).
 * AoS storage (callback form).
 */
export const Item = trait(() => ({
	itemType: "" as string,
	quantity: 1,
}));

/**
 * Hopper — a container that holds material cubes for processing.
 * AoS storage (callback form) because `contents` is a variable-length array.
 */
export const Hopper = trait(() => ({
	slots: 8,
	contents: [] as { material: string; count: number }[],
}));

/**
 * PowderStorage — bulk storage for ground/powdered materials.
 * SoA storage: flat numerics.
 */
export const PowderStorage = trait({
	material: "" as string,
	amount: 0,
	capacity: 100,
});

/**
 * CubeStack — a column of placed cubes at a grid position.
 * AoS storage (callback form) because `cubes` is a variable-length array.
 */
export const CubeStack = trait(() => ({
	cubes: [] as string[],
	gridX: 0,
	gridZ: 0,
	height: 0,
}));
