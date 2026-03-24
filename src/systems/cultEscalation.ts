/**
 * Cult escalation system — 3-tier threat ramp.
 *
 * Tier 1 (0-10 min):  Lone Wanderers patrol corridors
 * Tier 2 (10-25 min): War Parties of 2-3 mixed mechs patrol aggressively
 * Tier 3 (25+ min):   Coordinated Assault Waves push toward player base
 *
 * Spawns cult mechs at city edge zones. Coexists with feral enemies.
 * Uses component-based damage — cult mechs have component loadouts, not HP.
 */

import {
	CULT_MECH_DEFS,
	type CultMechType,
	type EscalationTier,
	getEscalationTier,
	pickCultMechType,
	pickGroupSize,
} from "../config/cultDefs";
import { isInsideBuilding } from "../ecs/cityLayout";
import { createFragment, getTerrainHeight, isWalkable } from "../ecs/terrain";
import {
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { serializeComponents } from "../ecs/types";
import { world } from "../ecs/world";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let elapsedGameSec = 0;
let spawnCooldownSec = 0;
let nextCultId = 0;
let lastTierLevel = 0;

/** Spawn points — same edges as feral spawns but offset so they don't overlap */
const CULT_SPAWN_ZONES = [
	{ x: -30, z: 10 },
	{ x: -30, z: 35 },
	{ x: 50, z: 10 },
	{ x: 50, z: 35 },
	{ x: 15, z: -22 },
	{ x: 15, z: 52 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countCultUnits(): number {
	let count = 0;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)?.value === "cultist") count++;
	}
	return count;
}

function findValidCultSpawn(): { x: number; z: number } | null {
	const shuffled = [...CULT_SPAWN_ZONES].sort(() => Math.random() - 0.5);
	for (const zone of shuffled) {
		const x = zone.x + (Math.random() - 0.5) * 8;
		const z = zone.z + (Math.random() - 0.5) * 8;
		if (isWalkable(x, z) && !isInsideBuilding(x, z)) {
			return { x, z };
		}
	}
	return null;
}

/**
 * Spawn a single cult mech at the given position.
 */
function spawnCultMech(mechType: CultMechType, x: number, z: number) {
	const def = CULT_MECH_DEFS[mechType];
	const fragment = createFragment();
	const y = getTerrainHeight(x, z);
	const id = `cult_${nextCultId++}`;

	// Deep-copy components so each entity has independent state
	const components = def.components.map((c) => ({ ...c }));

	world.spawn(
		EntityId({ value: id }),
		Position({ x, y, z }),
		Faction({ value: "cultist" }),
		Fragment({ fragmentId: fragment.id }),
		Unit({
			unitType: def.unitType,
			displayName: `${def.displayName} ${id.slice(-2).toUpperCase()}`,
			speed: def.speed,
			selected: false,
		}),
		UnitComponents({
			componentsJson: serializeComponents(components),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
}

/**
 * Spawn a group of cult mechs near a single spawn zone.
 */
function spawnCultGroup(tier: EscalationTier) {
	const basePos = findValidCultSpawn();
	if (!basePos) return;

	const groupSize = pickGroupSize(tier);
	for (let i = 0; i < groupSize; i++) {
		// Spread group members slightly around the base position
		const offsetX = basePos.x + (Math.random() - 0.5) * 4;
		const offsetZ = basePos.z + (Math.random() - 0.5) * 4;

		// Ensure spawn position is valid; fall back to base if not
		const x = isWalkable(offsetX, offsetZ) ? offsetX : basePos.x;
		const z = isWalkable(offsetX, offsetZ) ? offsetZ : basePos.z;

		const mechType = pickCultMechType(tier);
		spawnCultMech(mechType, x, z);
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reset escalation state. Call when starting a new game.
 */
export function resetCultEscalation() {
	elapsedGameSec = 0;
	spawnCooldownSec = 0;
	nextCultId = 0;
	lastTierLevel = 0;
}

/**
 * Get the current escalation tier level (1-3).
 */
export function getCurrentTierLevel(): number {
	return getEscalationTier(elapsedGameSec).level;
}

/**
 * Get elapsed game time in seconds.
 */
export function getElapsedGameSec(): number {
	return elapsedGameSec;
}

/**
 * Cult escalation tick. Called once per sim tick.
 *
 * @param deltaSec - Real seconds since last tick (adjusted by game speed)
 */
export function cultEscalationSystem(deltaSec: number) {
	elapsedGameSec += deltaSec;

	const tier = getEscalationTier(elapsedGameSec);

	// Tier transition burst — spawn a wave when advancing to a new tier
	if (tier.level > lastTierLevel && lastTierLevel > 0) {
		spawnCultGroup(tier);
		lastTierLevel = tier.level;
		spawnCooldownSec = tier.spawnIntervalSec * 0.5; // shorter cooldown after burst
		return;
	}
	lastTierLevel = tier.level;

	// Regular spawn cadence
	spawnCooldownSec -= deltaSec;
	if (spawnCooldownSec > 0) return;

	const currentCount = countCultUnits();
	if (currentCount >= tier.maxEnemies) {
		spawnCooldownSec = tier.spawnIntervalSec;
		return;
	}

	spawnCultGroup(tier);
	spawnCooldownSec = tier.spawnIntervalSec;
}
