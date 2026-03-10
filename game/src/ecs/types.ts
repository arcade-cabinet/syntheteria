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

// --- Factory components ---

/** Conveyor belt direction */
export type BeltDirection = "north" | "south" | "east" | "west";
export type BeltTier = "basic" | "fast" | "express";

/** A single conveyor belt segment */
export interface BeltComponent {
	direction: BeltDirection;
	speed: number; // items per second
	tier: BeltTier;
	/** Item type string currently on this segment (e.g., 'scrap_metal'), or null if empty */
	carrying: string | null;
	/** Next belt entity ID in the chain */
	nextBeltId: string | null;
	/** Previous belt entity ID in the chain */
	prevBeltId: string | null;
	/** Progress of carried item along this segment 0..1 */
	itemProgress: number;
}

/** Wire connection — power or signal cable between two entities */
export interface WireComponent {
	wireType: "power" | "signal";
	fromEntityId: string;
	toEntityId: string;
	length: number;
	currentLoad: number; // 0..1
	maxCapacity: number;
}

/** Mining drill — extracts resources from terrain */
export interface MinerComponent {
	resourceType:
		| "scrap_metal"
		| "e_waste"
		| "rare_alloy"
		| "copper"
		| "fiber_optics";
	extractionRate: number; // items per tick
	outputBeltId: string | null;
	drillHealth: number; // 0..1
	active: boolean;
}

/** Processor — transforms raw materials into refined ones */
export interface ProcessorComponent {
	processorType: "smelter" | "refiner" | "separator";
	recipe: string | null;
	inputBeltId: string | null;
	outputBeltId: string | null;
	progress: number; // 0..1
	speed: number; // ticks to complete
	active: boolean;
}

/** Holographic emitter — projects sprites/data into 3D space */
export interface HologramComponent {
	spriteId: string;
	animState: "idle" | "walk" | "talk";
	opacity: number;
	flickerSeed: number;
	flickerPhase: number;
	linkedEntityId: string | null;
}

/** An item on a conveyor belt or in inventory */
export interface ItemComponent {
	itemType: string;
	quantity: number;
}

/** Mineable resource node in the terrain */
export interface OreDepositComponent {
	oreType: string;
	currentYield: number;
	maxYield: number;
	hardness: number;
}

/** A physical block of processed material */
export interface MaterialCubeComponent {
	material: string;
	quality: number;
	hp: number;
	maxHp: number;
	damaged: boolean;
}

/** Grid position for cubes placed as structural elements */
export interface PlacedAtComponent {
	gridX: number;
	gridZ: number;
	gridY: number;
}

/** Marks an entity as something a unit can pick up */
export interface GrabbableComponent {
	weight: number;
}

/** Bulk storage for ground/powdered materials */
export interface PowderStorageComponent {
	material: string;
	amount: number;
	capacity: number;
}

/** Container that holds material cubes for processing */
export interface HopperComponent {
	slots: number;
	contents: { material: string; count: number }[];
}

/** Column of placed cubes at a grid position */
export interface CubeStackComponent {
	cubes: string[];
	gridX: number;
	gridZ: number;
	height: number;
}

/** Hackable target — can be taken over by player */
export interface HackableComponent {
	/** Compute cost to hack */
	difficulty: number;
	/** Current hack progress 0..1 */
	hackProgress: number;
	/** Whether currently being hacked */
	beingHacked: boolean;
	/** Whether already hacked (player-controlled) */
	hacked: boolean;
}

/** Signal relay — extends signal network range */
export interface SignalRelayComponent {
	signalRange: number;
	connectedTo: string[];
	signalStrength: number; // 0..1
}

/** Bot automation routine */
export interface AutomationComponent {
	routine: "idle" | "patrol" | "guard" | "work" | "follow";
	/** Entity ID to follow (for 'follow' routine) */
	followTarget: string | null;
	/** Patrol waypoints */
	patrolPoints: Vec3[];
	patrolIndex: number;
	/** Work target entity ID (for 'work' routine — e.g. a miner to tend) */
	workTarget: string | null;
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

	// Factory components
	belt?: BeltComponent;
	wire?: WireComponent;
	miner?: MinerComponent;
	processor?: ProcessorComponent;
	item?: ItemComponent;

	// Material / resource components
	oreDeposit?: OreDepositComponent;
	materialCube?: MaterialCubeComponent;
	placedAt?: PlacedAtComponent;
	grabbable?: GrabbableComponent;
	powderStorage?: PowderStorageComponent;
	hopper?: HopperComponent;
	cubeStack?: CubeStackComponent;
	/** Entity ID of the entity holding this cube */
	heldBy?: string;
	/** Entity ID of the belt this cube is riding */
	onBelt?: string;
	/** Entity ID of the hopper storing this cube */
	inHopper?: string;

	// Holographic projection
	hologram?: HologramComponent;

	// Hacking / signal
	hackable?: HackableComponent;
	signalRelay?: SignalRelayComponent;

	// Bot automation (for non-player-controlled bots)
	automation?: AutomationComponent;

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
