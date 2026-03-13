import gameplayConfig from "../config/gameplay.json";
import { isInsideBuilding } from "../ecs/cityLayout";
import { gameplayRandom } from "../ecs/seed";
import {
	AIController,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { units, world } from "../ecs/world";
import {
	getSurfaceHeightAtWorldPosition,
	isPassableAtWorldPosition,
} from "../world/structuralSpace";

/**
 * Rival Faction Encounters — AI scouts patrol toward player territory border.
 *
 * - Scouts spawn after a minimum tick threshold (no turn-1 encounters)
 * - Frequency scales with game progression
 * - First contact with an undiscovered faction triggers a diplomatic notification
 * - Scouts retreat if outmatched, engage if they have numerical advantage
 */

export type RivalFaction =
	| "reclaimers"
	| "volt_collective"
	| "signal_choir"
	| "iron_creed";

const CONFIG = gameplayConfig.rivalEncounters;

export interface FirstContactEvent {
	faction: RivalFaction;
	tick: number;
	scoutId: string;
	position: { x: number; z: number };
}

export interface RivalEncounterSnapshot {
	discoveredFactions: RivalFaction[];
	activeScoutCount: number;
	lastContactEvents: FirstContactEvent[];
}

// --- Module state ---
const discoveredFactions = new Set<RivalFaction>();
let nextScoutId = 0;
let spawnTimer = 0;
let lastContactEvents: FirstContactEvent[] = [];

/**
 * Get the set of factions the player has discovered via first contact.
 */
export function getDiscoveredFactions(): ReadonlySet<RivalFaction> {
	return discoveredFactions;
}

/**
 * Get the most recent first-contact events (cleared each tick).
 */
export function getLastContactEvents(): readonly FirstContactEvent[] {
	return lastContactEvents;
}

/**
 * Get a snapshot of current encounter state.
 */
export function getRivalEncounterSnapshot(): RivalEncounterSnapshot {
	return {
		discoveredFactions: [...discoveredFactions],
		activeScoutCount: countScouts(),
		lastContactEvents: [...lastContactEvents],
	};
}

/**
 * Count active rival scouts in the world.
 */
function countScouts(): number {
	let count = 0;
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (identity && isRivalFaction(identity.faction)) {
			count++;
		}
	}
	return count;
}

/**
 * Count player units near a given position.
 */
function countPlayerUnitsNear(x: number, z: number, radius: number): number {
	let count = 0;
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (identity?.faction !== "player") continue;
		const pos = unit.get(WorldPosition);
		if (!pos) continue;
		const dx = pos.x - x;
		const dz = pos.z - z;
		if (dx * dx + dz * dz <= radius * radius) {
			count++;
		}
	}
	return count;
}

/**
 * Count rival scouts near a given position (same faction counts as allies).
 */
function countRivalScoutsNear(
	x: number,
	z: number,
	radius: number,
	faction: RivalFaction,
): number {
	let count = 0;
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (identity?.faction !== faction) continue;
		const pos = unit.get(WorldPosition);
		if (!pos) continue;
		const dx = pos.x - x;
		const dz = pos.z - z;
		if (dx * dx + dz * dz <= radius * radius) {
			count++;
		}
	}
	return count;
}

/**
 * Type guard for rival faction identifiers.
 */
export function isRivalFaction(faction: string): faction is RivalFaction {
	return (
		faction === "reclaimers" ||
		faction === "volt_collective" ||
		faction === "signal_choir" ||
		faction === "iron_creed"
	);
}

/**
 * Find the average position of all player units (the "player territory center").
 */
function getPlayerCentroid(): { x: number; z: number } | null {
	let cx = 0;
	let cz = 0;
	let count = 0;
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (identity?.faction !== "player") continue;
		const pos = unit.get(WorldPosition);
		if (!pos) continue;
		cx += pos.x;
		cz += pos.z;
		count++;
	}
	if (count === 0) return null;
	return { x: cx / count, z: cz / count };
}

/**
 * Pick a random rival faction for the next scout.
 */
function pickFaction(): RivalFaction {
	const factions = CONFIG.factions as RivalFaction[];
	return factions[Math.floor(gameplayRandom() * factions.length)];
}

/**
 * Find a valid spawn position at the border, roughly facing toward the player.
 */
function findSpawnPosition(playerCenter: {
	x: number;
	z: number;
}): { x: number; z: number } | null {
	const spawnDist = CONFIG.spawnDistanceFromPlayer;
	for (let attempt = 0; attempt < 10; attempt++) {
		const angle = gameplayRandom() * Math.PI * 2;
		const x = playerCenter.x + Math.cos(angle) * spawnDist;
		const z = playerCenter.z + Math.sin(angle) * spawnDist;
		if (isPassableAtWorldPosition(x, z) && !isInsideBuilding(x, z)) {
			return { x, z };
		}
	}
	return null;
}

/**
 * Spawn a rival scout entity.
 */
function spawnScout(
	faction: RivalFaction,
	pos: { x: number; z: number },
): string {
	const y = getSurfaceHeightAtWorldPosition(pos.x, pos.z);
	const id = `rival_scout_${faction}_${nextScoutId++}`;

	const entity = world.spawn(
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(AIController, {
		role: "rival_scout",
		enabled: true,
		stateJson: null,
	});
	entity.set(Identity, { id, faction });
	entity.set(WorldPosition, { x: pos.x, y, z: pos.z });
	entity.set(MapFragment, { fragmentId: "frag_0" });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "scout",
		displayName: `${factionDisplayName(faction)} Scout`,
		speed: CONFIG.scoutSpeed,
		selected: false,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });

	return id;
}

/**
 * Human-readable faction name.
 */
function factionDisplayName(faction: RivalFaction): string {
	switch (faction) {
		case "reclaimers":
			return "Reclaimer";
		case "volt_collective":
			return "Volt";
		case "signal_choir":
			return "Signal";
		case "iron_creed":
			return "Iron Creed";
	}
}

/**
 * Check if a scout is near enough to player units for first contact.
 */
function checkFirstContact(tick: number): FirstContactEvent[] {
	const events: FirstContactEvent[] = [];
	for (const unit of units) {
		const identity = unit.get(Identity);
		if (!identity || !isRivalFaction(identity.faction)) continue;
		const faction = identity.faction as RivalFaction;
		if (discoveredFactions.has(faction)) continue;

		const pos = unit.get(WorldPosition);
		if (!pos) continue;

		const nearbyPlayers = countPlayerUnitsNear(
			pos.x,
			pos.z,
			CONFIG.fogEdgeDetectionRadius,
		);
		if (nearbyPlayers > 0) {
			discoveredFactions.add(faction);
			events.push({
				faction,
				tick,
				scoutId: identity.id,
				position: { x: pos.x, z: pos.z },
			});
		}
	}
	return events;
}

/**
 * Main encounter system tick. Called once per simulation tick.
 *
 * Responsibilities:
 * 1. Spawn scouts after minimum tick threshold, scaling with game progression
 * 2. Detect first contact with undiscovered factions
 * 3. Provide strength context to AI planner for retreat/engage decisions
 */
export function rivalEncounterSystem(tick: number) {
	lastContactEvents = [];

	// No encounters before minimum tick
	if (tick < CONFIG.minSpawnTick) return;

	// Spawn check
	spawnTimer--;
	if (spawnTimer <= 0 && countScouts() < CONFIG.maxActiveScouts) {
		const playerCenter = getPlayerCentroid();
		if (playerCenter) {
			const faction = pickFaction();
			const spawnPos = findSpawnPosition(playerCenter);
			if (spawnPos) {
				spawnScout(faction, spawnPos);
			}
		}
		// Spawn interval decreases as game progresses (more frequent mid/late game)
		const progressFactor = Math.min(tick / 3000, 1);
		const interval = CONFIG.spawnIntervalTicks * (1 - progressFactor * 0.5);
		spawnTimer = Math.max(Math.floor(interval), 60);
	}

	// First contact detection
	const contactEvents = checkFirstContact(tick);
	if (contactEvents.length > 0) {
		lastContactEvents = contactEvents;
	}
}

/**
 * Calculate strength ratios for a rival scout's position.
 * Used by the AI planner to decide retreat vs engage.
 */
export function getStrengthContext(
	scoutFaction: RivalFaction,
	x: number,
	z: number,
): { scoutStrength: number; playerStrength: number } {
	const detectionRadius = CONFIG.fogEdgeDetectionRadius;
	const scoutStrength = countRivalScoutsNear(
		x,
		z,
		detectionRadius,
		scoutFaction,
	);
	const playerStrength = countPlayerUnitsNear(x, z, detectionRadius);
	return { scoutStrength, playerStrength };
}

/**
 * Reset all encounter state. Call at game start or when loading a save.
 */
export function resetRivalEncounterState() {
	discoveredFactions.clear();
	nextScoutId = 0;
	spawnTimer = 0;
	lastContactEvents = [];
}
