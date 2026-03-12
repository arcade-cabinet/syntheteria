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
	requirePrimaryStructuralFragment,
} from "../world/structuralSpace";

/**
 * Enemy system — feral machines that roam the city streets.
 *
 * Feral bots spawn at city edges and patrol randomly.
 * They are hostile — will attack player units in range.
 * Can be hacked and taken over (future feature).
 */

let nextEnemyId = 0;

/** Spawn points at edges of the city */
const SPAWN_ZONES = [
	{ x: -25, z: 0 },
	{ x: -25, z: 25 },
	{ x: 45, z: 0 },
	{ x: 45, z: 25 },
	{ x: 10, z: -18 },
	{ x: 10, z: 48 },
];

// Light early-game presence: just a few wandering drones, no cultists.
// Player has no weapons initially and must avoid them.
const MAX_ENEMIES = 3;
const SPAWN_INTERVAL = 60; // ticks between spawn attempts (slower spawning)
let spawnTimer = 40; // longer initial delay so player can orient

// Track enemy entities by id
const enemyIds = new Set<string>();

function countEnemies(): number {
	let count = 0;
	for (const unit of units) {
		if (unit.get(Identity)?.faction === "feral") count++;
	}
	return count;
}

function findValidSpawn(): { x: number; z: number } | null {
	// Try each spawn zone with slight randomization
	const shuffled = [...SPAWN_ZONES].sort(() => gameplayRandom() - 0.5);
	for (const zone of shuffled) {
		const x = zone.x + (gameplayRandom() - 0.5) * 6;
		const z = zone.z + (gameplayRandom() - 0.5) * 6;
		if (isPassableAtWorldPosition(x, z) && !isInsideBuilding(x, z)) {
			return { x, z };
		}
	}
	return null;
}

function spawnEnemy() {
	const pos = findValidSpawn();
	if (!pos) return;

	const fragment = requirePrimaryStructuralFragment();
	const y = getSurfaceHeightAtWorldPosition(pos.x, pos.z);
	const id = `enemy_${nextEnemyId++}`;

	// Feral bots have random component states
	const hasCam = gameplayRandom() > 0.4;
	const hasArmsRoll = gameplayRandom() > 0.3;

	const entity = world.spawn(
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(AIController, {
		role: "hostile_machine",
		enabled: true,
		stateJson: null,
	});
	entity.set(Identity, { id, faction: "feral" as const });
	entity.set(WorldPosition, { x: pos.x, y, z: pos.z });
	entity.set(MapFragment, { fragmentId: fragment.id });
	entity.set(
		Unit,
		createBotUnitState({
			unitType: "maintenance_bot",
			displayName: `Feral ${id.slice(-2).toUpperCase()}`,
			speed: 2 + gameplayRandom() * 1.5,
			components: [
				{ name: "camera", functional: hasCam, material: "electronic" },
				{ name: "arms", functional: hasArmsRoll, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
			identity: {
				archetypeId: "feral_raider",
				speechProfile: "feral",
			},
		}),
	);
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });

	enemyIds.add(id);
}

/**
 * Enemy lifecycle tick.
 *
 * Intent and movement execution are handled by the Yuka-backed world AI
 * service. This system is now responsible for spawn cadence only.
 */
export function enemySystem() {
	// Spawn check
	spawnTimer--;
	if (spawnTimer <= 0 && countEnemies() < MAX_ENEMIES) {
		spawnEnemy();
		spawnTimer = SPAWN_INTERVAL;
	}
}

export function resetEnemyState() {
	nextEnemyId = 0;
	spawnTimer = 40;
	enemyIds.clear();
}
import { createBotUnitState } from "../bots";
