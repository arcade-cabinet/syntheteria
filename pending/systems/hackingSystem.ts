import gameplayConfig from "../config/gameplay.json";
import type { Entity } from "../ecs/traits";
import { Hacking, Identity, Signal, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import { globalCompute } from "./hacking";

/**
 * Extended hacking system for the radial capture flow (US-009).
 *
 * Radial 'Hack' action on player unit adjacent to hostile bot.
 * Requirements: signal link active + sufficient compute.
 * Multi-turn progress bar over target. On completion: hostile bot
 * faction changes to player, gains player speech profile.
 *
 * Hacked unit type mapping:
 *   Arachnoid  -> light melee
 *   MechaTrooper -> ranged
 *   QuadrupedTank -> siege
 *
 * Fails if signal link broken (target moves out of range) -- progress resets.
 *
 * IMPORTANT: Koota static traits return copies from get(), not mutable refs.
 * All mutations use entity.set() to persist changes.
 */

/** Range at which a hack can operate */
export const HACK_RANGE = 3.0;

/** Speech profile assigned to captured units by their original type */
export const CAPTURED_SPEECH_PROFILES: Record<string, string> = {
	arachnoid: "light_melee",
	mecha_trooper: "ranged",
	quadruped_tank: "siege",
};

export interface HackCheckResult {
	canHack: boolean;
	reason: string | null;
}

/**
 * Check whether a hacker entity can initiate a hack on a target.
 */
export function checkHackEligibility(
	hacker: Entity,
	target: Entity,
): HackCheckResult {
	const hackerIdentity = hacker.get(Identity);
	if (!hackerIdentity || hackerIdentity.faction !== "player") {
		return { canHack: false, reason: "Only player units can hack" };
	}

	const targetIdentity = target.get(Identity);
	if (!targetIdentity) {
		return { canHack: false, reason: "Invalid target" };
	}

	if (targetIdentity.faction === "player") {
		return { canHack: false, reason: "Cannot hack friendly units" };
	}

	if (targetIdentity.faction === "cultist") {
		return { canHack: false, reason: "Humans cannot be hacked" };
	}

	// Check signal link
	const signal = hacker.get(Signal);
	if (!signal?.connected) {
		return {
			canHack: false,
			reason: "No signal link — connect to network first",
		};
	}

	// Check hacking component
	const hackComp = hacker.get(Hacking);
	if (!hackComp) {
		return { canHack: false, reason: "Unit lacks hacking capability" };
	}

	// Check already hacking something else
	if (hackComp.targetId && hackComp.targetId !== targetIdentity.id) {
		return { canHack: false, reason: "Already hacking another target" };
	}

	// Check compute availability
	if (globalCompute.available < hackComp.computeCostPerTick) {
		return {
			canHack: false,
			reason: `Insufficient compute (need ${hackComp.computeCostPerTick}, have ${globalCompute.available})`,
		};
	}

	return { canHack: true, reason: null };
}

/**
 * Initiate a hack from a player unit on a hostile target.
 * Returns true if the hack was started.
 */
export function initiateHack(hacker: Entity, target: Entity): boolean {
	const check = checkHackEligibility(hacker, target);
	if (!check.canHack) return false;

	const hackComp = hacker.get(Hacking);
	const targetIdentity = target.get(Identity);
	if (!hackComp || !targetIdentity) return false;

	// Use entity.set() to persist trait changes (static traits return copies from get())
	hacker.set(Hacking, {
		...hackComp,
		targetId: targetIdentity.id,
		progress: 0,
	});

	return true;
}

export interface HackProgressEvent {
	hackerId: string;
	targetId: string;
	progress: number;
	completed: boolean;
	failed: boolean;
	failReason: string | null;
}

let lastHackEvents: HackProgressEvent[] = [];

export function getLastHackEvents(): HackProgressEvent[] {
	return lastHackEvents;
}

export function resetHackingSystemState() {
	lastHackEvents = [];
}

/**
 * Extended hacking system tick. Processes all active hacks with
 * signal-link-break detection and faction conversion.
 *
 * This supplements the existing hackingSystem() in hacking.ts by
 * providing the radial-flow specific behavior (progress events,
 * speech profile assignment, link-break resets).
 */
export function hackingCaptureSystem() {
	const events: HackProgressEvent[] = [];
	const hackers = world.query(Hacking, Signal, Identity, WorldPosition);

	for (const entity of hackers) {
		const hack = entity.get(Hacking)!;
		const identity = entity.get(Identity)!;
		const signal = entity.get(Signal)!;
		const hackerPos = entity.get(WorldPosition)!;

		if (!hack.targetId) continue;

		const currentTargetId = hack.targetId;

		// Find target
		const target = world
			.query(Identity, WorldPosition)
			.find((e) => e.get(Identity)?.id === currentTargetId);

		if (!target) {
			// Target no longer exists — reset hack
			entity.set(Hacking, {
				...hack,
				targetId: null,
				progress: 0,
			});
			events.push({
				hackerId: identity.id,
				targetId: currentTargetId,
				progress: 0,
				completed: false,
				failed: true,
				failReason: "Target destroyed",
			});
			continue;
		}

		const targetIdentity = target.get(Identity)!;
		const targetPos = target.get(WorldPosition)!;

		// Already converted
		if (targetIdentity.faction === "player") {
			entity.set(Hacking, {
				...hack,
				targetId: null,
				progress: 0,
			});
			continue;
		}

		// Check signal link — if broken, reset progress
		if (!signal.connected) {
			entity.set(Hacking, {
				...hack,
				targetId: null,
				progress: 0,
			});
			events.push({
				hackerId: identity.id,
				targetId: currentTargetId,
				progress: 0,
				completed: false,
				failed: true,
				failReason: "Signal link broken",
			});
			continue;
		}

		// Check range — if target moved out, reset
		const dx = hackerPos.x - targetPos.x;
		const dz = hackerPos.z - targetPos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > HACK_RANGE) {
			entity.set(Hacking, {
				...hack,
				targetId: null,
				progress: 0,
			});
			events.push({
				hackerId: identity.id,
				targetId: currentTargetId,
				progress: 0,
				completed: false,
				failed: true,
				failReason: "Target out of range",
			});
			continue;
		}

		// Check compute
		if (globalCompute.available < hack.computeCostPerTick) {
			events.push({
				hackerId: identity.id,
				targetId: targetIdentity.id,
				progress: hack.progress,
				completed: false,
				failed: false,
				failReason: null,
			});
			continue;
		}

		// Progress hack
		const difficulty = gameplayConfig.hacking.baseDifficulty;
		globalCompute.available -= hack.computeCostPerTick;
		const newProgress = hack.progress + hack.computeCostPerTick / difficulty;

		// Use epsilon to handle floating-point accumulation near 1.0
		const COMPLETION_THRESHOLD = 1.0 - 1e-9;
		if (newProgress >= COMPLETION_THRESHOLD) {
			// Success — convert target to player faction
			target.set(Identity, {
				...targetIdentity,
				faction: "player" as const,
			});

			// Assign speech profile based on unit type
			const targetUnit = target.get(Unit);
			if (targetUnit) {
				const speechProfile =
					CAPTURED_SPEECH_PROFILES[targetUnit.type] ?? "generic";
				target.set(Unit, {
					...targetUnit,
					displayName: `${targetUnit.displayName} [${speechProfile}]`,
				});
			}

			events.push({
				hackerId: identity.id,
				targetId: targetIdentity.id,
				progress: 1.0,
				completed: true,
				failed: false,
				failReason: null,
			});

			entity.set(Hacking, {
				...hack,
				targetId: null,
				progress: 0,
			});
		} else {
			entity.set(Hacking, {
				...hack,
				progress: newProgress,
			});
			events.push({
				hackerId: identity.id,
				targetId: targetIdentity.id,
				progress: newProgress,
				completed: false,
				failed: false,
				failReason: null,
			});
		}
	}

	lastHackEvents = events;
}
