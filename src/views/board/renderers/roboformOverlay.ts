/**
 * roboformOverlay — renders roboforming level as colored transparent planes.
 *
 * When factions develop tiles, the terrain visually transforms through
 * 5 levels of industrialization. This renderer places translucent overlay
 * planes on top of terrain to show the roboforming progression.
 *
 * Follows the territoryRenderer pattern: module-level state, create/update API.
 * Pure Three.js — no React dependency.
 *
 * Roboform levels:
 *   0 — Natural (no overlay)
 *   1 — Graded: desaturated earth tones
 *   2 — Paved: grey concrete
 *   3 — Plated: steel grey with faction accent edge glow
 *   4 — Armored: dark alloy with glowing faction-colored edge trim
 *
 * Fractional levels (e.g. 2.5) interpolate between adjacent level colors.
 */

import * as THREE from "three";
import { FACTION_COLORS } from "../../../rendering";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Roboform level color palette
// ---------------------------------------------------------------------------

/** Base colors for each roboform level (0 = natural, no overlay shown). */
const LEVEL_COLORS: readonly THREE.Color[] = [
	new THREE.Color(0x000000), // Level 0 — not rendered
	new THREE.Color(0x6b5b3a), // Level 1 — Graded: desaturated earth
	new THREE.Color(0x5a5a5a), // Level 2 — Paved: grey concrete
	new THREE.Color(0x8a8a90), // Level 3 — Plated: steel grey
	new THREE.Color(0x2a2a30), // Level 4 — Armored: dark alloy
];

const LEVEL_OPACITY: readonly number[] = [
	0.0, // Level 0 — invisible
	0.2, // Level 1 — subtle
	0.3, // Level 2 — moderate
	0.35, // Level 3 — visible
	0.4, // Level 4 — strong
];

// ---------------------------------------------------------------------------
// Tile roboform data
// ---------------------------------------------------------------------------

export interface RoboformTile {
	/** Roboform level 0-4 (fractional for interpolation). */
	readonly level: number;
	/** Faction ID that owns this roboformed tile (for accent colors). */
	readonly factionId: string;
}

/**
 * Module-level roboform state. Keyed by "x,z" tile coordinates.
 * Systems call `setRoboformLevel` to update; renderer reads on `updateRoboform`.
 */
const roboformData = new Map<string, RoboformTile>();

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let roboformGroup: THREE.Group | null = null;

const ROBOFORM_Y = 0.03; // slightly above territory overlay (0.02)
const TILE_PLANE_SIZE = 1.9; // slightly smaller than TILE_SIZE for grid gaps
const EDGE_TRIM_SIZE = 1.95; // edge trim is slightly larger
const EDGE_TRIM_OFFSET = 0.005; // raise edge trim above overlay

const sharedGeo = new THREE.PlaneGeometry(TILE_PLANE_SIZE, TILE_PLANE_SIZE);
sharedGeo.rotateX(-Math.PI / 2);

const edgeTrimGeo = new THREE.RingGeometry(
	TILE_PLANE_SIZE * 0.42,
	EDGE_TRIM_SIZE * 0.48,
	4,
	1,
);
edgeTrimGeo.rotateX(-Math.PI / 2);

// Temp color for interpolation
const _tmpA = new THREE.Color();
const _tmpB = new THREE.Color();

// ---------------------------------------------------------------------------
// Color interpolation
// ---------------------------------------------------------------------------

/**
 * Compute the overlay color for a given roboform level (supports fractional).
 */
function getLevelColor(level: number): THREE.Color {
	const clamped = Math.max(0, Math.min(4, level));
	const lo = Math.floor(clamped);
	const hi = Math.min(4, lo + 1);
	const t = clamped - lo;

	_tmpA.copy(LEVEL_COLORS[lo]);
	_tmpB.copy(LEVEL_COLORS[hi]);
	return new THREE.Color().copy(_tmpA).lerp(_tmpB, t);
}

/**
 * Compute the overlay opacity for a given roboform level (supports fractional).
 */
function getLevelOpacity(level: number): number {
	const clamped = Math.max(0, Math.min(4, level));
	const lo = Math.floor(clamped);
	const hi = Math.min(4, lo + 1);
	const t = clamped - lo;
	return LEVEL_OPACITY[lo] * (1 - t) + LEVEL_OPACITY[hi] * t;
}

// ---------------------------------------------------------------------------
// Public API — data manipulation
// ---------------------------------------------------------------------------

/**
 * Set the roboform level for a tile. Called by game systems when tiles
 * are developed by factions.
 *
 * @param tileX — tile grid X coordinate
 * @param tileZ — tile grid Z coordinate
 * @param level — roboform level 0-4 (fractional OK)
 * @param factionId — owning faction ID (for accent colors at level 3-4)
 */
export function setRoboformLevel(
	tileX: number,
	tileZ: number,
	level: number,
	factionId: string,
): void {
	const key = `${tileX},${tileZ}`;
	if (level <= 0) {
		roboformData.delete(key);
	} else {
		roboformData.set(key, { level: Math.min(4, level), factionId });
	}
}

/**
 * Get the current roboform level for a tile. Returns 0 if not roboformed.
 */
export function getRoboformLevel(tileX: number, tileZ: number): number {
	return roboformData.get(`${tileX},${tileZ}`)?.level ?? 0;
}

/**
 * Get the full roboform data map (read-only snapshot for testing/inspection).
 */
export function getRoboformSnapshot(): ReadonlyMap<string, RoboformTile> {
	return roboformData;
}

/**
 * Clear all roboform data. Useful for game reset.
 */
export function clearRoboformData(): void {
	roboformData.clear();
}

// ---------------------------------------------------------------------------
// Public API — rendering
// ---------------------------------------------------------------------------

/**
 * Create the roboform overlay group and add it to the scene.
 * Call once during scene setup.
 */
export function createRoboformOverlay(scene: THREE.Scene): void {
	roboformGroup = new THREE.Group();
	roboformGroup.name = "roboform-overlay";
	scene.add(roboformGroup);
}

/**
 * Rebuild roboform overlay meshes from the current roboform data.
 * Call once per turn or when roboform state changes.
 */
export function updateRoboformOverlay(): void {
	if (!roboformGroup) return;

	// Clear previous meshes
	while (roboformGroup.children.length > 0) {
		const child = roboformGroup.children[0];
		roboformGroup.remove(child);
	}

	for (const [key, data] of roboformData) {
		if (data.level <= 0) continue;

		const [txStr, tzStr] = key.split(",");
		const tx = Number(txStr);
		const tz = Number(tzStr);
		const pos = tileToWorld(tx, tz);

		// Main overlay plane
		const color = getLevelColor(data.level);
		const opacity = getLevelOpacity(data.level);

		const mat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity,
			depthWrite: false,
			side: THREE.DoubleSide,
		});

		const mesh = new THREE.Mesh(sharedGeo, mat);
		mesh.position.set(pos.x, ROBOFORM_Y, pos.z);
		roboformGroup.add(mesh);

		// Faction-colored edge trim for levels 3+ (Plated and Armored)
		if (data.level >= 2.5) {
			const factionColor = FACTION_COLORS[data.factionId] ?? 0x888888;
			const edgeIntensity = data.level >= 3.5 ? 0.7 : 0.4;

			const edgeMat = new THREE.MeshBasicMaterial({
				color: factionColor,
				transparent: true,
				opacity: edgeIntensity,
				depthWrite: false,
				side: THREE.DoubleSide,
			});

			const edgeMesh = new THREE.Mesh(edgeTrimGeo, edgeMat);
			edgeMesh.position.set(pos.x, ROBOFORM_Y + EDGE_TRIM_OFFSET, pos.z);
			// Rotate 45 degrees so the ring corners align with tile edges
			edgeMesh.rotation.y = Math.PI / 4;
			roboformGroup.add(edgeMesh);
		}
	}
}

/**
 * Dispose the roboform group and clean up state. Call on scene shutdown.
 */
export function destroyRoboformOverlay(): void {
	if (roboformGroup) {
		while (roboformGroup.children.length > 0) {
			const child = roboformGroup.children[0];
			roboformGroup.remove(child);
		}
		roboformGroup.parent?.remove(roboformGroup);
		roboformGroup = null;
	}
}
