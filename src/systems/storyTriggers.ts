/**
 * Story trigger system (US-5.1) — fires dialogue when units explore special rooms.
 *
 * Monitors player unit positions against known story trigger rooms.
 * Each trigger fires ONCE per game (not on revisit).
 * Triggers are registered by room tag from the labyrinth generator.
 *
 * The system emits trigger IDs that the UI reads to show NarrativeOverlay.
 */

import {
	type DialogueSequence,
	NARRATIVE_SEQUENCES,
	STORY_TRIGGERS,
} from "../config/narrativeDefs";
import { Faction, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";

// ─── State ──────────────────────────────────────────────────────────────────

interface StoryTriggerZone {
	/** World-space center of the trigger room. */
	worldX: number;
	worldZ: number;
	/** Trigger radius in world units. */
	radius: number;
	/** Dialogue sequence ID to fire. */
	sequenceId: string;
}

const triggerZones: StoryTriggerZone[] = [];
const firedTriggers = new Set<string>();
let pendingSequence: DialogueSequence | null = null;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a story trigger zone. Called when chunks with special rooms load.
 * If the trigger has already fired this game, it is ignored.
 */
export function registerStoryTrigger(
	worldX: number,
	worldZ: number,
	roomTag: string,
	radius = 4,
): void {
	const sequenceId = STORY_TRIGGERS[roomTag];
	if (!sequenceId) return; // Not a story-triggering room
	if (firedTriggers.has(sequenceId)) return; // Already triggered

	// Avoid duplicate registrations for the same zone
	const exists = triggerZones.some(
		(z) =>
			z.sequenceId === sequenceId &&
			Math.abs(z.worldX - worldX) < 2 &&
			Math.abs(z.worldZ - worldZ) < 2,
	);
	if (exists) return;

	triggerZones.push({ worldX, worldZ, radius, sequenceId });
}

/**
 * Pop the pending story sequence (if any). Called by the UI to show overlay.
 * Returns null if no trigger fired this tick.
 */
export function popStoryTrigger(): DialogueSequence | null {
	const seq = pendingSequence;
	pendingSequence = null;
	return seq;
}

/**
 * Check if there is a pending story trigger.
 */
export function hasPendingStoryTrigger(): boolean {
	return pendingSequence !== null;
}

/**
 * Reset all story state. Call when starting a new game.
 */
export function resetStoryTriggers(): void {
	triggerZones.length = 0;
	firedTriggers.clear();
	pendingSequence = null;
}

/**
 * Story trigger system tick. Called once per sim tick.
 * Checks if any player unit is inside an unfired trigger zone.
 */
export function storyTriggerSystem(): void {
	// Don't check if we already have a pending trigger (wait for UI to consume it)
	if (pendingSequence) return;
	if (triggerZones.length === 0) return;

	for (const entity of world.query(Position, Unit, Faction)) {
		if (entity.get(Faction)?.value !== "player") continue;
		const pos = entity.get(Position)!;

		for (let i = triggerZones.length - 1; i >= 0; i--) {
			const zone = triggerZones[i]!;
			if (firedTriggers.has(zone.sequenceId)) continue;

			const dx = pos.x - zone.worldX;
			const dz = pos.z - zone.worldZ;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist <= zone.radius) {
				// Trigger fired!
				firedTriggers.add(zone.sequenceId);
				const sequence = NARRATIVE_SEQUENCES[zone.sequenceId];
				if (sequence) {
					pendingSequence = sequence;
				}
				// Remove this zone — it won't fire again
				triggerZones.splice(i, 1);
				return; // One trigger per tick max
			}
		}
	}
}
