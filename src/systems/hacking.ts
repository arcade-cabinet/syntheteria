import { cancelAgentTask, readAIState } from "../ai";
import gameplayConfig from "../config/gameplay.json";
import type { Entity } from "../ecs/traits";
import { Hacking, Identity, Signal, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import type { BotUnitType } from "../bots/types";
import { getTurnState, hasActionPoints, spendActionPoint } from "./turnSystem";

/**
 * Compute capacity system.
 *
 * Compute is a real resource provided by relay towers and consumed by hacking.
 * Each relay tower with a Compute trait contributes its `contribution` minus its `cost`.
 * Global compute = sum of net contributions from all player-owned Compute entities.
 */
export const globalCompute = {
	capacity: 0,
	demand: 0,
	available: 0,
};

/** AP cost per hacking action (per turn of hacking). */
export const HACKING_AP_COST = 1;

/** Signal range required for hacking. */
export const HACKING_SIGNAL_RANGE = 3;

export function getHackDifficulty(_target: Entity): number {
	return gameplayConfig.hacking.baseDifficulty;
}

/**
 * Hacked bot role definitions.
 *
 * When a bot is captured via hacking, its combat role is determined by its unit type.
 * Each archetype has specialized combat capabilities:
 *   - Arachnoid (feral_drone): fast melee striker
 *   - MechaTrooper (mecha_trooper): ranged attacker (5 unit range)
 *   - QuadrupedTank (quadruped_tank): siege unit (2x structure damage)
 */
export interface HackedBotRole {
	/** Display label for the captured role */
	label: string;
	/** Combat style */
	combatStyle: "melee" | "ranged" | "siege";
	/** Attack range in world units */
	attackRange: number;
	/** Damage multiplier against structures (1.0 = normal) */
	structureDamageMultiplier: number;
	/** Movement speed modifier (1.0 = normal) */
	speedModifier: number;
}

const HACKED_BOT_ROLES: Partial<Record<BotUnitType, HackedBotRole>> = {
	feral_drone: {
		label: "Reclaimed Striker",
		combatStyle: "melee",
		attackRange: 2.5,
		structureDamageMultiplier: 1.0,
		speedModifier: 1.3,
	},
	mecha_trooper: {
		label: "Reclaimed Gunner",
		combatStyle: "ranged",
		attackRange: 5.0,
		structureDamageMultiplier: 1.0,
		speedModifier: 1.0,
	},
	quadruped_tank: {
		label: "Reclaimed Siege Engine",
		combatStyle: "siege",
		attackRange: 3.0,
		structureDamageMultiplier: 2.0,
		speedModifier: 0.8,
	},
};

/** Default role for unit types without a specialized hacked role. */
const DEFAULT_HACKED_ROLE: HackedBotRole = {
	label: "Reclaimed Unit",
	combatStyle: "melee",
	attackRange: 2.5,
	structureDamageMultiplier: 1.0,
	speedModifier: 1.0,
};

/**
 * Get the hacked bot role for a given unit type.
 */
export function getHackedBotRole(unitType: BotUnitType): HackedBotRole {
	return HACKED_BOT_ROLES[unitType] ?? DEFAULT_HACKED_ROLE;
}

/**
 * Apply a hacked role to a captured entity — adjust speed based on role modifiers.
 */
export function applyHackedRole(entity: Entity): HackedBotRole {
	const unit = entity.get(Unit);
	if (!unit) return DEFAULT_HACKED_ROLE;

	const role = getHackedBotRole(unit.type);
	// Use entity.set() since static traits return copies from get()
	entity.set(Unit, {
		...unit,
		speed: unit.speed * role.speedModifier,
	});
	return role;
}

/**
 * Check if a hacker can act this turn.
 * Player hackers need AP and it must be the player phase.
 */
function canHackerAct(entity: Entity): boolean {
	const faction = entity.get(Identity)?.faction;
	if (!faction) return false;

	const turn = getTurnState();

	if (faction === "player") {
		if (turn.phase !== "player") return false;
		const entityId = entity.get(Identity)!.id;
		return hasActionPoints(entityId);
	}

	return true;
}

/**
 * Spend AP for a hacking action. Returns true if successful.
 */
function trySpendHackAP(entity: Entity): boolean {
	const faction = entity.get(Identity)?.faction;
	if (faction === "player") {
		const entityId = entity.get(Identity)!.id;
		return spendActionPoint(entityId, HACKING_AP_COST);
	}
	return true;
}

export interface HackingEvent {
	hackerId: string;
	targetId: string;
	progress: number;
	completed: boolean;
	capturedRole: HackedBotRole | null;
}

let lastHackingEvents: HackingEvent[] = [];

export function getLastHackingEvents(): HackingEvent[] {
	return lastHackingEvents;
}

export function resetHackingState() {
	lastHackingEvents = [];
}

export function hackingSystem() {
	const hackers = world.query(Hacking, Signal);
	const events: HackingEvent[] = [];

	for (const entity of hackers) {
		const hack = entity.get(Hacking)!;
		const identity = entity.get(Identity);
		if (!hack.targetId) continue;

		const currentTargetId = hack.targetId;

		const target = world
			.query(Identity)
			.find((e) => e.get(Identity)?.id === currentTargetId);
		if (
			!target ||
			target.get(Identity)?.faction === "player" ||
			target.get(Identity)?.faction === "cultist"
		) {
			// Invalid or unhackable target — cancel
			// Use entity.set() since static traits return copies from get()
			entity.set(Hacking, { ...hack, targetId: null, progress: 0 });
			if (identity?.id) {
				cancelAgentTask(identity.id);
			}
			continue;
		}

		if (!entity.get(Signal)?.connected) {
			// Lost signal — hack paused
			continue;
		}

		// Check AP availability for turn-based hacking
		if (!canHackerAct(entity)) {
			continue;
		}

		const aiState = readAIState(entity);
		const targetPosition = target.get(WorldPosition);
		const sourcePosition = entity.get(WorldPosition);
		if (
			!aiState ||
			aiState.task?.kind !== "hack_target" ||
			aiState.task.phase !== "execute" ||
			!targetPosition ||
			!sourcePosition
		) {
			continue;
		}

		const dx = targetPosition.x - sourcePosition.x;
		const dz = targetPosition.z - sourcePosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist > HACKING_SIGNAL_RANGE) {
			continue;
		}

		if (globalCompute.available < hack.computeCostPerTick) {
			// Not enough compute — hack stalls
			continue;
		}

		// Spend AP for this hacking action
		if (!trySpendHackAP(entity)) {
			continue;
		}

		// Progress hack — consumes compute
		globalCompute.available -= hack.computeCostPerTick;
		const newProgress =
			hack.progress + hack.computeCostPerTick / getHackDifficulty(target);

		if (newProgress >= 1.0) {
			// Success — convert target to player faction
			const targetIdentity = target.get(Identity)!;
			target.set(Identity, {
				...targetIdentity,
				faction: "player" as const,
			});

			// Apply hacked role (speed modifiers, etc.)
			const role = applyHackedRole(target);

			// Use entity.set() since static traits return copies from get()
			entity.set(Hacking, { ...hack, targetId: null, progress: 0 });
			if (identity?.id) {
				cancelAgentTask(identity.id);
			}

			events.push({
				hackerId: identity?.id ?? "",
				targetId: targetIdentity.id,
				progress: 1.0,
				completed: true,
				capturedRole: role,
			});
		} else {
			// Use entity.set() since static traits return copies from get()
			entity.set(Hacking, { ...hack, progress: newProgress });

			events.push({
				hackerId: identity?.id ?? "",
				targetId: target.get(Identity)!.id,
				progress: newProgress,
				completed: false,
				capturedRole: null,
			});
		}
	}

	lastHackingEvents = events;
}
