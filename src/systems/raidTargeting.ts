/**
 * Raid targeting — scans the world for enemy stockpiles and evaluates
 * raid viability for an attacking faction.
 *
 * Also exposes calculateRaidStrength() which implements the wealth-scaling
 * formula from GDD §5.3:
 *   raidStrength = cubeCount*0.5 + buildingCount*2 + techLevel*10
 * multiplied by the active storm phase's raidWealthMultiplier.
 *
 * Stockpiles are clusters of placed cubes (Grabbable entities).
 * Targets are prioritised by material value, vulnerability (distance
 * from player defenders), and accessibility (pathfinding cost proxy).
 *
 * Tunables sourced from config/combat.json (raid section).
 */

import { config } from "../../config";
import type { Entity, Vec3 } from "../ecs/types";
import { units } from "../ecs/koota/compat";
import { type PerceivedPile, getVisibleEnemyPiles } from "../ai/PerceptionSystem";
import type { CubePile } from "./cubePileTracker";
import { type CubeEntity, getCubes } from "./raidSystem";
import { calculateRaidStrength as _calculateRaidStrength } from "./stormSystem";
export type { RaidStrengthInput } from "./stormSystem";
export { calculateRaidStrength } from "./stormSystem";
export type { PerceivedPile };

// ---------------------------------------------------------------------------
// Config-driven constants
// ---------------------------------------------------------------------------

const raidCfg = config.combat.raid;

/** Cubes within this radius of each other are considered one stockpile. */
const CLUSTER_RADIUS = raidCfg.clusterRadius;
/** Radius around a stockpile in which we count defenders. */
const DEFENDER_SCAN_RADIUS = raidCfg.defenderScanRadius;

// ---------------------------------------------------------------------------
// Target description
// ---------------------------------------------------------------------------

export interface RaidTarget {
	/** Centroid of the cube cluster. */
	position: Vec3;
	/** Sum of all cube values in the cluster. */
	estimatedValue: number;
	/** Rough threat level: how many functional defenders are nearby. */
	threatLevel: number;
	/** Number of cubes in the cluster. */
	cubeCount: number;
	/** Ids of cubes in this cluster (for downstream use). */
	cubeIds: string[];
}

// ---------------------------------------------------------------------------
// Material value weights — higher = more attractive to raiders.
// ---------------------------------------------------------------------------

const VALUE_WEIGHTS: Record<string, number> = { ...raidCfg.valueWeights };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find raid targets visible to the given faction.
 *
 * Scans all cube entities NOT owned by `faction`, clusters nearby cubes
 * into stockpiles, and returns them sorted by a composite score:
 *   score = value * (1 / (1 + threatLevel))
 *
 * Higher-value, lower-threat targets sort first.
 *
 * @param faction - the attacking faction (cubes belonging to this faction are ignored)
 */
export function findRaidTargets(faction: Entity["faction"]): RaidTarget[] {
	const cubes = getCubes();

	// Filter to cubes that belong to the enemy (i.e. NOT our faction, and not held)
	const enemyCubes = cubes.filter((c) => c.faction !== faction && !c.heldBy);

	if (enemyCubes.length === 0) return [];

	// Cluster cubes by proximity
	const clusters = clusterCubes(enemyCubes);

	// Build RaidTarget for each cluster
	const targets: RaidTarget[] = clusters.map((cluster) => {
		const centroid = computeCentroid(cluster);
		const estimatedValue = cluster.reduce(
			(sum, c) =>
				sum +
				(VALUE_WEIGHTS[c.grabbable.resourceType] ?? 1) * c.grabbable.value,
			0,
		);
		const threatLevel = countDefendersNear(
			centroid,
			DEFENDER_SCAN_RADIUS,
			faction,
		);
		return {
			position: centroid,
			estimatedValue,
			threatLevel,
			cubeCount: cluster.length,
			cubeIds: cluster.map((c) => c.id),
		};
	});

	// Sort by composite score: high value & low threat first
	targets.sort((a, b) => {
		const scoreA = a.estimatedValue / (1 + a.threatLevel);
		const scoreB = b.estimatedValue / (1 + b.threatLevel);
		return scoreB - scoreA;
	});

	return targets;
}

/**
 * Assess whether a given faction has enough force to raid a target.
 *
 * Compares available combat-capable units from the faction against
 * the expected defense strength.
 *
 * @returns an object with the assessment details and a `viable` flag
 */
export function assessRaidViability(
	faction: Entity["faction"],
	target: RaidTarget,
): {
	viable: boolean;
	availableForce: number;
	expectedDefense: number;
	forceRatio: number;
} {
	// Count combat-capable units of the attacking faction
	let availableForce = 0;
	for (const u of units) {
		if (u.faction !== faction) continue;
		const functionalCount = u.unit.components.filter(
			(c) => c.functional,
		).length;
		if (functionalCount > 0) {
			availableForce += functionalCount;
		}
	}

	// Expected defense: threat level weighted by average component count
	const expectedDefense = target.threatLevel * raidCfg.defenderComponentEstimate;

	const forceRatio =
		expectedDefense > 0
			? availableForce / expectedDefense
			: availableForce > 0
				? 10
				: 0;

	// Need at least forceRatioThreshold force ratio to consider viable
	const viable = forceRatio >= raidCfg.forceRatioThreshold && availableForce > 0;

	return {
		viable,
		availableForce,
		expectedDefense,
		forceRatio,
	};
}

/**
 * Governor-level raid target discovery using pile-based perception.
 *
 * Uses the wealth-attracts-raids formula (GDD §6.4):
 *   effectiveRange = baseRange * (1 + pile.cubeCount * 0.05)
 *
 * Only piles within the faction's (wealth-scaled) detection range are
 * considered as raid targets. This means larger, richer stockpiles are
 * detectable from farther away — a deliberate design tension: hoarding
 * wealth makes you a bigger target.
 *
 * @param attackingFaction - Faction ID initiating the raid scan
 * @param observerPosition - World XZ position of the faction's base or scout
 * @param basePerceptionRange - Base detection range in world units
 * @param allPiles - All cube piles in the world (from getPiles())
 * @returns RaidTargets derived from visible enemy piles, sorted by composite score
 */
export function findRaidTargetsFromPiles(
	attackingFaction: Entity["faction"],
	observerPosition: { x: number; z: number },
	basePerceptionRange: number,
	allPiles: CubePile[],
): RaidTarget[] {
	// Filter to enemy piles only
	const enemyPiles = allPiles.filter((p) => p.ownerFaction !== attackingFaction);

	// Use pile perception (wealth-scales detection range)
	const visiblePiles: PerceivedPile[] = getVisibleEnemyPiles(
		observerPosition,
		basePerceptionRange,
		enemyPiles,
	);

	if (visiblePiles.length === 0) return [];

	// Convert visible piles to RaidTargets
	const targets: RaidTarget[] = visiblePiles.map(({ pile }) => {
		const threatLevel = countDefendersNear(
			pile.center,
			DEFENDER_SCAN_RADIUS,
			attackingFaction,
		);

		return {
			position: pile.center,
			estimatedValue: pile.totalEconomicValue,
			threatLevel,
			cubeCount: pile.cubeCount,
			cubeIds: [], // pile-based targets don't carry individual cube IDs
		};
	});

	// Sort by composite score: high value, low threat first
	targets.sort((a, b) => {
		const scoreA = a.estimatedValue / (1 + a.threatLevel);
		const scoreB = b.estimatedValue / (1 + b.threatLevel);
		return scoreB - scoreA;
	});

	return targets;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Simple single-linkage clustering: group cubes that are within
 * CLUSTER_RADIUS of at least one other cube in the same cluster.
 */
function clusterCubes(cubes: CubeEntity[]): CubeEntity[][] {
	const assigned = new Set<string>();
	const clusters: CubeEntity[][] = [];

	for (const cube of cubes) {
		if (assigned.has(cube.id)) continue;

		// BFS to find connected cubes
		const cluster: CubeEntity[] = [cube];
		assigned.add(cube.id);
		const queue = [cube];

		while (queue.length > 0) {
			const current = queue.pop()!;
			for (const other of cubes) {
				if (assigned.has(other.id)) continue;
				if (
					distXZ(current.worldPosition, other.worldPosition) <= CLUSTER_RADIUS
				) {
					cluster.push(other);
					assigned.add(other.id);
					queue.push(other);
				}
			}
		}

		clusters.push(cluster);
	}

	return clusters;
}

function computeCentroid(cubes: CubeEntity[]): Vec3 {
	let x = 0;
	let z = 0;
	for (const c of cubes) {
		x += c.worldPosition.x;
		z += c.worldPosition.z;
	}
	const n = cubes.length;
	return { x: x / n, y: 0, z: z / n };
}

/**
 * Count functional player/defending units near a position.
 * "Defending" means any unit NOT belonging to the attacking faction.
 */
function countDefendersNear(
	pos: Vec3,
	radius: number,
	attackingFaction: Entity["faction"],
): number {
	let count = 0;
	for (const u of units) {
		if (u.faction === attackingFaction) continue;
		if (u.faction === "wildlife") continue; // otters don't fight
		if (!u.unit.components.some((c) => c.functional)) continue;
		if (distXZ(u.worldPosition, pos) <= radius) {
			count++;
		}
	}
	return count;
}

function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}
