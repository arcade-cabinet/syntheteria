/**
 * Ancient machine awakening system — Residuals and dormant constructors.
 *
 * Manages the lifecycle of Residual manifestations (Sentinels, Crawlers)
 * and dormant Von Neumann constructors (Guardians, Colossus) on Ferrathis.
 *
 * Awakening triggers:
 *   - Proximity: player/unit moves within machine's triggerRadius
 *   - Tech-gated: player tech level reaches threshold
 *   - Compound: tech level AND game time both satisfied
 *   - Provocation: player damages a structure the machine is guarding
 *
 * Machine states: DORMANT → AWARE → ACTIVE → HOSTILE (or GUARDIAN_PHASE_1/2/3)
 * Sentinels and Crawlers can return to DORMANT if provocation ends.
 * Guardians and Colossus escalate irreversibly once awakened.
 *
 * Emits events on the bus:
 *   - ancient_machine_awakened  (machine becomes ACTIVE)
 *   - ancient_machine_hostile   (machine enters HOSTILE state)
 *   - colossus_awakening        (special world-crisis event)
 *
 * All config sourced from config/combat.json (ancientMachines section).
 */

import { config } from "../../config";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AncientMachineType =
	| "sentinel"
	| "crawler"
	| "guardian"
	| "swarm_drone"
	| "colossus";

export type MachineState =
	| "dormant"
	| "aware"
	| "active"
	| "hostile"
	| "guardian_phase_1"
	| "guardian_phase_2"
	| "guardian_phase_3"
	| "destroyed";

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface AncientMachine {
	id: string;
	type: AncientMachineType;
	position: Vec3;
	hp: number;
	maxHp: number;
	state: MachineState;
	/** Tick on which the machine was spawned or initialized. */
	spawnTick: number;
	/** ID of the structure this machine is maintaining (Crawler only). */
	maintainedStructureId?: string;
	/** Number of ticks spent in current state. */
	stateTicksElapsed: number;
}

export interface WorldContext {
	/** Player's current tech level (0–10+). */
	playerTechLevel: number;
	/** Current simulation tick. */
	gameTick: number;
	/** Game minutes elapsed (gameTick / ticksPerMinute). */
	gameMinutesElapsed: number;
	/** Player's cube stockpile count. */
	playerCubeCount: number;
	/** IDs of structures recently damaged by player. */
	recentlyDamagedStructureIds: Set<string>;
}

export interface MachineAwakeningEvent {
	machineId: string;
	type: AncientMachineType;
	fromState: MachineState;
	toState: MachineState;
	tick: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type AncientMachineConfig = {
	hp: number;
	damage: number;
	range: number;
	speed: number;
	triggerRadius: number;
	awakenCondition?: string;
	loot: Record<string, number | string>;
};

const ancientMachinesCfg = (
	config.combat as typeof config.combat & {
		ancientMachines: Record<string, AncientMachineConfig>;
	}
).ancientMachines;

const TICKS_PER_MINUTE = 600; // 10 ticks/s * 60s

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const machines = new Map<string, AncientMachine>();
let nextMachineId = 1;
const awakeningEvents: MachineAwakeningEvent[] = [];

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

/**
 * Parse and evaluate an awakenCondition string against the world context.
 *
 * Supported condition formats:
 *   "tech_level_gte_N"                               — tech level >= N
 *   "tech_level_gte_N_and_game_minute_gte_M"         — tech >= N AND game >= M minutes
 *   undefined / ""                                    — always true (proximity-only trigger)
 */
export function evaluateAwakenCondition(
	condition: string | undefined,
	ctx: WorldContext,
): boolean {
	if (!condition) return true;

	const parts = condition.split("_and_");

	for (const part of parts) {
		const techMatch = part.match(/^tech_level_gte_(\d+)$/);
		if (techMatch) {
			const required = parseInt(techMatch[1], 10);
			if (ctx.playerTechLevel < required) return false;
			continue;
		}

		const minuteMatch = part.match(/^game_minute_gte_(\d+)$/);
		if (minuteMatch) {
			const required = parseInt(minuteMatch[1], 10);
			if (ctx.gameMinutesElapsed < required) return false;
			continue;
		}

		// Unknown condition clause — fail safe (do not awaken)
		return false;
	}

	return true;
}

/**
 * Check whether a machine is within trigger radius of a position.
 * Uses XZ distance only (2D).
 */
export function isWithinTriggerRadius(
	machine: AncientMachine,
	pos: Vec3,
	triggerRadius: number,
): boolean {
	const dx = machine.position.x - pos.x;
	const dz = machine.position.z - pos.z;
	return Math.sqrt(dx * dx + dz * dz) <= triggerRadius;
}

// ---------------------------------------------------------------------------
// Machine lifecycle
// ---------------------------------------------------------------------------

/**
 * Spawn an ancient machine at a position.
 * Returns the created machine.
 */
export function spawnAncientMachine(
	type: AncientMachineType,
	position: Vec3,
	currentTick: number,
	maintainedStructureId?: string,
): AncientMachine {
	const cfg = ancientMachinesCfg[type];
	const machine: AncientMachine = {
		id: `ancient_${nextMachineId++}`,
		type,
		position: { ...position },
		hp: cfg.hp,
		maxHp: cfg.hp,
		state: "dormant",
		spawnTick: currentTick,
		maintainedStructureId,
		stateTicksElapsed: 0,
	};
	machines.set(machine.id, machine);
	return machine;
}

/**
 * Get a machine by ID.
 */
export function getAncientMachine(id: string): AncientMachine | undefined {
	return machines.get(id);
}

/**
 * Get all active (non-destroyed) ancient machines.
 */
export function getAllAncientMachines(): AncientMachine[] {
	return [...machines.values()].filter((m) => m.state !== "destroyed");
}

/**
 * Get all machines of a specific type.
 */
export function getMachinesByType(type: AncientMachineType): AncientMachine[] {
	return getAllAncientMachines().filter((m) => m.type === type);
}

/**
 * Apply damage to a machine. Returns true if the machine is destroyed.
 */
export function damageMachine(id: string, amount: number, currentTick: number): boolean {
	const machine = machines.get(id);
	if (!machine || machine.state === "destroyed") return false;

	machine.hp = Math.max(0, machine.hp - amount);

	if (machine.hp <= 0) {
		machine.state = "destroyed";
		return true;
	}

	// Taking damage provokes Sentinels and Crawlers into hostile
	if (machine.state === "dormant" || machine.state === "aware" || machine.state === "active") {
		if (machine.type === "sentinel" || machine.type === "crawler") {
			transitionState(machine, "hostile", currentTick);
		}
	}

	// Guardian phase transitions based on HP percentage
	if (machine.type === "guardian") {
		updateGuardianPhase(machine, currentTick);
	}

	return false;
}

/**
 * Notify the system that a structure has been damaged.
 * Crawlers maintaining that structure will become hostile.
 */
export function notifyStructureDamaged(structureId: string, currentTick: number): void {
	for (const machine of machines.values()) {
		if (
			machine.type === "crawler" &&
			machine.maintainedStructureId === structureId &&
			machine.state !== "hostile" &&
			machine.state !== "destroyed"
		) {
			transitionState(machine, "hostile", currentTick);
		}
	}
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

function transitionState(
	machine: AncientMachine,
	newState: MachineState,
	currentTick: number,
): void {
	const fromState = machine.state;
	machine.state = newState;
	machine.stateTicksElapsed = 0;

	const event: MachineAwakeningEvent = {
		machineId: machine.id,
		type: machine.type,
		fromState,
		toState: newState,
		tick: currentTick,
	};
	awakeningEvents.push(event);

	// Emit bus event
	try {
		if (newState === "active") {
			emit({
				type: "ancient_machine_awakened",
				entityId: machine.id,
				machineType: machine.type,
				position: { ...machine.position },
				substrateDamage: 0,
				tick: currentTick,
			});
		} else if (newState === "hostile" || newState === "guardian_phase_1") {
			emit({
				type: "ancient_machine_hostile",
				entityId: machine.id,
				machineType: machine.type,
				tick: currentTick,
			});
		}

		if (machine.type === "colossus" && newState === "active") {
			emit({
				type: "colossus_awakening",
				entityId: machine.id,
				tick: currentTick,
			});
		}
	} catch {
		// Event bus errors must not crash gameplay
	}
}

function updateGuardianPhase(machine: AncientMachine, currentTick: number): void {
	const pct = (machine.hp / machine.maxHp) * 100;

	const phaseForHp =
		pct > 50
			? "guardian_phase_1"
			: pct > 25
				? "guardian_phase_2"
				: "guardian_phase_3";

	if (machine.state !== phaseForHp && machine.state !== "dormant") {
		transitionState(machine, phaseForHp, currentTick);
	}
}

// ---------------------------------------------------------------------------
// Per-machine tick logic
// ---------------------------------------------------------------------------

function tickMachine(
	machine: AncientMachine,
	ctx: WorldContext,
	playerPos: Vec3,
): void {
	machine.stateTicksElapsed++;

	if (machine.state === "destroyed") return;

	const cfg = ancientMachinesCfg[machine.type];

	switch (machine.state) {
		case "dormant": {
			// Check awakening conditions
			const conditionMet = evaluateAwakenCondition(
			(cfg as { awakenCondition?: string }).awakenCondition,
			ctx,
		);
			if (!conditionMet) break;

			// Check proximity trigger
			if (isWithinTriggerRadius(machine, playerPos, cfg.triggerRadius)) {
				if (machine.type === "guardian" || machine.type === "colossus") {
					// Irreversible awakening for major threats
					const initialState: MachineState =
						machine.type === "guardian" ? "guardian_phase_1" : "active";
					transitionState(machine, initialState, ctx.gameTick);
				} else {
					// Sentinels/Crawlers/Drones: become aware first
					transitionState(machine, "aware", ctx.gameTick);
				}
			}
			break;
		}

		case "aware": {
			// Aware: non-hostile patrol state
			// Transition to active if player lingers within radius
			if (isWithinTriggerRadius(machine, playerPos, cfg.triggerRadius)) {
				if (machine.stateTicksElapsed >= 20) {
					transitionState(machine, "active", ctx.gameTick);
				}
			} else {
				// Player left the area — return to dormant after 60 ticks
				if (machine.stateTicksElapsed >= 60) {
					machine.state = "dormant";
					machine.stateTicksElapsed = 0;
				}
			}
			break;
		}

		case "active": {
			// Active: observing/patrolling
			// Colossus in active state is a world crisis — stays active
			// Others: if provoked, become hostile
			if (machine.type === "swarm_drone") {
				// Swarm drones go straight to hostile
				transitionState(machine, "hostile", ctx.gameTick);
			}
			break;
		}

		case "guardian_phase_1":
		case "guardian_phase_2":
		case "guardian_phase_3":
		case "hostile":
			// Actively combat/hostile states — managed externally (combat system)
			break;
	}
}

// ---------------------------------------------------------------------------
// Main system tick
// ---------------------------------------------------------------------------

/**
 * Advance the ancient machine system one tick.
 *
 * Checks awakening conditions for all dormant machines.
 * Transitions states based on proximity, tech level, and provocation.
 *
 * @param ctx - Current world context (tech level, time, player position)
 * @param playerPos - Current player world position for proximity checks
 */
export function ancientMachineSystem(ctx: WorldContext, playerPos: Vec3): void {
	for (const machine of machines.values()) {
		tickMachine(machine, ctx, playerPos);
	}

	// Crawlers: check if maintained structure was recently damaged
	for (const machine of machines.values()) {
		if (
			machine.type === "crawler" &&
			machine.maintainedStructureId &&
			ctx.recentlyDamagedStructureIds.has(machine.maintainedStructureId) &&
			machine.state !== "hostile" &&
			machine.state !== "destroyed"
		) {
			transitionState(machine, "hostile", ctx.gameTick);
		}
	}
}

// ---------------------------------------------------------------------------
// Event drain
// ---------------------------------------------------------------------------

/**
 * Get awakening events since last call. Drains the queue.
 */
export function getAwakeningEvents(): MachineAwakeningEvent[] {
	const events = awakeningEvents.splice(0);
	return events;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetAncientMachineSystem(): void {
	machines.clear();
	nextMachineId = 1;
	awakeningEvents.length = 0;
}
