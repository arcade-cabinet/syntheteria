/**
 * Motor pool bot fabrication system.
 *
 * Players queue robot construction at powered motor pools.
 * Each turn, active jobs tick down. On completion, a robot spawns
 * at the motor pool tile and the queue slot frees up.
 *
 * Flow:
 *   1. queueFabrication() — validate cost, deduct resources, create job entity
 *   2. runFabrication()   — called each turn in environment phase;
 *      tick down turnsRemaining, spawn bot on completion
 */

import { trait, type World } from "koota";
import { playSfx } from "../audio/sfx";
import { MOTOR_POOL_UNIT_TIERS } from "../config/buildingUnlockDefs";
import { TRACK_REGISTRY } from "../robots/specializations/trackRegistry";
import type { RobotClass } from "../robots/types";
import type { ResourceMaterial } from "../terrain/types";
import {
	BotFabricator,
	Building,
	Powered,
	UnitFaction,
	UnitPos,
	UnitSpecialization,
	UnitStats,
	UnitVisual,
} from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { canSpawnUnit } from "./populationSystem";
import { canAfford, spendResources } from "./resourceSystem";

// ─── Fabrication job trait ──────────────────────────────────────────────────

/** A single in-progress fabrication job, linked to a motor pool entity. */
export const FabricationJob = trait({
	/** The motor pool entity id (from entity.id()). */
	motorPoolId: 0,
	robotClass: "scout" as RobotClass,
	turnsRemaining: 1,
	factionId: "",
	/** Specialization track chosen at queue time. Empty = no specialization. */
	trackId: "",
	/** Track version: 1 = base, 2 = upgraded. */
	trackVersion: 1 as 1 | 2,
});

// ─── Robot costs ────────────────────────────────────────────────────────────

export interface RobotCost {
	readonly materials: Partial<Record<ResourceMaterial, number>>;
	readonly buildTime: number;
}

export const ROBOT_COSTS: Record<RobotClass, RobotCost> = {
	// Faction bots
	scout: {
		materials: { iron_ore: 2, circuits: 1 },
		buildTime: 2,
	},
	infantry: {
		materials: { steel: 3, iron_ore: 2 },
		buildTime: 3,
	},
	cavalry: {
		materials: { iron_ore: 3, circuits: 2, timber: 1 },
		buildTime: 3,
	},
	ranged: {
		materials: { steel: 4, glass: 2, circuits: 2 },
		buildTime: 5,
	},
	support: {
		materials: { iron_ore: 3, steel: 2, circuits: 1 },
		buildTime: 4,
	},
	worker: {
		materials: { iron_ore: 3, timber: 2 },
		buildTime: 3,
	},
	// Cult mechs (not player-buildable — costs here for system completeness)
	cult_infantry: {
		materials: { steel: 5, iron_ore: 3 },
		buildTime: 6,
	},
	cult_ranged: {
		materials: { steel: 4, glass: 3 },
		buildTime: 6,
	},
	cult_cavalry: {
		materials: { iron_ore: 4, circuits: 3 },
		buildTime: 5,
	},
};

// ─── Robot stat defaults (imported lazily to avoid circular deps) ───────────

const ROBOT_DEFAULTS: Record<
	RobotClass,
	{
		stats: {
			hp: number;
			maxHp: number;
			ap: number;
			maxAp: number;
			mp: number;
			maxMp: number;
			scanRange: number;
			attack: number;
			defense: number;
		};
		visual: { modelId: string; scale: number; facingAngle: number };
	}
> = {
	scout: {
		stats: {
			hp: 5,
			maxHp: 5,
			ap: 2,
			maxAp: 2,
			mp: 5,
			maxMp: 5,
			scanRange: 8,
			attack: 1,
			defense: 0,
		},
		visual: { modelId: "scout", scale: 1.0, facingAngle: 0 },
	},
	infantry: {
		stats: {
			hp: 10,
			maxHp: 10,
			ap: 2,
			maxAp: 2,
			mp: 3,
			maxMp: 3,
			scanRange: 4,
			attack: 3,
			defense: 1,
		},
		visual: { modelId: "infantry", scale: 1.0, facingAngle: 0 },
	},
	cavalry: {
		stats: {
			hp: 7,
			maxHp: 7,
			ap: 2,
			maxAp: 2,
			mp: 4,
			maxMp: 4,
			scanRange: 5,
			attack: 3,
			defense: 0,
		},
		visual: { modelId: "cavalry", scale: 1.0, facingAngle: 0 },
	},
	ranged: {
		stats: {
			hp: 12,
			maxHp: 12,
			ap: 2,
			maxAp: 2,
			mp: 2,
			maxMp: 2,
			scanRange: 6,
			attack: 4,
			defense: 2,
		},
		visual: { modelId: "ranged", scale: 1.0, facingAngle: 0 },
	},
	support: {
		stats: {
			hp: 7,
			maxHp: 7,
			ap: 2,
			maxAp: 2,
			mp: 3,
			maxMp: 3,
			scanRange: 4,
			attack: 1,
			defense: 0,
		},
		visual: { modelId: "support", scale: 1.0, facingAngle: 0 },
	},
	worker: {
		stats: {
			hp: 8,
			maxHp: 8,
			ap: 2,
			maxAp: 2,
			mp: 2,
			maxMp: 2,
			scanRange: 3,
			attack: 0,
			defense: 0,
		},
		visual: { modelId: "worker", scale: 1.0, facingAngle: 0 },
	},
	cult_infantry: {
		stats: {
			hp: 12,
			maxHp: 12,
			ap: 2,
			maxAp: 2,
			mp: 2,
			maxMp: 2,
			scanRange: 3,
			attack: 4,
			defense: 2,
		},
		visual: { modelId: "cult_infantry", scale: 1.0, facingAngle: 0 },
	},
	cult_ranged: {
		stats: {
			hp: 10,
			maxHp: 10,
			ap: 2,
			maxAp: 2,
			mp: 2,
			maxMp: 2,
			scanRange: 5,
			attack: 5,
			defense: 1,
		},
		visual: { modelId: "cult_ranged", scale: 1.0, facingAngle: 0 },
	},
	cult_cavalry: {
		stats: {
			hp: 8,
			maxHp: 8,
			ap: 2,
			maxAp: 2,
			mp: 4,
			maxMp: 4,
			scanRange: 4,
			attack: 3,
			defense: 1,
		},
		visual: { modelId: "cult_cavalry", scale: 1.0, facingAngle: 0 },
	},
};

// ─── Queue a fabrication ────────────────────────────────────────────────────

export type QueueResult =
	| { ok: true }
	| {
			ok: false;
			reason:
				| "not_powered"
				| "queue_full"
				| "cannot_afford"
				| "pop_cap"
				| "class_locked";
	  };

/**
 * Queue fabrication of a robot at a motor pool.
 * Validates power, slot availability, and resource cost.
 * Deducts resources immediately on success.
 *
 * @param trackId — specialization track chosen at fabrication. Empty = unspecialized.
 * @param trackVersion — 1 = base track, 2 = upgraded via higher-tier tech.
 */
export function queueFabrication(
	world: World,
	motorPoolEntity: ReturnType<World["query"]>[number],
	robotClass: RobotClass,
	trackId = "",
	trackVersion: 1 | 2 = 1,
): QueueResult {
	// Must be powered
	if (!motorPoolEntity.has(Powered)) {
		return { ok: false, reason: "not_powered" };
	}

	// Must have BotFabricator with available slots
	const fab = motorPoolEntity.get(BotFabricator);
	if (!fab || fab.queueSize >= fab.fabricationSlots) {
		return { ok: false, reason: "queue_full" };
	}

	const building = motorPoolEntity.get(Building);
	if (!building) {
		return { ok: false, reason: "queue_full" };
	}

	// Motor Pool tier gates which robot classes can be fabricated
	const poolTier = building.buildingTier ?? 1;
	const allowedClasses =
		MOTOR_POOL_UNIT_TIERS[poolTier] ?? MOTOR_POOL_UNIT_TIERS[1]!;
	if (!allowedClasses.includes(robotClass)) {
		return { ok: false, reason: "class_locked" };
	}

	const cost = ROBOT_COSTS[robotClass];
	const factionId = building.factionId;

	// Population cap check — can't queue if already at or over cap
	if (!canSpawnUnit(world, factionId)) {
		return { ok: false, reason: "pop_cap" };
	}

	// Check resources
	if (!canAfford(world, factionId, cost.materials)) {
		return { ok: false, reason: "cannot_afford" };
	}

	// Deduct resources
	for (const [mat, amount] of Object.entries(cost.materials)) {
		if (amount && amount > 0) {
			spendResources(world, factionId, mat as ResourceMaterial, amount);
		}
	}

	// Increment queue size on the motor pool
	motorPoolEntity.set(BotFabricator, {
		...fab,
		queueSize: fab.queueSize + 1,
	});

	// Spawn job entity
	world.spawn(
		FabricationJob({
			motorPoolId: motorPoolEntity.id(),
			robotClass,
			turnsRemaining: cost.buildTime,
			factionId,
			trackId,
			trackVersion,
		}),
	);

	playSfx("build_complete");
	return { ok: true };
}

// ─── Per-turn fabrication tick ──────────────────────────────────────────────

/**
 * Tick all fabrication jobs. Called once per turn in the environment phase.
 *
 * - Only ticks jobs whose motor pool is still powered
 * - Spawns the completed robot at the motor pool tile
 * - Removes the job entity and decrements queueSize
 */
export function runFabrication(world: World): void {
	// Build a lookup of motor pool entities by id for fast access
	const motorPools = new Map<number, ReturnType<World["query"]>[number]>();
	for (const e of world.query(Building, BotFabricator)) {
		motorPools.set(e.id(), e);
	}

	for (const jobEntity of world.query(FabricationJob)) {
		const job = jobEntity.get(FabricationJob);
		if (!job) continue;

		const pool = motorPools.get(job.motorPoolId);
		if (!pool) {
			// Motor pool destroyed — remove orphaned job
			jobEntity.destroy();
			continue;
		}

		// Only tick if motor pool is powered
		if (!pool.has(Powered)) continue;

		const remaining = job.turnsRemaining - 1;

		if (remaining <= 0) {
			// Fabrication complete — spawn robot at motor pool tile
			const building = pool.get(Building)!;
			const defaults = ROBOT_DEFAULTS[job.robotClass];

			// Apply track stat mods if specialized (ranged tracks have statMods)
			const stats = { ...defaults.stats };
			if (job.trackId) {
				const trackEntry = TRACK_REGISTRY.get(job.trackId);
				const mods =
					job.trackVersion === 2
						? trackEntry?.v2StatMods
						: trackEntry?.statMods;
				if (mods) {
					for (const [key, value] of Object.entries(mods)) {
						if (value !== undefined && key in stats) {
							(stats as Record<string, number>)[key] =
								((stats as Record<string, number>)[key] ?? 0) + value;
						}
					}
				}
			}

			const unit = world.spawn(
				UnitPos({ tileX: building.tileX, tileZ: building.tileZ }),
				UnitStats({ ...stats }),
				UnitVisual({ ...defaults.visual }),
				UnitFaction({ factionId: job.factionId }),
			);

			// Add specialization trait if track was chosen
			if (job.trackId) {
				unit.add(
					UnitSpecialization({
						trackId: job.trackId,
						trackVersion: job.trackVersion,
					}),
				);
			}

			const trackLabel = job.trackId
				? ` [${TRACK_REGISTRY.get(job.trackId)?.label ?? job.trackId}]`
				: "";
			pushTurnEvent(
				`Fabrication complete: ${job.robotClass.replace(/_/g, " ")}${trackLabel}`,
			);

			// Free up the fabrication slot
			const fab = pool.get(BotFabricator)!;
			pool.set(BotFabricator, {
				...fab,
				queueSize: Math.max(0, fab.queueSize - 1),
			});

			// Remove the job
			jobEntity.destroy();
		} else {
			// Tick down
			jobEntity.set(FabricationJob, { ...job, turnsRemaining: remaining });
		}
	}
}
