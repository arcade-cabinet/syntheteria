import { type Entity as KootaEntity, trait } from "koota";
import type { AgentRole } from "../ai";
import type { BotArchetypeId, BotSpeechProfile, BotUnitType } from "../bots";

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
	faction: "player" as
		| "player"
		| "cultist"
		| "rogue"
		| "feral"
		| "wildlife"
		| "reclaimers"
		| "volt_collective"
		| "signal_choir"
		| "iron_creed",
});

// Which scene the entity belongs to
export const Scene = trait({
	location: "world" as "world" | "interior",
	buildingId: null as string | null, // If interior, which building
});

// Hex-grid logical position (Axial coordinates: q, r)
export const GridPosition = trait({ q: 0, r: 0 });

// Y-axis rotation (radians) for 3D model turning
export const Rotation = trait({ y: 0 });

// Continuous 3D position (single source of truth for rendering interpolation)
export const WorldPosition = trait({ x: 0, y: 0, z: 0 });

// Which map fragment this entity belongs to (for fog-of-war grouping)
export const MapFragment = trait({ fragmentId: "" });

// Unit (mobile robot)
export const Unit = trait(() => ({
	type: "maintenance_bot" as BotUnitType,
	archetypeId: "field_technician" as BotArchetypeId,
	markLevel: 1,
	speechProfile: "mentor" as BotSpeechProfile,
	displayName: "Unit",
	speed: 0, // world units per second at 1x game speed
	selected: false,
	components: [] as UnitComponent[],
}));

// Navigation — hex-grid pathing
export const Navigation = trait(() => ({
	path: [] as { q: number; r: number }[],
	pathIndex: 0,
	moving: false,
}));

// AI ownership and persisted runtime state metadata
export const AIController = trait(() => ({
	role: "player_unit" as AgentRole,
	enabled: true,
	stateJson: null as string | null,
}));

// Building / facility
export const Building = trait(() => ({
	type: "",
	powered: false,
	operational: false,
	selected: false,
	components: [] as UnitComponent[],
	cooldownExpiresAtTick: 0,
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

// Narrative and Onboarding state
export const Narrative = trait(() => ({
	consciousnessLevel: 0, // 0: Void, 1: Sensorium, 2: Self-Aware
	unlockedThoughts: [] as string[],
	completedTutorialSteps: [] as string[],
	lastThoughtId: null as string | null,
}));

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

// ==== W0: New traits for full Koota migration ====

// Singletons
export const ResourcePool = trait({
	scrapMetal: 0,
	eWaste: 0,
	intactComponents: 0,
	refinedAlloys: 0,
	powerCells: 0,
	circuitry: 0,
	opticalFiber: 0,
	nanoComposites: 0,
	quantumCores: 0,
	biomimeticPolymers: 0,
	darkMatter: 0,
});

export const TurnStateKoota = trait({
	turnNumber: 0,
	phase: "player" as "player" | "ai_faction" | "environment",
	activeFaction: "player" as string,
});

// Collections
export const TerritoryCell = trait({
	q: 0,
	r: 0,
	owner: "" as string,
	strength: 0,
});

export const FloorCell = trait({
	q: 0,
	r: 0,
	fragmentId: "",
	structuralZone: "",
	floorPresetId: "",
	discoveryState: 0, // 0=unexplored, 1=abstract, 2=detailed
	passable: true,
});

export const SpeechBubble = trait({
	entityId: "",
	text: "",
	expiresAtTick: 0,
	opacity: 1,
	wx: 0,
	wy: 0,
	wz: 0,
});

export const HarvestOp = trait({
	harvesterId: "",
	structureId: 0,
	ticksRemaining: 0,
	harvestType: "structure" as "structure" | "floor",
});

export const POI = trait({
	q: 0,
	r: 0,
	poiType: "",
	name: "",
	discovered: false,
});

export const AIFaction = trait({
	factionId: "" as string,
	phase: "dormant" as string,
	ticksUntilDecision: 0,
});

export const FactionResearch = trait({
	factionId: "" as string,
	activeResearchId: null as string | null,
	turnsCompleted: 0,
	completedTechsJson: "[]",
});

export const FactionStanding = trait({
	factionId: "" as string,
	targetFactionId: "" as string,
	standing: 0,
	atWar: false,
	allied: false,
	tradingWith: false,
});

export const FactionResourcePool = trait({
	factionId: "" as string,
	resourcesJson: "{}",
});

export const ChunkDiscovery = trait({
	chunkX: 0,
	chunkZ: 0,
	discoveryLevel: "unexplored" as "unexplored" | "abstract" | "full",
});

// Per-unit traits
export const UnitTurnState = trait({
	apRemaining: 0,
	mpRemaining: 0,
	hasActed: false,
});

export const Experience = trait({
	xp: 0,
	level: 1,
	killCount: 0,
	harvestCount: 0,
});

export const AnimationState = trait({
	clipName: "",
	playhead: 0,
	blendWeight: 1,
});

export const BotLOD = trait({
	level: "full" as "full" | "simplified" | "icon" | "hidden",
});
