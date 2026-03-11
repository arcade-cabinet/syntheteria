import { type Entity as KootaEntity, trait } from "koota";

export type Entity = KootaEntity;
export type UnitEntity = KootaEntity;
export type BuildingEntity = KootaEntity;

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface UnitComponent {
	name: string;
	functional: boolean;
	material: "metal" | "plastic" | "electronic";
}

// Identity
export const Identity = trait({
	id: "",
	faction: "player" as "player" | "cultist" | "rogue" | "feral" | "wildlife",
});

// Continuous 3D position (single source of truth)
export const WorldPosition = trait({ x: 0, y: 0, z: 0 });

// Which map fragment this entity belongs to (for fog-of-war grouping)
export const MapFragment = trait({ fragmentId: "" });

// Unit (mobile robot)
export const Unit = trait(() => ({
	type: "maintenance_bot" as
		| "maintenance_bot"
		| "utility_drone"
		| "fabrication_unit",
	displayName: "Unit",
	speed: 0, // world units per second at 1x game speed
	selected: false,
	components: [] as UnitComponent[],
}));

// Navigation — navmesh path as world-space waypoints
export const Navigation = trait(() => ({
	path: [] as Vec3[],
	pathIndex: 0,
	moving: false,
}));

// Building / facility
export const Building = trait(() => ({
	type: "",
	powered: false,
	operational: false,
	selected: false,
	components: [] as UnitComponent[],
}));

// Lightning rod specialization
export const LightningRod = trait({
	rodCapacity: 0,
	currentOutput: 0,
	protectionRadius: 0,
});

// Signal network
export const Signal = trait({
	range: 0,
	connected: false,
	relaySource: false,
});

// Compute pool
export const Compute = trait({
	contribution: 0,
	cost: 0,
});

// Hacking state
export const Hacking = trait({
	targetId: null as string | null,
	technique: null as string | null,
	progress: 0, // 0..1
	computeCostPerTick: 0,
});

// --- Component helpers ---
export function hasCamera(entity: Entity): boolean {
	const unit = entity.get(Unit);
	if (!unit) return false;
	return unit.components.some((c) => c.name === "camera" && c.functional);
}

export function hasArms(entity: Entity): boolean {
	const unit = entity.get(Unit);
	if (!unit) return false;
	return unit.components.some((c) => c.name === "arms" && c.functional);
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
