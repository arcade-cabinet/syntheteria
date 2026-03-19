/**
 * Speech Triggers — helper functions that bridge game systems to speech bubbles.
 *
 * Game systems call these with an entity ID and faction ID.
 * This module resolves the faction's persona → speech profile → picks a line
 * → pushes it to the speechBubbleStore.
 *
 * Keeps speech profile resolution logic in one place rather than
 * scattered across attackSystem, harvestSystem, etc.
 */

import type { World } from "koota";
import type {
	ContextSpeechTrigger,
	EventSpeechTrigger,
} from "../narrative/speechProfiles";
import {
	getContextSpeechByPersona,
	getEventSpeechByPersona,
} from "../narrative/speechProfiles";
import { Faction } from "../traits";
import { triggerSpeech } from "./speechBubbleStore";

// ─── Persona lookup ─────────────────────────────────────────────────────────

/** Resolve a faction ID to its persona string (otter, fox, raven, lynx, bear). */
function lookupPersona(world: World, factionId: string): string {
	for (const e of world.query(Faction)) {
		const f = e.get(Faction);
		if (f?.id === factionId) return f.persona;
	}
	return "otter"; // fallback to mentor
}

// ─── Trigger functions for game systems ─────────────────────────────────────

/** Trigger combat speech for a unit. Called from attackSystem. */
export function triggerCombatSpeech(
	world: World,
	entityId: number,
	factionId: string,
): void {
	const persona = lookupPersona(world, factionId);
	const line = getContextSpeechByPersona(persona, "combat");
	triggerSpeech(entityId, factionId, line);
}

/** Trigger harvest speech for a unit. Called from harvestSystem. */
export function triggerHarvestSpeech(
	world: World,
	entityId: number,
	factionId: string,
): void {
	const persona = lookupPersona(world, factionId);
	const line = getContextSpeechByPersona(persona, "harvesting");
	triggerSpeech(entityId, factionId, line);
}

/** Trigger discovery speech for a unit. Called from memoryFragments. */
export function triggerDiscoverySpeech(
	world: World,
	entityId: number,
	factionId: string,
): void {
	const persona = lookupPersona(world, factionId);
	const line = getContextSpeechByPersona(persona, "discovery");
	triggerSpeech(entityId, factionId, line);
}

/** Trigger event speech (hostile_construction, enemy_scouts, etc). */
export function triggerEventSpeech(
	world: World,
	entityId: number,
	factionId: string,
	trigger: EventSpeechTrigger,
): void {
	const persona = lookupPersona(world, factionId);
	const line = getEventSpeechByPersona(persona, trigger);
	triggerSpeech(entityId, factionId, line);
}

/** Trigger context speech with any context trigger. */
export function triggerContextSpeech(
	world: World,
	entityId: number,
	factionId: string,
	context: ContextSpeechTrigger,
): void {
	const persona = lookupPersona(world, factionId);
	const line = getContextSpeechByPersona(persona, context);
	triggerSpeech(entityId, factionId, line);
}
