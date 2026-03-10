/**
 * BotBrainSystem — R3F component that runs all bot brains each frame.
 *
 * Responsibilities:
 *   1. Query all entities with unit + faction traits from the ECS world.
 *   2. Maintain a BotBrain instance per non-player entity.
 *   3. Each frame: build BotContext, run brain FSM, translate SteeringOutput
 *      into Yuka Vehicle steering commands via the useBotSteering API.
 *
 * This component renders nothing — it is a pure logic system placed inside
 * the R3F <Canvas> alongside <YukaSystem />.
 *
 * Bot brains are created lazily on first encounter and cleaned up when the
 * entity is removed from the ECS world.
 */

import { useFrame } from "@react-three/fiber";
import type { Entity, Vec3 } from "../ecs/types.ts";
import { units } from "../ecs/world.ts";
import { BotBrain, BotState, SteeringCommand } from "./BotBrain.ts";
import {
	type BotContext,
	type ComponentStatus,
	type NearbyEntity,
	distanceSqXZ,
	summarizeComponents,
} from "./BotContext.ts";
import type { BotOrder } from "./BotOrders.ts";
import type { BotSteeringAPI } from "./BotSteeringTypes.ts";

// ---------------------------------------------------------------------------
// Config defaults — sourced from config/enemies.json and config/combat.json
// at module scope to avoid re-importing each frame. These match the values
// in the config files and serve as fallback defaults.
// ---------------------------------------------------------------------------

/** Default aggro range for feral enemies (from enemies.json feral.aggroRange). */
const DEFAULT_AGGRO_RANGE = 6;

/** Default patrol range for feral enemies (from enemies.json feral.patrolRange). */
const DEFAULT_PATROL_RANGE = 15;

/** Default melee range (from combat.json meleeRange). */
const DEFAULT_MELEE_RANGE = 2.5;

/** Health ratio below which a bot should flee (0..1). */
const DEFAULT_FLEE_THRESHOLD = 0.25;

/** Distance squared that counts as "safe" from threats when fleeing. */
const DEFAULT_SAFE_DISTANCE = 20;
const DEFAULT_SAFE_DISTANCE_SQ = DEFAULT_SAFE_DISTANCE * DEFAULT_SAFE_DISTANCE;

/** Maximum perception range for detecting other entities. */
const MAX_PERCEPTION_RANGE = 30;
const MAX_PERCEPTION_RANGE_SQ = MAX_PERCEPTION_RANGE * MAX_PERCEPTION_RANGE;

// ---------------------------------------------------------------------------
// Hostile faction table — quick lookup for "is this entity an enemy?"
// ---------------------------------------------------------------------------

/** Map faction -> set of factions that are hostile. */
const HOSTILE_FACTIONS: Record<string, Set<string>> = {
	player: new Set(["feral", "cultist", "rogue"]),
	feral: new Set(["player", "cultist", "rogue"]),
	cultist: new Set(["player", "feral", "rogue"]),
	rogue: new Set(["player", "feral", "cultist"]),
	wildlife: new Set(), // wildlife is not hostile to anything
};

function isHostile(factionA: string, factionB: string): boolean {
	return HOSTILE_FACTIONS[factionA]?.has(factionB) ?? false;
}

// ---------------------------------------------------------------------------
// Brain registry
// ---------------------------------------------------------------------------

interface BrainEntry {
	brain: BotBrain;
	/** Reference to the BotSteeringAPI for this entity. Set externally. */
	steeringApi: BotSteeringAPI | null;
	/** Last known order from the governor. */
	currentOrder: BotOrder | null;
}

/**
 * Map of entity ID -> BrainEntry. Maintained by the system.
 * We use a plain Map rather than a WeakMap because entity IDs are strings.
 */
const brainRegistry = new Map<string, BrainEntry>();

// ---------------------------------------------------------------------------
// Public API for registering/unregistering steering APIs
// ---------------------------------------------------------------------------

/**
 * Register a steering API for a bot entity so the brain system can
 * issue steering commands. Called from useBotSteering or equivalent hooks.
 */
export function registerBotSteering(
	entityId: string,
	api: BotSteeringAPI,
): void {
	const entry = brainRegistry.get(entityId);
	if (entry) {
		entry.steeringApi = api;
	} else {
		const brain = new BotBrain();
		brainRegistry.set(entityId, {
			brain,
			steeringApi: api,
			currentOrder: null,
		});
	}
}

/**
 * Unregister a steering API when the entity is removed or the hook unmounts.
 */
export function unregisterBotSteering(entityId: string): void {
	const entry = brainRegistry.get(entityId);
	if (entry) {
		entry.steeringApi = null;
	}
}

/**
 * Set an order from the governor for a specific bot.
 */
export function setBotOrder(entityId: string, order: BotOrder): void {
	const entry = brainRegistry.get(entityId);
	if (entry) {
		entry.currentOrder = order;
		entry.brain.setOrder(order);
	} else {
		// Brain not yet created — create it and queue the order.
		const brain = new BotBrain();
		brain.setOrder(order);
		brainRegistry.set(entityId, {
			brain,
			steeringApi: null,
			currentOrder: order,
		});
	}
}

/**
 * Get the current state of a bot's brain (for debug UI).
 */
export function getBotState(entityId: string): BotState | null {
	return brainRegistry.get(entityId)?.brain.state ?? null;
}

/**
 * Get all brain entries (for debug UI / system inspection).
 */
export function getAllBrainStates(): ReadonlyMap<string, BrainEntry> {
	return brainRegistry;
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

/**
 * Build a BotContext for a given entity by scanning the ECS world.
 * This is the most expensive operation per frame — we try to minimize
 * allocations by reusing arrays where possible.
 */
function buildContext(
	entity: Entity,
	allUnits: ReadonlyArray<Entity>,
	order: BotOrder | null,
): BotContext {
	const pos = entity.worldPosition!;
	const faction = entity.faction;

	const nearbyEnemies: NearbyEntity[] = [];
	const nearbyAllies: NearbyEntity[] = [];

	// Scan all units for nearby entities within perception range.
	for (const other of allUnits) {
		if (other.id === entity.id) continue;
		if (!other.worldPosition) continue;

		const dSq = distanceSqXZ(pos, other.worldPosition);
		if (dSq > MAX_PERCEPTION_RANGE_SQ) continue;

		const nearbyEntry: NearbyEntity = {
			id: other.id,
			position: other.worldPosition,
			distanceSq: dSq,
			faction: other.faction,
		};

		if (isHostile(faction, other.faction)) {
			nearbyEnemies.push(nearbyEntry);
		} else if (other.faction === faction) {
			nearbyAllies.push(nearbyEntry);
		}
	}

	// Sort by distance (closest first).
	nearbyEnemies.sort((a, b) => a.distanceSq - b.distanceSq);
	nearbyAllies.sort((a, b) => a.distanceSq - b.distanceSq);

	// Summarize component status.
	let components: ComponentStatus;
	if (entity.unit?.components) {
		components = summarizeComponents(entity.unit.components);
	} else {
		components = {
			total: 0,
			functional: 0,
			healthRatio: 1,
			hasArms: false,
			hasCamera: false,
			hasLegs: false,
		};
	}

	// Resolve home base — for now, use world origin as default.
	// In the future this should look up the faction's nearest building.
	const homeBase: Vec3 | null = { x: 0, y: 0, z: 0 };

	const aggroRange = DEFAULT_AGGRO_RANGE;
	const patrolRange = DEFAULT_PATROL_RANGE;

	return {
		entityId: entity.id,
		position: pos,
		faction,
		nearbyEnemies,
		nearbyAllies,
		components,
		homeBase,
		currentOrder: order,
		aggroRangeSq: aggroRange * aggroRange,
		patrolRangeSq: patrolRange * patrolRange,
		meleeRange: DEFAULT_MELEE_RANGE,
		fleeThreshold: DEFAULT_FLEE_THRESHOLD,
		safeDistanceSq: DEFAULT_SAFE_DISTANCE_SQ,
	};
}

// ---------------------------------------------------------------------------
// Steering output application
// ---------------------------------------------------------------------------

/**
 * Translate a BotBrain SteeringOutput into calls on the BotSteeringAPI.
 */
function applySteeringOutput(
	api: BotSteeringAPI,
	output: { command: SteeringCommand; target?: Vec3 },
): void {
	switch (output.command) {
		case SteeringCommand.STOP:
			api.stop();
			break;
		case SteeringCommand.SEEK:
			if (output.target) api.seek(output.target);
			break;
		case SteeringCommand.ARRIVE:
			if (output.target) api.arrive(output.target);
			break;
		case SteeringCommand.FLEE:
			if (output.target) api.flee(output.target);
			break;
		case SteeringCommand.WANDER:
			api.wander();
			break;
	}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * R3F system component that drives all bot brains.
 *
 * Place inside <Canvas> alongside <YukaSystem />.
 * Renders nothing — pure logic.
 *
 * Usage: Place inside Canvas alongside YukaSystem.
 * Renders nothing — pure logic.
 */
export function BotBrainSystem() {
	useFrame((_, delta) => {
		// Snapshot all unit entities this frame.
		const allUnitEntities = units.entities as Entity[];

		// Collect all entities in the world that are non-player bots
		// (feral, cultist, rogue) and have a unit + worldPosition.
		const activeBotIds = new Set<string>();

		for (const entity of allUnitEntities) {
			// Skip player-controlled units — they use manual input.
			if (entity.faction === "player") continue;
			if (!entity.worldPosition) continue;
			if (!entity.unit) continue;

			activeBotIds.add(entity.id);

			// Get or create brain entry.
			let entry = brainRegistry.get(entity.id);
			if (!entry) {
				entry = {
					brain: new BotBrain(),
					steeringApi: null,
					currentOrder: null,
				};
				brainRegistry.set(entity.id, entry);
			}

			// Skip if no steering API registered (vehicle not yet created).
			if (!entry.steeringApi) continue;

			// Build perception context.
			const ctx = buildContext(entity, allUnitEntities, entry.currentOrder);

			// Run the brain FSM.
			const output = entry.brain.update(delta, ctx);

			// Apply steering commands to the Yuka Vehicle.
			applySteeringOutput(entry.steeringApi, output);
		}

		// Cleanup: remove brains for entities that no longer exist.
		for (const entityId of brainRegistry.keys()) {
			if (!activeBotIds.has(entityId)) {
				brainRegistry.delete(entityId);
			}
		}
	});

	return null;
}
