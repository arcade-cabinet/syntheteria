/**
 * MemorySystem — persistent memory for bot AI perception.
 *
 * Bots remember entities they have seen, even after losing line of sight.
 * Memories decay over time: the `confidence` field drops from 1.0 to 0.0
 * as the memory ages, and records are pruned after `memoryDuration` seconds.
 *
 * This module is intentionally decoupled from Yuka's built-in MemorySystem.
 * While Yuka provides MemoryRecord/MemorySystem, our game needs:
 *   - Faction-aware memory (remember hostile vs. friendly)
 *   - Confidence decay (not just binary visible/expired)
 *   - Integration with our string-based entity IDs (Yuka uses object refs)
 *   - Threat filtering (getRecentThreats)
 *
 * Usage:
 * ```ts
 * updateMemory('bot-1', ['enemy-3', 'ally-2'], allEntities, 42.5);
 * const threats = getRecentThreats('bot-1', 10.0, 42.5);
 * ```
 *
 * This module is a pure logic system — no React / R3F dependencies.
 */

import { config } from "../../config/index.ts";
import type { Vec3 } from "../ecs/types.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const perceptionConfig = config.enemies.perception;

/**
 * How long (in seconds) a memory persists before being pruned.
 * After this duration, the bot "forgets" the entity entirely.
 */
const MEMORY_DURATION = perceptionConfig.memoryDuration;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single memory record for an entity that a bot has seen.
 *
 * Unlike Yuka's built-in MemoryRecord (which uses object references),
 * this uses string entity IDs to match our ECS architecture.
 */
export interface MemoryRecord {
	/** Entity ID of the remembered entity. */
	entityId: string;

	/** World-space position where the entity was last seen. */
	lastSeenPosition: Vec3;

	/** Game time (seconds) when the entity was last seen. */
	lastSeenTime: number;

	/** Type of entity (e.g., "maintenance_bot", "utility_drone"). */
	entityType: string;

	/** Faction of the remembered entity. */
	faction: string;

	/**
	 * Confidence in this memory, 1.0 (just seen) to 0.0 (about to expire).
	 * Computed on access as: 1 - (timeSinceLastSeen / memoryDuration).
	 * A value of 0 means the memory should be pruned.
	 */
	confidence: number;

	/** Whether the entity is currently visible (updated each frame). */
	visible: boolean;
}

// ---------------------------------------------------------------------------
// Internal storage
// ---------------------------------------------------------------------------

/**
 * Per-bot memory store. Maps bot entity ID -> Map of remembered entity ID -> raw record.
 * Raw records store everything except `confidence`, which is computed on access.
 */
interface RawMemoryRecord {
	entityId: string;
	lastSeenPosition: Vec3;
	lastSeenTime: number;
	entityType: string;
	faction: string;
	visible: boolean;
}

const botMemories = new Map<string, Map<string, RawMemoryRecord>>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Update a bot's memory with the set of entities it currently sees.
 *
 * For each visible entity:
 *   - If already remembered: update position, time, and mark visible.
 *   - If new: create a fresh memory record.
 *
 * For each previously visible entity that is no longer seen:
 *   - Mark as not visible (memory starts decaying).
 *
 * Prune expired memories (age > memoryDuration).
 *
 * @param botId           - Entity ID of the bot whose memory to update
 * @param visibleEntities - Array of entity IDs currently visible to the bot
 * @param entityLookup    - Function to look up entity data by ID
 * @param currentTime     - Current game time in seconds
 */
export function updateMemory(
	botId: string,
	visibleEntities: string[],
	entityLookup: (
		id: string,
	) => { position: Vec3; type: string; faction: string } | null,
	currentTime: number,
): void {
	let memories = botMemories.get(botId);
	if (!memories) {
		memories = new Map();
		botMemories.set(botId, memories);
	}

	// Mark all existing memories as not visible this frame.
	for (const record of memories.values()) {
		record.visible = false;
	}

	// Update or create records for currently visible entities.
	const visibleSet = new Set(visibleEntities);

	for (const entityId of visibleSet) {
		const entityData = entityLookup(entityId);
		if (!entityData) continue;

		const existing = memories.get(entityId);

		if (existing) {
			// Update existing record.
			existing.lastSeenPosition = { ...entityData.position };
			existing.lastSeenTime = currentTime;
			existing.entityType = entityData.type;
			existing.faction = entityData.faction;
			existing.visible = true;
		} else {
			// Create new record.
			memories.set(entityId, {
				entityId,
				lastSeenPosition: { ...entityData.position },
				lastSeenTime: currentTime,
				entityType: entityData.type,
				faction: entityData.faction,
				visible: true,
			});
		}
	}

	// Prune expired memories (older than memoryDuration).
	for (const [entityId, record] of memories) {
		const age = currentTime - record.lastSeenTime;
		if (age > MEMORY_DURATION) {
			memories.delete(entityId);
		}
	}
}

/**
 * Get all memories for a bot, with computed confidence values.
 *
 * @param botId       - Entity ID of the bot
 * @param currentTime - Current game time in seconds
 * @returns Array of memory records, sorted by confidence descending
 */
export function getMemories(
	botId: string,
	currentTime: number,
): MemoryRecord[] {
	const memories = botMemories.get(botId);
	if (!memories) return [];

	const result: MemoryRecord[] = [];

	for (const raw of memories.values()) {
		const age = currentTime - raw.lastSeenTime;
		const confidence = raw.visible
			? 1.0
			: Math.max(0, 1 - age / MEMORY_DURATION);

		if (confidence <= 0) continue; // skip fully decayed

		result.push({
			entityId: raw.entityId,
			lastSeenPosition: raw.lastSeenPosition,
			lastSeenTime: raw.lastSeenTime,
			entityType: raw.entityType,
			faction: raw.faction,
			confidence,
			visible: raw.visible,
		});
	}

	result.sort((a, b) => b.confidence - a.confidence);
	return result;
}

/**
 * Get recent threat memories for a bot — hostile entities seen within maxAge seconds.
 *
 * @param botId       - Entity ID of the bot
 * @param maxAge      - Maximum age in seconds (e.g., 10 = last 10 seconds)
 * @param currentTime - Current game time in seconds
 * @returns Array of memory records for hostile entities within the age window
 */
export function getRecentThreats(
	botId: string,
	maxAge: number,
	currentTime: number,
): MemoryRecord[] {
	const memories = botMemories.get(botId);
	if (!memories) return [];

	const result: MemoryRecord[] = [];

	for (const raw of memories.values()) {
		const age = currentTime - raw.lastSeenTime;
		if (age >= maxAge) continue;

		const confidence = raw.visible
			? 1.0
			: Math.max(0, 1 - age / MEMORY_DURATION);

		if (confidence <= 0) continue;

		result.push({
			entityId: raw.entityId,
			lastSeenPosition: raw.lastSeenPosition,
			lastSeenTime: raw.lastSeenTime,
			entityType: raw.entityType,
			faction: raw.faction,
			confidence,
			visible: raw.visible,
		});
	}

	result.sort((a, b) => b.confidence - a.confidence);
	return result;
}

/**
 * Check if a bot has any memory of a specific entity.
 *
 * @param botId    - Entity ID of the bot
 * @param entityId - Entity ID to check
 * @returns True if the bot remembers this entity
 */
export function hasMemoryOf(botId: string, entityId: string): boolean {
	return botMemories.get(botId)?.has(entityId) ?? false;
}

/**
 * Get a specific memory record for a bot, if it exists.
 *
 * @param botId       - Entity ID of the bot
 * @param entityId    - Entity ID to look up
 * @param currentTime - Current game time in seconds
 * @returns The memory record, or null if not remembered
 */
export function getMemoryOf(
	botId: string,
	entityId: string,
	currentTime: number,
): MemoryRecord | null {
	const raw = botMemories.get(botId)?.get(entityId);
	if (!raw) return null;

	const age = currentTime - raw.lastSeenTime;
	const confidence = raw.visible ? 1.0 : Math.max(0, 1 - age / MEMORY_DURATION);

	if (confidence <= 0) return null;

	return {
		entityId: raw.entityId,
		lastSeenPosition: raw.lastSeenPosition,
		lastSeenTime: raw.lastSeenTime,
		entityType: raw.entityType,
		faction: raw.faction,
		confidence,
		visible: raw.visible,
	};
}

/**
 * Clear all memories for a specific bot (e.g., on entity removal or reset).
 */
export function clearBotMemory(botId: string): void {
	botMemories.delete(botId);
}

/**
 * Clear all bot memories (e.g., on game restart).
 */
export function clearAllMemories(): void {
	botMemories.clear();
}

/**
 * Get the total number of bots with active memories (for debug UI).
 */
export function getActiveMemoryCount(): number {
	return botMemories.size;
}
