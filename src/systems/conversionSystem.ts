/**
 * Conversion system — unit conversion via influence zones and cult leader presence.
 *
 * Conversion is the Religious path's alternative to combat. Enemy units inside
 * a faction's influence zone accumulate "faith pressure". When pressure exceeds
 * the vulnerability threshold, a Cult Leader within range can attempt conversion.
 *
 * Conversion mechanics:
 * - Enemy unit inside influence zone → pressure accumulates per tick
 * - At faithPressureToVulnerable, unit becomes "vulnerable to conversion"
 * - Cult Leader within conversionActionRange + vulnerable unit → conversion attempt
 * - Success chance: base chance + (faith level factor) - (reason resistance factor)
 * - Successful conversion: unit switches faction, keeps stats, generates faith bonus
 * - Volt Collective units with divine_voltage doctrine are permanently immune
 *
 * Conversion is permanent — converted units do not revert unless killed.
 *
 * Module-level state with _resetConversionState() for test cleanup.
 *
 * Tunables sourced from config/victoryPaths.json (faithSystem.conversionMechanics).
 */

import victoryPathsConfig from "../../config/victoryPaths.json";
import { emit } from "./eventBus";
import { getConversionResistance, getInfluenceZones, recordConversion } from "./ideologySystem";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const conversionCfg = victoryPathsConfig.faithSystem.conversionMechanics;

const ACTION_RANGE = conversionCfg.conversionActionRange;
const PRESSURE_THRESHOLD = conversionCfg.faithPressureToVulnerable;
const BASE_CHANCE = conversionCfg.conversionChanceBase;
const CHANCE_PER_FAITH_LEVEL = conversionCfg.conversionChancePerFaithLevel;
const CONVERSION_TIME = conversionCfg.conversionTimeSeconds;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnitForConversion {
	/** Unique entity ID */
	id: string;
	/** Owning faction */
	faction: string;
	/** World position */
	position: { x: number; y: number; z: number };
	/** Whether this unit has the divine_voltage doctrine (Volt Collective immunity) */
	conversionImmune?: boolean;
	/** Compute/reason level (high reason = resistant to conversion) */
	reasonLevel?: number;
}

export interface CultLeaderUnit {
	/** Entity ID of the cult leader */
	id: string;
	/** Owning faction */
	faction: string;
	/** World position */
	position: { x: number; y: number; z: number };
	/** Faith accumulated by this faction (determines conversion bonus chance) */
	factionFaith: number;
}

/** Tracks accumulated faith pressure on enemy units. */
interface PressureRecord {
	unitId: string;
	pressure: number;
	/** Whether the unit is currently vulnerable (pressure >= threshold) */
	vulnerable: boolean;
	/** If a conversion is in progress, seconds remaining */
	conversionProgress?: number;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Faith pressure accumulation, keyed by unit ID */
const pressureByUnit = new Map<string, PressureRecord>();

/** Total conversions performed per faction (faction → count) */
const conversionCount = new Map<string, number>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

function safeEmit(event: Parameters<typeof emit>[0]): void {
	try {
		emit(event);
	} catch {
		// Never crash gameplay
	}
}

// ---------------------------------------------------------------------------
// Influence zone pressure
// ---------------------------------------------------------------------------

/**
 * Update faith pressure accumulation for enemy units inside influence zones.
 * Call once per game tick for each faction that has shrines.
 *
 * @param attackingFaction — The faction whose influence zones are checked
 * @param enemyUnits       — Units from other factions that might be in zone
 */
export function updateFaithPressure(
	attackingFaction: string,
	enemyUnits: UnitForConversion[],
): void {
	const zones = getInfluenceZones(attackingFaction);
	if (zones.length === 0) return;

	for (const unit of enemyUnits) {
		if (unit.faction === attackingFaction) continue;
		if (unit.conversionImmune) continue;

		// Check if unit is inside any influence zone
		let totalPressureThisTick = 0;
		for (const zone of zones) {
			const dist = distXZ(unit.position, zone.position);
			if (dist <= zone.radius) {
				totalPressureThisTick += zone.faithPressurePerTick;
			}
		}

		if (totalPressureThisTick === 0) continue;

		// Accumulate pressure
		let record = pressureByUnit.get(unit.id);
		if (!record) {
			record = { unitId: unit.id, pressure: 0, vulnerable: false };
			pressureByUnit.set(unit.id, record);
		}

		record.pressure += totalPressureThisTick;
		record.vulnerable = record.pressure >= PRESSURE_THRESHOLD;
	}
}

/**
 * Get accumulated faith pressure for a unit (0.0 → PRESSURE_THRESHOLD+).
 */
export function getUnitPressure(unitId: string): number {
	return pressureByUnit.get(unitId)?.pressure ?? 0;
}

/**
 * Whether a unit is currently vulnerable to conversion attempts.
 */
export function isVulnerableToConversion(unitId: string): boolean {
	return pressureByUnit.get(unitId)?.vulnerable ?? false;
}

/**
 * Clear faith pressure for a unit (e.g. if the unit leaves all influence zones
 * for an extended period, or the unit is destroyed).
 */
export function clearUnitPressure(unitId: string): void {
	pressureByUnit.delete(unitId);
}

// ---------------------------------------------------------------------------
// Conversion attempts
// ---------------------------------------------------------------------------

/**
 * Attempt to convert a vulnerable enemy unit using a Cult Leader.
 *
 * Conversion conditions:
 * 1. Target unit is vulnerable (pressure >= threshold)
 * 2. Target is within ACTION_RANGE of the cult leader
 * 3. Target is not conversion-immune
 * 4. Roll passes success chance (modified by faith level and target's reason resistance)
 *
 * @param cultLeader — The Cult Leader performing the conversion
 * @param target     — The enemy unit being targeted
 * @param tick       — Current game tick
 * @returns "success" | "fail" | "blocked" | "out_of_range"
 */
export function attemptConversion(
	cultLeader: CultLeaderUnit,
	target: UnitForConversion,
	tick: number,
): "success" | "fail" | "blocked" | "out_of_range" {
	// Must be an enemy
	if (target.faction === cultLeader.faction) return "blocked";

	// Must not be immune
	if (target.conversionImmune) return "blocked";

	// Must be vulnerable
	if (!isVulnerableToConversion(target.id)) return "blocked";

	// Must be in range
	const dist = distXZ(cultLeader.position, target.position);
	if (dist > ACTION_RANGE) return "out_of_range";

	// Compute success chance
	const faithLevel = Math.floor(cultLeader.factionFaith / 100);
	const baseSuccess = BASE_CHANCE + faithLevel * CHANCE_PER_FAITH_LEVEL;

	// Resistance from reason (high reason = harder to convert)
	const resistance = getConversionResistance(target.faction);
	// Also check per-unit reason level
	const unitReasonResistance =
		target.reasonLevel !== undefined && target.reasonLevel > 100
			? (target.reasonLevel - 100) * 0.005
			: 0;

	const finalChance = Math.max(0.01, baseSuccess * resistance - unitReasonResistance);

	if (Math.random() > finalChance) return "fail";

	// Conversion succeeded — clear pressure record
	clearUnitPressure(target.id);

	// Increment conversion counter for this faction
	conversionCount.set(
		cultLeader.faction,
		(conversionCount.get(cultLeader.faction) ?? 0) + 1,
	);

	// Notify ideology system (faith bonus, win condition tracking)
	recordConversion(cultLeader.faction, tick);

	safeEmit({
		type: "unit_converted",
		entityId: target.id,
		fromFaction: target.faction,
		toFaction: cultLeader.faction,
		cultLeaderId: cultLeader.id,
		tick,
	});

	return "success";
}

/**
 * Batch update: run influence zone pressure accumulation and then attempt
 * conversions for all cult leaders within range of vulnerable units.
 *
 * This is the main entry point for each game tick.
 *
 * @param attackingFaction — Faction running the conversion campaign
 * @param cultLeaders      — Active Cult Leader units for this faction
 * @param allEnemyUnits    — All enemy units that could be in influence zones
 * @param tick             — Current game tick
 * @returns Array of successfully converted unit IDs
 */
export function runConversionTick(
	attackingFaction: string,
	cultLeaders: CultLeaderUnit[],
	allEnemyUnits: UnitForConversion[],
	tick: number,
): string[] {
	// Step 1: Accumulate faith pressure
	updateFaithPressure(attackingFaction, allEnemyUnits);

	// Step 2: Attempt conversions for vulnerable units near cult leaders
	const converted: string[] = [];
	for (const leader of cultLeaders) {
		for (const unit of allEnemyUnits) {
			if (!isVulnerableToConversion(unit.id)) continue;
			const result = attemptConversion(leader, unit, tick);
			if (result === "success") {
				converted.push(unit.id);
			}
		}
	}

	return converted;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Total conversions performed by a faction this game.
 */
export function getConversionCount(faction: string): number {
	return conversionCount.get(faction) ?? 0;
}

/**
 * All unit IDs currently under faith pressure from any faction.
 */
export function getUnitsUnderPressure(): string[] {
	return [...pressureByUnit.keys()];
}

/**
 * Conversion time in seconds (how long it takes after "vulnerable" before
 * conversion can complete — used by UI progress bars).
 */
export function getConversionTime(): number {
	return CONVERSION_TIME;
}

// ---------------------------------------------------------------------------
// Test reset
// ---------------------------------------------------------------------------

/** Reset all conversion state. For testing only. */
export function _resetConversionState(): void {
	pressureByUnit.clear();
	conversionCount.clear();
}
