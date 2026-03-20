/**
 * Unit detection — determines if an enemy unit is within any player unit's scan range.
 *
 * Replaces the old explored-tile fog gate. Terrain is always visible;
 * only enemy UNITS are hidden until within scan range of a friendly unit.
 */

export interface Scanner {
	x: number;
	z: number;
	range: number;
}

/**
 * Check if a unit at (tileX, tileZ) is within any scanner's scan range.
 * Uses Manhattan distance matching the existing movement/adjacency system.
 */
export function isUnitDetected(
	tileX: number,
	tileZ: number,
	scanners: readonly Scanner[],
): boolean {
	for (const s of scanners) {
		const dist = Math.abs(tileX - s.x) + Math.abs(tileZ - s.z);
		if (dist <= s.range) return true;
	}
	return false;
}
