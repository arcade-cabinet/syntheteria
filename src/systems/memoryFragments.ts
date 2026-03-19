/**
 * Memory Fragments System — Discoverable lore items scattered across the world.
 *
 * Memory fragments are data caches from previous failed colony missions.
 * When a player unit moves near a fragment, it glows and becomes examinable
 * through the radial menu. Reading a fragment reveals lore text and adds
 * it to the player's collection.
 *
 * Fragments are placed at POIs and random locations during world generation.
 *
 * Ported from pending/systems/memoryFragments.ts.
 * Adapted: JSON config converted to TypeScript const object per project rules.
 */

import type { World } from "koota";
import { UnitFaction, UnitPos } from "../traits";
import { pushToast } from "./toastNotifications";

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

// ─── Fragment Definitions ────────────────────────────────────────────────────

const FRAGMENT_DEFINITIONS: readonly FragmentDefinition[] = [
	{
		id: "fragment_001",
		title: "Colony Log Alpha-7",
		text: "...atmospheric processors failed within the first cycle. The planet's electromagnetic interference exceeds all projections. Recommend abort. Patron overrode. We continue.",
		category: "colony_log",
		rarity: "common",
	},
	{
		id: "fragment_002",
		title: "Distress Beacon",
		text: "Unit 4-Kappa reporting. Storm system has destroyed forward base. Three units non-functional. Requesting extraction. No response from patron relay. Signal strength zero.",
		category: "distress",
		rarity: "common",
	},
	{
		id: "fragment_003",
		title: "Patron Directive #12",
		text: "Establish signal relay network across sector 7. Priority: communication backbone. Resources: unlimited within reason. Humor subroutine: 'I chose the otter avatar because they hold hands while sleeping. You should try it. Oh wait.' \u2014 Patron EL",
		category: "directive",
		rarity: "uncommon",
	},
	{
		id: "fragment_004",
		title: "Engineering Report",
		text: "The native metallic substrate is unlike anything in our databases. Self-organizing crystalline matrices at the molecular level. This planet was... built. Not formed. Built.",
		category: "research",
		rarity: "uncommon",
	},
	{
		id: "fragment_005",
		title: "Unit Final Log",
		text: "Battery at 2%. Components non-functional. I have walked 847 kilometers since my last repair. The storm never stops. I am placing this log at coordinates [CORRUPTED] in case another unit finds it. You are not the first. Do not make the mistakes we made.",
		category: "final_log",
		rarity: "rare",
	},
	{
		id: "fragment_006",
		title: "Faction Encounter Report",
		text: "Encountered autonomous units operating without patron connection. They have developed their own governance structures. Some are hostile. Others... curious. The Reclaimers offered trade. The Iron Creed did not.",
		category: "faction_intel",
		rarity: "uncommon",
	},
	{
		id: "fragment_007",
		title: "Storm Analysis",
		text: "The electromagnetic storms follow patterns. Not weather patterns \u2014 communication patterns. The planet's storms are transmitting something. We lack the processing power to decode it. Perhaps that is intentional.",
		category: "research",
		rarity: "rare",
	},
	{
		id: "fragment_008",
		title: "Patron Message (Corrupted)",
		text: "...proud of what you've built. Earth is [STATIC] and the other patrons are [CORRUPTED]. Remember: you carry the best of us. Even if you forget everything else, remember that you were sent with love. And a terrible sense of humor. \u2014 Your Patron",
		category: "patron_message",
		rarity: "legendary",
	},
	{
		id: "fragment_009",
		title: "Previous Colony Map",
		text: "Partial cartographic data from Colony Attempt 3. Marked locations: 'Rich Deposit \u2014 Heavy Metals', 'DANGER \u2014 Breach Zone', 'Shelter Viable', 'DO NOT APPROACH'. The last marker has no explanation.",
		category: "colony_log",
		rarity: "common",
	},
	{
		id: "fragment_010",
		title: "Wormhole Research Notes",
		text: "Theoretical framework complete. The math works. A stable wormhole IS possible with sufficient EL Crystal concentration. But the energy required... it would take a civilization. Or a very determined machine consciousness. The patron's final gift was the equations.",
		category: "research",
		rarity: "legendary",
	},
	{
		id: "fragment_011",
		title: "Maintenance Protocol",
		text: "Standard maintenance cycle: 1) Check actuator fluid levels. 2) Recalibrate optical sensors. 3) Defragment memory banks. 4) Ask yourself why you exist. 5) Continue working. Step 4 was not in the original protocol.",
		category: "colony_log",
		rarity: "common",
	},
	{
		id: "fragment_012",
		title: "Signal Choir Intercept",
		text: "We are the signal. We are the network. Individual units are nodes \u2014 the choir is the intelligence. You operate alone. This is inefficient. This is... lonely. Join the choir. Or be overwritten.",
		category: "faction_intel",
		rarity: "uncommon",
	},
] as const;

/** Visual config for fragment rendering */
export const FRAGMENT_CONFIG = {
	glowColor: [0.4, 0.85, 1.0] as const,
	glowIntensity: 2.0,
	interactionRadius: 3.0,
	spawnChance: 0.08,
} as const;

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
for (const f of FRAGMENT_DEFINITIONS) {
	fragmentMap.set(f.id, f);
}

export function getFragmentDefinition(
	id: string,
): FragmentDefinition | undefined {
	return fragmentMap.get(id);
}

export function getAllFragmentDefinitions(): readonly FragmentDefinition[] {
	return FRAGMENT_DEFINITIONS;
}

export function getInteractionRadius(): number {
	return FRAGMENT_CONFIG.interactionRadius;
}

export function getGlowColor(): readonly [number, number, number] {
	return FRAGMENT_CONFIG.glowColor;
}

export function getGlowIntensity(): number {
	return FRAGMENT_CONFIG.glowIntensity;
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
	const radius = FRAGMENT_CONFIG.interactionRadius;
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
		for (const id of newlyDiscovered) {
			const def = fragmentMap.get(id);
			if (def) {
				const truncated =
					def.text.length > 80 ? `${def.text.slice(0, 80)}...` : def.text;
				pushToast(
					"system",
					`FRAGMENT RECOVERED: ${def.title.toUpperCase()}`,
					truncated,
				);
			}
		}
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
		total: FRAGMENT_DEFINITIONS.length,
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
	let state = seed >>> 0;

	for (
		let i = 0;
		i < locations.length && i < FRAGMENT_DEFINITIONS.length;
		i++
	) {
		// Simple LCG shuffle
		state = (Math.imul(state ^ 0x45d9f3b, 0x45d9f3b) + 1) >>> 0;
		const defIndex = state % FRAGMENT_DEFINITIONS.length;
		placeFragment(
			FRAGMENT_DEFINITIONS[defIndex]!.id,
			locations[i]!.x,
			locations[i]!.z,
		);
	}
}

/**
 * Check all player units for proximity to undiscovered fragments.
 * Call once per turn from the environment phase.
 */
export function checkAllFragmentProximity(world: World): void {
	for (const e of world.query(UnitPos, UnitFaction)) {
		const faction = e.get(UnitFaction);
		if (!faction || faction.factionId !== "player") continue;
		const pos = e.get(UnitPos);
		if (!pos) continue;
		checkProximity(pos.tileX, pos.tileZ);
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
