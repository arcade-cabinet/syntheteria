/**
 * Territory visualization system — render data for territory overlays.
 *
 * Converts territory ownership data into visualization primitives:
 * colored zones for terrain shader overlays, border line segments
 * where factions meet, contested area markers, and minimap data.
 *
 * Pure data output — no Three.js, no config imports, no ECS coupling.
 * Consumers (terrain shader, minimap renderer, HUD) read the output
 * and apply it to their own rendering pipelines.
 *
 * Module-level Map state with reset() for test isolation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec2 {
	x: number;
	z: number;
}

export interface TerritoryZone {
	center: Vec2;
	radius: number;
	factionColor: string;
	borderColor: string;
	opacity: number;
	isContested: boolean;
}

export interface BorderSegment {
	start: Vec2;
	end: Vec2;
	factionA: string;
	factionB: string;
}

export interface ContestedZone {
	center: Vec2;
	radius: number;
	factions: [string, string];
}

export interface MinimapTerritory {
	center: Vec2;
	radius: number;
	color: string;
	isContested: boolean;
}

interface TerritoryEntry {
	id: string;
	center: Vec2;
	radius: number;
	ownerFaction: string;
}

// ---------------------------------------------------------------------------
// Default faction colors
// ---------------------------------------------------------------------------

const DEFAULT_FACTION_COLORS: Record<string, string> = {
	reclaimers: "#D4A574",
	volt_collective: "#4A90D9",
	signal_choir: "#7B68EE",
	iron_creed: "#808080",
	neutral: "#333333",
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let territories = new Map<string, TerritoryEntry>();
let factionColors = new Map<string, string>(
	Object.entries(DEFAULT_FACTION_COLORS),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distance(a: Vec2, b: Vec2): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Darken a hex color by mixing it toward black.
 * factor 0 = original, factor 1 = fully black.
 */
function darkenHex(hex: string, factor: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	const dr = Math.round(r * (1 - factor));
	const dg = Math.round(g * (1 - factor));
	const db = Math.round(b * (1 - factor));

	return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

/**
 * Compute the two intersection points of two circles.
 * Returns null if circles do not intersect or are identical.
 */
function circleIntersectionPoints(
	c1: Vec2,
	r1: number,
	c2: Vec2,
	r2: number,
): [Vec2, Vec2] | null {
	const d = distance(c1, c2);

	// No intersection: too far apart, one inside the other, or coincident
	if (d >= r1 + r2) return null;
	if (d <= Math.abs(r1 - r2)) return null;
	if (d === 0) return null;

	const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
	const h = Math.sqrt(r1 * r1 - a * a);

	// Point along the line between centers at distance a from c1
	const px = c1.x + (a * (c2.x - c1.x)) / d;
	const pz = c1.z + (a * (c2.z - c1.z)) / d;

	// Offset perpendicular to the line between centers
	const ox = (h * (c2.z - c1.z)) / d;
	const oz = (h * (c2.x - c1.x)) / d;

	return [
		{ x: px + ox, z: pz - oz },
		{ x: px - ox, z: pz + oz },
	];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new territory for visualization tracking.
 */
export function registerTerritory(
	territoryId: string,
	center: Vec2,
	radius: number,
	ownerFaction: string,
): void {
	territories.set(territoryId, {
		id: territoryId,
		center: { x: center.x, z: center.z },
		radius,
		ownerFaction,
	});
}

/**
 * Remove a territory from visualization tracking.
 */
export function removeTerritory(territoryId: string): void {
	territories.delete(territoryId);
}

/**
 * Update the radius of a tracked territory.
 * No-op if the territory does not exist.
 */
export function updateTerritoryRadius(
	territoryId: string,
	newRadius: number,
): void {
	const entry = territories.get(territoryId);
	if (entry) {
		entry.radius = newRadius;
	}
}

/**
 * Get the faction color as a hex string.
 * Returns neutral color if the faction has no assigned color.
 */
export function getFactionColor(factionId: string): string {
	return factionColors.get(factionId) ?? factionColors.get("neutral") ?? "#333333";
}

/**
 * Set or override a faction's color.
 */
export function setFactionColor(factionId: string, color: string): void {
	factionColors.set(factionId, color);
}

/**
 * Build render data for all tracked territories.
 *
 * Each TerritoryZone includes whether the zone is contested
 * (overlaps with a different faction's territory). Contested zones
 * have reduced opacity to signal instability.
 */
export function getTerritoryRenderData(): TerritoryZone[] {
	const entries = Array.from(territories.values());
	const contested = computeContestedSet(entries);
	const zones: TerritoryZone[] = [];

	for (const entry of entries) {
		const isContested = contested.has(entry.id);
		const factionColor = getFactionColor(entry.ownerFaction);
		const borderColor = darkenHex(factionColor, 0.3);

		zones.push({
			center: { x: entry.center.x, z: entry.center.z },
			radius: entry.radius,
			factionColor,
			borderColor,
			opacity: isContested ? 0.3 : 0.5,
			isContested,
		});
	}

	return zones;
}

/**
 * Compute line segments where territories from different factions overlap.
 * Each segment connects the two intersection points of the overlapping circles.
 */
export function getBorderSegments(): BorderSegment[] {
	const entries = Array.from(territories.values());
	const segments: BorderSegment[] = [];

	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			const a = entries[i];
			const b = entries[j];

			if (a.ownerFaction === b.ownerFaction) continue;

			const points = circleIntersectionPoints(
				a.center,
				a.radius,
				b.center,
				b.radius,
			);

			if (points) {
				segments.push({
					start: points[0],
					end: points[1],
					factionA: a.ownerFaction,
					factionB: b.ownerFaction,
				});
			}
		}
	}

	return segments;
}

/**
 * Get all zones where territories from different factions overlap.
 *
 * The contested zone center is the midpoint between the two territory
 * centers, and the radius covers the overlapping area.
 */
export function getContestedZones(): ContestedZone[] {
	const entries = Array.from(territories.values());
	const zones: ContestedZone[] = [];

	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			const a = entries[i];
			const b = entries[j];

			if (a.ownerFaction === b.ownerFaction) continue;

			const dist = distance(a.center, b.center);
			if (dist < a.radius + b.radius) {
				// Overlap amount
				const overlap = a.radius + b.radius - dist;
				zones.push({
					center: {
						x: (a.center.x + b.center.x) / 2,
						z: (a.center.z + b.center.z) / 2,
					},
					radius: overlap / 2,
					factions: [a.ownerFaction, b.ownerFaction],
				});
			}
		}
	}

	return zones;
}

/**
 * Get simplified territory data for minimap rendering.
 * Same as render data but without border color or opacity details.
 */
export function getMinimapData(): MinimapTerritory[] {
	const entries = Array.from(territories.values());
	const contested = computeContestedSet(entries);

	return entries.map((entry) => ({
		center: { x: entry.center.x, z: entry.center.z },
		radius: entry.radius,
		color: getFactionColor(entry.ownerFaction),
		isContested: contested.has(entry.id),
	}));
}

/**
 * Get territories visible from a camera position within a view distance.
 * A territory is visible if any part of its circle falls within the
 * view distance from the camera (distance to center minus radius).
 */
export function getVisibleTerritories(
	cameraPosition: Vec2,
	viewDistance: number,
): TerritoryZone[] {
	const allData = getTerritoryRenderData();

	return allData.filter((zone) => {
		const dist = distance(cameraPosition, zone.center);
		// Territory is visible if closest edge is within view distance
		return dist - zone.radius <= viewDistance;
	});
}

/**
 * Determine which territory contains a given position.
 * If the position falls within multiple territories, returns the one
 * whose center is closest. Returns null if not in any territory.
 */
export function getTerritoryAtPosition(position: Vec2): TerritoryEntry | null {
	let best: TerritoryEntry | null = null;
	let bestDist = Infinity;

	for (const entry of territories.values()) {
		const dist = distance(position, entry.center);
		if (dist <= entry.radius && dist < bestDist) {
			best = entry;
			bestDist = dist;
		}
	}

	return best;
}

/**
 * Clear all territory visualization state.
 * Faction colors are reset to defaults.
 */
export function reset(): void {
	territories = new Map();
	factionColors = new Map(Object.entries(DEFAULT_FACTION_COLORS));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a set of territory IDs that are contested (overlap with a
 * different faction's territory).
 */
function computeContestedSet(entries: TerritoryEntry[]): Set<string> {
	const contested = new Set<string>();

	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			const a = entries[i];
			const b = entries[j];

			if (a.ownerFaction === b.ownerFaction) continue;

			const dist = distance(a.center, b.center);
			if (dist < a.radius + b.radius) {
				contested.add(a.id);
				contested.add(b.id);
			}
		}
	}

	return contested;
}
