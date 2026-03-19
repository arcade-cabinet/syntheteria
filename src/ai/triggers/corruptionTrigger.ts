/**
 * CorruptionTrigger — cult zone detection using Yuka-inspired trigger regions.
 *
 * Each cult POI (CultStructure) has a corruptionRadius. When a faction unit
 * enters that radius, the system fires:
 *   1. An alert to AlertBar ("CORRUPTION ZONE DETECTED")
 *   2. A boost to cult awareness for that faction (faction FSM context)
 *   3. Diplomacy contact event when factions first encounter each other
 *
 * Adapted from Yuka's SphericalTriggerRegion for our tile grid:
 * we use manhattan distance instead of 3D sphere intersection.
 */

import type { World } from "koota";
import { CultStructure } from "../../ecs/traits/cult";
import { UnitFaction, UnitPos } from "../../ecs/traits/unit";
import { pushAlert } from "../../ui/game/AlertBar";

// ---------------------------------------------------------------------------
// Corruption zone tracking
// ---------------------------------------------------------------------------

/** Records which units have already been alerted about a given cult POI. */
const _alertedPairs = new Set<string>();

/** Records which faction pairs have already triggered first contact. */
const _contactedPairs = new Set<string>();

function alertKey(entityId: number, poiX: number, poiZ: number): string {
	return `${entityId}:${poiX},${poiZ}`;
}

function contactKey(factionA: string, factionB: string): string {
	return factionA < factionB ? `${factionA}:${factionB}` : `${factionB}:${factionA}`;
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

export interface CorruptionEvent {
	type: "corruption_zone_entered" | "faction_first_contact";
	factionId: string;
	/** The other faction (for first_contact events). */
	otherFactionId?: string;
	tileX: number;
	tileZ: number;
	turn: number;
}

/**
 * Check all faction units against all cult structure corruption radii.
 * Called once per turn in the environment phase.
 *
 * Returns events for systems that need to react (FSM, diplomacy).
 */
export function checkCorruptionTriggers(
	world: World,
	currentTurn: number,
): CorruptionEvent[] {
	const events: CorruptionEvent[] = [];

	// Collect cult POIs
	const pois: Array<{ x: number; z: number; radius: number }> = [];
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (!s) continue;
		pois.push({ x: s.tileX, z: s.tileZ, radius: s.corruptionRadius });
	}

	if (pois.length === 0) return events;

	// Check each unit against each POI
	for (const e of world.query(UnitPos, UnitFaction)) {
		const pos = e.get(UnitPos);
		const faction = e.get(UnitFaction);
		if (!pos || !faction) continue;

		// Skip cult faction units — they're the cult, not entering zones
		if (isCultFaction(faction.factionId)) continue;

		for (const poi of pois) {
			const dist =
				Math.abs(pos.tileX - poi.x) + Math.abs(pos.tileZ - poi.z);
			if (dist > poi.radius) continue;

			const key = alertKey(e.id(), poi.x, poi.z);
			if (_alertedPairs.has(key)) continue;

			_alertedPairs.add(key);

			// Fire alert for player faction only (others don't need UI alerts)
			if (faction.factionId === "player") {
				pushAlert(
					"cult",
					"CORRUPTION ZONE DETECTED",
					poi.x,
					poi.z,
				);
			}

			events.push({
				type: "corruption_zone_entered",
				factionId: faction.factionId,
				tileX: poi.x,
				tileZ: poi.z,
				turn: currentTurn,
			});
		}
	}

	return events;
}

/**
 * Check for first contact between faction units.
 * When two non-cult factions have units within scan range of each other
 * for the first time, fire a diplomacy event.
 */
export function checkFactionContact(
	world: World,
	currentTurn: number,
): CorruptionEvent[] {
	const events: CorruptionEvent[] = [];

	// Collect all faction units with positions
	const units: Array<{
		factionId: string;
		tileX: number;
		tileZ: number;
	}> = [];

	for (const e of world.query(UnitPos, UnitFaction)) {
		const pos = e.get(UnitPos);
		const faction = e.get(UnitFaction);
		if (!pos || !faction) continue;
		if (isCultFaction(faction.factionId)) continue;
		units.push({
			factionId: faction.factionId,
			tileX: pos.tileX,
			tileZ: pos.tileZ,
		});
	}

	// O(n^2) but faction unit counts are small (~50 total)
	for (let i = 0; i < units.length; i++) {
		for (let j = i + 1; j < units.length; j++) {
			const a = units[i];
			const b = units[j];
			if (a.factionId === b.factionId) continue;

			const key = contactKey(a.factionId, b.factionId);
			if (_contactedPairs.has(key)) continue;

			const dist =
				Math.abs(a.tileX - b.tileX) + Math.abs(a.tileZ - b.tileZ);
			// Contact range: 8 tiles (roughly scan range)
			if (dist > 8) continue;

			_contactedPairs.add(key);

			// Alert for player contacts
			if (a.factionId === "player" || b.factionId === "player") {
				const otherFaction =
					a.factionId === "player" ? b.factionId : a.factionId;
				pushAlert(
					"diplomacy",
					`First contact: ${otherFaction.replace(/_/g, " ")}`,
					b.tileX,
					b.tileZ,
				);
			}

			events.push({
				type: "faction_first_contact",
				factionId: a.factionId,
				otherFactionId: b.factionId,
				tileX: b.tileX,
				tileZ: b.tileZ,
				turn: currentTurn,
			});
		}
	}

	return events;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CULT_IDS = new Set(["static_remnants", "null_monks", "lost_signal"]);

function isCultFaction(factionId: string): boolean {
	return CULT_IDS.has(factionId);
}

// ---------------------------------------------------------------------------
// Reset (new game)
// ---------------------------------------------------------------------------

export function resetCorruptionTriggers(): void {
	_alertedPairs.clear();
	_contactedPairs.clear();
}
