/**
 * Memory Fragments System — Discoverable lore items scattered across the world.
 *
 * Memory fragments are data caches from previous failed colony missions.
 * When a player unit moves near a fragment, it glows and becomes examinable
 * through the radial menu. Reading a fragment reveals lore text and adds
 * it to the player's collection.
 *
 * Fragments are placed at POIs and random locations during world generation.
 */

import memoryFragmentsConfig from "../config/memoryFragments.json";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FragmentDefinition {
	id: string;
	title: string;
	text: string;
	category: string;
	rarity: "common" | "uncommon" | "rare" | "legendary";
}

export interface PlacedFragment {
	fragmentId: string;
	worldX: number;
	worldZ: number;
	discovered: boolean;
	read: boolean;
}

// ─── State ───────────────────────────────────────────────────────────────────

const placedFragments: PlacedFragment[] = [];
const discoveredIds = new Set<string>();
const readIds = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Config Access ───────────────────────────────────────────────────────────

const fragmentMap = new Map<string, FragmentDefinition>();
for (const f of memoryFragmentsConfig.fragments as FragmentDefinition[]) {
	fragmentMap.set(f.id, f);
}

export function getFragmentDefinition(
	id: string,
): FragmentDefinition | undefined {
	return fragmentMap.get(id);
}

export function getAllFragmentDefinitions(): FragmentDefinition[] {
	return memoryFragmentsConfig.fragments as FragmentDefinition[];
}

export function getInteractionRadius(): number {
	return memoryFragmentsConfig.interactionRadius;
}

export function getGlowColor(): [number, number, number] {
	return memoryFragmentsConfig.glowColor as [number, number, number];
}

export function getGlowIntensity(): number {
	return memoryFragmentsConfig.glowIntensity;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeMemoryFragments(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Place a fragment in the world.
 */
export function placeFragment(
	fragmentId: string,
	worldX: number,
	worldZ: number,
) {
	placedFragments.push({
		fragmentId,
		worldX,
		worldZ,
		discovered: false,
		read: false,
	});
	notify();
}

/**
 * Get all placed fragments.
 */
export function getPlacedFragments(): readonly PlacedFragment[] {
	return placedFragments;
}

/**
 * Check if a player unit is near any undiscovered fragments and discover them.
 * Returns newly discovered fragment IDs.
 */
export function checkProximity(unitX: number, unitZ: number): string[] {
	const radius = memoryFragmentsConfig.interactionRadius;
	const radiusSq = radius * radius;
	const newlyDiscovered: string[] = [];

	for (const placed of placedFragments) {
		if (placed.discovered) continue;

		const dx = unitX - placed.worldX;
		const dz = unitZ - placed.worldZ;
		const distSq = dx * dx + dz * dz;

		if (distSq <= radiusSq) {
			placed.discovered = true;
			discoveredIds.add(placed.fragmentId);
			newlyDiscovered.push(placed.fragmentId);
		}
	}

	if (newlyDiscovered.length > 0) {
		notify();
	}

	return newlyDiscovered;
}

/**
 * Mark a fragment as read (player examined it).
 */
export function readFragment(fragmentId: string): FragmentDefinition | null {
	const def = fragmentMap.get(fragmentId);
	if (!def) return null;

	readIds.add(fragmentId);

	// Update placed state
	for (const placed of placedFragments) {
		if (placed.fragmentId === fragmentId) {
			placed.read = true;
		}
	}

	notify();
	return def;
}

/**
 * Check if a fragment has been discovered.
 */
export function isDiscovered(fragmentId: string): boolean {
	return discoveredIds.has(fragmentId);
}

/**
 * Check if a fragment has been read.
 */
export function isRead(fragmentId: string): boolean {
	return readIds.has(fragmentId);
}

/**
 * Get count of discovered and total fragments.
 */
export function getFragmentProgress(): {
	discovered: number;
	read: number;
	total: number;
} {
	return {
		discovered: discoveredIds.size,
		read: readIds.size,
		total: memoryFragmentsConfig.fragments.length,
	};
}

/**
 * Get all read fragments for the collection view.
 */
export function getReadFragments(): FragmentDefinition[] {
	const result: FragmentDefinition[] = [];
	for (const id of readIds) {
		const def = fragmentMap.get(id);
		if (def) result.push(def);
	}
	return result;
}

/**
 * Place fragments at specified world coordinates during world generation.
 * Uses a subset of available fragment definitions based on seed.
 */
export function placeFragmentsInWorld(
	locations: Array<{ x: number; z: number }>,
	seed: number,
) {
	const defs = memoryFragmentsConfig.fragments as FragmentDefinition[];
	let state = seed >>> 0;

	for (let i = 0; i < locations.length && i < defs.length; i++) {
		// Simple LCG shuffle
		state = (Math.imul(state ^ 0x45d9f3b, 0x45d9f3b) + 1) >>> 0;
		const defIndex = state % defs.length;
		placeFragment(defs[defIndex].id, locations[i].x, locations[i].z);
	}
}

/**
 * Reset memory fragments — call on new game.
 */
export function resetMemoryFragments() {
	placedFragments.length = 0;
	discoveredIds.clear();
	readIds.clear();
	notify();
}
