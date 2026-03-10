/**
 * ThreatAssessment — evaluates threat level of remembered entities.
 *
 * Produces a 0.0 (no threat) to 1.0 (critical) threat score for each
 * entity in a bot's memory. The score combines multiple factors:
 *   - Distance (closer = more threatening)
 *   - Faction hostility (hostile factions score higher)
 *   - Target health (healthier targets are more dangerous)
 *   - Numerical advantage (outnumbered = higher threat)
 *   - Memory confidence (fresh memories count more)
 *
 * Feeds into BotBrain state transitions: when getHighestThreat() returns
 * a threat above the configured threshold, the bot transitions from
 * PATROL -> SEEK_TARGET -> ATTACK.
 *
 * Usage:
 * ```ts
 * const threat = assessThreat('bot-1', memoryRecord, botContext);
 * const highest = getHighestThreat('bot-1', currentTime, allEntities);
 * if (highest && highest.threatLevel > config.enemies.perception.threatThreshold) {
 *   // transition to combat
 * }
 * ```
 *
 * This module is a pure logic system — no React / R3F dependencies.
 */

import { config } from "../../config/index.ts";
import type { Entity, Vec3 } from "../ecs/types.ts";
import type { BotContext } from "./BotContext.ts";
import { distanceSqXZ, summarizeComponents } from "./BotContext.ts";
import { getMemories, type MemoryRecord } from "./MemorySystem.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const perceptionConfig = config.enemies.perception;

/** Threat level at or above which the bot should engage. */
export const THREAT_THRESHOLD = perceptionConfig.threatThreshold;

// ---------------------------------------------------------------------------
// Hostile faction table (same as BotBrainSystem — shared constant)
// ---------------------------------------------------------------------------

const HOSTILE_FACTIONS: Record<string, Set<string>> = {
	player: new Set(["feral", "cultist", "rogue"]),
	feral: new Set(["player", "cultist", "rogue"]),
	cultist: new Set(["player", "feral", "rogue"]),
	rogue: new Set(["player", "feral", "cultist"]),
	wildlife: new Set(),
};

function isHostile(factionA: string, factionB: string): boolean {
	return HOSTILE_FACTIONS[factionA]?.has(factionB) ?? false;
}

// ---------------------------------------------------------------------------
// Threat factor weights — how much each factor contributes to the final score
// ---------------------------------------------------------------------------

/** Weight for distance factor (closer = more dangerous). */
const W_DISTANCE = 0.3;

/** Weight for faction hostility (hostile vs. neutral). */
const W_HOSTILITY = 0.2;

/** Weight for target health (healthier = more dangerous). */
const W_TARGET_HEALTH = 0.15;

/** Weight for numerical advantage (outnumbered = more threat). */
const W_NUMBERS = 0.15;

/** Weight for memory confidence (fresh = more relevant). */
const W_CONFIDENCE = 0.2;

// ---------------------------------------------------------------------------
// Factor computation
// ---------------------------------------------------------------------------

/**
 * Distance factor: 1.0 at point-blank, 0.0 at max perception range.
 * Uses an inverse-square falloff for realistic urgency scaling.
 */
function distanceFactor(
	observerPos: Vec3,
	targetPos: Vec3,
	maxRange: number,
): number {
	const dSq = distanceSqXZ(observerPos, targetPos);
	const maxRangeSq = maxRange * maxRange;

	if (dSq >= maxRangeSq) return 0;

	// Inverse square falloff: close targets are disproportionately scary.
	const normalizedDist = Math.sqrt(dSq) / maxRange;
	return Math.max(0, 1 - normalizedDist * normalizedDist);
}

/**
 * Hostility factor: 1.0 for hostile factions, 0.0 for neutral/friendly.
 */
function hostilityFactor(
	observerFaction: string,
	targetFaction: string,
): number {
	if (isHostile(observerFaction, targetFaction)) return 1.0;
	return 0.0;
}

/**
 * Target health factor: how dangerous the target is based on its components.
 * A fully healthy target is 1.0 (very dangerous); a mostly broken one is low.
 * If we cannot determine health, assume moderate danger (0.5).
 */
function targetHealthFactor(
	targetId: string,
	allEntities: ReadonlyArray<Entity>,
): number {
	for (const e of allEntities) {
		if (e.id !== targetId) continue;

		if (e.unit?.components) {
			const status = summarizeComponents(e.unit.components);
			return status.healthRatio;
		}

		// Entity exists but has no components (e.g., a building) — moderate threat.
		return 0.5;
	}

	// Entity not found — use memory data, assume moderate.
	return 0.5;
}

/**
 * Numerical advantage factor: how outnumbered the observer is.
 * More nearby enemies relative to allies = higher threat.
 *
 * Returns 0.0 (heavily outnumbering enemies) to 1.0 (heavily outnumbered).
 */
function numbersFactor(ctx: BotContext): number {
	const enemies = ctx.nearbyEnemies.length;
	const allies = ctx.nearbyAllies.length + 1; // +1 for self

	if (enemies === 0) return 0;

	// Ratio of enemies to total nearby combatants
	const ratio = enemies / (enemies + allies);
	return Math.min(1, ratio);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assess the threat level of a single remembered entity.
 *
 * @param botId         - Entity ID of the bot making the assessment
 * @param targetMemory  - Memory record of the target entity
 * @param ctx           - Current BotContext (provides position, faction, nearby lists)
 * @param allEntities   - All entities in the world (for target health lookup)
 * @returns Threat level from 0.0 (no threat) to 1.0 (critical)
 */
export function assessThreat(
	_botId: string,
	targetMemory: MemoryRecord,
	ctx: BotContext,
	allEntities: ReadonlyArray<Entity>,
): number {
	// Maximum perception range for distance normalization.
	const maxRange =
		perceptionConfig.defaultRange + perceptionConfig.cameraRangeBonus;

	const fDist = distanceFactor(
		ctx.position,
		targetMemory.lastSeenPosition,
		maxRange,
	);
	const fHostile = hostilityFactor(ctx.faction, targetMemory.faction);
	const fHealth = targetHealthFactor(targetMemory.entityId, allEntities);
	const fNumbers = numbersFactor(ctx);
	const fConfidence = targetMemory.confidence;

	// Non-hostile entities have zero threat regardless of other factors.
	if (fHostile === 0) return 0;

	// Weighted sum, clamped to [0, 1].
	const threat =
		W_DISTANCE * fDist +
		W_HOSTILITY * fHostile +
		W_TARGET_HEALTH * fHealth +
		W_NUMBERS * fNumbers +
		W_CONFIDENCE * fConfidence;

	return Math.min(1, Math.max(0, threat));
}

/**
 * Get the highest-threat entity from a bot's memory.
 *
 * Evaluates threat for all remembered entities and returns the one with
 * the highest score. Returns null if no threats exist or all are below
 * a minimum threshold.
 *
 * @param botId       - Entity ID of the bot
 * @param currentTime - Current game time in seconds
 * @param ctx         - Current BotContext for the bot
 * @param allEntities - All entities in the world
 * @returns The highest threat, or null if no significant threats exist
 */
export function getHighestThreat(
	botId: string,
	currentTime: number,
	ctx: BotContext,
	allEntities: ReadonlyArray<Entity>,
): { entityId: string; threatLevel: number; memory: MemoryRecord } | null {
	const memories = getMemories(botId, currentTime);

	if (memories.length === 0) return null;

	let bestEntityId: string | null = null;
	let bestThreat = 0;
	let bestMemory: MemoryRecord | null = null;

	for (const memory of memories) {
		// Only assess hostile entities.
		if (!isHostile(ctx.faction, memory.faction)) continue;

		const threat = assessThreat(botId, memory, ctx, allEntities);

		if (threat > bestThreat) {
			bestThreat = threat;
			bestEntityId = memory.entityId;
			bestMemory = memory;
		}
	}

	if (!bestEntityId || bestThreat <= 0 || !bestMemory) return null;

	return {
		entityId: bestEntityId,
		threatLevel: bestThreat,
		memory: bestMemory,
	};
}

/**
 * Get all threats above a given threshold, sorted by threat level descending.
 *
 * @param botId       - Entity ID of the bot
 * @param currentTime - Current game time in seconds
 * @param ctx         - Current BotContext for the bot
 * @param allEntities - All entities in the world
 * @param minThreat   - Minimum threat level to include (default: THREAT_THRESHOLD)
 * @returns Array of threats sorted by threat level (highest first)
 */
export function getThreatsAbove(
	botId: string,
	currentTime: number,
	ctx: BotContext,
	allEntities: ReadonlyArray<Entity>,
	minThreat: number = THREAT_THRESHOLD,
): Array<{ entityId: string; threatLevel: number; memory: MemoryRecord }> {
	const memories = getMemories(botId, currentTime);
	const threats: Array<{
		entityId: string;
		threatLevel: number;
		memory: MemoryRecord;
	}> = [];

	for (const memory of memories) {
		if (!isHostile(ctx.faction, memory.faction)) continue;

		const threat = assessThreat(botId, memory, ctx, allEntities);

		if (threat >= minThreat) {
			threats.push({
				entityId: memory.entityId,
				threatLevel: threat,
				memory,
			});
		}
	}

	threats.sort((a, b) => b.threatLevel - a.threatLevel);
	return threats;
}

/**
 * Quick check: does the bot face any threat above the configured threshold?
 * Cheaper than getHighestThreat() — bails out on first match.
 *
 * @param botId       - Entity ID of the bot
 * @param currentTime - Current game time in seconds
 * @param ctx         - Current BotContext for the bot
 * @param allEntities - All entities in the world
 * @returns True if any remembered hostile entity exceeds the threat threshold
 */
export function hasThreatAboveThreshold(
	botId: string,
	currentTime: number,
	ctx: BotContext,
	allEntities: ReadonlyArray<Entity>,
): boolean {
	const memories = getMemories(botId, currentTime);

	for (const memory of memories) {
		if (!isHostile(ctx.faction, memory.faction)) continue;

		const threat = assessThreat(botId, memory, ctx, allEntities);
		if (threat >= THREAT_THRESHOLD) return true;
	}

	return false;
}
