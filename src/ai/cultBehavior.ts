/**
 * Yuka GOAP for cult unit behavior.
 *
 * Simplified from the feature branch's 12-evaluator multi-faction system
 * to 3 evaluators for ONE enemy faction (Cult of EL):
 *
 *   PatrolGoal  — pick a random walkable tile, walk to it, repeat
 *   AggroGoal   — if player unit within detection range, move toward and attack
 *   EscalateGoal — at tier 3, coordinate with nearby cult units to form assault groups
 *
 * Each cult entity gets a Yuka Vehicle with a Think brain that evaluates
 * these three options each tick. The winning goal sets a decidedAction
 * which the cultAISystem reads to issue movement/combat commands.
 */

import { EntityManager, GoalEvaluator, Think, Vehicle } from "yuka";
import { CULT_MECH_DEFS, type CultMechType } from "../config/cultDefs";
import { isInsideBuilding } from "../ecs/cityLayout";
import { isWalkable } from "../ecs/terrain";
import {
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { parseComponents, serializePath, type Vec3 } from "../ecs/types";
import { world } from "../ecs/world";
import { getCurrentTierLevel } from "../systems/cultEscalation";
import { findPath } from "../systems/pathfinding";

// ---------------------------------------------------------------------------
// CultAgent — extends Yuka Vehicle, owns a Think brain
// ---------------------------------------------------------------------------

export type CultAction =
	| { type: "patrol"; target: Vec3 }
	| { type: "attack"; targetPos: Vec3 }
	| { type: "assault"; rallyPoint: Vec3 }
	| { type: "idle" };

export class CultAgent extends Vehicle {
	readonly entityId: number;
	brain: Think<CultAgent>;

	// Synced from ECS each tick
	posX = 0;
	posZ = 0;
	mechType: CultMechType = "wanderer";
	aggroRange = 5;
	attackRange = 2.5;
	hasFunctionalComponents = true;

	// Result of brain arbitration
	decidedAction: CultAction = { type: "idle" };

	constructor(entityId: number) {
		super();
		this.entityId = entityId;
		this.brain = new Think(this);

		// Add the 3 evaluators with fixed characterBias weights
		this.brain.addEvaluator(new PatrolEvaluator(0.4));
		this.brain.addEvaluator(new AggroEvaluator(0.8));
		this.brain.addEvaluator(new EscalateEvaluator(0.6));
	}

	/** Run brain arbitration to decide next action. */
	arbitrate(): void {
		this.decidedAction = { type: "idle" };
		this.brain.arbitrate();
	}
}

// ---------------------------------------------------------------------------
// Shared helpers for evaluators
// ---------------------------------------------------------------------------

function distanceSq(ax: number, az: number, bx: number, bz: number): number {
	const dx = ax - bx;
	const dz = az - bz;
	return dx * dx + dz * dz;
}

interface NearbyPlayer {
	x: number;
	z: number;
	dist: number;
}

/**
 * Find player units near the given position, sorted by distance.
 */
function findNearbyPlayers(
	fromX: number,
	fromZ: number,
	maxRange: number,
): NearbyPlayer[] {
	const results: NearbyPlayer[] = [];
	const rangeSq = maxRange * maxRange;

	for (const entity of world.query(Position, Unit, Faction)) {
		if (entity.get(Faction)?.value !== "player") continue;
		const pos = entity.get(Position)!;
		const dSq = distanceSq(fromX, fromZ, pos.x, pos.z);
		if (dSq <= rangeSq) {
			results.push({ x: pos.x, z: pos.z, dist: Math.sqrt(dSq) });
		}
	}

	results.sort((a, b) => a.dist - b.dist);
	return results;
}

/**
 * Find nearby cult units for assault coordination.
 */
function countNearbyCultUnits(
	fromX: number,
	fromZ: number,
	range: number,
): number {
	let count = 0;
	const rangeSq = range * range;

	for (const entity of world.query(Position, Unit, Faction)) {
		if (entity.get(Faction)?.value !== "cultist") continue;
		const pos = entity.get(Position)!;
		if (distanceSq(fromX, fromZ, pos.x, pos.z) <= rangeSq) {
			count++;
		}
	}

	return count;
}

/**
 * Find the centroid of nearby player units (for assault rally targeting).
 */
function findPlayerCentroid(): Vec3 | null {
	let sumX = 0;
	let sumZ = 0;
	let count = 0;

	for (const entity of world.query(Position, Unit, Faction)) {
		if (entity.get(Faction)?.value !== "player") continue;
		const pos = entity.get(Position)!;
		sumX += pos.x;
		sumZ += pos.z;
		count++;
	}

	if (count === 0) return null;
	return { x: sumX / count, y: 0, z: sumZ / count };
}

// ---------------------------------------------------------------------------
// PatrolEvaluator — random patrol when no threats detected
// ---------------------------------------------------------------------------

const PATROL_RADIUS = 15;

class PatrolEvaluator extends GoalEvaluator<CultAgent> {
	calculateDesirability(agent: CultAgent): number {
		if (!agent.hasFunctionalComponents) return 0;

		// Patrol is the fallback — moderate base desirability
		// Decreases slightly when nearby players exist (aggro should win)
		const nearbyPlayers = findNearbyPlayers(
			agent.posX,
			agent.posZ,
			agent.aggroRange,
		);
		if (nearbyPlayers.length > 0) return 0.1;

		return 0.5;
	}

	setGoal(agent: CultAgent): void {
		// Pick a random walkable point within patrol radius
		for (let attempt = 0; attempt < 5; attempt++) {
			const x = agent.posX + (Math.random() - 0.5) * PATROL_RADIUS * 2;
			const z = agent.posZ + (Math.random() - 0.5) * PATROL_RADIUS * 2;
			if (isWalkable(x, z) && !isInsideBuilding(x, z)) {
				agent.decidedAction = {
					type: "patrol",
					target: { x, y: 0, z },
				};
				return;
			}
		}
		agent.decidedAction = { type: "idle" };
	}
}

// ---------------------------------------------------------------------------
// AggroEvaluator — attack nearest player unit within detection range
// ---------------------------------------------------------------------------

class AggroEvaluator extends GoalEvaluator<CultAgent> {
	calculateDesirability(agent: CultAgent): number {
		if (!agent.hasFunctionalComponents) return 0;

		const nearbyPlayers = findNearbyPlayers(
			agent.posX,
			agent.posZ,
			agent.aggroRange,
		);
		if (nearbyPlayers.length === 0) return 0;

		// Desirability increases as player gets closer
		const closest = nearbyPlayers[0];
		const normalizedDist = closest.dist / agent.aggroRange;
		// 0.9 when very close, 0.6 when at edge of aggro range
		return 0.6 + 0.3 * (1 - normalizedDist);
	}

	setGoal(agent: CultAgent): void {
		const nearbyPlayers = findNearbyPlayers(
			agent.posX,
			agent.posZ,
			agent.aggroRange,
		);
		if (nearbyPlayers.length === 0) {
			agent.decidedAction = { type: "idle" };
			return;
		}

		const closest = nearbyPlayers[0];
		agent.decidedAction = {
			type: "attack",
			targetPos: { x: closest.x, y: 0, z: closest.z },
		};
	}
}

// ---------------------------------------------------------------------------
// EscalateEvaluator — coordinate assault at tier 3
// ---------------------------------------------------------------------------

const ASSAULT_COORDINATION_RANGE = 20;
const MIN_ASSAULT_GROUP = 3;

class EscalateEvaluator extends GoalEvaluator<CultAgent> {
	calculateDesirability(agent: CultAgent): number {
		if (!agent.hasFunctionalComponents) return 0;

		// Only active at tier 3
		if (getCurrentTierLevel() < 3) return 0;

		// Need enough nearby cult units to form an assault group
		const nearbyCult = countNearbyCultUnits(
			agent.posX,
			agent.posZ,
			ASSAULT_COORDINATION_RANGE,
		);
		if (nearbyCult < MIN_ASSAULT_GROUP) return 0.2;

		// High desirability when we have a critical mass
		return 0.75;
	}

	setGoal(agent: CultAgent): void {
		// Rally toward player base centroid
		const centroid = findPlayerCentroid();
		if (centroid) {
			agent.decidedAction = {
				type: "assault",
				rallyPoint: centroid,
			};
		} else {
			// No player units found — patrol instead
			agent.decidedAction = { type: "idle" };
		}
	}
}

// ---------------------------------------------------------------------------
// CultAI Runtime — manages agent registry + tick
// ---------------------------------------------------------------------------

const entityManager = new EntityManager();
const agents = new Map<number, CultAgent>();

/**
 * Reset all cult AI state. Call when starting a new game.
 */
export function resetCultAI() {
	for (const agent of agents.values()) {
		entityManager.remove(agent);
	}
	agents.clear();
}

/**
 * Get or create a CultAgent for the given entity ID.
 */
function getOrCreateAgent(entityId: number): CultAgent {
	let agent = agents.get(entityId);
	if (!agent) {
		agent = new CultAgent(entityId);
		agents.set(entityId, agent);
		entityManager.add(agent);
	}
	return agent;
}

/**
 * Remove agents for entities that no longer exist.
 */
function pruneStaleAgents(liveEntityIds: Set<number>) {
	for (const [id, agent] of agents) {
		if (!liveEntityIds.has(id)) {
			entityManager.remove(agent);
			agents.delete(id);
		}
	}
}

/**
 * Cult AI system tick. Called once per sim tick.
 *
 * 1. Sync ECS state into Yuka agents
 * 2. Run brain arbitration for each cult unit
 * 3. Execute decided actions back into ECS (movement commands)
 */
export function cultAISystem() {
	const liveIds = new Set<number>();

	// Gather all cult units and sync their state into agents
	for (const entity of world.query(
		Position,
		Unit,
		Faction,
		Navigation,
		UnitComponents,
	)) {
		if (entity.get(Faction)?.value !== "cultist") continue;

		const entityId = entity.id();
		liveIds.add(entityId);

		const agent = getOrCreateAgent(entityId);
		const pos = entity.get(Position)!;
		const unit = entity.get(Unit)!;
		const comps = parseComponents(
			entity.get(UnitComponents)?.componentsJson ?? "[]",
		);

		// Sync ECS → agent
		agent.posX = pos.x;
		agent.posZ = pos.z;
		agent.mechType = unit.unitType as CultMechType;
		agent.hasFunctionalComponents = comps.some((c) => c.functional);

		// Look up aggro/attack range from mech definition
		const def = CULT_MECH_DEFS[agent.mechType];
		if (def) {
			agent.aggroRange = def.aggroRange;
			agent.attackRange = def.attackRange;
		}

		const nav = entity.get(Navigation)!;

		// Skip units that are already moving — let them finish their path
		if (nav.moving) continue;

		// Run brain arbitration
		agent.arbitrate();

		// Execute the decided action
		const action = agent.decidedAction;
		switch (action.type) {
			case "patrol": {
				const path = findPath(pos, action.target);
				if (path.length > 0) {
					entity.set(Navigation, {
						pathJson: serializePath(path),
						pathIndex: 0,
						moving: true,
					});
				}
				break;
			}
			case "attack": {
				const path = findPath(pos, action.targetPos);
				if (path.length > 0) {
					entity.set(Navigation, {
						pathJson: serializePath(path),
						pathIndex: 0,
						moving: true,
					});
				}
				break;
			}
			case "assault": {
				const path = findPath(pos, action.rallyPoint);
				if (path.length > 0) {
					entity.set(Navigation, {
						pathJson: serializePath(path),
						pathIndex: 0,
						moving: true,
					});
				}
				break;
			}
			case "idle":
				break;
		}
	}

	// Remove agents for destroyed entities
	pruneStaleAgents(liveIds);
}
