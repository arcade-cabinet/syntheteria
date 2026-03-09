/**
 * Syntheteria ECS Entity type and component definitions.
 * All components are optional — Miniplex queries select by presence.
 *
 * Navigation uses continuous 3D positions (no grid/tiles).
 * Units move freely through the world via navmesh pathfinding.
 *
 * Units have functional/broken parts instead of hit points.
 */

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** A physical component that can be functional or broken */
export interface UnitComponent {
	name: string;
	functional: boolean;
	/** Material needed to fabricate a replacement */
	material: "metal" | "plastic" | "electronic";
}

export interface OtterComponent {
	speed: number;
	wanderTimer: number;
	wanderDir: { x: number; z: number };
	/** True during ticks where the otter successfully moved forward. */
	moving: boolean;
	/** When true the otter stays put — used for quest-giver otters. */
	stationary?: boolean;
	/** Optional dialogue lines shown in a speech bubble when a player unit is nearby. */
	lines?: string[];
}

export interface Entity {
	// Identity
	id: string;
	faction: "player" | "cultist" | "rogue" | "feral" | "wildlife";

	// Continuous 3D position (single source of truth)
	worldPosition?: Vec3;

	// Which map fragment this entity belongs to (for fog-of-war grouping)
	mapFragment?: { fragmentId: string };

	// Unit (mobile robot)
	unit?: {
		type: "maintenance_bot" | "utility_drone" | "fabrication_unit";
		displayName: string;
		speed: number; // world units per second at 1x game speed
		selected: boolean;
		components: UnitComponent[];
	};

	// Navigation — navmesh path as world-space waypoints
	navigation?: {
		path: Vec3[];
		pathIndex: number;
		moving: boolean;
	};

	// Building / facility
	building?: {
		type: string;
		powered: boolean;
		operational: boolean;
		selected: boolean;
		components: UnitComponent[];
	};

	// Lightning rod specialization
	lightningRod?: {
		rodCapacity: number;
		currentOutput: number;
		protectionRadius: number;
	};

	// Otter — small furry wildlife that wanders the ruins
	otter?: OtterComponent;

	// FPS player control — the bot the player is currently piloting
	playerControlled?: {
		isActive: boolean;
		/** Yaw (horizontal look) in radians */
		yaw: number;
		/** Pitch (vertical look) in radians, clamped to ±π/2 */
		pitch: number;
	};
}

/** Entity with guaranteed unit components (matches units query) */
export type UnitEntity = Entity &
	Required<Pick<Entity, "unit" | "worldPosition" | "mapFragment">>;

/** Entity with guaranteed building components (matches buildings query) */
export type BuildingEntity = Entity &
	Required<Pick<Entity, "building" | "worldPosition">>;

/** Entity with guaranteed lightning rod components (matches lightningRods query) */
export type LightningRodEntity = Entity &
	Required<Pick<Entity, "lightningRod" | "building" | "worldPosition">>;

/** Entity with guaranteed otter components (matches otters query) */
export type OtterEntity = Entity &
	Required<Pick<Entity, "otter" | "worldPosition">>;

/** Entity with guaranteed player-controlled components */
export type PlayerEntity = Entity &
	Required<Pick<Entity, "playerControlled" | "unit" | "worldPosition">>;

// --- Component helpers ---

export function hasCamera(entity: UnitEntity): boolean {
	return entity.unit.components.some(
		(c) => c.name === "camera" && c.functional,
	);
}

export function hasArms(entity: UnitEntity): boolean {
	return entity.unit.components.some((c) => c.name === "arms" && c.functional);
}

export function hasFunctionalComponent(
	components: UnitComponent[],
	name: string,
): boolean {
	return components.some((c) => c.name === name && c.functional);
}

export function getBrokenComponents(
	components: UnitComponent[],
): UnitComponent[] {
	return components.filter((c) => !c.functional);
}

export function getFunctionalComponents(
	components: UnitComponent[],
): UnitComponent[] {
	return components.filter((c) => c.functional);
}
