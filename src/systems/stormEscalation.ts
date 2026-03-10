/**
 * Storm escalation system — manages storm lifecycle and lightning strikes.
 *
 * Storms cycle through phases: calm → brewing → active → surge → aftermath.
 * Escalation level increases over game time, making storms more severe.
 * During active/surge phases, lightning can strike buildings and cubes.
 * Lightning rod buildings absorb nearby strikes, protecting neighbors.
 *
 * All tunables sourced from config/power.json (stormEscalation section).
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StormPhase {
	name: string;
	durationTicks: number;
	intensityMultiplier: number;
	damageChance: number;
}

export interface StormState {
	phaseName: string;
	phaseIndex: number;
	phaseTimer: number;
	escalationLevel: number;
	intensityMultiplier: number;
}

export interface LightningStrikeEvent {
	x: number;
	z: number;
	damage: number;
	absorbedByRod: boolean;
}

export interface BuildingInfo {
	id: string;
	x: number;
	z: number;
	type: string;
}

export type GetBuildingsFunc = () => BuildingInfo[];
export type ApplyDamageFunc = (buildingId: string, damage: number) => void;
export type RandomFunc = () => number;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const stormConfig = config.power.stormEscalation;
const PHASES: StormPhase[] = stormConfig.phases as unknown as StormPhase[];
const ESCALATION_RATE = stormConfig.escalationRate;
const MAX_ESCALATION_LEVEL = stormConfig.maxEscalationLevel;
const LIGHTNING_STRIKE_RADIUS = stormConfig.lightningStrikeRadius;
const LIGHTNING_STRIKE_DAMAGE = stormConfig.lightningStrikeDamage;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentPhaseIndex = 0;
let phaseTimer = 0;
let escalationLevel = 0;
// @ts-ignore written but value not yet read
let totalTicksElapsed = 0;
let pendingEvents: LightningStrikeEvent[] = [];

/** Pluggable building query — set by integration layer. */
let getBuildings: GetBuildingsFunc = () => [];

/** Pluggable damage application — set by integration layer. */
let applyDamage: ApplyDamageFunc = () => {};

/** Pluggable random — allows deterministic tests. */
let randomFn: RandomFunc = () => Math.random();

// ---------------------------------------------------------------------------
// Configuration hooks
// ---------------------------------------------------------------------------

export function setGetBuildings(fn: GetBuildingsFunc): void {
	getBuildings = fn;
}

export function setApplyDamage(fn: ApplyDamageFunc): void {
	applyDamage = fn;
}

export function setRandomFn(fn: RandomFunc): void {
	randomFn = fn;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentPhase(): StormPhase {
	return PHASES[currentPhaseIndex];
}

function dist2d(x1: number, z1: number, x2: number, z2: number): number {
	const dx = x1 - x2;
	const dz = z1 - z2;
	return Math.sqrt(dx * dx + dz * dz);
}

function isRodNearby(
	x: number,
	z: number,
	buildings: BuildingInfo[],
): BuildingInfo | null {
	for (const b of buildings) {
		if (b.type === "lightning_rod") {
			if (dist2d(x, z, b.x, b.z) <= LIGHTNING_STRIKE_RADIUS) {
				return b;
			}
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Advance storm state by one tick.
 * Handles phase transitions, escalation growth, and lightning generation.
 */
export function stormEscalationSystem(currentTick: number): void {
	totalTicksElapsed = currentTick;
	phaseTimer++;

	const phase = currentPhase();

	// Phase transition
	if (phaseTimer >= phase.durationTicks) {
		phaseTimer = 0;
		currentPhaseIndex = (currentPhaseIndex + 1) % PHASES.length;

		// Escalation increases when a full cycle completes (wraps back to phase 0)
		if (currentPhaseIndex === 0) {
			escalationLevel = Math.min(
				MAX_ESCALATION_LEVEL,
				escalationLevel + ESCALATION_RATE * phase.durationTicks,
			);
		}
	}

	// Update escalation based on total game time
	escalationLevel = Math.min(
		MAX_ESCALATION_LEVEL,
		currentTick * ESCALATION_RATE,
	);

	// Lightning generation during damaging phases
	const activePhase = currentPhase();
	if (activePhase.damageChance > 0) {
		const effectiveChance =
			activePhase.damageChance * (1 + escalationLevel);

		if (randomFn() < effectiveChance) {
			const allBuildings = getBuildings();
			if (allBuildings.length > 0) {
				// Pick a random target building
				const targetIdx = Math.floor(
					randomFn() * allBuildings.length,
				);
				const target = allBuildings[targetIdx];
				const strikeX = target.x;
				const strikeZ = target.z;

				const effectiveDamage =
					LIGHTNING_STRIKE_DAMAGE * (1 + escalationLevel);

				// Check if a lightning rod absorbs the strike
				const rod = isRodNearby(strikeX, strikeZ, allBuildings);
				if (rod && rod.id !== target.id) {
					// Rod absorbs — no damage to the original target
					pendingEvents.push({
						x: strikeX,
						z: strikeZ,
						damage: 0,
						absorbedByRod: true,
					});
				} else {
					// Strike hits — apply damage
					applyDamage(target.id, effectiveDamage);
					pendingEvents.push({
						x: strikeX,
						z: strikeZ,
						damage: effectiveDamage,
						absorbedByRod: false,
					});
				}
			}
		}
	}
}

/**
 * Get the current storm state.
 */
export function getStormState(): StormState {
	const phase = currentPhase();
	return {
		phaseName: phase.name,
		phaseIndex: currentPhaseIndex,
		phaseTimer,
		escalationLevel,
		intensityMultiplier: phase.intensityMultiplier,
	};
}

/**
 * Get lightning strike events since last call.
 * Drains the event queue.
 */
export function getStormEvents(): LightningStrikeEvent[] {
	const events = pendingEvents;
	pendingEvents = [];
	return events;
}

/**
 * Reset all storm state. Intended for tests and world reset.
 */
export function resetStormEscalation(): void {
	currentPhaseIndex = 0;
	phaseTimer = 0;
	escalationLevel = 0;
	totalTicksElapsed = 0;
	pendingEvents = [];
	getBuildings = () => [];
	applyDamage = () => {};
	randomFn = () => Math.random();
}
